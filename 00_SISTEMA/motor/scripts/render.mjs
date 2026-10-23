// Renderiza um projeto a partir de 03_roteiro/edicao.json, no formato do campo "modelo" (src/modelos.json).
// Uso: node scripts/render.mjs <pasta-do-projeto> [--previa] [--trecho 0 15] [--edicao <arquivo>] [--saida <arquivo.mp4>]
//   --previa  → metade da resolução, rápido, salva em 06_previas/
//   (padrão)  → resolução cheia, salva em 07_final/ (com --trecho, ganha sufixo e não sobrescreve o final)
//   --edicao  → outro arquivo de edição (relativo ao projeto), ex.: 03_roteiro/edicao_mix.json
//   --saida   → caminho do mp4 (usado pelo teste de regressão)
//   --partes [N|auto] → render por partes, retomável (scripts/lib/partes.mjs): áudio inteiro numa passada, vídeo em
//               partes nos capítulos (auto; sem capítulos, a cada ~3 min em início de cena) ou em N partes, junção sem
//               recompressão e loudness uma vez só no master (no MIX, 2 passadas lineares). Se cair, rode o MESMO
//               comando de novo: as partes prontas são puladas. --manter-partes guarda as partes depois de juntar;
//               --reaproveitar-partes usa as partes válidas mesmo se o edicao.json ou o motor mudaram (áudio incluso).
//   --concurrency N → páginas do Chrome em paralelo (padrão 2; 1 na máquina ocupada)
//   --loudnorm-linear → loudness em 2 passadas (ganho linear) no render inteiro; com --partes, já é o padrão do MIX
// Sem "modelo" = INSTAGRAM - TELA DIVIDIDA (composição Edicao, congelada: mesmo comando de sempre).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {renderPorPartes} from './lib/partes.mjs';
import {binariosRemotion} from './lib/binarios.mjs';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const previa = args.includes('--previa');
const opcao = (nome) => {
	const i = args.indexOf(nome);
	return i === -1 ? null : args[i + 1];
};
const ti = args.indexOf('--trecho');
const trecho = ti === -1 ? null : [Number(args[ti + 1]), Number(args[ti + 2])];
const pi = args.indexOf('--partes');
const partes = pi === -1 ? null : args[pi + 1] && !args[pi + 1].startsWith('--') ? args[pi + 1] : 'auto';
if (partes && partes !== 'auto' && !(Number.isInteger(Number(partes)) && Number(partes) >= 1)) {
	console.error(`--partes espera "auto" ou um número de partes ≥ 1 (veio "${partes}")`);
	process.exit(1);
}
const concorrencia = opcao('--concurrency') ?? '2';
const binarios = binariosRemotion(MOTOR); // ffmpeg do sistema se o Windows bloquear o do pacote (ver lib/binarios.mjs)

const edPath = path.resolve(proj, opcao('--edicao') ?? path.join('03_roteiro', 'edicao.json'));
if (!fs.existsSync(edPath)) {
	console.error(`Não achei ${edPath}`);
	process.exit(1);
}
const ed = JSON.parse(fs.readFileSync(edPath, 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(MOTOR, 'src', 'modelos.json'), 'utf8'));
const idModelo = ed.modelo ?? reg.padrao;
const mod = reg.modelos[idModelo];
if (!mod) {
	console.error(`Modelo desconhecido: "${idModelo}". Opções: ${Object.keys(reg.modelos).join(', ')}`);
	process.exit(1);
}
const meta = path.join(proj, '02_analise', 'meta.json');
if (fs.existsSync(meta)) {
	const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
	ed.duracao ??= m.duracao_s;
	const deitado = Math.abs(m.rotacao) === 90; // celular gravando com rotação nos metadados
	ed.aspectoBruto ??= deitado ? m.altura / m.largura : m.largura / m.altura;
}

// Garante que a biblioteca de efeitos esteja disponível no projeto.
const sfxLib = path.join(RAIZ, '02_BIBLIOTECA', 'sfx');
const sfxProj = path.join(proj, '05_audio', 'sfx');
fs.mkdirSync(sfxProj, {recursive: true});
// cópia recursiva (pacotes em subpastas, ex.: motionix/whooshes/...); só copia o que falta
fs.cpSync(sfxLib, sfxProj, {recursive: true, force: false, errorOnExist: false});

const propsFile = path.join(proj, '03_roteiro', `.props-render-${process.pid}.json`);
fs.writeFileSync(propsFile, JSON.stringify(ed));

