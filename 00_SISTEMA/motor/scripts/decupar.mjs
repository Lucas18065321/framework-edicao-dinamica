// Decupagem automática para brutos sem corte: tira silêncios longos e marca tomadas repetidas/erradas.
// Uso: node scripts/decupar.mjs <proj> [--pausa 0.45] [--antes 0.12] [--depois 0.18] [--manter 3,7] [--tirar 5]
// Mede o ruído de fundo da gravação (limiar adaptativo, não fixo), acha as falas, junta as palavras do
// palavras.json em cada fala e compara falas vizinhas: quando uma frase é recomeçada, fica a ÚLTIMA tomada.
// Saídas: 03_roteiro/decupagem.md (lista numerada para revisar) e 03_roteiro/montagem.json ("montagem" do edicao.json).
// Revise o .md lendo o texto: frases erradas que não se repetem precisam de --tirar; falsos positivos, --manter.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opcao = (n, p) => (args.indexOf(n) === -1 ? p : args[args.indexOf(n) + 1]);
const lista = (n) => new Set(String(opcao(n, '')).split(',').filter(Boolean).map(Number));
const PAUSA = Number(opcao('--pausa', 0.45));
const ANTES = Number(opcao('--antes', 0.12));
const DEPOIS = Number(opcao('--depois', 0.18));
const manter = lista('--manter');
const tirar = lista('--tirar');

const bruto = fs.readdirSync(path.join(proj, '01_bruto')).find((f) => /^bruto\./.test(f));
if (!bruto) {
	console.error('Uso: node scripts/decupar.mjs <proj> (precisa de 01_bruto/bruto.* e 02_analise/palavras.json)');
	process.exit(1);
}
const palavras = JSON.parse(fs.readFileSync(path.join(proj, '02_analise', 'palavras.json'), 'utf8'));

// Nível RMS em janelas de 50 ms.
const JAN = 0.05;
const out = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path.join(proj, '01_bruto', bruto), '-vn', '-af', 'aresample=16000,aformat=channel_layouts=mono,asetnsamples=n=800:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 512 * 1024 * 1024}).stdout;
const niveis = [...out.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -120 : Number(m[1])));
const ordenado = [...niveis].sort((a, b) => a - b);
const pct = (p) => ordenado[Math.floor(p * (ordenado.length - 1))];
const chao = pct(0.1);
const fala = pct(0.9);
const limiar = chao + 0.3 * (fala - chao);

// Trechos de fala: janelas acima do limiar, unindo buracos menores que PAUSA.
let trechos = [];
let ini = null;
niveis.forEach((v, i) => {
	const t = i * JAN;
	if (v >= limiar && ini === null) ini = t;
	if (v < limiar && ini !== null) trechos.push([ini, t]), (ini = null);
});
if (ini !== null) trechos.push([ini, niveis.length * JAN]);
trechos = trechos.reduce((acc, tr) => {
	const ult = acc[acc.length - 1];
	if (ult && tr[0] - ult[1] < PAUSA) ult[1] = tr[1];
	else acc.push([...tr]);
	return acc;
}, []);

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
const dur = niveis.length * JAN;
const falas = trechos.map(([a, b], i) => {
	const ws = palavras.filter((w) => (w.ini + w.fim) / 2 >= a - 0.05 && (w.ini + w.fim) / 2 <= b + 0.05);
	return {n: i + 1, ini: Math.max(0, a - ANTES), fim: Math.min(dur, b + DEPOIS), texto: ws.map((w) => w.w).join(' '), chave: ws.map((w) => norm(w.w)).filter(Boolean), status: 'ok'};
});
// Tomada repetida: a fala recomeça igual (3 primeiras palavras) ou é muito parecida com uma das 2 seguintes.
const parecida = (a, b) => {
	if (a.length >= 3 && a.slice(0, 3).join(' ') === b.slice(0, 3).join(' ')) return true;
	const A = new Set(a);
	const comuns = b.filter((w) => A.has(w)).length;
	return a.length >= 3 && comuns / Math.max(a.length, 1) >= 0.6;
};
falas.forEach((f, i) => {
	if (!f.chave.length) f.status = 'sem fala';
	else if (falas.slice(i + 1, i + 3).some((g) => parecida(f.chave, g.chave))) f.status = 'repetida';
	if (manter.has(f.n)) f.status = 'ok';
	if (tirar.has(f.n)) f.status = 'tirada';
});
// Encosta trechos que se sobrepõem por causa das folgas.
const mantidas = falas.filter((f) => f.status === 'ok');
const montagem = mantidas.reduce((acc, f) => {
	const ult = acc[acc.length - 1];
	if (ult && f.ini <= ult.fim) ult.fim = f.fim;
	else acc.push({ini: +f.ini.toFixed(3), fim: +f.fim.toFixed(3)});
	return acc;
}, []);
const total = montagem.reduce((s, m) => s + m.fim - m.ini, 0);

const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const md = [
	'# Decupagem automática',
	'',
	`Bruto ${fmt(dur)} → editado ${fmt(total)} (${montagem.length} trechos). Limiar ${limiar.toFixed(1)} dB (ruído ${chao.toFixed(1)} dB, fala ${fala.toFixed(1)} dB), pausa ≥ ${PAUSA} s.`,
	'Revise: frase errada que não se repete → `--tirar N`; falso positivo → `--manter N`. Depois cole `montagem.json` no `edicao.json`.',
	'',
	'| # | tempo no bruto | dur | status | fala |',
	'|---|---|---|---|---|',
	...falas.map((f) => `| ${f.n} | ${fmt(f.ini)}–${fmt(f.fim)} | ${(f.fim - f.ini).toFixed(1)} s | ${f.status === 'ok' ? '✔' : `✂ ${f.status}`} | ${f.texto || '—'} |`),
].join('\n');
fs.mkdirSync(path.join(proj, '03_roteiro'), {recursive: true});
fs.writeFileSync(path.join(proj, '03_roteiro', 'decupagem.md'), md + '\n');
fs.writeFileSync(path.join(proj, '03_roteiro', 'montagem.json'), JSON.stringify(montagem, null, 1));
console.log(`[decupar] ${falas.length} falas · ${falas.filter((f) => f.status !== 'ok').length} cortadas · ${fmt(dur)} → ${fmt(total)} · 03_roteiro/decupagem.md e montagem.json`);
