// Prepara um bruto de câmera (4K, 10 bits, 4:2:2, perfil log, rotação) para o motor: gira, recorta no formato
// do modelo em resolução nativa máxima, converte para 8 bits 4:2:0 com quadro-chave a cada ~1 s e corrige a cor.
// O Chrome do Remotion não decodifica H.264 10 bits 4:2:2; sem este passo o render falha ou fica muito lento.
// Uso: node scripts/preparar.mjs <proj> [--modelo <id>] [--foco x,y] [--cor nenhuma|neutra|viva|cinema] [--comparar]
//   --comparar → só gera 06_previas/comparativo_cor.jpg (original × presets) para o usuário escolher a cor
//   original fica preservado em 01_bruto/original.<ext>; o arquivo de trabalho é 01_bruto/bruto.mp4
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opcao = (n) => (args.indexOf(n) === -1 ? null : args[args.indexOf(n) + 1]);
const dirBruto = path.join(proj, '01_bruto');
if (!fs.existsSync(dirBruto)) {
	console.error('Uso: node scripts/preparar.mjs <proj> [--modelo <id>] [--foco x,y] [--cor neutra] [--comparar]');
	process.exit(1);
}

// Correção de cor (aplicada depois do recorte, em RGB de 16 bits). "neutra" é o ponto de partida seguro.
const COR = {
	nenhuma: '',
	neutra: 'normalize=blackpt=black:whitept=white:smoothing=48:strength=0.6,curves=preset=medium_contrast',
	viva: 'normalize=blackpt=black:whitept=white:smoothing=48:strength=0.75,curves=preset=increase_contrast,colorbalance=rm=0.02:bm=-0.02',
	cinema: 'normalize=blackpt=black:whitept=white:smoothing=48:strength=0.55,curves=master=0/0.03 0.25/0.2 0.5/0.5 0.75/0.8 1/0.97,colorbalance=rs=-0.05:bs=0.06:rh=0.06:bh=-0.05',
};
const SATURACAO = {nenhuma: 1, neutra: 1.15, viva: 1.3, cinema: 1.05};

let original = fs.readdirSync(dirBruto).find((f) => /^original\./i.test(f));
if (!original) {
	const b = fs.readdirSync(dirBruto).find((f) => /^bruto\./i.test(f));
	if (!b) {
		console.error('Não achei 01_bruto/bruto.* nem original.*');
		process.exit(1);
	}
	original = `original${path.extname(b).toLowerCase()}`;
	fs.renameSync(path.join(dirBruto, b), path.join(dirBruto, original));
}
const src = path.join(dirBruto, original);

const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:stream_side_data=rotation', '-of', 'json', src], {encoding: 'utf8'}).stdout).streams[0];
const rot = Math.abs(Number(probe.side_data_list?.find((s) => s.rotation != null)?.rotation ?? 0));
const [dw, dh] = rot === 90 ? [probe.height, probe.width] : [probe.width, probe.height];

