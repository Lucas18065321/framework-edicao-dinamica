// "Assiste" um vídeo local ou de URL: transcrição palavra a palavra (Whisper do FFmpeg, 100% local),
// linha do tempo segundo a segundo, cortes de cena, pausas, quadros e folhas de contato.
// Uso: node scripts/assistir.mjs <video-ou-URL> <pasta-de-saida> [--lang pt] [--fps 1] [--sem-frames]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const SISTEMA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODEL = path.join(SISTEMA, 'modelos', 'ggml-small.bin');
const FONT = 'C\\:/Windows/Fonts/arial.ttf';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
let [src, outDir] = args;
if (!src || !outDir) {
	console.error('Uso: node scripts/assistir.mjs <video-ou-URL> <pasta-de-saida> [--lang pt] [--fps 1] [--sem-frames]');
	process.exit(1);
}
const lang = opt('--lang', 'pt');
outDir = path.resolve(outDir);
fs.mkdirSync(outDir, {recursive: true});

const run = (cmd, a, o = {}) => {
	const r = spawnSync(cmd, a, {encoding: 'utf8', maxBuffer: 1 << 28, ...o});
	if (r.status !== 0 && !o.allowFail) throw new Error(`${cmd} falhou: ${(r.stderr || '').slice(-1500)}`);
	return r;
};
const log = (m) => console.log(`[assistir] ${m}`);
const fmt = (s) => {
	const d = Math.round(s * 10); // décimos, para 59,98 virar 01:00.0 e não 00:60.0
	return `${String(Math.floor(d / 600)).padStart(2, '0')}:${((d % 600) / 10).toFixed(1).padStart(4, '0')}`;
};

// 1. URL → baixa com yt-dlp (só conteúdo que você tem direito de usar).
if (/^https?:\/\//i.test(src)) {
	log('baixando com yt-dlp…');
	run('yt-dlp', ['-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4', '-o', path.join(outDir, 'fonte.%(ext)s'), src]);
	src = path.join(outDir, 'fonte.mp4');
}
src = path.resolve(src);

// 2. Metadados.
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', src]).stdout);
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const dur = Number(probe.format.duration);
const [fn, fd] = (v?.r_frame_rate || '30/1').split('/').map(Number);
const meta = {arquivo: src, duracao_s: dur, largura: v?.width, altura: v?.height, fps: +(fn / fd).toFixed(3), rotacao: v?.side_data_list?.[0]?.rotation ?? 0, tem_audio: !!a};
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
log(`${meta.largura}x${meta.altura} @ ${meta.fps}fps, ${dur.toFixed(1)}s`);

// 3. Transcrição palavra a palavra (whisper.cpp dentro do FFmpeg; nada sai da máquina).
let words = [];
if (a) {
	log('transcrevendo palavra a palavra (≈ tempo real)…');
	const srt = path.join(outDir, 'palavras.srt');
	// Filter-option paths can't carry the drive colon reliably, so run inside outDir with relative paths.
	const relModel = path.relative(outDir, MODEL).replace(/\\/g, '/');
	run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vn', '-af',
		`aresample=16000,whisper=model=${relModel}:language=${lang}:queue=20:use_gpu=false:max_len=1:destination=palavras.srt:format=srt`, '-f', 'null', '-'], {cwd: outDir});
	const toS = (t) => {
		const [h, m, s] = t.replace(',', '.').split(':');
		return +h * 3600 + +m * 60 + +s;
	};
	for (const block of fs.readFileSync(srt, 'utf8').split(/\r?\n\r?\n/)) {
		const m = block.match(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})\r?\n([\s\S]+)/);
		if (m && m[3].trim()) words.push({w: m[3].trim(), ini: +toS(m[1]).toFixed(3), fim: +toS(m[2]).toFixed(3)});
	}
	fs.writeFileSync(path.join(outDir, 'palavras.json'), JSON.stringify(words, null, 1));
	// Mesmo conteúdo no formato das skills HyperFrames (talking-head-recut, embedded-captions…),
	// cujo Whisper próprio não roda nesta máquina.
	fs.writeFileSync(path.join(outDir, 'transcript.json'), JSON.stringify(words.map((w) => ({text: w.w, start: w.ini, end: w.fim})), null, 1));

	// Frases: quebra em pontuação final ou pausa > 0,6 s.
	const frases = [];
	let cur = [];
	words.forEach((w, i) => {
		cur.push(w);
		const next = words[i + 1];
		if (/[.!?…]$/.test(w.w) || !next || next.ini - w.fim > 0.6) {
			frases.push({ini: cur[0].ini, fim: cur.at(-1).fim, texto: cur.map((x) => x.w).join(' ')});
			cur = [];
		}
	});
	fs.writeFileSync(path.join(outDir, 'frases.json'), JSON.stringify(frases, null, 1));
	fs.writeFileSync(path.join(outDir, 'transcricao.md'), frases.map((f) => `[${fmt(f.ini)} → ${fmt(f.fim)}] ${f.texto}`).join('\n') + '\n');
	log(`${words.length} palavras, ${frases.length} frases`);
}

