// Alinha o palavras.json (texto já corrigido) ao áudio, para os formatos 4 e 5: a ilustração entra na palavra, então
// erro de tempo do Whisper aparece na tela. Medido no piloto do PAPER VOX ANIMATION: a transcrição em pedaços de ~24 s pôs
// uma frase 2,7 s cedo, dentro de uma pausa de 3,1 s (e "alucinou" um "Obrigado" no silêncio), e
// outra 1,6 s cedo. Heurística em cima desses tempos não resolve; aqui o tempo vem do próprio áudio:
//   1. silêncios medidos (silencedetect) → ilhas de fala;
//   2. ilhas agrupadas em trechos curtos (≤ 8 s, sempre cortados num silêncio) e retranscritos com o Whisper turbo
//      (o mesmo do transcrever.mjs), palavra a palavra, 2 em paralelo: em trecho curto o Whisper quase não deriva;
//   3. as palavras novas são casadas com o texto corrigido (alinhamento de sequência, Needleman–Wunsch, sem acento e
//      sem pontuação); a palavra casada herda o tempo novo; a não casada é interpolada entre as vizinhas;
//   4. palavra que ainda caia dentro de um silêncio é levada para a borda da ilha mais perto;
//   5. "E"/"A" de começo de frase casado longe vai para junto da palavra seguinte; palavras espremidas no mesmo
//      instante são repartidas até a próxima.
// O TEXTO não muda (continua o do corrigir-palavras.mjs); só os tempos.
// Uso (de dentro do motor, pela fila): node scripts/vez.mjs node scripts/alinhar-palavras.mjs <proj> [--audio 01_bruto/bruto.mp3]
//   [--limiar -35] [--min 0.35] [--paralelo 2]
//   lê 02_analise/palavras.json, guarda a versão anterior em 02_analise/palavras_corrigidas.json, grava o alinhado no
//   lugar e o relatório em 02_analise/alinhamento.md. Rodou o corrigir-palavras.mjs de novo? Rode este depois.
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELO = path.resolve(MOTOR, '..', 'modelos', 'ggml-large-v3-turbo-q5_0.bin');
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const proj = path.resolve(args[0] ?? '');
const dir = path.join(proj, '02_analise');
if (!args[0] || !fs.existsSync(path.join(dir, 'palavras.json'))) {
	console.error('Uso: node scripts/alinhar-palavras.mjs <proj> [--audio 01_bruto/bruto.mp3] [--limiar -35] [--min 0.35] [--paralelo 2]');
	process.exit(1);
}
const audio = path.resolve(proj, opt('--audio', fs.readdirSync(path.join(proj, '01_bruto')).map((f) => `01_bruto/${f}`).find((f) => /bruto\.(mp3|wav|m4a|mp4)$/i.test(f)) ?? '01_bruto/bruto.mp3'));
const LIMIAR = Number(opt('--limiar', -35));
const MIN = Number(opt('--min', 0.35));
const PARALELO = Math.max(1, Number(opt('--paralelo', 2)));
const TRECHO = 8;
const PAD = 0.25;
const r3 = (x) => +x.toFixed(3);
const log = (...m) => console.log('[alinhar]', ...m);
const t0 = Date.now();

// 1. áudio 16 kHz e ilhas de fala
const tmp = path.join(dir, '_alinhar');
fs.mkdirSync(tmp, {recursive: true});
const wav = path.join(tmp, 'audio16k.wav');
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', audio, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], {encoding: 'utf8'}).stdout);
const sd = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', `silencedetect=n=${LIMIAR}dB:d=${MIN}`, '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const sil = [];
let a0 = null;
for (const l of sd.split(/\r?\n/)) {
	const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/);
	if (a) a0 = Number(a[1]);
	if (b && a0 != null) sil.push([a0, Number(b[1])]), (a0 = null);
}
if (a0 != null) sil.push([a0, dur]);
const ilhas = [];
let c = 0;
for (const [a, b] of sil) {
	if (a > c + 0.02) ilhas.push([c, a]);
	c = b;
}
if (dur > c + 0.02) ilhas.push([c, dur]);

