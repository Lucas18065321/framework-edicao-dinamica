// Legenda CC (SRT PT-BR) no tempo da SAÍDA, transcrição limpa e capítulos para a descrição do YouTube.
// Uso: node scripts/srt-saida.mjs <proj> [--edicao 03_roteiro/edicao.json] [--saida <pasta>]
// Entrada: 02_analise/palavras.json (corrija ANTES com corrigir-palavras.mjs) + `montagem` e `capitulos` do edicao.json.
// O palavras.srt do assistir.mjs está no tempo do BRUTO; este converte com a mesma conta do motor (cortes no grid de
// quadros do fps do modelo, pausas {pausa: s} sem voz, palavras fora da montagem somem).
// Saídas (padrão: 07_final/):
//   <nome>.srt              blocos de até 2 linhas × 42 caracteres, 1–6 s, quebrando em pontuação, pausas e cortes
//   <nome>_transcricao.txt  texto limpo, 1 frase por linha (sincronização automática do YouTube Studio)
//   <nome>_capitulos.txt    0:00 + capítulos do edicao.json, no formato da descrição do YouTube
import fs from 'node:fs';
import path from 'node:path';
import {lerEdicao, montarSegs, palavrasNaSaida, duracaoSaida, relogio, mmss} from './lib/saida.mjs';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opcao = (n, p) => (args.indexOf(n) === -1 ? p : args[args.indexOf(n) + 1]);
const LINHA = 42, LINHAS = 2, MIN = 1, MAX = 6;

let edicao;
try {
	edicao = lerEdicao(proj, opcao('--edicao'));
} catch (e) {
	console.error(e.message);
	process.exit(1);
}
const {ed, fps} = edicao;
const segs = montarSegs(ed, fps);
const dur = duracaoSaida(segs);
const palavras = JSON.parse(fs.readFileSync(path.resolve(proj, ed.palavras ?? '02_analise/palavras.json'), 'utf8'));
const destino = path.resolve(opcao('--saida') ?? path.join(proj, '07_final'));
fs.mkdirSync(destino, {recursive: true});
const nome = path.basename(proj);

