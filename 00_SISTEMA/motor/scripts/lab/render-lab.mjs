// Render das composições do laboratório (entrada própria src/lab/index.ts; nada dos 3 formatos fixos é tocado).
// Uso (de dentro do motor, SEMPRE pela fila): node scripts/vez.mjs node scripts/lab/render-lab.mjs <proj> --props 03_roteiro/<x>.json
//   [--comp PaperVox] [--previa] [--trecho 0 5] [--saida <mp4>] [--concurrency 2] [--gl angle|nenhum] [--sem-loudnorm]
//   --previa → metade da resolução, CRF 26, em 06_previas/ · padrão → resolução cheia, CRF 17, em 07_final/
// Reusa scripts/lib/binarios.mjs (ffmpeg do sistema quando o Windows bloqueia o do pacote) e o loudness dos formatos
// novos do render.mjs: -14 LUFS / -1 dBTP em 2 passadas com ganho linear (não esmaga os transientes dos SFX).
// Imprime o tempo de render e os segundos de render por segundo de vídeo (s/s).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {binariosRemotion} from '../lib/binarios.mjs';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const args = process.argv.slice(2);
const opcao = (nome, padrao = null) => (args.includes(nome) ? args[args.indexOf(nome) + 1] : padrao);
const proj = path.resolve(args[0] ?? '');
const propsRel = opcao('--props');
if (!args[0] || !propsRel) {
	console.error('Uso: node scripts/lab/render-lab.mjs <proj> --props 03_roteiro/<x>.json [--comp PaperVox] [--previa] [--trecho a b] [--saida f] [--concurrency N] [--gl angle|nenhum] [--sem-loudnorm]');
	process.exit(1);
}
const propsPath = path.resolve(proj, propsRel);
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const comp = opcao('--comp', 'PaperVox');
const previa = args.includes('--previa');
const ti = args.indexOf('--trecho');
const trecho = ti === -1 ? null : [Number(args[ti + 1]), Number(args[ti + 2])];
const fps = 24;
const gl = opcao('--gl', 'angle');
const binarios = binariosRemotion(MOTOR);

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const base = path.basename(propsRel, '.json');
const faixa = trecho ? `_${trecho[0]}-${trecho[1]}s` : '';
const saida = opcao('--saida') ? path.resolve(opcao('--saida')) : path.join(proj, previa ? '06_previas' : '07_final', `lab_${base}_${previa ? `previa_${stamp}` : 'final'}${faixa}.mp4`);
fs.mkdirSync(path.dirname(saida), {recursive: true});

const cli = [
	path.join(MOTOR, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', 'src/lab/index.ts', comp, saida,
	`--public-dir=${proj}`, `--props=${propsPath}`, `--concurrency=${opcao('--concurrency', '2')}`,
	'--codec=h264', '--audio-codec=aac', '--log=error', ...binarios,
	...(gl !== 'nenhum' ? [`--gl=${gl}`] : []),
	...(previa ? ['--scale=0.5', '--crf=26'] : ['--crf=17', '--audio-bitrate=320k']),
	...(trecho ? [`--frames=${Math.round(trecho[0] * fps)}-${Math.round(trecho[1] * fps) - 1}`] : []),
];
const dur = trecho ? trecho[1] - trecho[0] : props.duracao;
console.log(`[render-lab] ${comp} · ${previa ? 'prévia' : 'final'} · ${dur.toFixed(1)} s → ${path.relative(RAIZ, saida)}`);
const t0 = Date.now();
let r;
for (let tentativa = 1; tentativa <= 2; tentativa++) {
	r = spawnSync(process.execPath, cli, {cwd: MOTOR, stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
	if (r.stderr) process.stderr.write(r.stderr);
	if (r.status === 0) break;
	const log = path.join(proj, '06_previas', `render_lab_erro_${stamp}_${tentativa}.log`);
	fs.mkdirSync(path.dirname(log), {recursive: true});
	fs.writeFileSync(log, `${cli.join(' ')}\n\n${r.stderr ?? ''}`);
	console.error(`[render-lab] falhou (tentativa ${tentativa}); erro em ${path.relative(RAIZ, log)}${tentativa === 1 ? '. Tentando de novo…' : ''}`);
}
if (r.status !== 0) process.exit(r.status ?? 1);
const tRender = (Date.now() - t0) / 1000;

if (!args.includes('--sem-loudnorm')) {
	const tmp = saida.replace(/\.mp4$/, '.tmp.mp4');
	fs.renameSync(saida, tmp);
	let filtro = 'loudnorm=I=-14:TP=-1:LRA=11';
	const med = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', tmp, '-vn', '-af', `${filtro}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
	try {
		const m = JSON.parse(med.slice(med.lastIndexOf('{'), med.lastIndexOf('}') + 1));
		filtro += `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
	} catch {
		console.warn('[render-lab] medição de loudness falhou; usando passada única');
	}
	const ln = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-c:v', 'copy', '-af', filtro, '-ar', '48000', '-c:a', 'aac', '-b:a', previa ? '192k' : '320k', '-movflags', '+faststart', saida], {stdio: 'inherit'});
	if (ln.status === 0) fs.rmSync(tmp);
	else fs.renameSync(tmp, saida);
}
const mb = fs.statSync(saida).size / 1e6;
console.log(`[render-lab] ok: render ${tRender.toFixed(0)} s (${(tRender / dur).toFixed(1)} s por s de vídeo), total ${((Date.now() - t0) / 1000).toFixed(0)} s, ${mb.toFixed(1)} MB`);
