// Transcrição de alta qualidade (Whisper large-v3-turbo dentro do FFmpeg; nada sai da máquina).
// Soma ao assistir.mjs (que continua igual): divide o áudio nas pausas, transcreve 2–3 pedaços em paralelo com o
// modelo grande, junta palavra a palavra e refaz sozinho os trechos suspeitos (palavra esticada, fala sem palavra).
// Uso (de dentro do motor): node scripts/transcrever.mjs <video-ou-audio> <pasta-02_analise> [--paralelo 2] [--principal]
//   saída: palavras_turbo.json ([{w, ini, fim}], s do arquivo), transcricao_turbo.md, suspeitos_turbo.json
//   --principal → grava também palavras.json (o original vai para palavras_assistir.json, se existir)
// Medido em 11/10/2026: turbo ≈ 3,6× o tempo real por processo (o VAD do filtro deixa ~19× mais lento: não usar).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELO = path.resolve(MOTOR, '..', 'modelos', 'ggml-large-v3-turbo-q5_0.bin');
const args = process.argv.slice(2);
const [entrada, saidaDir] = args;
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const PARALELO = Math.max(1, Number(opt('--paralelo', 2)));
const PRINCIPAL = args.includes('--principal');
const ALVO = 24; // s por pedaço (corta na pausa mais perto)
const PAD = 0.35; // s de folga em cada ponta do pedaço
if (!entrada || !saidaDir) {
	console.error('Uso: node scripts/transcrever.mjs <video-ou-audio> <pasta-02_analise> [--paralelo 2] [--principal]');
	process.exit(1);
}
const log = (...m) => console.log('[transcrever]', ...m);
const tmp = path.join(saidaDir, '_transcrever');
fs.mkdirSync(tmp, {recursive: true});

// 1. Áudio 16 kHz mono (o whisper do FFmpeg reamostra, mas um WAV único deixa os pedaços rápidos e exatos).
const wav = path.join(tmp, 'audio16k.wav');
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', entrada, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], {stdio: 'inherit'});
const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], {encoding: 'utf8'}).stdout);
log(`${path.basename(entrada)}: ${dur.toFixed(1)} s de áudio`);

// 2. Pausas → pontos de corte perto de cada ALVO s.
const sd = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'silencedetect=n=-35dB:d=0.25', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const pausas = [];
let ini = null;
for (const l of sd.split(/\r?\n/)) {
	const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/);
	if (a) ini = Number(a[1]);
	if (b && ini != null) { pausas.push((ini + Number(b[1])) / 2); ini = null; }
}
const cortes = [0];
while (cortes[cortes.length - 1] + ALVO + 6 < dur) {
	const alvo = cortes[cortes.length - 1] + ALVO;
	const perto = pausas.filter((p) => Math.abs(p - alvo) <= 8).sort((x, y) => Math.abs(x - alvo) - Math.abs(y - alvo))[0];
	cortes.push(perto ?? alvo);
}
cortes.push(dur);
const pedacos = cortes.slice(0, -1).map((c, i) => ({i, ini: c, fim: cortes[i + 1]}));
log(`${pedacos.length} pedaço(s), ${PARALELO} em paralelo (${os.cpus().length} núcleos)`);

