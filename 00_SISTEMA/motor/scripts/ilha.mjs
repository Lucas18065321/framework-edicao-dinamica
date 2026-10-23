// Ilha de edição: abre o projeto no Remotion Studio (prévia AO VIVO no navegador, sem renderizar nada).
// O usuário assiste, aponta o que mudar ("em 1:23 tira o zoom"), o Claude edita o edicao.json e a prévia se atualiza.
// Só depois do "aprovado" roda o render final (scripts/render.mjs). A composição e o render não mudam: é o mesmo
// src/index.ts, com as mesmas props e a mesma pasta pública que o render usa.
//
// Uso: node scripts/ilha.mjs [<pasta-do-projeto>] [--edicao 03_roteiro/edicao.json] [--porta 3123]
//   sem pasta → usa 03_PROJETOS/.projeto-ativo (o /editar grava ali o projeto em andamento) ou o mais recente.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {binariosRemotion} from './lib/binarios.mjs';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const PROJETOS = path.join(RAIZ, '03_PROJETOS');
const args = process.argv.slice(2);
const opcao = (nome) => {
	const i = args.indexOf(nome);
	return i === -1 ? null : args[i + 1];
};

const escolherProjeto = () => {
	const dado = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
	if (dado) return path.resolve(dado);
	const ativo = path.join(PROJETOS, '.projeto-ativo');
	if (fs.existsSync(ativo)) return path.resolve(PROJETOS, fs.readFileSync(ativo, 'utf8').trim());
	const pastas = fs.readdirSync(PROJETOS, {withFileTypes: true})
		.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
		.map((d) => path.join(PROJETOS, d.name))
		.filter((p) => fs.existsSync(path.join(p, '03_roteiro', 'edicao.json')))
		.sort((a, b) => fs.statSync(path.join(b, '03_roteiro', 'edicao.json')).mtimeMs - fs.statSync(path.join(a, '03_roteiro', 'edicao.json')).mtimeMs);
	return pastas[0];
};

const proj = escolherProjeto();
const edPath = path.resolve(proj ?? '', opcao('--edicao') ?? path.join('03_roteiro', 'edicao.json'));
if (!proj || !fs.existsSync(edPath)) {
	console.error(`[ilha] não achei o edicao.json (${edPath}). Passe a pasta do projeto.`);
	process.exit(1);
}
const reg = JSON.parse(fs.readFileSync(path.join(MOTOR, 'src', 'modelos.json'), 'utf8'));
const propsFile = path.join(proj, '03_roteiro', '.props-ilha.json');

// Mesma preparação de props do render.mjs (duração e aspecto do bruto vêm do 02_analise/meta.json).
const prepararProps = () => {
	const ed = JSON.parse(fs.readFileSync(edPath, 'utf8'));
	const meta = path.join(proj, '02_analise', 'meta.json');
	if (fs.existsSync(meta)) {
		const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
		ed.duracao ??= m.duracao_s;
		const deitado = Math.abs(m.rotacao) === 90;
		ed.aspectoBruto ??= deitado ? m.altura / m.largura : m.largura / m.altura;
	}
	fs.writeFileSync(propsFile, JSON.stringify(ed));
	return ed;
};

const ed = prepararProps();
const idModelo = ed.modelo ?? reg.padrao;
const mod = reg.modelos[idModelo];
if (!mod) {
	console.error(`[ilha] modelo desconhecido: "${idModelo}"`);
	process.exit(1);
}
const sfxLib = path.join(RAIZ, '02_BIBLIOTECA', 'sfx');
const sfxProj = path.join(proj, '05_audio', 'sfx');
fs.mkdirSync(sfxProj, {recursive: true});
fs.cpSync(sfxLib, sfxProj, {recursive: true, force: false, errorOnExist: false});

// Toda vez que o edicao.json muda, as props da ilha são refeitas (a Studio relê o arquivo de props).
let espera = null;
fs.watchFile(edPath, {interval: 700}, () => {
	clearTimeout(espera);
	espera = setTimeout(() => {
		try {
			prepararProps();
			console.log(`[ilha] ${new Date().toLocaleTimeString('pt-BR')} edicao.json atualizado → prévia recarregada (se não mudar, aperte F5 na aba)`);
		} catch (e) {
			console.error(`[ilha] edicao.json com erro de JSON, prévia mantida na versão anterior: ${e.message}`);
		}
	}, 300);
});

const porta = opcao('--porta') ?? '3123';
const cli = [
	path.join(MOTOR, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'studio', 'src/index.ts',
	`--public-dir=${proj}`, `--props=${propsFile}`, `--port=${porta}`, '--no-open', '--ipv4', ...binariosRemotion(MOTOR),
];
console.log(`[ilha] ${mod.nome} · ${path.basename(proj)}`);
console.log(`[ilha] abra: http://localhost:${porta}/${mod.composicao}`);
const studio = spawn(process.execPath, cli, {cwd: MOTOR, stdio: 'inherit'});
const sair = () => {
	fs.unwatchFile(edPath);
	fs.rmSync(propsFile, {force: true});
	studio.kill();
	process.exit(0);
};
process.on('SIGINT', sair);
process.on('SIGTERM', sair);
studio.on('exit', (c) => {
	fs.unwatchFile(edPath);
	fs.rmSync(propsFile, {force: true});
	process.exit(c ?? 0);
});
