// Recorte por chroma de stills do Flow gerados em fundo azul (#0000FF) ou verde (#00FF00): PNG com alfa, sem halo.
// O Nano Banana não entrega a cor exata do fundo: a cor-chave é MEDIDA nos 4 cantos da imagem (média), não suposta.
// Uso (de dentro do motor): node scripts/recorte-chroma.mjs <entrada> <saida.png> [--sim 0.2] [--blend 0.08]
//   [--pb] (preto e branco + contraste, para o AcabamentoDark) [--aparar] (corta a borda transparente, margem 2%)
//   [--choke 1|2] (encolhe o alfa em px: tira a franja de objeto fino, como tubo ou fio)
//   [--conferir <previa.png>] (o recorte sobre carvão #1C1A18 e sobre branco, lado a lado, para olhar a 100%)
// Imprime a cor medida, a % de pixels transparentes e o "halo" (pixels semitransparentes ainda puxados para a cor-chave,
// em % do objeto). ALTO (> 3%; > 6% com --pb) = refazer com --sim maior ou, se o objeto tem a cor do fundo, gerar de novo.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const [ent, sai] = args;
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
if (!ent || !sai) {
	console.error('Uso: node scripts/recorte-chroma.mjs <entrada> <saida.png> [--sim 0.2] [--blend 0.08] [--pb] [--aparar] [--conferir <previa.png>]');
	process.exit(1);
}
const SIM = Number(opt('--sim', 0.2)), BLEND = Number(opt('--blend', 0.08));
const ff = (a, enc = 'utf8') => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...a], {encoding: enc, maxBuffer: 512 * 1024 * 1024});
const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', ent], {encoding: 'utf8'}).stdout.trim().split(',').map(Number);
const [W, H] = probe;
if (!W || !H) {
	console.error(`[recorte] não consegui ler ${ent}`);
	process.exit(1);
}

// 1. cor-chave: média de 4 quadrados de 3% nos cantos
const q = Math.max(4, Math.round(Math.min(W, H) * 0.03));
const cantos = [[0, 0], [W - q, 0], [0, H - q], [W - q, H - q]].map(([x, y]) => {
	const r = ff(['-i', ent, '-vf', `crop=${q}:${q}:${x}:${y},scale=1:1:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], 'buffer').stdout;
	return [r[0], r[1], r[2]];
});
const cor = [0, 1, 2].map((c) => Math.round(cantos.reduce((s, k) => s + k[c], 0) / 4));
const hex = `0x${cor.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const azul = cor[2] > cor[1];
const espalho = Math.max(...[0, 1, 2].map((c) => Math.max(...cantos.map((k) => k[c])) - Math.min(...cantos.map((k) => k[c]))));
if (espalho > 40) console.warn(`[recorte] AVISO: os cantos variam ${espalho} níveis (fundo com degradê ou objeto encostando na borda)`);

// 2. chroma + despill (+ P&B) → PNG
// o P&B entra só no fim (passo 4b): o halo é medido antes, enquanto a cor-chave ainda aparece
const cadeia = [`format=rgba`, `chromakey=${hex}:similarity=${SIM}:blend=${BLEND}`, `despill=type=${azul ? 'blue' : 'green'}:mix=0.6:expand=0.1`];
fs.mkdirSync(path.dirname(path.resolve(sai)), {recursive: true});
// --choke N: encolhe o alfa N px (erosão 3×3) para tirar a franja semitransparente de objeto fino (tubo, fio)
const CHOKE = Number(opt('--choke', 0));
const grafo = CHOKE > 0 ? `[0]${cadeia.join(',')},split[c][a];[a]alphaextract,${Array(CHOKE).fill('erosion').join(',')}[m];[c][m]alphamerge` : null;
let r = grafo ? ff(['-y', '-i', ent, '-filter_complex', grafo, '-frames:v', '1', sai]) : ff(['-y', '-i', ent, '-vf', cadeia.join(','), '-frames:v', '1', sai]);
if (r.status !== 0) {
	console.error(r.stderr);
	process.exit(1);
}

// 3. aparar a borda transparente (bbox do alfa)
if (args.includes('--aparar')) {
	const bb = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-i', sai, '-vf', 'alphaextract,bbox=min_val=24', '-f', 'null', '-'], {encoding: 'utf8'}).stderr ?? '';
	const ult = [...bb.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)].pop();
	if (ult) {
		const [x1, x2, y1, y2] = ult.slice(1).map(Number);
		const m = Math.round(Math.max(x2 - x1, y2 - y1) * 0.02);
		const cx = Math.max(0, x1 - m), cy = Math.max(0, y1 - m), cw = Math.min(W - cx, x2 - x1 + 1 + 2 * m), ch = Math.min(H - cy, y2 - y1 + 1 + 2 * m);
		const tmp = sai.replace(/\.png$/i, '.tmp.png');
		ff(['-y', '-i', sai, '-vf', `crop=${cw}:${ch}:${cx}:${cy}`, tmp]);
		fs.renameSync(tmp, sai);
	}
}

// 4. medidas: transparente e halo (semitransparente com cor ainda puxada para a chave)
const [w2, h2] = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', sai], {encoding: 'utf8'}).stdout.trim().split(',').map(Number);
const px = ff(['-i', sai, '-vf', `scale=${Math.min(512, w2)}:-1:flags=area,format=rgba`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], 'buffer').stdout;
let transp = 0, halo = 0;
const n = px.length / 4;
for (let i = 0; i < px.length; i += 4) {
	const [R, G, B, Al] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
	if (Al < 16) transp++;
	else if (Al < 235 && (azul ? B > R + 25 && B > G + 25 : G > R + 25 && G > B + 25)) halo++;
}
const haloRel = halo / Math.max(1, n - transp); // fração do OBJETO, não da imagem (objeto fino tem muita borda)
const teto = args.includes('--pb') ? 0.06 : 0.03; // no P&B a tinta da chave vira cinza: tolera mais
console.log(`[recorte] ${path.basename(ent)} → ${path.basename(sai)} (${w2}×${h2}) · chave ${hex} · ${((100 * transp) / n).toFixed(0)}% transparente · halo ${(100 * haloRel).toFixed(1)}% do objeto${haloRel > teto ? ' ← ALTO' : ''}`);

// 4b. P&B + contraste (para o AcabamentoDark), depois da medida
if (args.includes('--pb')) {
	const tmp = sai.replace(/.png$/i, '.tmp.png');
	ff(['-y', '-i', sai, '-vf', 'format=rgba,hue=s=0,eq=contrast=1.15:brightness=-0.02', '-frames:v', '1', tmp]);
	fs.renameSync(tmp, sai);
}

// 5. prévia de conferência
const conf = opt('--conferir', null);
if (conf) {
	ff(['-y', '-i', sai, '-filter_complex', `[0]split[a][b];color=c=0x1C1A18:s=${w2}x${h2}[c];color=c=white:s=${w2}x${h2}[d];[c][a]overlay[e];[d][b]overlay[f];[e][f]hstack`, '-frames:v', '1', conf]);
}
