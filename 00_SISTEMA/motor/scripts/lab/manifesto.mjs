// Manifesto do laboratório (Fase 0): impressão digital (SHA-256) de tudo FORA do lab que os 3 formatos fixos usam,
// para provar, junto com as regressões, que o lab não vazou para a produção.
// Uso (de dentro do motor):
//   node scripts/lab/manifesto.mjs              → grava 05_LAB/manifesto-AAAA-MM-DD.json
//   node scripts/lab/manifesto.mjs --conferir [05_LAB/manifesto-….json]  → compara com o mais recente (ou o indicado);
//                                                 código 1 se algum arquivo mudou, sumiu ou apareceu
// Entra: motor/src e motor/scripts (menos as pastas lab), package.json, package-lock.json, os guias dos 3 modelos,
// a skill /editar e os agentes de vídeo (.claude/ da porta de entrada), e as versões do ffmpeg, do Chrome e do
// headless shell do Remotion (mudança de versão muda render sem mudar arquivo nenhum).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const LAB = path.join(RAIZ, '05_LAB');
// Porta de entrada: a pasta onde a sessão do Claude Code abre (tem .claude/skills e .claude/agents). Padrão: a raiz do
// repositório; se as suas skills e agentes ficam em outra pasta, aponte com a variável de ambiente PORTA_CLAUDE.
const PORTA = path.resolve(process.env.PORTA_CLAUDE || RAIZ);
const MODELOS = ['tela-dividida-instagram', 'cut-dinamico-instagram', 'mix-edit-youtube', 'paper-vox-instagram'];

const listar = (dir, fora = []) => {
	if (!fs.existsSync(dir)) return [];
	const out = [];
	for (const d of fs.readdirSync(dir, {withFileTypes: true})) {
		const p = path.join(dir, d.name);
		if (fora.includes(p)) continue;
		if (d.isDirectory()) out.push(...listar(p, fora));
		else out.push(p);
	}
	return out;
};

const alvos = () => [
	...listar(path.join(MOTOR, 'src'), [path.join(MOTOR, 'src', 'lab')]),
	...listar(path.join(MOTOR, 'scripts'), [path.join(MOTOR, 'scripts', 'lab')]),
	path.join(MOTOR, 'package.json'),
	path.join(MOTOR, 'package-lock.json'),
	...MODELOS.map((m) => path.join(RAIZ, '01_REFERENCIAS', 'modelos', m, 'guia-de-estilo.md')),
	path.join(RAIZ, '01_REFERENCIAS', 'modelos', 'MODELOS.md'),
	...listar(path.join(PORTA, '.claude', 'skills', 'editar')),
	...listar(path.join(PORTA, '.claude', 'agents')),
].filter((p) => fs.existsSync(p));

const rotulo = (p) => {
	const r = path.relative(RAIZ, p);
	return (r.startsWith('..') ? `PORTA/${path.relative(PORTA, p)}` : r).replace(/\\/g, '/');
};
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const versoes = () => {
	const ff = spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'}).stdout?.split(/\r?\n/)[0] ?? '?';
	const hs = path.join(MOTOR, 'node_modules', '.remotion', 'chrome-headless-shell', 'VERSION');
	const chromeDir = 'C:/Program Files/Google/Chrome/Application';
	const chrome = fs.existsSync(chromeDir) ? fs.readdirSync(chromeDir).filter((d) => /^\d+\.\d+\.\d+\.\d+$/.test(d)).sort() : [];
	const pkg = (n) => {
		try {
			return JSON.parse(fs.readFileSync(path.join(MOTOR, 'node_modules', ...n.split('/'), 'package.json'), 'utf8')).version;
		} catch {
			return '?';
		}
	};
	return {ffmpeg: ff, headless_shell: fs.existsSync(hs) ? fs.readFileSync(hs, 'utf8').trim() : '?', chrome, remotion: pkg('remotion'), node: process.version};
};

const gerar = () => {
	const arquivos = {};
	for (const p of alvos().sort()) arquivos[rotulo(p)] = sha(p);
	return {gerado: new Date().toISOString(), versoes: versoes(), total: Object.keys(arquivos).length, arquivos};
};

if (process.argv.includes('--conferir')) {
	const i = process.argv.indexOf('--conferir');
	const dado = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? path.resolve(process.argv[i + 1]) : null;
	const mais = fs.readdirSync(LAB).filter((f) => /^manifesto-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
	const ref = dado ?? (mais ? path.join(LAB, mais) : null);
	if (!ref) {
		console.error('[manifesto] nenhum manifesto em 05_LAB/ para conferir');
		process.exit(1);
	}
	const antes = JSON.parse(fs.readFileSync(ref, 'utf8'));
	const agora = gerar();
	const mud = [], sumiu = [], novo = [];
	for (const [k, v] of Object.entries(antes.arquivos)) {
		if (!(k in agora.arquivos)) sumiu.push(k);
		else if (agora.arquivos[k] !== v) mud.push(k);
	}
	for (const k of Object.keys(agora.arquivos)) if (!(k in antes.arquivos)) novo.push(k);
	const vers = Object.keys(agora.versoes).filter((k) => JSON.stringify(agora.versoes[k]) !== JSON.stringify(antes.versoes[k]));
	console.log(`[manifesto] contra ${path.basename(ref)} (${antes.total} arquivos)`);
	for (const k of mud) console.log(`  MUDOU  ${k}`);
	for (const k of sumiu) console.log(`  SUMIU  ${k}`);
	for (const k of novo) console.log(`  NOVO   ${k}`);
	for (const k of vers) console.log(`  VERSÃO ${k}: ${JSON.stringify(antes.versoes[k])} → ${JSON.stringify(agora.versoes[k])}`);
	const igual = !mud.length && !sumiu.length && !novo.length;
	console.log(igual ? `[manifesto] IGUAL${vers.length ? ' (só versão de ferramenta mudou: veja acima)' : ''}` : '[manifesto] DIFERENTE');
	process.exit(igual ? 0 : 1);
}

const m = gerar();
const dia = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local
const destino = path.join(LAB, `manifesto-${dia}.json`);
fs.writeFileSync(destino, JSON.stringify(m, null, 1));
console.log(`[manifesto] ${m.total} arquivos → ${path.relative(RAIZ, destino)}`);
console.log(`[manifesto] versões: ${JSON.stringify(m.versoes)}`);