// 4. Pausas (silêncios ≥ 0,35 s) e cortes de cena.
const pausas = [];
if (a) {
	const r = run('ffmpeg', ['-hide_banner', '-i', src, '-vn', '-af', 'silencedetect=noise=-35dB:d=0.35', '-f', 'null', '-'], {allowFail: true});
	let ini = null;
	for (const l of r.stderr.split('\n')) {
		const s = l.match(/silence_start: ([\d.]+)/), e = l.match(/silence_end: ([\d.]+)/);
		if (s) ini = +s[1];
		if (e && ini !== null) pausas.push({ini: +ini.toFixed(2), fim: +(+e[1]).toFixed(2)}), (ini = null);
	}
}
const cortes = [];
if (v) {
	const r = run('ffmpeg', ['-hide_banner', '-i', src, '-an', '-vf', "select='gt(scene,0.3)',showinfo", '-f', 'null', '-'], {allowFail: true});
	for (const l of r.stderr.split('\n')) {
		const m = l.match(/pts_time:([\d.]+)/);
		if (m) cortes.push(+(+m[1]).toFixed(2));
	}
}
fs.writeFileSync(path.join(outDir, 'pausas_e_cortes.json'), JSON.stringify({pausas, cortes}, null, 1));

// 5. Quadros (1 por segundo por padrão) + folhas de contato com tempo impresso.
const fps = Number(opt('--fps', dur <= 90 ? 2 : 1));
if (v && !args.includes('--sem-frames')) {
	log(`extraindo quadros a ${fps} fps…`);
	const fdir = path.join(outDir, 'quadros');
	fs.mkdirSync(fdir, {recursive: true});
	run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', `fps=${fps},scale=480:-2`, '-q:v', '4', path.join(fdir, 'q_%05d.jpg')]);
	run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf',
		`fps=${fps},scale=240:-2,drawtext=fontfile='${FONT}':text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.75,tile=6x4`,
		'-q:v', '3', path.join(outDir, 'folha_%03d.jpg')]);
}

// 6. Linha do tempo segundo a segundo: fala + pausa + corte + quadro.
const lines = [`# Linha do tempo — ${path.basename(src)}`, '', `Duração ${dur.toFixed(1)} s · ${meta.largura}x${meta.altura} · ${meta.fps} fps`, '', '| seg | fala | eventos | quadro |', '|---|---|---|---|'];
for (let s = 0; s < Math.ceil(dur); s++) {
	const fala = words.filter((w) => w.ini >= s && w.ini < s + 1).map((w) => w.w).join(' ');
	const ev = [
		...cortes.filter((c) => c >= s && c < s + 1).map((c) => `corte ${c.toFixed(2)}s`),
		...pausas.filter((p) => p.ini >= s && p.ini < s + 1).map((p) => `pausa ${(p.fim - p.ini).toFixed(2)}s`),
	].join(', ');
	const q = v && !args.includes('--sem-frames') ? `q_${String(Math.floor(s * fps) + 1).padStart(5, '0')}.jpg` : '';
	lines.push(`| ${fmt(s).slice(0, 5)} | ${fala || '—'} | ${ev} | ${q} |`);
}
fs.writeFileSync(path.join(outDir, 'segundo_a_segundo.md'), lines.join('\n') + '\n');
log(`pronto → ${outDir}`);