const nome = path.basename(proj);
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const tag = idModelo === reg.padrao ? '' : `_${idModelo.split('-')[0]}`; // _cut, _mix
const faixa = trecho ? `_${trecho[0]}-${trecho[1]}s` : '';
const saida = opcao('--saida')
	? path.resolve(opcao('--saida'))
	: previa
		? path.join(proj, '06_previas', `previa_${stamp}${tag}${faixa}.mp4`)
		: path.join(proj, '07_final', `${nome}_final${trecho ? `_trecho${faixa}` : ''}.mp4`);
fs.mkdirSync(path.dirname(saida), {recursive: true});

const cli = [
	path.join(MOTOR, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', 'src/index.ts', mod.composicao, saida,
	`--public-dir=${proj}`, `--props=${propsFile}`,
	`--concurrency=${concorrencia}`, '--codec=h264', '--audio-codec=aac', '--log=error', ...binarios,
	...((opcao('--gl') ?? mod.gl) && opcao('--gl') !== 'nenhum' ? [`--gl=${opcao('--gl') ?? mod.gl}`] : []), // 3D e efeitos WebGL dos formatos novos
	...(previa ? ['--scale=0.5', '--crf=26'] : ['--crf=17', '--audio-bitrate=320k']),
	...(trecho ? [`--frames=${Math.round(trecho[0] * mod.fps)}-${Math.round(trecho[1] * mod.fps) - 1}`] : []),
];
console.log(`[render] ${mod.nome} · ${previa ? 'prévia' : 'final'}${partes ? ` · por partes (${partes})` : ''} → ${path.relative(RAIZ, saida)}`);
if (partes) {
	const gl = [...((opcao('--gl') ?? mod.gl) && opcao('--gl') !== 'nenhum' ? [`--gl=${opcao('--gl') ?? mod.gl}`] : []), ...binarios];
	renderPorPartes({proj, ed, edPath, idModelo, mod, previa, trecho, propsFile, saida, args, opcao, MOTOR, RAIZ, concorrencia, gl, partes});
	process.exit(0);
}
const t0 = Date.now();
// Falhas passageiras do Chrome/compositor acontecem no Windows: guarda o erro em log e tenta mais uma vez.
let r;
for (let tentativa = 1; tentativa <= 2; tentativa++) {
	r = spawnSync(process.execPath, cli, {cwd: MOTOR, stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
	if (r.stderr) process.stderr.write(r.stderr);
	if (r.status === 0) break;
	const log = path.join(proj, '06_previas', `render_erro_${stamp}_${tentativa}.log`);
	fs.mkdirSync(path.dirname(log), {recursive: true});
	fs.writeFileSync(log, `${cli.join(' ')}\n\n${r.stderr ?? ''}`);
	console.error(`[render] falhou (tentativa ${tentativa}); erro salvo em ${path.relative(RAIZ, log)}${tentativa === 1 ? '. Tentando de novo…' : ''}`);
}
fs.rmSync(propsFile, {force: true});
if (r.status !== 0) process.exit(r.status ?? 1);

// Loudness final: -14 LUFS / -1 dBTP (padrão das redes). Vídeo copiado sem reencode.
// Formatos novos: 2 passadas (mede e aplica ganho linear), sem a compressão dinâmica da passada única, que esmagava
// os transientes curtos dos SFX. O Tela Dividida (congelado) segue com a passada única de sempre.
const tmp = saida.replace(/\.mp4$/, '.tmp.mp4');
fs.renameSync(saida, tmp);
let filtroLn = 'loudnorm=I=-14:TP=-1:LRA=11';
if (args.includes('--loudnorm-linear')) { // opcional (2 passadas); o padrão continua igual ao do v2 aprovado
	const med = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', tmp, '-vn', '-af', `${filtroLn}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
	const j = med && med.slice(med.lastIndexOf('{'), med.lastIndexOf('}') + 1);
	try {
		const m = JSON.parse(j);
		filtroLn += `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
	} catch {
		console.warn('[render] medição de loudness falhou; usando passada única');
	}
}
const ln = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-c:v', 'copy', '-af', filtroLn, '-ar', '48000', '-c:a', 'aac', '-b:a', previa ? '192k' : '320k', '-movflags', '+faststart', saida], {stdio: 'inherit'});
if (ln.status === 0) fs.rmSync(tmp);
else fs.renameSync(tmp, saida); // mantém o render sem normalização se o ffmpeg falhar
console.log(`[render] ok em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
