// Confere quadros soltos de um projeto (formatos do motor de camadas) sem renderizar o vídeo: empacota uma vez e tira
// stills nos instantes pedidos (s da SAÍDA), em resolução cheia, + uma folha com todos lado a lado.
// Uso (de dentro do motor): node scripts/quadros.mjs <pasta-do-projeto> <t1> <t2> ... [--edicao <arquivo>] [--escala 0.5]
//   → 06_previas/quadros_<hora>/q_<t>.png e folha.jpg
// Serve para conferir peça, rodapé, enquadramento e desfoque antes de gastar 1 h num render final.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {binariosRemotion} from './lib/binarios.mjs';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome) => {
	const i = args.indexOf(nome);
	return i === -1 ? null : args[i + 1];
};
const proj = path.resolve(args[0] ?? '');
const tempos = args.slice(1).filter((a, i, l) => !a.startsWith('--') && !(l[i - 1] ?? '').startsWith('--')).map(Number).filter(Number.isFinite);
if (!fs.existsSync(proj) || !tempos.length) {
	console.error('uso: node scripts/quadros.mjs <pasta-do-projeto> <t1> <t2> ... [--edicao <arquivo>] [--escala 0.5]');
	process.exit(1);
}
const ed = JSON.parse(fs.readFileSync(path.resolve(proj, opcao('--edicao') ?? path.join('03_roteiro', 'edicao.json')), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(MOTOR, 'src', 'modelos.json'), 'utf8'));
const mod = reg.modelos[ed.modelo ?? reg.padrao];
const meta = path.join(proj, '02_analise', 'meta.json');
if (fs.existsSync(meta)) {
	const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
	ed.duracao ??= m.duracao_s;
	ed.aspectoBruto ??= Math.abs(m.rotacao) === 90 ? m.altura / m.largura : m.largura / m.altura;
}
const CLI = path.join(MOTOR, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const pasta = path.join(proj, '06_previas', `quadros_${stamp}`);
fs.mkdirSync(pasta, {recursive: true});
const props = path.join(os.tmpdir(), `quadros-props-${process.pid}.json`);
fs.writeFileSync(props, JSON.stringify(ed));
const pacote = path.join(os.tmpdir(), `remotion-quadros-${process.pid}`);
const gl = mod.gl ? [`--gl=${mod.gl}`] : [];
const binarios = binariosRemotion(MOTOR);

console.log(`[quadros] empacotando (a pasta do projeto é copiada)…`);
let t0 = Date.now();
const b = spawnSync(process.execPath, [CLI, 'bundle', 'src/index.ts', `--public-dir=${proj}`, `--out-dir=${pacote}`, '--log=error'], {cwd: MOTOR, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8'});
if (b.status !== 0) {
	console.error(b.stderr);
	process.exit(1);
}
console.log(`[quadros] pacote em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const feitos = [];
for (const t of tempos) {
	t0 = Date.now();
	const q = Math.round(t * mod.fps);
	const png = path.join(pasta, `q_${t.toFixed(2).replace('.', '_')}.png`);
	const r = spawnSync(process.execPath, [CLI, 'still', pacote, mod.composicao, png, `--props=${props}`, `--frame=${q}`, `--scale=${opcao('--escala') ?? '1'}`, '--log=error', ...gl, ...binarios], {cwd: MOTOR, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8'});
	if (r.status === 0) feitos.push(png);
	console.log(`[quadros] ${t.toFixed(2)} s (q ${q}) ${r.status === 0 ? 'ok' : `falhou\n${(r.stderr ?? '').slice(-800)}`} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
fs.rmSync(pacote, {recursive: true, force: true});
fs.rmSync(props, {force: true});
if (feitos.length) {
	// folha: 2 colunas, cada quadro a 960 px de largura (caminhos relativos: o FFmpeg não aceita "C:" dentro do filtro)
	const cols = Math.min(2, feitos.length);
	const linhas = Math.ceil(feitos.length / cols);
	const entradas = feitos.flatMap((f) => ['-i', path.basename(f)]);
	// rótulo com o tempo: o drawtext do FFmpeg do Windows precisa do arquivo da fonte (sem fontconfig), por caminho relativo
	const arial = path.join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts', 'arial.ttf');
	const rotulo = (i) => (fs.existsSync(arial) ? `,drawtext=fontfile='${path.relative(pasta, arial).split(path.sep).join('/')}':text='${path.basename(feitos[i], '.png').slice(2).replace('_', ',')} s':x=12:y=12:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6` : '');
	const escala = feitos.map((_, i) => `[${i}:v]scale=960:-2${rotulo(i)}[v${i}]`).join(';');
	const vazio = Array.from({length: cols * linhas - feitos.length}, (_, k) => `color=black:s=960x540:d=1[e${k}]`).join(';');
	const todos = [...feitos.map((_, i) => `[v${i}]`), ...Array.from({length: cols * linhas - feitos.length}, (_, k) => `[e${k}]`)].join('');
	const filtro = `${escala}${vazio ? `;${vazio}` : ''};${todos}xstack=inputs=${cols * linhas}:layout=${Array.from({length: cols * linhas}, (_, i) => `${(i % cols) * 960}_${Math.floor(i / cols) * 540}`).join('|')}[s]`;
	const f = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-map', '[s]', '-frames:v', '1', 'folha.jpg'], {cwd: pasta, encoding: 'utf8'});
	console.log(f.status === 0 ? `[quadros] folha: ${path.join(pasta, 'folha.jpg')}` : `[quadros] folha falhou: ${f.stderr}`);
}
