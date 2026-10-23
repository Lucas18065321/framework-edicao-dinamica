// Recorta a pessoa (sem fundo) num trecho do BRUTO, para texto e objetos passarem atrás dela (formatos novos).
// Uso: node scripts/recortar.mjs <proj> <brutoIni> <brutoFim> [nome]
// → <proj>/04_broll/recortes/<nome>.webm (VP9 com alfa) + a linha pronta para "recortes" no edicao.json.
// IA local (u2net_human_seg via hyperframes, nada sai do PC). ≈ 0,6 s por quadro na CPU: recorte só o necessário.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const [projArg, a, b, nomeArg] = process.argv.slice(2);
if (!projArg || a == null || b == null) {
	console.error('Uso: node scripts/recortar.mjs <proj> <brutoIni> <brutoFim> [nome]');
	process.exit(1);
}
const proj = path.resolve(projArg);
const meta = JSON.parse(fs.readFileSync(path.join(proj, '02_analise', 'meta.json'), 'utf8'));

// Início e fim no grid comum (quadros do bruto × quadros da composição, 30 fps): assim o recorte casa
// quadro a quadro com o vídeo da pessoa no render (ex.: bruto 24 fps → passos de 1/6 s).
const edPath = path.join(proj, '03_roteiro', 'edicao.json');
const reg = JSON.parse(fs.readFileSync(new URL('../src/modelos.json', import.meta.url), 'utf8'));
const FPS = reg.modelos[(fs.existsSync(edPath) && JSON.parse(fs.readFileSync(edPath, 'utf8')).modelo) || reg.padrao].fps;
const fb = Math.round(meta.fps);
const mdc = (x, y) => (y ? mdc(y, x % y) : x);
const passo = fb / mdc(fb, FPS) / meta.fps;
const snap = (t) => Math.round(Number(t) / passo) * passo;
const ini = snap(a);
const fim = Math.min(snap(b), meta.duracao_s);
const nome = nomeArg ?? `recorte_${ini.toFixed(2).replace('.', '_')}`;
const pasta = path.join(proj, '04_broll', 'recortes');
fs.mkdirSync(pasta, {recursive: true});
const fonte = path.join(pasta, `_${nome}_fonte.mp4`);
const saida = path.join(pasta, `${nome}.webm`);

const t0 = Date.now();
const cut = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', ini.toFixed(4), '-t', (fim - ini).toFixed(4), '-i', meta.arquivo, '-an', '-c:v', 'libx264', '-crf', '10', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', fonte], {stdio: 'inherit'});
if (cut.status !== 0) process.exit(cut.status ?? 1);
const alfa = path.join(pasta, `_${nome}_alfa.webm`);
const rb = spawnSync(`npx -y hyperframes remove-background "${fonte}" -o "${alfa}" --device cpu`, {stdio: 'inherit', shell: true});
fs.rmSync(fonte, {force: true});
if (rb.status !== 0) process.exit(rb.status ?? 1);
// Vira sequência de imagens WebP com alfa (q0001.webp...), lida pelo navegador no render. O webm transparente via
// compositor (OffthreadVideo) falhava às vezes com "No frame found at position", mesmo regravado só com quadros-chave.
const pastaSeq = path.join(pasta, nome);
fs.rmSync(pastaSeq, {recursive: true, force: true});
fs.mkdirSync(pastaSeq, {recursive: true});
const ri = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', alfa, '-c:v', 'libwebp', '-lossless', '0', '-quality', '88', '-compression_level', '2', path.join(pastaSeq, 'q%04d.webp')], {stdio: 'inherit'});
fs.rmSync(alfa, {force: true});
if (ri.status !== 0) process.exit(ri.status ?? 1);
const rel = `${path.relative(proj, pastaSeq).replace(/\\/g, '/')}/`;
console.log(`[recortar] ok em ${((Date.now() - t0) / 1000).toFixed(0)} s → ${rel} (${fs.readdirSync(pastaSeq).length} quadros)`);
console.log(JSON.stringify({arquivo: rel, brutoIni: +ini.toFixed(4), brutoFim: +fim.toFixed(4), fps: meta.fps}));