// 2. trechos curtos cortados nos silêncios
const trechos = [];
for (const il of ilhas) {
	const u = trechos[trechos.length - 1];
	if (u && il[1] - u[0] <= TRECHO) u[1] = il[1];
	else trechos.push([il[0], il[1]]);
}
log(`${sil.length} silêncios, ${ilhas.length} ilhas, ${trechos.length} trechos (≤ ${TRECHO} s), ${PARALELO} em paralelo`);
const rel = (p) => path.relative(tmp, p).replace(/\\/g, '/');
const whisper = (a, b, nome) => new Promise((res) => {
	const s = Math.max(0, a - PAD), e = Math.min(dur, b + PAD);
	const dest = `${nome}.json`;
	fs.rmSync(path.join(tmp, dest), {force: true});
	const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', s.toFixed(3), '-to', e.toFixed(3), '-i', 'audio16k.wav', '-af',
		`whisper=model=${rel(MODELO)}:language=pt:use_gpu=false:queue=${Math.ceil(e - s) + 1}:max_len=1:destination=${dest}:format=json`, '-f', 'null', '-'], {cwd: tmp});
	p.on('close', () => {
		const f = path.join(tmp, dest);
		const ws = !fs.existsSync(f) ? [] : fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } })
			.filter(Boolean).map((x) => ({w: String(x.text || '').trim(), ini: s + x.start / 1000, fim: s + x.end / 1000})).filter((x) => x.w && !/^\[.*\]$|^\(.*\)$/.test(x.w));
		res(ws);
	});
});
const pool = async (itens, n, fn) => { const out = []; let k = 0; await Promise.all(Array.from({length: n}, async () => { while (k < itens.length) { const j = k++; out[j] = await fn(itens[j], j); } })); return out; };
const novas = (await pool(trechos, PARALELO, ([a, b], j) => whisper(a, b, `t${String(j).padStart(3, '0')}`)))
	.flatMap((ws, j) => ws.filter((x) => { const m = (x.ini + x.fim) / 2; return m >= trechos[j][0] - PAD / 2 && m <= trechos[j][1] + PAD / 2; }));