const edPath = path.join(proj, '03_roteiro', 'edicao.json');
const idModelo = opcao('--modelo') ?? (fs.existsSync(edPath) ? JSON.parse(fs.readFileSync(edPath, 'utf8')).modelo : null);
const reg = JSON.parse(fs.readFileSync(path.join(MOTOR, 'src', 'modelos.json'), 'utf8'));
const mod = reg.modelos[idModelo ?? ''];
if (!mod) {
	console.error(`Diga o formato: --modelo ${Object.keys(reg.modelos).join(' | ')}`);
	process.exit(1);
}
const alvo = mod.largura / mod.altura;
const [fx, fy] = (opcao('--foco') ?? '0.5,0.42').split(',').map(Number);
const par = (n) => Math.floor(n / 2) * 2;
const cw = dw / dh > alvo ? par(dh * alvo) : dw;
const ch = dw / dh > alvo ? dh : par(dw / alvo);
const cx = par(Math.min(dw - cw, Math.max(0, fx * dw - cw / 2)));
const cy = par(Math.min(dh - ch, Math.max(0, fy * dh - ch / 2)));
const recorte = `crop=${cw}:${ch}:${cx}:${cy}`;
// 23,976 → 24 (ou 29,97 → 30): ajusta o vídeo ao fps do formato e o áudio na mesma proporção (0,1%, inaudível),
// para cada quadro do bruto casar com um quadro do render (recortes e cortes exatos, sem quadro repetido).
const [num, den] = probe.r_frame_rate.split('/').map(Number);
const fpsFonte = num / (den || 1);
const conformar = fpsFonte !== mod.fps && Math.abs(fpsFonte - mod.fps) / mod.fps < 0.002;
const cadeia = (cor) => [recorte, 'format=gbrp16le', COR[cor], 'format=yuv444p16le', SATURACAO[cor] !== 1 ? `hue=s=${SATURACAO[cor]}` : '', 'format=yuv420p', conformar ? `setpts=N/(${mod.fps}*TB)` : ''].filter(Boolean).join(',');
console.log(`[preparar] ${original}: ${dw}×${dh}${rot ? ` (girado ${rot}°)` : ''} → ${mod.nome}: recorte ${cw}×${ch} em (${cx}, ${cy})`);

if (args.includes('--comparar')) {
	const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], {encoding: 'utf8'}).stdout);
	const saida = path.join(proj, '06_previas', 'comparativo_cor.jpg');
	fs.mkdirSync(path.dirname(saida), {recursive: true});
	const nomes = Object.keys(COR);
	const tempos = [0.25, 0.6].map((p) => (dur * p).toFixed(2));
	const alturaTile = alvo > 1 ? 405 : 640;
	const entradas = tempos.flatMap((t) => ['-ss', t, '-i', src]);
	const grafos = tempos.flatMap((_, i) => nomes.map((n) => `[${i}:v]${cadeia(n)},scale=-2:${alturaTile},drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${n}':x=20:y=20:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.5[t${i}${n}]`));
	const linhas = tempos.map((_, i) => `${nomes.map((n) => `[t${i}${n}]`).join('')}hstack=inputs=${nomes.length}[l${i}]`);
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...entradas, '-filter_complex', [...grafos, ...linhas, `${tempos.map((_, i) => `[l${i}]`).join('')}vstack=inputs=${tempos.length}`].join(';'), '-frames:v', '1', '-q:v', '3', saida], {stdio: 'inherit'});
	if (r.status !== 0) process.exit(r.status ?? 1);
	console.log(`[preparar] comparativo de cor → ${path.relative(proj, saida)} (${nomes.join(' | ')})`);
	process.exit(0);
}

const cor = opcao('--cor') ?? 'neutra';
if (!(cor in COR)) {
	console.error(`--cor ${Object.keys(COR).join(' | ')}`);
	process.exit(1);
}
const saida = path.join(dirBruto, 'bruto.mp4');
const t0 = Date.now();
const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-stats', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0?', '-vf', cadeia(cor), ...(conformar ? ['-r', String(mod.fps), '-af', `atempo=${(mod.fps / fpsFonte).toFixed(6)}`] : []), '-c:v', 'libx264', '-preset', 'faster', '-crf', '15', '-g', String(mod.fps), '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', saida], {stdio: 'inherit'});
if (r.status !== 0) process.exit(r.status ?? 1);
fs.writeFileSync(path.join(dirBruto, 'preparo.json'), JSON.stringify({original, girado: rot, recorte: {cw, ch, cx, cy}, foco: [fx, fy], cor, modelo: idModelo, fpsFonte, fps: conformar ? mod.fps : fpsFonte}, null, 1));
console.log(`[preparar] ok em ${((Date.now() - t0) / 1000).toFixed(0)} s → 01_bruto/bruto.mp4 (cor: ${cor}${conformar ? `, ${fpsFonte.toFixed(3)} → ${mod.fps} fps` : ''}). Rode o assistir.mjs nele.`);
