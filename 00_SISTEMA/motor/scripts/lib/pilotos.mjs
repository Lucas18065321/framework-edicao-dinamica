// Pilotos das regressões (00_SISTEMA/regressao/pilotos.json): para cada modelo, o vídeo aprovado que serve de prova de
// que o formato não mudou. Usado por scripts/regressao.mjs (TELA DIVIDIDA, CUT, MIX e formatos novos que renderizam
// pelo render.mjs) e scripts/regressao-paper-vox.mjs.
// Formato de cada modelo: {"projeto": "<pasta do projeto ou null>", "base": "<prefixo do mp4 de referência>",
//   "trechos": [["ini", "fim"], ...] (s da saída), "escala": "L:A" da miniatura do PSNR (null = só md5), "limiar": dB}
// --projeto <pasta> troca o projeto da rodada; junto com --gravar, ele fica salvo no pilotos.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import MODELOS from '../../src/modelos.json' with {type: 'json'};

export const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RAIZ = path.resolve(MOTOR, '..', '..');
export const PASTA_REGRESSAO = path.join(RAIZ, '00_SISTEMA', 'regressao');
const ARQ = path.join(PASTA_REGRESSAO, 'pilotos.json');
export const rel = (p) => path.relative(RAIZ, p).replace(/\\/g, '/');

const lerTudo = () => {
	if (!fs.existsSync(ARQ)) {
		console.error(`[regressão] não achei ${rel(ARQ)} (lista dos pilotos por modelo)`);
		process.exit(1);
	}
	return JSON.parse(fs.readFileSync(ARQ, 'utf8'));
};

// Pasta do projeto: caminho (relativo à raiz do repositório ou absoluto) ou só o nome, procurado em
// 03_PROJETOS/<nome> e numa subpasta de canal (03_PROJETOS/<canal>/<nome>). Precisa ter o arquivo `marcador`.
const acharProjeto = (nome, marcador) => {
	const PROJETOS = path.join(RAIZ, '03_PROJETOS');
	const canais = fs.existsSync(PROJETOS) ? fs.readdirSync(PROJETOS, {withFileTypes: true}).filter((d) => d.isDirectory()).map((d) => path.join(PROJETOS, d.name, nome)) : [];
	// path.resolve(nome) = relativo à pasta atual (ex.: ../../03_PROJETOS/<pasta>, rodando de dentro de 00_SISTEMA/motor)
	return [path.resolve(RAIZ, nome), path.resolve(nome), path.join(PROJETOS, nome), ...canais].find((p) => fs.existsSync(path.join(p, marcador)));
};

// Devolve {id, nome, proj, base, trechos, escala, limiar, gravar} ou null quando o modelo ainda não tem piloto.
// comando = como rodar esta regressão (para a mensagem de "como gravar").
export const lerPiloto = (id, marcador, comando) => {
	const tudo = lerTudo();
	const cfg = tudo[id];
	if (!cfg) {
		console.error(`[regressão] o modelo ${id} não está em ${rel(ARQ)}: acrescente {"projeto": null, "base": "${id}_base", "trechos": [["0", "5"]], "escala": null, "limiar": null}`);
		process.exit(1);
	}
	const args = process.argv;
	const gravar = args.includes('--gravar');
	const projArg = args.includes('--projeto') ? args[args.indexOf('--projeto') + 1] : null;
	const nomeProj = projArg ?? cfg.projeto;
	const nome = `O ${MODELOS.modelos[id]?.nome ?? id} aprovado`;
	if (!nomeProj) {
		console.log(`[regressão] SEM PILOTO (${id}): ainda não há vídeo aprovado gravado como referência, nada a comparar.`);
		console.log('  Depois do 1º vídeo APROVADO neste formato, grave a referência (de dentro de 00_SISTEMA/motor):');
		console.log(`    node scripts/vez.mjs node scripts/${comando} --gravar --projeto <pasta do projeto>`);
		console.log(`  Isso salva o projeto em ${rel(ARQ)} e grava ${rel(PASTA_REGRESSAO)}/${cfg.base}*.mp4. Ajuste antes os "trechos" (s) no pilotos.json.`);
		return null;
	}
	const proj = acharProjeto(nomeProj, marcador);
	if (!proj) {
		console.error(`[regressão] não achei o piloto "${nomeProj}" (com ${marcador}) na raiz, em 03_PROJETOS nem nas subpastas de canal`);
		process.exit(1);
	}
	if (!Array.isArray(cfg.trechos) || !cfg.trechos.length) {
		console.error(`[regressão] ${id}: "trechos" vazio em ${rel(ARQ)} (ex.: [["0", "5"]])`);
		process.exit(1);
	}
	// com --gravar --projeto, o piloto fica salvo no pilotos.json só depois que as referências forem gravadas (salvar())
	const salvar = () => {
		if (!gravar || !projArg) return;
		const atual = lerTudo();
		atual[id] = {...atual[id], projeto: rel(proj)};
		fs.writeFileSync(ARQ, `${JSON.stringify(atual, null, 2)}\n`);
		console.log(`[regressão] piloto de ${id} salvo em ${rel(ARQ)}: ${rel(proj)}`);
	};
	const trechos = cfg.trechos.map(([a, b]) => [String(a), String(b)]);
	return {id, nome, proj, base: cfg.base ?? `${id}_base`, trechos, escala: cfg.escala ?? null, limiar: cfg.limiar ?? null, gravar, salvar};
};

// Caminho do mp4 de referência do trecho k (o 1º sem sufixo; os seguintes _2, _3...).
export const arquivoBase = (base, k) => path.join(PASTA_REGRESSAO, `${base}${k ? `_${k + 1}` : ''}.mp4`);