log(`retranscrito: ${novas.length} palavras em ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// 3. casa com o texto corrigido (Needleman–Wunsch)
const base = JSON.parse(fs.readFileSync(path.join(dir, 'palavras.json'), 'utf8'));
fs.writeFileSync(path.join(dir, 'palavras_corrigidas.json'), JSON.stringify(base));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}%]/gu, '');
const A = base.map((x) => norm(x.w)), B = novas.map((x) => norm(x.w));
const n = A.length, m = B.length;
const sim = (x, y) => (x === y ? 2 : x && y && (x.startsWith(y) || y.startsWith(x)) && Math.min(x.length, y.length) >= 3 ? 1 : -1);
const S = Array.from({length: n + 1}, () => new Float64Array(m + 1));
for (let i = 1; i <= n; i++) S[i][0] = -i;
for (let j = 1; j <= m; j++) S[0][j] = -j;
for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) S[i][j] = Math.max(S[i - 1][j - 1] + sim(A[i - 1], B[j - 1]), S[i - 1][j] - 1, S[i][j - 1] - 1);
const par = new Array(n).fill(-1);
for (let i = n, j = m; i > 0 && j > 0;) {
	if (S[i][j] === S[i - 1][j - 1] + sim(A[i - 1], B[j - 1])) { if (sim(A[i - 1], B[j - 1]) > 0) par[i - 1] = j - 1; i--, j--; }
	else if (S[i][j] === S[i - 1][j] - 1) i--;
	else j--;
}
const w = base.map((x) => ({...x}));
const casadas = par.filter((j) => j >= 0).length;
for (let i = 0; i < n; i++) if (par[i] >= 0) (w[i].ini = novas[par[i]].ini), (w[i].fim = novas[par[i]].fim);
// não casadas: interpola entre as vizinhas casadas, pelo tamanho da palavra
for (let i = 0; i < n;) {
	if (par[i] >= 0) { i++; continue; }
	let j = i;
	while (j < n && par[j] < 0) j++;
	const ini = i > 0 ? w[i - 1].fim : Math.max(0, (w[j]?.ini ?? 0) - 0.3 * (j - i));
	const fim = j < n ? w[j].ini : Math.min(dur, ini + 0.3 * (j - i));
	const peso = w.slice(i, j).map((x) => norm(x.w).length + 2), tot = peso.reduce((s, v) => s + v, 0);
	let cur = ini;
	for (let k = i; k < j; k++) { const d = ((fim - ini) * peso[k - i]) / tot; w[k].ini = cur; w[k].fim = cur + d; cur += d; }
	i = j;
}
// 4. ninguém dentro de silêncio
const ilhaPerto = (t) => ilhas.reduce((best, il) => { const d = t < il[0] ? il[0] - t : t > il[1] ? t - il[1] : 0; return d < best.d ? {il, d} : best; }, {il: null, d: Infinity}).il;
for (const x of w) {
	const il = ilhaPerto((x.ini + x.fim) / 2);
	if (!il) continue;
	const d = x.fim - x.ini;
	if (x.ini < il[0]) (x.ini = il[0]), (x.fim = Math.min(il[1], Math.max(x.fim, il[0] + Math.min(d, 0.15))));
	if (x.fim > il[1]) (x.fim = il[1]), (x.ini = Math.max(il[0], Math.min(x.ini, il[1] - Math.min(d, 0.15))));
}
// 5. palavrinha (≤ 2 letras, sem fechar frase) casada longe da seguinte: o "E"/"A" de começo de frase que o Whisper
// juntou à frase anterior. Vai para junto da seguinte.
for (let i = 1; i < w.length - 1; i++) {
	const x = w[i], nx = w[i + 1], pv = w[i - 1];
	if (norm(x.w).length > 2 || /[.!?]$/.test(x.w)) continue;
	const gNext = nx.ini - x.fim, gPrev = x.ini - pv.fim;
	if (gNext > 0.6 && gNext > gPrev) {
		const d = Math.min(0.12, x.fim - x.ini);
		x.ini = Math.max(pv.fim, nx.ini - d);
		x.fim = nx.ini;
	}
}
// 6. espremidas: 2+ palavras seguidas no mesmo instante (interpolação sem espaço) → repartidas até a próxima palavra
for (let i = 0; i < w.length;) {
	let j = i + 1;
	while (j < w.length && Math.abs(w[j].ini - w[i].ini) < 0.03) j++;
	if (j - i >= 2) {
		const ini = w[i].ini, fim = j < w.length ? Math.max(w[j].ini, ini + 0.08 * (j - i)) : w[j - 1].fim;
		const peso = w.slice(i, j).map((x) => norm(x.w).length + 2), tot = peso.reduce((s2, v) => s2 + v, 0);
		let cur = ini;
		for (let k = i; k < j; k++) { const d = ((fim - ini) * peso[k - i]) / tot; w[k].ini = cur; w[k].fim = cur + d; cur += d; }
	}
	i = j;
}
// 7. ordem: nenhuma palavra começa antes da anterior
for (let i = 1; i < w.length; i++) if (w[i].ini < w[i - 1].ini + 0.03) (w[i].ini = w[i - 1].ini + 0.03), (w[i].fim = Math.max(w[i].fim, w[i].ini + 0.03));
for (let i = 1; i < w.length; i++) if (w[i].ini < w[i - 1].fim) w[i - 1].fim = Math.max(w[i - 1].ini + 0.02, w[i].ini);
for (const x of w) (x.ini = r3(x.ini)), (x.fim = r3(x.fim));

fs.writeFileSync(path.join(dir, 'palavras.json'), JSON.stringify(w));
const mov = w.map((x, i) => ({w: x.w, de: base[i].ini, para: x.ini, d: x.ini - base[i].ini})).filter((x) => Math.abs(x.d) >= 0.25);
const relat = [
	'# Alinhamento ao áudio (retranscrição em trechos curtos)', '',
	`Áudio: ${path.relative(proj, audio).replace(/\\/g, '/')} · silêncios a ${LIMIAR} dB, ≥ ${MIN} s: ${sil.length} · ilhas: ${ilhas.length} · trechos: ${trechos.length}`,
	`Casadas: ${casadas} de ${n} palavras (as outras interpoladas) · ${mov.length} palavras mudaram ≥ 0,25 s · ${((Date.now() - t0) / 1000).toFixed(0)} s`, '',
	'| palavra | antes (s) | depois (s) | Δ |', '|---|---|---|---|',
	...mov.map((x) => `| ${x.w} | ${x.de.toFixed(2)} | ${x.para.toFixed(2)} | ${x.d >= 0 ? '+' : ''}${x.d.toFixed(2)} |`),
];
fs.writeFileSync(path.join(dir, 'alinhamento.md'), relat.join('\n') + '\n');
fs.rmSync(tmp, {recursive: true, force: true});
log(`casadas ${casadas}/${n}; ${mov.length} palavras mudaram ≥ 0,25 s → 02_analise/palavras.json · relatório: alinhamento.md · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