// 3. Transcrição de um intervalo (palavra a palavra, JSON).
const rel = (p) => path.relative(tmp, p).replace(/\\/g, '/');
const transcrever = (a, b, nome) => new Promise((res) => {
	const s = Math.max(0, a - PAD), e = Math.min(dur, b + PAD);
	const dest = `${nome}.json`;
	fs.rmSync(path.join(tmp, dest), {force: true});
	const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', s.toFixed(3), '-to', e.toFixed(3), '-i', 'audio16k.wav', '-af',
		`whisper=model=${rel(MODELO)}:language=pt:use_gpu=false:queue=${Math.ceil(e - s) + 1}:max_len=1:destination=${dest}:format=json`, '-f', 'null', '-'], {cwd: tmp});
	p.on('close', () => {
		const f = path.join(tmp, dest);
		const ws = !fs.existsSync(f) ? [] : fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } })
			.filter(Boolean).map((x) => ({w: String(x.text || '').trim(), ini: +(s + x.start / 1000).toFixed(3), fim: +(s + x.end / 1000).toFixed(3)}))
			.filter((x) => x.w && !/^\[.*\]$|^\(.*\)$/.test(x.w));
		res(ws);
	});
});
const pool = async (itens, n, fn) => { const out = []; let k = 0; await Promise.all(Array.from({length: n}, async () => { while (k < itens.length) { const j = k++; out[j] = await fn(itens[j]); } })); return out; };

const t0 = Date.now();
const res = await pool(pedacos, PARALELO, async (pc) => {
	const ws = await transcrever(pc.ini, pc.fim, `p${String(pc.i).padStart(3, '0')}`);
	log(`pedaço ${pc.i + 1}/${pedacos.length} (${pc.ini.toFixed(1)}–${pc.fim.toFixed(1)} s): ${ws.length} palavras`);
	// fica só o que o meio da palavra cai dentro do pedaço (a folga evita palavra cortada e não duplica)
	return ws.filter((w) => { const m = (w.ini + w.fim) / 2; return m >= pc.ini - (pc.i === 0 ? PAD : 0) && m < pc.fim + (pc.i === pedacos.length - 1 ? PAD : 0); });
});
let palavras = res.flat().sort((a, b) => a.ini - b.ini);

// 4. Suspeitos: palavra esticada (> 1,5 s) ou trecho com voz e sem palavra (> 2 s). Refaz em pedaço curto.
const vozSemPalavra = () => {
	const out = [];
	const fala = []; // intervalos com voz = complemento das pausas longas
	let ult = 0;
	const sil = [];
	let si = null;
	for (const l of sd.split(/\r?\n/)) {
		const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/);
		if (a) si = Number(a[1]);
		if (b && si != null) { sil.push([si, Number(b[1])]); si = null; }
	}
	for (const [a, b] of sil) { if (a > ult) fala.push([ult, a]); ult = b; }
	if (ult < dur) fala.push([ult, dur]);
	for (const [a, b] of fala) {
		const dentro = palavras.filter((w) => w.fim > a && w.ini < b);
		let t = a;
		for (const w of dentro) { if (w.ini - t > 2) out.push([t, w.ini]); t = Math.max(t, w.fim); }
		if (b - t > 2) out.push([t, b]);
	}
	return out;
};
const suspeitos = [
	...palavras.filter((w, i) => w.fim - w.ini > 1.5 && i < palavras.length - 1).map((w) => ({tipo: 'palavra esticada', ini: w.ini, fim: w.fim, w: w.w})),
	...vozSemPalavra().map(([a, b]) => ({tipo: 'voz sem palavra', ini: a, fim: b})),
];
if (suspeitos.length) {
	log(`${suspeitos.length} trecho(s) suspeito(s): segunda passada em pedaços curtos`);
	for (const [k, s] of suspeitos.entries()) {
		const a = Math.max(0, s.ini - 1.5), b = Math.min(dur, s.fim + 1.5);
		const novas = (await transcrever(a, b, `s${String(k).padStart(3, '0')}`)).filter((w) => { const m = (w.ini + w.fim) / 2; return m >= a && m < b && w.fim - w.ini <= 1.5; });
		const velhas = palavras.filter((w) => { const m = (w.ini + w.fim) / 2; return m >= a && m < b; });
		s.antes = velhas.map((w) => w.w).join(' ');
		s.depois = novas.map((w) => w.w).join(' ');
		if (novas.length >= velhas.length * 0.8) { palavras = palavras.filter((w) => !velhas.includes(w)).concat(novas).sort((x, y) => x.ini - y.ini); s.aplicado = true; }
	}
}
for (let i = 1; i < palavras.length; i++) if (palavras[i].ini < palavras[i - 1].fim) palavras[i - 1].fim = palavras[i].ini;
// Palavras "espremidas" (duração < 30 ms, comum no fim de frase rápida): redistribui a sequência inteira, junto com a
// palavra anterior, entre o começo da anterior e o começo da próxima, pelo tamanho de cada palavra.
let espremidas = 0;
for (let i = 1; i < palavras.length; i++) {
	if (palavras[i].fim - palavras[i].ini >= 0.03) continue;
	let e = i;
	while (e + 1 < palavras.length && palavras[e + 1].fim - palavras[e + 1].ini < 0.03) e++;
	const s = i - 1, a = palavras[s].ini, b = e + 1 < palavras.length ? palavras[e + 1].ini : palavras[e].fim + 0.25 * (e - s + 1);
	const grupo = palavras.slice(s, e + 1);
	const pesos = grupo.map((w) => w.w.replace(/[^\p{L}\d]/gu, '').length + 1);
	const tot = pesos.reduce((x, y) => x + y, 0);
	let t = a;
	grupo.forEach((w, k) => { const d = ((b - a) * pesos[k]) / tot; w.ini = +t.toFixed(3); w.fim = +(t + d).toFixed(3); t += d; });
	espremidas += e - s;
	i = e;
}
if (espremidas) log(`${espremidas} palavra(s) espremida(s) redistribuída(s)`);

