// Importa sons para 05_LAB/sfx/<categoria>/ (WAV 48 kHz 16 bits, sem metadados) e mede cada um no catálogo
// 05_LAB/sfx/catalogo.tsv: duração, pico verdadeiro, loudness momentâneo máximo e o instante dele (o pico de
// um whoosh, para alinhar ao corte). Nomes no padrão do Motionix: <categoria>/<categoria>_NN_<nome>.wav.
// Uso (de dentro de 00_SISTEMA/motor): node scripts/lab/sfx-catalogar.mjs <lote.json>
//   lote.json = {"origem": "...", "licenca": "...", "url": "...",
//                "itens": [{"arquivo": "<caminho do som baixado>", "categoria": "glitch", "nome": "bit-017", "descricao": "..."}]}
// Idempotente: um original que já está no catálogo (mesma origem e mesmo nome de arquivo) é pulado.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SFX = path.join(RAIZ, '05_LAB', 'sfx');
const CATALOGO = path.join(SFX, 'catalogo.tsv');
const COLUNAS = ['categoria', 'arquivo', 'dur', 'pico_dbtp', 'm_max_lufs', 't_m_max', 'origem', 'original', 'licenca', 'descricao'];

const lote = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const linhas = fs.existsSync(CATALOGO) ? fs.readFileSync(CATALOGO, 'utf8').split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split('\t')) : [];
const ja = new Set(linhas.map((c) => `${c[6]}|${c[7]}`));
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const limpa = (s) => String(s ?? '').replace(/[\t\r\n]+/g, ' ').trim();

const medir = (arq) => {
	const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], {encoding: 'utf8'}).stdout.trim());
	// apad: a janela do M é de 400 ms; sem completar com silêncio, um clique de 50 ms sai "-inf"
	const err = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-v', 'verbose', '-i', arq, '-af', 'apad=whole_dur=1,ebur128=peak=true:framelog=verbose', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).stderr;
	let mMax = -Infinity;
	let tMax = 0;
	for (const m of err.matchAll(/t:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+|-inf)/g)) {
		const v = m[2] === '-inf' ? -Infinity : Number(m[2]);
		if (v > mMax) [mMax, tMax] = [v, Number(m[1]) - 0.2]; // M usa janela de 400 ms: o centro dela
	}
	const pico = Number(err.match(/True peak:\s*Peak:\s*(-?[\d.]+|-inf)/)?.[1] ?? NaN);
	return {dur: dur.toFixed(3), pico_dbtp: Number.isFinite(pico) ? pico.toFixed(1) : '-inf', m_max_lufs: Number.isFinite(mMax) ? mMax.toFixed(1) : '-inf', t_m_max: Math.max(0, tMax).toFixed(2)};
};

const novas = [];
for (const it of lote.itens) {
	const original = path.basename(it.arquivo);
	if (ja.has(`${lote.origem}|${original}`)) continue;
	const dir = path.join(SFX, it.categoria);
	fs.mkdirSync(dir, {recursive: true});
	const n = fs.readdirSync(dir).filter((f) => f.startsWith(`${it.categoria}_`) && f.endsWith('.wav')).length + 1;
	const nome = `${it.categoria}_${String(n).padStart(2, '0')}_${slug(it.nome)}.wav`;
	const saida = path.join(dir, nome);
	const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', it.arquivo, '-map', '0:a:0', '-map_metadata', '-1', '-af', 'aresample=48000:dither_method=triangular', '-c:a', 'pcm_s16le', saida], {encoding: 'utf8'});
	if (r.status !== 0) { console.log(`ERRO ao converter ${original}: ${r.stderr.trim()}`); continue; }
	const m = medir(saida);
	const linha = {categoria: it.categoria, arquivo: `${it.categoria}/${nome}`, ...m, origem: lote.origem, original, licenca: lote.licenca, descricao: limpa(it.descricao)};
	novas.push(COLUNAS.map((c) => limpa(linha[c])).join('\t'));
	ja.add(`${lote.origem}|${original}`);
}
if (!fs.existsSync(CATALOGO)) fs.writeFileSync(CATALOGO, COLUNAS.join('\t') + '\n');
if (novas.length) fs.appendFileSync(CATALOGO, novas.join('\n') + '\n');
const porCat = {};
novas.forEach((l) => (porCat[l.split('\t')[0]] = (porCat[l.split('\t')[0]] ?? 0) + 1));
console.log(`[sfx-catalogar] ${novas.length} sons novos de "${lote.origem}" (${lote.itens.length - novas.length} já estavam): ${JSON.stringify(porCat)}`);
