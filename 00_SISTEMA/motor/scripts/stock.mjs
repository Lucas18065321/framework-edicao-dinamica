// Free stock B-roll fetcher. Prefers vertical media; records license/credit for every file.
// Usage: node scripts/stock.mjs <pasta-do-projeto> <id> "<english query>" [--image] [--ilustracao] [--n 3] [--horizontal]
//   --horizontal: prefere 16:9 (YOUTUBE - MIX EDIT); sem ele, prefere vertical (formatos do Instagram)
//   video:  Pixabay → Pexels (keys in .env)
//   image:  Pixabay → Openverse/Wikimedia (no key) → Pexels
//   --ilustracao: Pixabay illustrations/vectors (diagrams, icons…)
//   Saves to <projeto>/04_broll/banco (videos) or 04_broll/fotos (images); credits in 04_broll/creditos.json
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
const [proj, id, query, ...rest] = process.argv.slice(2);
const ilustracao = rest.includes('--ilustracao');
const wantImage = rest.includes('--image') || ilustracao;
const n = Number(rest[rest.indexOf('--n') + 1]) || 3;
const horizontal = rest.includes('--horizontal');
if (!proj || !id || !query) {
	console.error('Uso: stock.mjs <pasta-do-projeto> <id> "<query em inglês>" [--image] [--ilustracao] [--n 3]');
	process.exit(1);
}
const OUT = path.join(path.resolve(proj), '04_broll', wantImage ? 'fotos' : 'banco');
const CREDITS = path.join(path.resolve(proj), '04_broll', 'creditos.json');

const UA = {'User-Agent': 'split-editor/1.0 (personal video editing)'};
const q = encodeURIComponent(query);
const out = [];

// Each source is optional: a bad key or outage is reported and the next source is tried.
async function tryJson(name, url, init) {
	try {
		const r = await fetch(url, init);
		const text = await r.text();
		if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 120).trim()}`);
		return JSON.parse(text);
	} catch (e) {
		console.warn(`[${name}] indisponível: ${e.message}`);
		return {};
	}
}

async function pixabayVideos() {
	if (!env.PIXABAY_API_KEY) return;
	const j = await tryJson('pixabay', `https://pixabay.com/api/videos/?key=${env.PIXABAY_API_KEY}&q=${q}&per_page=${Math.max(3, n * 3)}&safesearch=true`);
	// Vertical clips first, then the rest.
	const deitado = (v) => v.videos.large.width > v.videos.large.height;
	const hits = (j.hits ?? []).sort((a, b) => (horizontal ? deitado(b) - deitado(a) : (b.videos.large.height > b.videos.large.width) - (a.videos.large.height > a.videos.large.width)));
	for (const v of hits) {
		// 4K "large" files are heavy to render on this machine; 1080p is enough for a 1080-wide frame.
		const f = v.videos.large?.url && v.videos.large.width <= 1920 ? v.videos.large : v.videos.medium?.url ? v.videos.medium : v.videos.large;
		out.push({src: 'pixabay', url: f.url, ext: 'mp4', w: f.width, h: f.height, dur: v.duration, credit: `${v.user} / Pixabay`, license: 'Pixabay Content License', page: v.pageURL});
	}
}
async function pixabayImages() {
	if (!env.PIXABAY_API_KEY) return;
	const type = ilustracao ? 'illustration' : 'photo';
	const j = await tryJson('pixabay', `https://pixabay.com/api/?key=${env.PIXABAY_API_KEY}&q=${q}&image_type=${type}&orientation=${horizontal ? 'horizontal' : 'vertical'}&per_page=${Math.max(3, n * 2)}&safesearch=true`);
	for (const p of j.hits ?? []) out.push({src: 'pixabay', url: p.largeImageURL, ext: p.largeImageURL.split('.').pop().toLowerCase(), w: p.imageWidth, h: p.imageHeight, credit: `${p.user} / Pixabay`, license: 'Pixabay Content License', page: p.pageURL});
}
async function pexelsVideos() {
	if (!env.PEXELS_API_KEY) return;
	const j = await tryJson('pexels', `https://api.pexels.com/videos/search?query=${q}&orientation=${horizontal ? 'landscape' : 'portrait'}&per_page=${n * 2}`, {headers: {Authorization: env.PEXELS_API_KEY}});
	for (const v of j.videos ?? []) {
		const files = v.video_files.filter((f) => f.file_type === 'video/mp4').sort((a, b) => a.width - b.width);
		const f = files.find((f) => f.width >= 1080) ?? files.at(-1);
		if (f) out.push({src: 'pexels', url: f.link, ext: 'mp4', w: f.width, h: f.height, dur: v.duration, credit: `${v.user.name} / Pexels`, license: 'Pexels License', page: v.url});
	}
}
async function pexelsImages() {
	if (!env.PEXELS_API_KEY) return;
	const j = await tryJson('pexels', `https://api.pexels.com/v1/search?query=${q}&orientation=${horizontal ? 'landscape' : 'portrait'}&per_page=${n}`, {headers: {Authorization: env.PEXELS_API_KEY}});
	for (const p of j.photos ?? []) out.push({src: 'pexels', url: p.src.large2x, ext: 'jpg', w: p.width, h: p.height, credit: `${p.photographer} / Pexels`, license: 'Pexels License', page: p.url});
}
async function openverseImages() {
	const j = await tryJson('openverse', `https://api.openverse.org/v1/images/?q=${q}&license_type=commercial&size=large&page_size=${n * 2}`, {headers: UA});
	for (const v of j.results ?? []) {
		if (!/\.(jpe?g|png)$/i.test(v.url)) continue;
		out.push({src: 'openverse', url: v.url, ext: v.url.split('.').pop().toLowerCase(), w: v.width, h: v.height, credit: v.attribution ?? `${v.creator} (${v.license} ${v.license_version})`, license: `${v.license} ${v.license_version}`, page: v.foreign_landing_url});
	}
}

const so = rest.includes('--fonte') ? rest[rest.indexOf('--fonte') + 1] : null; // força uma fonte só
if (so === 'openverse') {
	await openverseImages();
} else if (wantImage) {
	await pixabayImages();
	if (!ilustracao) await openverseImages();
	await pexelsImages();
} else {
	await pixabayVideos();
	await pexelsVideos();
}
if (!out.length) {
	console.warn('Nenhum resultado (verifique a query em inglês e as chaves no .env).');
	process.exit(3);
}

fs.mkdirSync(OUT, {recursive: true});
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};
let k = 0;
for (const c of out) {
	if (k >= n) break;
	const name = `${id}_${k + 1}.${c.ext === 'jpeg' ? 'jpg' : c.ext}`;
	const r = await fetch(c.url, {headers: UA});
	if (!r.ok) continue;
	fs.writeFileSync(path.join(OUT, name), Buffer.from(await r.arrayBuffer()));
	credits[`${path.basename(OUT)}/${name}`] = {query, ...c};
	console.log(`${name}  ${c.w}x${c.h}${c.dur ? ` ${c.dur}s` : ''}  ${c.src}  ${c.license}`);
	k++;
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
if (!k) process.exit(3);