// 5. Saídas. (meta.json é o mesmo do assistir.mjs: render, ilha, quadros, recortar e validador leem dele.)
const metaF = path.join(saidaDir, 'meta.json');
if (!fs.existsSync(metaF)) {
	const j = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', entrada], {encoding: 'utf8'}).stdout || '{}');
	const v = (j.streams || []).find((s) => s.codec_type === 'video');
	if (v) {
		const [n, d] = v.r_frame_rate.split('/').map(Number);
		const rot = Number((v.side_data_list || []).find((s) => s.rotation != null)?.rotation ?? v.tags?.rotate ?? 0);
		const deitado = Math.abs(rot) % 180 === 90;
		fs.writeFileSync(metaF, JSON.stringify({arquivo: path.resolve(entrada), duracao_s: +Number(j.format.duration).toFixed(6), largura: deitado ? v.height : v.width, altura: deitado ? v.width : v.height, fps: +(n / d).toFixed(3), rotacao: rot, tem_audio: (j.streams || []).some((s) => s.codec_type === 'audio')}, null, 2));
	}
}
fs.writeFileSync(path.join(saidaDir, 'palavras_turbo.json'), JSON.stringify(palavras, null, 1));
fs.writeFileSync(path.join(saidaDir, 'suspeitos_turbo.json'), JSON.stringify(suspeitos, null, 1));
const frases = [];
let f = [];
for (const w of palavras) { f.push(w); if (/[.!?]$/.test(w.w)) { frases.push(f); f = []; } }
if (f.length) frases.push(f);
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
fs.writeFileSync(path.join(saidaDir, 'transcricao_turbo.md'), frases.map((x) => `[${mmss(x[0].ini)} → ${mmss(x[x.length - 1].fim)}] ${x.map((w) => w.w).join(' ')}`).join('\n') + '\n');
if (PRINCIPAL) {
	const p = path.join(saidaDir, 'palavras.json');
	if (fs.existsSync(p) && !fs.existsSync(path.join(saidaDir, 'palavras_assistir.json'))) fs.copyFileSync(p, path.join(saidaDir, 'palavras_assistir.json'));
	fs.writeFileSync(p, JSON.stringify(palavras, null, 1));
}
log(`pronto em ${((Date.now() - t0) / 1000).toFixed(0)} s: ${palavras.length} palavras, ${frases.length} frases${PRINCIPAL ? ' (palavras.json atualizado)' : ''}`);
