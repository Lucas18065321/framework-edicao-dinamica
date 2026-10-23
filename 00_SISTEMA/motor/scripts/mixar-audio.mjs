// Áudio do INSTAGRAM - PAPER VOX ANIMATION depois do render (a composição só toca a voz e, sem sfxNaMixagem, os SFX):
//   trilha: ≤ 1/4 da voz (regra do formato), um pouco mais nas pausas e montagens, PARA SECO nos cortes (trechos só voz,
//           ajuste da prévia 1 do piloto) e volta em 0,12 s; fade no fim.
//   SFX (quando props.sfxNaMixagem): cada um entra na amostra exata (a composição só acerta a grade de 1/24 s = 41,7 ms),
//           com o t que o refinar-sfx.mjs calculou.
// O envelope é aplicado amostra a amostra em Node (sem Python); depois amix (sem normalizar) com o áudio do vídeo e
// loudnorm −14 LUFS / −1 dBTP em 2 passadas lineares, vídeo copiado. Comparar trilhas = rodar de novo com outra
// --trilha (segundos, sem renderizar de novo). Nasceu no lab como mixar-trilha.mjs.
// Uso (de dentro do motor): node scripts/mixar-audio.mjs <proj> --video <mp4> --props 03_roteiro/quadro.json
//   [--trilha A|B|nenhuma] [--desde <s do vídeo no início do trecho>] [--saida f.mp4] [--final]   (--final → AAC 320k)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const args = process.argv.slice(2);
const opcao = (nome, padrao = null) => (args.includes(nome) ? args[args.indexOf(nome) + 1] : padrao);
const proj = path.resolve(args[0] ?? '');
if (!args[0] || !opcao('--video') || !opcao('--props')) {
	console.error('Uso: node scripts/mixar-audio.mjs <proj> --video <mp4> --props 03_roteiro/<x>.json [--trilha A|B|nenhuma] [--desde s] [--saida f] [--final]');
	process.exit(1);
}
const video = path.resolve(proj, opcao('--video'));
const props = JSON.parse(fs.readFileSync(path.resolve(proj, opcao('--props')), 'utf8'));
const id = opcao('--trilha');
const m = id === 'nenhuma' ? null : id ? props.musicas?.[id] : props.musica;
if (id && id !== 'nenhuma' && !m) {
	console.error(`[mixar] sem musicas.${id} no props`);
	process.exit(1);
}
const desde = Number(opcao('--desde', '0'));
const saida = opcao('--saida') ? path.resolve(proj, opcao('--saida')) : video.replace(/\.mp4$/, `_trilha-${id ?? 'A'}.mp4`);
if (path.resolve(saida) === path.resolve(video)) {
	console.error('[mixar] --saida não pode ser o próprio --video');
	process.exit(1);
}
const SR = 48000;
const tmpRaw = `${saida}.extra.f32`, tmpMix = `${saida}.mix.wav`;
const ff = (a, o = {}) => spawnSync('ffmpeg', ['-hide_banner', ...a], {maxBuffer: 1024 * 1024 * 1024, ...o});
const durVideo = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], {encoding: 'utf8'}).stdout) || props.duracao - desde;
const N = Math.ceil(durVideo * SR);
const extra = new Float32Array(N * 2); // trilha + SFX, estéreo intercalado
const resolver = (src) => (src.startsWith('@raiz/') ? path.join(RAIZ, src.slice(6)) : path.join(proj, src));
const decodificar = (arq, ini = 0, dur = null) => {
	const r = ff(['-loglevel', 'error', '-ss', String(ini), ...(dur ? ['-t', String(dur)] : []), '-i', arq, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-']);
	if (r.status !== 0) throw new Error(`[mixar] não decodificou ${arq}: ${r.stderr}`);
	return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
};
const cl = (v) => Math.min(1, Math.max(0, v));

// 1. trilha: nível com/sem fala suavizado (0,15 s) × máscara dos cortes × fades
let somaQ = 0, nQ = 0;
if (m) {
	const x = decodificar(resolver(m.src), (m.ini ?? 0) + desde, durVideo);
	const pausas = m.pausas ?? [], cortes = m.cortes ?? [];
	const mascara = (t) => {
		let g = 1;
		for (const [a, b] of cortes) {
			if (t >= a - 0.012 && t < a) g *= (a - t) / 0.012; // parada brusca em 12 ms (sem estalo)
			else if (t >= a && t <= b) return 0;
			else if (t > b && t < b + 0.12) g *= (t - b) / 0.12;
		}
		return g;
	};
	const suave = 1 - Math.exp(-1 / (0.15 * SR));
	let nivel = m.vol, ip = 0;
	for (let i = 0; i < Math.min(N, x.length / 2); i++) {
		const t = desde + i / SR; // tempo do vídeo inteiro (pausas e cortes são absolutos)
		while (ip < pausas.length && t > pausas[ip][1]) ip++;
		const alvo = ip < pausas.length && t >= pausas[ip][0] ? m.volSemFala ?? m.vol : m.vol;
		nivel += (alvo - nivel) * suave;
		const g = nivel * mascara(t) * (desde > 0 ? 1 : cl(t / 0.05)) * (m.fim != null ? cl((m.fim - t) / (m.fade ?? 1.5)) : 1);
		extra[2 * i] = x[2 * i] * g;
		extra[2 * i + 1] = x[2 * i + 1] * g;
		if (g > 0) { somaQ += extra[2 * i] ** 2; nQ++; }
	}
}

// 2. SFX na amostra exata (só quando a composição não os tocou)
let nSfx = 0;
if (props.sfxNaMixagem) {
	const cache = new Map();
	for (const s of props.sfx ?? []) {
		const ini = Math.round((s.t - desde) * SR);
		if (!cache.has(s.som)) cache.set(s.som, decodificar(resolver(s.som)));
		const y = cache.get(s.som), v = s.vol ?? 0.3;
		const de = Math.max(0, -ini); // som que começou antes do trecho
		if (ini + y.length / 2 <= 0 || ini >= N) continue;
		for (let k = de; k < y.length / 2 && ini + k < N; k++) {
			extra[2 * (ini + k)] += y[2 * k] * v;
			extra[2 * (ini + k) + 1] += y[2 * k + 1] * v;
		}
		nSfx++;
	}
}
fs.writeFileSync(tmpRaw, Buffer.from(extra.buffer, extra.byteOffset, extra.byteLength));

// 3. mistura com o áudio do vídeo (voz [+ SFX da composição]) sem normalizar
const mix = ff(['-loglevel', 'error', '-y', '-i', video, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', tmpRaw, '-filter_complex', `[0:a]aresample=${SR},aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=first:normalize=0:dropout_transition=0[a]`, '-map', '[a]', '-c:a', 'pcm_f32le', tmpMix]);
if (mix.status !== 0) throw new Error(`[mixar] amix falhou: ${mix.stderr}`);

// 4. loudnorm em 2 passadas (ganho linear) e mux com o vídeo copiado
let filtro = 'loudnorm=I=-14:TP=-1:LRA=11';
const med = ff(['-nostats', '-i', tmpMix, '-af', `${filtro}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
try {
	const j = JSON.parse(med.slice(med.lastIndexOf('{'), med.lastIndexOf('}') + 1));
	filtro += `:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
} catch {
	console.warn('[mixar] medição de loudness falhou; usando passada única');
}
const fim = ff(['-loglevel', 'error', '-y', '-i', video, '-i', tmpMix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', filtro, '-ar', '48000', '-c:a', 'aac', '-b:a', args.includes('--final') ? '320k' : '192k', '-movflags', '+faststart', saida], {stdio: 'inherit'});
fs.rmSync(tmpRaw, {force: true});
fs.rmSync(tmpMix, {force: true});
if (fim.status !== 0) process.exit(fim.status ?? 1);

// 5. conferência
const rmsDb = nQ ? 10 * Math.log10(somaQ / nQ) : -120;
const lufs = (arq) => (ff(['-nostats', '-i', arq, '-vn', '-af', 'ebur128', '-f', 'null', '-'], {encoding: 'utf8'}).stderr.match(/Integrated loudness:\s*I:\s*(-?[\d.]+)/) ?? [])[1];
if (m) console.log(`[mixar] trilha ${id ?? 'A'} · ${path.basename(m.src)} desde ${(m.ini ?? 0) + desde} s · vol ${m.vol}/${m.volSemFala ?? m.vol} · ${(m.cortes ?? []).length} cortes só voz · RMS onde toca ${rmsDb.toFixed(1)} dBFS (voz ${m.vozI ?? '?'} LUFS antes do loudnorm)`);
else console.log('[mixar] sem trilha');
if (props.sfxNaMixagem) console.log(`[mixar] ${nSfx} SFX na amostra exata`);
console.log(`[mixar] ok: ${path.relative(RAIZ, saida)} · ${lufs(saida)} LUFS`);
