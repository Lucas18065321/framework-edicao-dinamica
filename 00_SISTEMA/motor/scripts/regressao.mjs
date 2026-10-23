// Prova que os formatos aprovados continuam iguais: renderiza trechos fixos de um vídeo aprovado (o piloto) e compara
// quadro a quadro com a referência gravada em 00_SISTEMA/regressao/<base>[_k].mp4.
// Os pilotos ficam em 00_SISTEMA/regressao/pilotos.json (um por modelo: projeto, base, trechos, escala, limiar).
// Uso (de dentro do motor): node scripts/regressao.mjs   → INSTAGRAM - TELA DIVIDIDA (congelado): md5 de cada quadro
//      --cut                                 → INSTAGRAM - EDIÇÃO CUT DINÂMICO (md5; se mudar, PSNR na miniatura ≥ 42 dB)
//      --mix                                 → YOUTUBE - MIX EDIT (idem, miniatura 16:9)
//      --modelo <id>                         → outro modelo que renderiza pelo render.mjs (ex.: um formato novo)
//      --gravar [--projeto <pasta>]          → grava uma referência nova (só se a mudança for aprovada pelo usuário);
//                                              com --projeto, o piloto do modelo fica salvo no pilotos.json
// Modelo sem piloto (projeto null no pilotos.json): avisa SEM PILOTO, explica como gravar e sai com código 0.
// Rode as três depois de qualquer mudança no motor (render.mjs, Root.tsx, MotorCamadas, peças, pacotes, fontes...).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {MOTOR, RAIZ, arquivoBase, lerPiloto} from './lib/pilotos.mjs';

const args = process.argv.slice(2);
const ID = args.includes('--modelo') ? args[args.indexOf('--modelo') + 1] : args.includes('--mix') ? 'mix-edit-youtube' : args.includes('--cut') ? 'cut-dinamico-instagram' : 'tela-dividida-instagram';
if (ID === 'paper-vox-instagram') {
	console.error('[regressão] o PAPER VOX ANIMATION tem regressão própria: node scripts/vez.mjs node scripts/regressao-paper-vox.mjs');
	process.exit(1);
}
const flag = args.includes('--modelo') ? `--modelo ${ID}` : ID === 'mix-edit-youtube' ? '--mix' : ID === 'cut-dinamico-instagram' ? '--cut' : '';
// escala: o motor de camadas decodifica o vídeo da pessoa no navegador (GPU), então dois renders do MESMO código já
// diferem por ruído; a comparação é por PSNR em miniatura (escala), não por md5. escala null = só md5 (TELA DIVIDIDA).
const CFG = lerPiloto(ID, path.join('03_roteiro', 'edicao.json'), `regressao.mjs${flag ? ` ${flag}` : ''}`);
if (!CFG) process.exit(0);
const PROJ = CFG.proj;
const gravar = CFG.gravar;
const LIMIAR = CFG.limiar ?? 42;

const quadros = (f) =>
	spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-map', '0:v', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024})
		.stdout.split('\n')
		.filter((l) => l && !l.startsWith('#'))
		.map((l) => l.split(',').pop().trim());

let falhou = false;
CFG.trechos.forEach((trecho, k) => {
	const BASE = arquivoBase(CFG.base, k);
	const rotulo = CFG.trechos.length > 1 ? ` (trecho ${trecho[0]}–${trecho[1]} s)` : '';
	if (!gravar && !fs.existsSync(BASE)) {
		console.log(`[regressão] sem referência ${path.relative(RAIZ, BASE)}${rotulo}: grave com --gravar (com ok do usuário)`);
		falhou = true;
		return;
	}
	const saida = gravar ? BASE : path.join(os.tmpdir(), `regressao_${process.pid}_${k}.mp4`);
	if (gravar) fs.mkdirSync(path.dirname(BASE), {recursive: true});
	const r = spawnSync(process.execPath, ['scripts/render.mjs', PROJ, '--previa', '--trecho', ...trecho, '--saida', saida], {cwd: MOTOR, stdio: 'inherit'});
	if (r.status !== 0) process.exit(r.status ?? 1);
	if (gravar) {
		console.log(`[regressão] referência gravada: ${path.relative(RAIZ, BASE)}`);
		return;
	}
	const a = quadros(BASE);
	const b = quadros(saida);
	const dif = a.filter((h, i) => h !== b[i]).length + Math.abs(a.length - b.length);
	if (dif === 0) {
		console.log(`[regressão] IDÊNTICO${rotulo}: ${a.length} quadros iguais à referência. ${CFG.nome} não mudou.`);
		fs.rmSync(saida, {force: true});
	} else if (CFG.escala) {
		// CUT: em resolução cheia o ruído dá PSNR mín. 38–41 dB; a 135×240 (área) ele some (≥ 45 dB) e o que é estrutural
		// fica: medido: contraste +1% → 42,5 dB; deslocamento de 4 px → 26 dB; card/texto/cor diferente → bem menos.
		// Limiar: 42 dB (campo "limiar" do pilotos.json). O MIX usa a mesma conta na miniatura 16:9 (240×135).
		const stats = path.join(os.tmpdir(), `psnr_${process.pid}_${k}.txt`);
		spawnSync('ffmpeg', ['-v', 'error', '-i', saida, '-i', BASE, '-lavfi', `[0:v]scale=${CFG.escala}:flags=area[a];[1:v]scale=${CFG.escala}:flags=area[b];[a][b]psnr=stats_file=${path.basename(stats)}`, '-f', 'null', '-'], {cwd: os.tmpdir()});
		const v = fs.readFileSync(stats, 'utf8').trim().split('\n').map((l) => l.match(/psnr_avg:(\S+)/)?.[1]).map((x) => (x === 'inf' ? 99 : Number(x)));
		fs.rmSync(stats, {force: true});
		const min = Math.min(...v);
		const pior = v.indexOf(min) + 1;
		if (min >= LIMIAR && a.length === b.length) {
			console.log(`[regressão] EQUIVALENTE${rotulo}: ${a.length} quadros, ${a.length - dif} idênticos e o resto só com ruído de decodificação (PSNR mín. ${min.toFixed(1)} dB ≥ ${LIMIAR} a ${CFG.escala.replace(':', '×')}). ${CFG.nome} não mudou.`);
			fs.rmSync(saida, {force: true});
		} else {
			console.log(`[regressão] ATENÇÃO${rotulo}: mudança visual (PSNR mín. ${min.toFixed(1)} dB no quadro ${pior}). Render novo: ${saida}`);
			falhou = true;
		}
	} else {
		const psnr = spawnSync('ffmpeg', ['-v', 'info', '-i', saida, '-i', BASE, '-lavfi', 'psnr', '-f', 'null', '-'], {encoding: 'utf8'}).stderr.match(/average:(\S+)/)?.[1];
		console.log(`[regressão] ATENÇÃO${rotulo}: ${dif} de ${a.length} quadros diferentes (PSNR médio ${psnr} dB). Render novo: ${saida}`);
		falhou = true;
	}
});
if (falhou) process.exit(1);
CFG.salvar();
