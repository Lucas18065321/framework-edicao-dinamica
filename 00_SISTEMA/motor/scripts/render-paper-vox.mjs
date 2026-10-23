// Render do INSTAGRAM - PAPER VOX ANIMATION (modelo fixo paper-vox-instagram). Separado do render.mjs de propósito: os
// 3 modelos fixos continuam sem nenhuma mudança, e este tem áudio próprio (a composição toca só a voz e os SFX; a trilha,
// e os SFX quando sfxNaMixagem, entram depois pelo mixar-audio.mjs, com loudnorm de 2 passadas lineares no fim).
// Uso (de dentro do motor, SEMPRE pela fila):
//   node scripts/vez.mjs node scripts/render-paper-vox.mjs <proj> [--previa] [--trecho a b] [--trilhas A,B | --sem-trilha]
//     [--props 03_roteiro/quadro.json] [--saida f.mp4] [--manter-base] [--concurrency 2] [--gl angle|nenhum]
//   --previa → metade da resolução, CRF 26, em 06_previas/previa_<data>_paper[_trecho]_trilha-<X>.mp4; padrão: todas as
//              trilhas de props.musicas (para comparar). Final → 1080×1920, CRF 17, AAC 320k, em 07_final/<proj>_final.mp4,
//              com a trilha escolhida (props.musica).
//   --manter-base → guarda o vídeo sem trilha (<saída>.base.mp4) para remisturar com scripts/mixar-audio.mjs.
// Tempo medido no piloto (144 s): prévia 601 s (4,2 s/s); final 1.786 s (12,4 s/s). Avise o usuário antes de rodar.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {binariosRemotion} from './lib/binarios.mjs';
import MODELOS from '../src/modelos.json' with {type: 'json'};

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const ID = 'paper-vox-instagram';
const args = process.argv.slice(2);
const opcao = (nome, padrao = null) => (args.includes(nome) ? args[args.indexOf(nome) + 1] : padrao);
const proj = path.resolve(args[0] ?? '');
if (!args[0] || !fs.existsSync(proj)) {
	console.error('Uso: node scripts/vez.mjs node scripts/render-paper-vox.mjs <proj> [--previa] [--trecho a b] [--trilhas A,B | --sem-trilha] [--props 03_roteiro/quadro.json] [--saida f] [--manter-base]');
	process.exit(1);
}
const propsPath = path.resolve(proj, opcao('--props', '03_roteiro/quadro.json'));
if (!fs.existsSync(propsPath)) {
	console.error(`[paper-vox] não achei ${path.relative(RAIZ, propsPath)}: rode antes o gerador (node 03_roteiro/montar_quadro.mjs)`);
	process.exit(1);
}
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
if (props.modelo && props.modelo !== ID) {
	console.error(`[paper-vox] o props é do modelo "${props.modelo}", não do ${ID}`);
	process.exit(1);
}
const mod = MODELOS.modelos[ID];
const previa = args.includes('--previa');
const ti = args.indexOf('--trecho');
const trecho = ti === -1 ? null : [Number(args[ti + 1]), Number(args[ti + 2])];
const gl = opcao('--gl', mod.gl ?? 'angle');
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const faixa = trecho ? `_${trecho[0]}-${trecho[1]}s` : '';
const saidaFinal = opcao('--saida') ? path.resolve(opcao('--saida')) : path.join(proj, previa ? '06_previas' : '07_final', previa ? `previa_${stamp}_paper${faixa}.mp4` : `${path.basename(proj)}_final${faixa}.mp4`);
fs.mkdirSync(path.dirname(saidaFinal), {recursive: true});
const base = saidaFinal.replace(/\.mp4$/, '.base.mp4');

