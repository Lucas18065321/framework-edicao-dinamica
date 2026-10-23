// Cria um projeto novo a partir do modelo e (opcionalmente) copia o bruto para 01_bruto/bruto.<ext>.
// Uso: node scripts/novo-projeto.mjs "<nome do vídeo>" [caminho-do-bruto]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [nome, bruto] = process.argv.slice(2);
if (!nome) {
	console.error('Uso: node scripts/novo-projeto.mjs "<nome do vídeo>" [caminho-do-bruto]');
	process.exit(1);
}
const slug = nome
	.normalize('NFD')
	.replace(/[̀-ͯ]/g, '')
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, '-')
	.replace(/^-|-$/g, '');
const data = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local (toISOString virava o dia após as 21h)
const dest = path.join(RAIZ, '03_PROJETOS', `${data}_${slug}`);
if (fs.existsSync(dest)) {
	console.error(`Já existe: ${dest}`);
	process.exit(1);
}
// o .gitkeep só existe para o git guardar as pastas vazias do modelo: não vai para o projeto
fs.cpSync(path.join(RAIZ, '03_PROJETOS', '_MODELO_PROJETO'), dest, {recursive: true, filter: (src) => path.basename(src) !== '.gitkeep'});
if (bruto) {
	const ext = path.extname(bruto).toLowerCase() || '.mp4';
	fs.copyFileSync(bruto, path.join(dest, '01_bruto', `bruto${ext}`));
}
console.log(dest);
