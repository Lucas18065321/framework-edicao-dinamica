// Importa para o lab os WAVs do Mixkit que o usuário baixou à mão (um a um, no site; nunca por robô).
// Acha em Downloads os mixkit-<nome>-<id>.wav da seleção (05_LAB/sfx/selecao-mixkit.json, feita pelo usuário; não vem
// no repositório, formato em 05_LAB/sfx/README.md), cataloga com o
// sfx-catalogar.mjs (48 kHz 16 bits + medição) e manda os originais para a Lixeira. Arquivo fora da seleção não é tocado.
// Uso (de dentro de 00_SISTEMA/motor): node scripts/lab/sfx-importar-mixkit.mjs [--pasta <Downloads>] [--manter]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..', '..', '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const pasta = arg('--pasta') ?? path.join(os.homedir(), 'Downloads');
const SELECAO = path.join(RAIZ, '05_LAB', 'sfx', 'selecao-mixkit.json');
if (!fs.existsSync(SELECAO)) {
	console.error('[mixkit] falta 05_LAB/sfx/selecao-mixkit.json: a lista dos sons escolhidos, [{"id": "1234", "categoria": "papel", "essencial": true, "titulo": "...", "dur": 1}] (ver 05_LAB/sfx/README.md)');
	process.exit(1);
}
const selecao = new Map(JSON.parse(fs.readFileSync(SELECAO, 'utf8')).map((s) => [s.id, s]));

const achados = fs.readdirSync(pasta)
	.map((f) => ({f, id: f.match(/^mixkit-.*-(\d+)(?: \(\d+\))?\.wav$/i)?.[1]}))
	.filter((x) => x.id && selecao.has(x.id));
const porId = new Map();
achados.forEach((x) => { if (!porId.has(x.id)) porId.set(x.id, x.f); }); // cópia "(1)" de clique duplo: fica a primeira
if (!porId.size) { console.log(`[mixkit] nenhum mixkit-*.wav da seleção em ${pasta}`); process.exit(0); }

const lote = {
	origem: 'Mixkit (mixkit.co, baixado à mão pelo usuário)',
	licenca: 'Mixkit Sound Effects Free License (uso comercial; YouTube, redes e anúncios; sem crédito)',
	url: 'https://mixkit.co/license/#sfxFree',
	itens: [...porId].map(([id, f]) => {
		const s = selecao.get(id);
		return {arquivo: path.join(pasta, f), categoria: s.categoria, nome: `mk-${f.replace(/^mixkit-/i, '').replace(/\.wav$/i, '')}`, descricao: `${s.titulo}${s.essencial ? ' (★)' : ''}`};
	}),
};
const tmp = path.join(os.tmpdir(), `lote-mixkit-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify(lote));
const r = spawnSync(process.execPath, [path.join(AQUI, 'sfx-catalogar.mjs'), tmp], {stdio: 'inherit'});
fs.rmSync(tmp, {force: true});
if (r.status !== 0) process.exit(r.status ?? 1);

const faltam = [...selecao.values()].filter((s) => s.essencial && !porId.has(s.id));
console.log(`[mixkit] ${porId.size} da seleção encontrados; ★ que faltam: ${faltam.length ? `${faltam.length} (${faltam.slice(0, 8).map((s) => s.titulo).join('; ')}${faltam.length > 8 ? '…' : ''})` : 'nenhum'}`);
if (!process.argv.includes('--manter')) {
	for (const x of achados) {
		const p = path.join(pasta, x.f).replace(/'/g, "''");
		spawnSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${p}','OnlyErrorDialogs','SendToRecycleBin')`]);
	}
	console.log(`[mixkit] ${achados.length} originais de Downloads foram para a Lixeira`);
}
