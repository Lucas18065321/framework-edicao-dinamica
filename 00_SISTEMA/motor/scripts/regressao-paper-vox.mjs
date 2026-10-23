// Prova que o INSTAGRAM - PAPER VOX ANIMATION aprovado continua igual: renderiza trechos fixos do vídeo piloto (o
// projeto de "paper-vox-instagram" em 00_SISTEMA/regressao/pilotos.json) e compara quadro a quadro com a referência em
// 00_SISTEMA/regressao/paper-vox_base[_k].mp4. Script próprio: o render e o áudio do Paper Vox não passam pelo render.mjs
// dos outros 3. Trechos sugeridos: a abertura (foto que voa, papéis, texto com slam), uma montagem (mergulho, planos de
// 0,2 s, emergência) e um chicote com motion blur; ajuste os "trechos" do pilotos.json para o seu piloto.
// Compara só o vídeo: md5 de cada quadro (IDÊNTICO) e, se mudar, PSNR na miniatura 135×240 (EQUIVALENTE ≥ 40 dB).
// Calibração (medida no piloto do formato): dois renders do MESMO código nunca saem com md5 igual (composição da GPU e
// da trama do halftone); esse ruído dá PSNR mín. ≥ 42 dB (medido 42,2–47,8) depois que as texturas passaram a segurar o
// quadro até decodificar (antes, 41). Mudança real pequena: palavra 30×15 px trocada de cor = 38,6 dB; deslocar 2 px = 25 dB.
// Limiar: 40 dB (campo "limiar" do pilotos.json).
// Uso (de dentro do motor, pela fila): node scripts/vez.mjs node scripts/regressao-paper-vox.mjs [--gravar [--projeto <pasta>]]
//   --gravar → grava a referência nova (só se a mudança for aprovada pelo usuário); com --projeto, o piloto fica salvo.
// Sem piloto (projeto null no pilotos.json): avisa SEM PILOTO, explica como gravar e sai com código 0.
// Rode junto com as 3 do regressao.mjs depois de qualquer mudança em src/modelos/paper-vox/, src/kit/, Root.tsx,
// scripts/render-paper-vox.mjs, scripts/lib/mural.mjs ou pacotes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {MOTOR, RAIZ, arquivoBase, lerPiloto} from './lib/pilotos.mjs';

const CFG = lerPiloto('paper-vox-instagram', path.join('03_roteiro', 'quadro.json'), 'regressao-paper-vox.mjs');
if (!CFG) process.exit(0);
CFG.escala ??= '135:240';
const PROJ = CFG.proj;
const gravar = CFG.gravar;
const LIMIAR = CFG.limiar ?? 40;

const quadros = (f) =>
	spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-map', '0:v', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024})
		.stdout.split('\n')
		.filter((l) => l && !l.startsWith('#'))
		.map((l) => l.split(',').pop().trim());

let falhou = false;
CFG.trechos.forEach((trecho, k) => {
	const BASE = arquivoBase(CFG.base, k);
	const rotulo = ` (trecho ${trecho[0]}–${trecho[1]} s)`;
	const saida = gravar ? BASE : path.join(os.tmpdir(), `regressao_pv_${process.pid}_${k}.mp4`);
	if (gravar) fs.mkdirSync(path.dirname(BASE), {recursive: true});
	const r = spawnSync(process.execPath, ['scripts/render-paper-vox.mjs', PROJ, '--previa', '--trecho', ...trecho, '--sem-trilha', '--saida', saida], {cwd: MOTOR, stdio: ['inherit', 'ignore', 'inherit']});
	if (r.status !== 0) process.exit(r.status ?? 1);
	if (gravar) {
		console.log(`[regressão] referência gravada: ${path.relative(RAIZ, BASE)}`);
		return;
	}
	if (!fs.existsSync(BASE)) {
		console.log(`[regressão] sem referência ${path.relative(RAIZ, BASE)}: grave com --gravar (com ok do usuário)`);
		falhou = true;
		return;
	}
	const a = quadros(BASE);
	const b = quadros(saida);
	const dif = a.filter((h, i) => h !== b[i]).length + Math.abs(a.length - b.length);
	if (dif === 0) {
		console.log(`[regressão] IDÊNTICO${rotulo}: ${a.length} quadros iguais à referência. ${CFG.nome} não mudou.`);
		fs.rmSync(saida, {force: true});
		return;
	}
	const stats = path.join(os.tmpdir(), `psnr_pv_${process.pid}_${k}.txt`);
	spawnSync('ffmpeg', ['-v', 'error', '-i', saida, '-i', BASE, '-lavfi', `[0:v]scale=${CFG.escala}:flags=area[a];[1:v]scale=${CFG.escala}:flags=area[b];[a][b]psnr=stats_file=${path.basename(stats)}`, '-f', 'null', '-'], {cwd: os.tmpdir()});
	const v = fs.readFileSync(stats, 'utf8').trim().split('\n').map((l) => l.match(/psnr_avg:(\S+)/)?.[1]).map((x) => (x === 'inf' ? 99 : Number(x)));
	fs.rmSync(stats, {force: true});
	const min = Math.min(...v);
	if (min >= LIMIAR && a.length === b.length) {
		console.log(`[regressão] EQUIVALENTE${rotulo}: ${a.length} quadros, ${a.length - dif} idênticos e o resto só com ruído (PSNR mín. ${min.toFixed(1)} dB ≥ ${LIMIAR} a ${CFG.escala.replace(':', '×')}). ${CFG.nome} não mudou.`);
		fs.rmSync(saida, {force: true});
	} else {
		console.log(`[regressão] ATENÇÃO${rotulo}: mudança visual (PSNR mín. ${min.toFixed(1)} dB no quadro ${v.indexOf(min) + 1}; ${a.length} × ${b.length} quadros). Render novo: ${saida}`);
		falhou = true;
	}
});
if (falhou) process.exit(1);
CFG.salvar();
