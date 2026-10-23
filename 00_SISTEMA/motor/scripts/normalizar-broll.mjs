// Normaliza os vídeos de B-roll usados no edicao.json para o leitor do navegador (@remotion/media):
// H.264 yuv420p, fps do formato, quadro-chave a cada 1 s, faststart, no máximo 1920 px, sem áudio.
// Bancos (Pixabay) entregam arquivos com 1 quadro-chave só ou índice incomum, e o render estoura o tempo
// ("Timeout while extracting frame"). O original fica ao lado como <nome>.orig.<ext>; rodar de novo é seguro.
// Uso: node scripts/normalizar-broll.mjs <proj> [--edicao 03_roteiro/edicao.json]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const i = args.indexOf('--edicao');
const ed = JSON.parse(fs.readFileSync(path.resolve(proj, i === -1 ? '03_roteiro/edicao.json' : args[i + 1]), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(MOTOR, 'src', 'modelos.json'), 'utf8'));
const fps = reg.modelos[ed.modelo ?? reg.padrao].fps;
const videos = [...new Set((ed.cenas ?? []).map((c) => c.broll).filter((b) => b && /\.(mp4|mov|m4v|webm)$/i.test(b)))];

const keyframesOk = (f) => {
	const ks = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', f], {encoding: 'utf8'}).stdout.trim().split(/\s+/).map(Number);
	const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate:format=duration', '-of', 'json', f], {encoding: 'utf8'}).stdout;
	const j = JSON.parse(r);
	const [a, b] = j.streams[0].r_frame_rate.split('/').map(Number);
	const dur = Number(j.format.duration);
	const maxGap = Math.max(...ks.map((k, n) => (ks[n + 1] ?? dur) - k));
	return Math.abs(a / b - fps) < 0.01 && maxGap <= 1.05;
};

for (const rel of videos) {
	const f = path.join(proj, rel);
	if (!fs.existsSync(f)) {
		console.warn(`✗ não achei ${rel}`);
		continue;
	}
	if (keyframesOk(f)) {
		console.log(`✓ ${rel} (já normalizado)`);
		continue;
	}
	const orig = f.replace(/(\.[^.]+)$/, '.orig$1');
	if (!fs.existsSync(orig)) fs.renameSync(f, orig);
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', orig, '-an', '-vf', `fps=${fps},scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))',format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', String(fps), '-keyint_min', String(fps), '-movflags', '+faststart', f.replace(/\.[^.]+$/, '.mp4')], {stdio: 'inherit'});
	console.log(r.status === 0 ? `✓ ${rel} normalizado` : `✗ ${rel} falhou`);
}
