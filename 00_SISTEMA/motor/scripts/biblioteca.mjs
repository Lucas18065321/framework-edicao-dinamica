// Biblioteca reutilizável de mídia (02_BIBLIOTECA/broll-reutilizavel + catalogo.json).
// Uso:
//   node scripts/biblioteca.mjs buscar <termos...>            → lista itens que casam com os termos (tags/descrição)
//   node scripts/biblioteca.mjs importar <arquivo-lote.json>  → copia arquivos de um projeto para a biblioteca e cataloga
//   node scripts/biblioteca.mjs listar                         → tudo, agrupado por tema
// Formato do lote: [{ "arquivo": "<caminho>", "nome": "slug", "tema": "cozinha", "tags": ["..."], "descricao": "...",
//                     "tipo": "video|imagem", "orientacao": "vertical|horizontal", "origem": "flow|pixabay|openverse|meu",
//                     "licenca": "...", "credito": "...", "projeto": "..." }]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BIB = path.join(RAIZ, '02_BIBLIOTECA', 'broll-reutilizavel');
const CAT = path.join(RAIZ, '02_BIBLIOTECA', 'catalogo.json');
const cat = fs.existsSync(CAT) ? JSON.parse(fs.readFileSync(CAT, 'utf8')) : [];
const salvar = () => fs.writeFileSync(CAT, JSON.stringify(cat, null, 1));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'importar') {
	const lote = JSON.parse(fs.readFileSync(args[0], 'utf8'));
	for (const it of lote) {
		const ext = path.extname(it.arquivo).toLowerCase();
		const dir = path.join(BIB, it.tema);
		fs.mkdirSync(dir, {recursive: true});
		const destRel = path.join(it.tema, `${it.nome}${ext}`).replace(/\\/g, '/');
		if (cat.some((c) => c.arquivo === destRel)) {
			console.log(`já existe: ${destRel}`);
			continue;
		}
		fs.copyFileSync(it.arquivo, path.join(BIB, destRel));
		let dur = null;
		if (it.tipo === 'video') {
			const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(BIB, destRel)], {encoding: 'utf8'});
			dur = +(+r.stdout.trim()).toFixed(1) || null;
		}
		const {arquivo, ...meta} = it;
		cat.push({...meta, arquivo: destRel, duracao_s: dur, adicionado: new Date().toISOString().slice(0, 10)});
		console.log(`+ ${destRel}`);
	}
	salvar();
} else if (cmd === 'buscar') {
	const termos = args.map(norm);
	const hits = cat
		.map((c) => {
			const alvo = norm([c.nome, c.tema, c.descricao, ...(c.tags ?? [])].join(' '));
			return {c, score: termos.filter((t) => alvo.includes(t)).length};
		})
		.filter((h) => h.score > 0)
		.sort((a, b) => b.score - a.score);
	if (!hits.length) console.log('nada encontrado');
	for (const {c, score} of hits) console.log(`[${score}] 02_BIBLIOTECA/broll-reutilizavel/${c.arquivo}  (${c.tipo}${c.duracao_s ? ` ${c.duracao_s}s` : ''}, ${c.orientacao}, ${c.origem}) — ${c.descricao}`);
} else if (cmd === 'listar') {
	const temas = [...new Set(cat.map((c) => c.tema))].sort();
	for (const t of temas) {
		console.log(`\n## ${t}`);
		for (const c of cat.filter((x) => x.tema === t)) console.log(`- ${c.arquivo} — ${c.descricao}`);
	}
	console.log(`\n${cat.length} itens`);
} else {
	console.error('Uso: biblioteca.mjs buscar <termos...> | importar <lote.json> | listar');
	process.exit(1);
}