// ---------- palavras da saída, limpas ----------
const anotacao = /^[*[(].*[*\])][.,!?…]*$/; // *risos*, (risos), [Música]: não é fala
const fimFrase = /[.?!…]["”')\]]*$/;
const virgula = /[,;:—–]["”')\]]*$/;
const FUNCAO = new Set('a o as os e é de do da dos das em no na nos nas um uma uns umas para pra pro por pelo pela com sem que se me te lhe ao à aos às mas ou nem como seu sua seus suas meu minha'.split(' '));
const limpa = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const ws = [];
for (const w of palavrasNaSaida(palavras, segs)) {
	const t = String(w.w).trim();
	if (!t || anotacao.test(t)) continue;
	const ant = ws[ws.length - 1];
	const maiuscula = !ant || fimFrase.test(ant.w);
	ws.push({...w, w: maiuscula ? t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1) : t});
}
if (!ws.length) {
	console.error('Nenhuma palavra cai dentro da montagem.');
	process.exit(1);
}

// capítulos (s da saída), ordenados; o 1º precisa estar em 0:00
const caps = (Array.isArray(ed.capitulos) ? ed.capitulos : []).filter((c) => typeof c?.t === 'number' && typeof c?.titulo === 'string' && c.titulo.trim()).sort((a, b) => a.t - b.t);
const capDe = (t) => caps.filter((c) => c.t <= t + 1e-6).length;

// Quebra DEPOIS da palavra k: 'forcada' (pausa sem voz, silêncio ≥ 1,5 s), 'forte' (fim de frase, silêncio ≥ 0,6 s,
// início de capítulo), 'media' (vírgula, silêncio ≥ 0,25 s, corte da montagem) ou 'fraca'.
const quebra = ws.map((w, k) => {
	const p = ws[k + 1];
	if (!p) return 'forte';
	const vao = p.ini - w.fim;
	const pausaEntre = segs.some((s) => s.bruto == null && s.ini >= w.fim - 1e-6 && s.fim <= p.ini + 1e-6);
	if (pausaEntre || vao >= 1.5) return 'forcada';
	if (fimFrase.test(w.w) || vao >= 0.6 || capDe(w.ini) !== capDe(p.ini)) return 'forte';
	if (virgula.test(w.w) || vao >= 0.25 || p.trecho !== w.trecho) return 'media';
	return 'fraca';
});

// Melhor divisão de um bloco em até 2 linhas de ≤ 42 caracteres (null = não cabe).
const dividir = (pal) => {
	const txt = pal.join(' ');
	if (txt.length <= LINHA) return [txt];
	if (LINHAS < 2) return null;
	let melhor = null;
	for (let k = 1; k < pal.length; k++) {
		const a = pal.slice(0, k).join(' '), b = pal.slice(k).join(' ');
		if (a.length > LINHA || b.length > LINHA) continue;
		const fim = pal[k - 1];
		const nota = Math.abs(a.length - b.length) + (virgula.test(fim) || fimFrase.test(fim) ? -10 : 0) + (FUNCAO.has(limpa(fim)) ? 12 : 0);
		if (!melhor || nota < melhor.nota) melhor = {nota, linhas: [a, b]};
	}
	return melhor?.linhas ?? null;
};

// ---------- blocos: programação dinâmica sobre os pontos de quebra ----------
const n = ws.length;
const custo = new Array(n + 1).fill(Infinity);
const de = new Array(n + 1).fill(-1);
custo[0] = 0;
const PESO = {forcada: 0, forte: 0, media: 3, fraca: 12};
for (let j = 1; j <= n; j++) {
	for (let i = j - 1; i >= 0; i--) {
		if (i < j - 1 && quebra[i] === 'forcada') break; // o bloco i..j-1 não atravessa pausa sem voz nem silêncio longo
		const pal = ws.slice(i, j).map((w) => w.w);
		const len = pal.join(' ').length;
		const d = ws[j - 1].fim - ws[i].ini;
		const unica = j - i === 1;
		if (!unica && (len > LINHA * LINHAS || d > MAX)) break; // só cresce daqui para trás
		if (!unica && !dividir(pal)) continue;
		let c = 4 + PESO[quebra[j - 1]] + (quebra[j - 1] === 'fraca' && FUNCAO.has(limpa(pal[pal.length - 1])) ? 6 : 0);
		if (d < MIN) c += 20 * (MIN - d); // bloco curto demais para ler
		if (d > 5) c += 2 * (d - 5);
		if (len < 20) c += (20 - len) * 0.15;
		for (let k = i; k < j - 2; k++) if (quebra[k] === 'forte') c += 4; // fim de frase no meio do bloco (com 2+ palavras depois)
		if (custo[i] + c < custo[j]) (custo[j] = custo[i] + c), (de[j] = i);
	}
}
const blocos = [];
for (let j = n; j > 0; j = de[j]) blocos.unshift([de[j], j]);

const cues = blocos.map(([i, j]) => {
	const pal = ws.slice(i, j).map((w) => w.w);
	return {ini: ws[i].ini, fim: ws[j - 1].fim, pal, linhas: dividir(pal) ?? [pal.join(' ')]};
});
// segurança: bloco que começa (quase) junto com o seguinte (palavras de 0 s do Whisper no mesmo instante) não teria
// tempo na tela: junta com o seguinte
for (let k = cues.length - 2; k >= 0; k--) {
	if (cues[k + 1].ini - cues[k].ini >= 0.2) continue;
	const pal = [...cues[k].pal, ...cues[k + 1].pal];
	cues.splice(k, 2, {ini: cues[k].ini, fim: Math.max(cues[k].fim, cues[k + 1].fim), pal, linhas: dividir(pal) ?? [pal.join(' ')]});
}
// duração mínima de 1 s (sem invadir o próximo bloco), máxima de 6 s, nunca depois do fim do vídeo
cues.forEach((c, k) => {
	const prox = cues[k + 1]?.ini ?? dur;
	c.fim = Math.min(Math.max(c.fim, Math.min(c.ini + MIN, prox - 0.04)), c.ini + MAX, prox - 0.001, dur);
});

const ts = (s) => {
	const ms = Math.round(s * 1000);
	const p = (x, k = 2) => String(x).padStart(k, '0');
	return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = cues.map((c, k) => `${k + 1}\n${ts(c.ini)} --> ${ts(c.fim)}\n${c.linhas.join('\n')}\n`).join('\n');
fs.writeFileSync(path.join(destino, `${nome}.srt`), srt);

// ---------- transcrição limpa: 1 frase por linha, linha em branco entre capítulos (no fim da frase em curso) ----------
let txt = '';
let linha = [];
let capPendente = false;
ws.forEach((w, k) => {
	linha.push(w.w);
	if (k + 1 < n && capDe(w.ini) !== capDe(ws[k + 1].ini)) capPendente = true;
	if (fimFrase.test(w.w) || quebra[k] === 'forcada' || k === n - 1) {
		txt += linha.join(' ') + '\n' + (capPendente && k < n - 1 ? '\n' : '');
		linha = [];
		capPendente = false;
	}
});
fs.writeFileSync(path.join(destino, `${nome}_transcricao.txt`), txt);

// ---------- capítulos (descrição do YouTube) ----------
const avisos = [];
let capTxt = null;
if (caps.length) {
	const lista = caps[0].t <= 0.5 ? [{...caps[0], t: 0}, ...caps.slice(1)] : [{t: 0, titulo: 'Introdução'}, ...caps];
	if (caps[0].t > 0.5) avisos.push(`o 1º capítulo começa em ${relogio(caps[0].t)}: entrou "0:00 Introdução" (o YouTube exige 0:00)`);
	lista.forEach((c, k) => {
		const fim = lista[k + 1]?.t ?? dur;
		if (c.t >= dur) avisos.push(`capítulo "${c.titulo}" (${relogio(c.t)}) começa depois do fim do vídeo (${relogio(dur)})`);
		else if (fim - c.t < 10) avisos.push(`capítulo "${c.titulo}" tem ${(fim - c.t).toFixed(1)} s (o YouTube exige ≥ 10 s)`);
		if (k && relogio(c.t) === relogio(lista[k - 1].t)) avisos.push(`dois capítulos no mesmo segundo (${relogio(c.t)})`);
	});
	if (lista.length < 3) avisos.push(`só ${lista.length} capítulos (o YouTube exige ≥ 3)`);
	capTxt = lista.map((c) => `${relogio(c.t)} ${c.titulo.trim()}`).join('\n') + '\n';
	fs.writeFileSync(path.join(destino, `${nome}_capitulos.txt`), capTxt);
} else avisos.push('o edicao.json não tem "capitulos": não gravei o arquivo de capítulos');

// ---------- resumo ----------
const durs = cues.map((c) => c.fim - c.ini);
const cps = cues.map((c) => c.linhas.join(' ').length / Math.max(0.5, c.fim - c.ini));
const rapidos = cps.filter((x) => x > 20).length;
const rel = (f) => path.relative(proj, f) || f;
console.log(`[srt] ${ws.length} palavras na saída (${mmss(dur)}) → ${cues.length} blocos · ${(durs.reduce((a, b) => a + b, 0) / cues.length).toFixed(1)} s em média (mín. ${Math.min(...durs).toFixed(2)}, máx. ${Math.max(...durs).toFixed(2)})`);
console.log(`[srt] ${cues.filter((c) => c.linhas.length === 2).length} blocos em 2 linhas · maior linha ${Math.max(...cues.flatMap((c) => c.linhas.map((l) => l.length)))} caracteres${rapidos ? ` · ${rapidos} blocos acima de 20 caracteres/s (fala rápida)` : ''}`);
const vazios = [];
for (let k = 1; k < ws.length; k++) if (ws[k].ini - ws[k - 1].fim > 5) vazios.push(`${mmss(ws[k - 1].fim)}–${mmss(ws[k].ini)}`);
if (vazios.length) console.log(`[srt] trechos de > 5 s sem palavra (o Whisper pode ter pulado fala; confira e insira com corrigir-palavras.mjs {inserir}): ${vazios.join(', ')}`);
avisos.forEach((a) => console.log(`[srt] aviso: ${a}`));
console.log(`[srt] gravado: ${rel(path.join(destino, `${nome}.srt`))}, ${rel(path.join(destino, `${nome}_transcricao.txt`))}${capTxt ? `, ${rel(path.join(destino, `${nome}_capitulos.txt`))}` : ''}`);
if (capTxt) console.log(capTxt.trimEnd().replace(/^/gm, '   '));