// trilhas: --sem-trilha | --trilhas A,B | prévia = todas as opções | final = a escolhida
const opcoes = Object.keys(props.musicas ?? {});
const semTrilha = args.includes('--sem-trilha');
const trilhas = semTrilha ? [] : opcao('--trilhas') ? opcao('--trilhas').split(',') : previa && opcoes.length > 1 ? opcoes : props.musica || props.sfxNaMixagem ? [null] : [];
for (const t of trilhas) if (t && !props.musicas?.[t]) {
	console.error(`[paper-vox] trilha ${t} não está em props.musicas (${opcoes.join(', ') || 'nenhuma'})`);
	process.exit(1);
}

// 1. render da composição (voz [+ SFX]) sem loudnorm
const cli = [
	path.join(MOTOR, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', 'src/index.ts', mod.composicao, base,
	`--public-dir=${proj}`, `--props=${propsPath}`, `--concurrency=${opcao('--concurrency', '2')}`,
	'--codec=h264', '--audio-codec=aac', '--log=error', ...binariosRemotion(MOTOR),
	...(gl !== 'nenhum' ? [`--gl=${gl}`] : []),
	...(previa ? ['--scale=0.5', '--crf=26'] : ['--crf=17', '--audio-bitrate=320k']),
	...(trecho ? [`--frames=${Math.round(trecho[0] * mod.fps)}-${Math.round(trecho[1] * mod.fps) - 1}`] : []),
];
const dur = trecho ? trecho[1] - trecho[0] : props.duracao;
console.log(`[paper-vox] ${mod.nome} · ${previa ? 'prévia' : 'final'} · ${dur.toFixed(1)} s → ${path.relative(RAIZ, saidaFinal)}${trilhas.filter(Boolean).length > 1 ? ` (+ ${trilhas.length} trilhas)` : ''}`);
const t0 = Date.now();
let r;
for (let tentativa = 1; tentativa <= 2; tentativa++) {
	r = spawnSync(process.execPath, cli, {cwd: MOTOR, stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
	if (r.stderr) process.stderr.write(r.stderr);
	if (r.status === 0) break;
	const log = path.join(proj, '06_previas', `render_erro_${stamp}_${tentativa}.log`);
	fs.mkdirSync(path.dirname(log), {recursive: true});
	fs.writeFileSync(log, `${cli.join(' ')}\n\n${r.stderr ?? ''}`);
	console.error(`[paper-vox] falhou (tentativa ${tentativa}); erro em ${path.relative(RAIZ, log)}${tentativa === 1 ? '. Tentando de novo…' : ''}`);
}
if (r.status !== 0) process.exit(r.status ?? 1);
const tRender = (Date.now() - t0) / 1000;

// 2. áudio: trilha(s) e SFX na amostra exata (mixar-audio) ou, sem nada a misturar, só o loudnorm de 2 passadas
const saidas = [];
const mixar = (trilha, saida) => {
	const a = [path.join(MOTOR, 'scripts', 'mixar-audio.mjs'), proj, '--video', base, '--props', propsPath, '--saida', saida, ...(semTrilha || (!trilha && !props.musica) ? ['--trilha', 'nenhuma'] : trilha ? ['--trilha', trilha] : []), ...(trecho ? ['--desde', String(trecho[0])] : []), ...(previa ? [] : ['--final'])];
	const m = spawnSync(process.execPath, a, {cwd: MOTOR, stdio: 'inherit'});
	if (m.status !== 0) process.exit(m.status ?? 1);
	saidas.push(saida);
};
if (trilhas.length === 0) mixar(null, saidaFinal);
else for (const t of trilhas) mixar(t, trilhas.length > 1 ? saidaFinal.replace(/\.mp4$/, `_trilha-${t}.mp4`) : saidaFinal);
if (!args.includes('--manter-base')) fs.rmSync(base, {force: true});
const mb = saidas.map((s) => (fs.statSync(s).size / 1e6).toFixed(1)).join(' + ');
console.log(`[paper-vox] ok: render ${tRender.toFixed(0)} s (${(tRender / dur).toFixed(1)} s por s de vídeo), total ${((Date.now() - t0) / 1000).toFixed(0)} s, ${mb} MB${args.includes('--manter-base') ? ` · base: ${path.relative(RAIZ, base)}` : ''}`);
