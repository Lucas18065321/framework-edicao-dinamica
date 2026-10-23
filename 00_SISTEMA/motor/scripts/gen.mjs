// Google generation bridge (Nano Banana 2 / Pro images, Gemini Omni Flash video) with a hard budget cap.
// Usage:
//   node scripts/gen.mjs image <id> "<prompt>" [--pro] [--size 1K|2K]
//   node scripts/gen.mjs video <id> "<prompt>" [--image path.jpg] [--res 360p|720p|1080p]
//   node scripts/gen.mjs budget
//   Add --projeto <pasta> to save into that project's 04_broll/ia_api (opcional; o caminho principal é o Flow)
// Key and budget come from 00_SISTEMA/motor/.env:  GEMINI_API_KEY=...  GEMINI_BUDGET_USD=10
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
	(fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '')
		.split(/\r?\n/)
		.filter((l) => /^\s*[A-Z_]+=/.test(l))
		.map((l) => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const BUDGET = Number(env.GEMINI_BUDGET_USD || 10);
const LEDGER = path.join(root, 'gen-ledger.json');
// Saída: <projeto>/04_broll/ia_api quando --projeto é passado; senão 02_BIBLIOTECA/broll-reutilizavel.
const projArg = process.argv.indexOf('--projeto');
const OUT = projArg !== -1 ? path.join(path.resolve(process.argv[projArg + 1]), '04_broll', 'ia_api') : path.join(root, '..', '..', '02_BIBLIOTECA', 'broll-reutilizavel');
const API = 'https://generativelanguage.googleapis.com/v1beta';

// Conservative list-price estimates (USD). Update if Google changes pricing.
const PRICE = {image: 0.08, imagePro: 0.16, videoPerSec: {'360p': 0.03, '720p': 0.1, '1080p': 0.15}, assumedVideoSec: 8};

const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : [];
const month = new Date().toISOString().slice(0, 7);
const spent = () => ledger.filter((e) => e.month === month).reduce((s, e) => s + e.usd, 0);

const [cmd, id, prompt, ...rest] = process.argv.slice(2);
const flag = (name, def) => {
	const i = rest.indexOf(name);
	return i === -1 ? def : rest[i + 1] ?? true;
};

if (cmd === 'budget') {
	console.log(`Mês ${month}: gasto estimado US$${spent().toFixed(2)} de US$${BUDGET.toFixed(2)}`);
	process.exit(0);
}
if (!KEY) {
	console.error('GEMINI_API_KEY ausente. Coloque-o em 00_SISTEMA/motor/.env (modelo: .env.example)');
	process.exit(1);
}
if (!['image', 'video'].includes(cmd) || !id || !prompt) {
	console.error('Uso: gen.mjs image|video <id> "<prompt>" [opções]');
	process.exit(1);
}

const isPro = cmd === 'image' && rest.includes('--pro');
const res = flag('--res', '720p');
const cost = cmd === 'image' ? (isPro ? PRICE.imagePro : PRICE.image) : PRICE.videoPerSec[res] * PRICE.assumedVideoSec;
if (spent() + cost > BUDGET) {
	console.error(`Bloqueado: esta geração (~US$${cost.toFixed(2)}) passaria do orçamento mensal (US$${spent().toFixed(2)}/${BUDGET}).`);
	process.exit(2);
}

let body;
if (cmd === 'image') {
	body = {
		model: isPro ? 'gemini-3-pro-image' : 'gemini-3.1-flash-image',
		input: [{type: 'text', text: prompt}],
		response_format: {type: 'image', mime_type: 'image/jpeg', aspect_ratio: flag('--ar', '9:16'), image_size: flag('--size', '2K')},
	};
} else {
	const img = flag('--image', null);
	const input = img
		? [
				{type: 'image', data: fs.readFileSync(img).toString('base64'), mime_type: img.endsWith('.png') ? 'image/png' : 'image/jpeg'},
				{type: 'text', text: prompt},
			]
		: prompt;
	body = {model: 'gemini-omni-1.1-flash', input, response_format: {type: 'video', aspect_ratio: flag('--ar', '9:16'), resolution: res, delivery: 'uri'}};
}

// Walk the response and return the first media payload (inline data or uri), whatever the nesting.
function findMedia(node) {
	if (!node || typeof node !== 'object') return null;
	if ((node.data || node.uri) && (node.mime_type || node.mimeType || node.uri)) return node;
	for (const v of Object.values(node)) {
		const hit = findMedia(v);
		if (hit) return hit;
	}
	return null;
}

const headers = {'Content-Type': 'application/json', 'x-goog-api-key': KEY};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Gerando ${cmd} "${id}" (~US$${cost.toFixed(2)})...`);
const r = await fetch(`${API}/interactions`, {method: 'POST', headers, body: JSON.stringify(body)});
const json = await r.json();
if (!r.ok) {
	console.error('Erro da API:', JSON.stringify(json).slice(0, 800));
	process.exit(1);
}
const media = findMedia(json);
if (!media) {
	console.error('Resposta sem mídia:', JSON.stringify(json).slice(0, 800));
	process.exit(1);
}

fs.mkdirSync(OUT, {recursive: true});
const ext = cmd === 'image' ? 'jpg' : 'mp4';
const file = path.join(OUT, `${id}.${ext}`);
if (media.data) {
	fs.writeFileSync(file, Buffer.from(media.data, 'base64'));
} else {
	// Poll the file until ACTIVE, then download.
	const fileId = media.uri.match(/files\/([^/:?]+)/)?.[1];
	for (let i = 0; fileId && i < 120; i++) {
		const s = await (await fetch(`${API}/files/${fileId}`, {headers})).json();
		if (s.state === 'ACTIVE') break;
		if (s.state === 'FAILED') throw new Error('Geração falhou: ' + JSON.stringify(s).slice(0, 400));
		await sleep(5000);
	}
	const url = fileId ? `${API}/files/${fileId}:download?alt=media` : media.uri;
	const dl = await fetch(url, {headers});
	fs.writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
}

ledger.push({month, at: new Date().toISOString(), cmd, id, model: body.model, usd: cost, prompt});
fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
console.log(`OK → ${path.relative(root, file)} | gasto do mês ~US$${spent().toFixed(2)}/${BUDGET}`);
