// Captura de manchete ou de página de artigo científico para o Text Match Cut (YOUTUBE - MIX EDIT).
// Abre a página num Chrome invisível com perfil novo (sem login nem cookies), recusa os cookies não essenciais quando há
// botão para isso, põe o título a ~30% da altura e fotografa a tela em alta resolução. A página fica INTACTA (é citação):
// nada é escondido nem reescrito. Mede no próprio HTML a caixa da palavra-chave e a do título (px da imagem), que vão
// direto para a peça match-cut (itens[].caixa e caixaManchete).
// Uso (de dentro do motor): node scripts/capturar-manchete.mjs <proj> <id> <url> --palavra <palavra>
//   [--seletor "h1"] [--largura 1440] [--altura 900] [--escala 2] [--esperar 4] [--posicao 0.3]
// → <proj>/04_broll/internet/<id>.png + registro em <proj>/04_broll/internet/capturas.json
// Página com paywall ou que exige login: não contornar (o guia manda pular).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

const [projArg, id, url, ...resto] = process.argv.slice(2);
if (!projArg || !id || !url) {
	console.error('Uso: node scripts/capturar-manchete.mjs <proj> <id> <url> --palavra <palavra> [--seletor h1] [--largura 1440] [--altura 900] [--escala 2]');
	process.exit(1);
}
const opc = (n, p) => {
	const i = resto.indexOf(n);
	return i === -1 ? p : resto[i + 1];
};
const palavra = opc('--palavra', 'Foco');
const seletor = opc('--seletor', '');
const W = Number(opc('--largura', 1440));
const H = Number(opc('--altura', 900));
const ESC = Number(opc('--escala', 2));
const ESPERA = Number(opc('--esperar', 4)) * 1000;
const POS = Number(opc('--posicao', 0.3));
const proj = path.resolve(projArg);
const pasta = path.join(proj, '04_broll', 'internet');
fs.mkdirSync(pasta, {recursive: true});

const CHROMES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const chrome = CHROMES.find((c) => fs.existsSync(c));
if (!chrome) throw new Error('Chrome/Edge não encontrado');
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'captura-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio', '--lang=en-US', `--window-size=${W},${H}`, 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const wsUrl = await new Promise((ok, falha) => {
	let buf = '';
	const t = setTimeout(() => falha(new Error('Chrome não abriu a porta de depuração')), 20000);
	proc.stderr.on('data', (d) => {
		buf += d;
		const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
		if (m) {
			clearTimeout(t);
			ok(m[1]);
		}
	});
});

const ws = new WebSocket(wsUrl);
await new Promise((ok) => ws.addEventListener('open', ok, {once: true}));
let seq = 0;
const pend = new Map();
const ouvintes = [];
ws.addEventListener('message', (ev) => {
	const m = JSON.parse(ev.data);
	if (m.id && pend.has(m.id)) {
		const {ok, falha} = pend.get(m.id);
		pend.delete(m.id);
		m.error ? falha(new Error(m.error.message)) : ok(m.result);
	} else if (m.method) ouvintes.forEach((f) => f(m));
});
const cdp = (method, params = {}, sessionId) =>
	new Promise((ok, falha) => {
		const i = ++seq;
		pend.set(i, {ok, falha});
		ws.send(JSON.stringify({id: i, method, params, ...(sessionId ? {sessionId} : {})}));
	});

let saida = 1;
try {
	const {targetId} = await cdp('Target.createTarget', {url: 'about:blank'});
	const {sessionId: s} = await cdp('Target.attachToTarget', {targetId, flatten: true});
	const pg = (m, p) => cdp(m, p, s);
	await pg('Page.enable');
	await pg('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: ESC, mobile: false});
	const carregou = new Promise((ok) => {
		ouvintes.push((m) => m.method === 'Page.loadEventFired' && m.sessionId === s && ok());
		setTimeout(ok, 30000);
	});
	await pg('Page.navigate', {url});
	await carregou;
	await dormir(ESPERA);
	const avaliar = async (expr) => (await pg('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true})).result.value;

	// 1) cookies: clica só em botão de RECUSAR (nunca em "aceitar")
	const cookies = await avaliar(`(() => {
		const re = /^(reject all|reject|reject cookies|deny|deny all|deny non-essential|decline|decline all|refuse|refuse all|only necessary|necessary only|use necessary cookies only|continue without accepting|rejeitar|rejeitar todos|recusar|recusar todos|apenas necessários|somente necessários)$/i;
		const bs = [...document.querySelectorAll('button, a[role=button], [role=button], input[type=button]')];
		const b = bs.find((x) => re.test((x.innerText || x.value || '').trim()));
		if (b) { b.click(); return 'recusados'; }
		const banner = bs.some((x) => /^(accept|accept all|aceitar|aceitar todos|i agree|agree)$/i.test((x.innerText || '').trim()));
		return banner ? 'banner sem botão de recusar' : 'sem banner';
	})()`);
	await dormir(1500);

	// 2) título e palavra-chave, medidos no DOM
	const medir = `(() => {
		const palavra = ${JSON.stringify(palavra)};
		let el = ${JSON.stringify(seletor)} ? document.querySelector(${JSON.stringify(seletor)}) : null;
		if (!el) {
			const cands = [...document.querySelectorAll('h1, h2, [class*=title], [class*=headline]')].filter((e) => new RegExp('\\\\b' + palavra + '\\\\b', 'i').test(e.innerText || ''));
			cands.sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
			el = cands[0] || document.querySelector('h1');
		}
		if (!el) return null;
		return {ok: true};
	})()`;
	const achou = await avaliar(medir);
	if (!achou) throw new Error('não achei o título na página');
	const caixas = await avaliar(`(async () => {
		const palavra = ${JSON.stringify(palavra)};
		let el = ${JSON.stringify(seletor)} ? document.querySelector(${JSON.stringify(seletor)}) : null;
		if (!el) {
			const cands = [...document.querySelectorAll('h1, h2, [class*=title], [class*=headline]')].filter((e) => new RegExp('\\\\b' + palavra + '\\\\b', 'i').test(e.innerText || ''));
			cands.sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
			el = cands[0] || document.querySelector('h1');
		}
		const r0 = el.getBoundingClientRect();
		// só rola se o título não estiver bem visível ao carregar: assim o cabeçalho com o veículo continua no quadro
		if (r0.bottom > 0.75 * innerHeight || r0.top < 0) window.scrollTo(0, Math.max(0, r0.top + window.scrollY - ${POS} * innerHeight));
		await new Promise((r) => setTimeout(r, 900));
		const caixa = (r) => [r.left, r.top, r.width, r.height].map((v) => Math.round(v * ${ESC}));
		const rt = el.getBoundingClientRect();
		const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const re = new RegExp('\\\\b' + palavra + '\\\\b', 'i');
		let rp = null, achada = null;
		for (let n = w.nextNode(); n; n = w.nextNode()) {
			const m = re.exec(n.data);
			if (m) {
				const rg = document.createRange();
				rg.setStart(n, m.index);
				rg.setEnd(n, m.index + m[0].length);
				rp = rg.getBoundingClientRect();
				achada = m[0];
				break;
			}
		}
		// data perto do título (para o hold mostrar veículo e data): <time> ou texto com cara de data a até 500 px
		const datas = [...document.querySelectorAll('time, [class*=date], [class*=Date], [class*=published], .cit, .article-source, [class*=meta]')]
			.map((e) => ({e, r: e.getBoundingClientRect()}))
			.filter(({e, r}) => r.width > 0 && r.height > 0 && Math.abs(r.top - rt.top) < 500 && /(19|20)\\d\\d/.test(e.innerText || ''));
		let um = {l: rt.left, t: rt.top, r: rt.right, b: rt.bottom};
		if (datas[0]) {
			const r = datas[0].r;
			um = {l: Math.min(um.l, r.left), t: Math.min(um.t, r.top), r: Math.max(um.r, r.right), b: Math.max(um.b, r.bottom)};
		}
		return {
			titulo: (el.innerText || '').trim().slice(0, 400),
			palavraAchada: achada,
			caixa: rp ? caixa(rp) : null,
			caixaTitulo: caixa(rt),
			caixaManchete: [um.l, um.t, um.r - um.l, um.b - um.t].map((v) => Math.round(v * ${ESC})),
			data: datas[0] ? datas[0].e.innerText.trim().slice(0, 120) : null,
			paywall: /subscribe to (continue|read)|assine para (continuar|ler)|sign in to continue/i.test(document.body.innerText.slice(0, 20000)),
		};
	})()`);
	const shot = await pg('Page.captureScreenshot', {format: 'png'});
	const arq = path.join(pasta, `${id}.png`);
	fs.writeFileSync(arq, Buffer.from(shot.data, 'base64'));
	const reg = path.join(pasta, 'capturas.json');
	const lista = fs.existsSync(reg) ? JSON.parse(fs.readFileSync(reg, 'utf8')).filter((x) => x.id !== id) : [];
	const item = {id, url, capturado_em: new Date().toISOString(), palavra, cookies, largura: W * ESC, altura: H * ESC, ...caixas, arquivo: path.relative(proj, arq).replace(/\\/g, '/')};
	lista.push(item);
	fs.writeFileSync(reg, JSON.stringify(lista, null, 1));
	console.log(JSON.stringify(item, null, 1));
	if (!caixas.caixa) console.warn(`[captura] ATENÇÃO: a palavra "${palavra}" não foi achada no título`);
	if (caixas.paywall) console.warn('[captura] ATENÇÃO: a página parece ter paywall/login: não usar (o guia manda pular)');
	saida = 0;
} catch (e) {
	console.error(`[captura] falhou: ${e.message}`);
} finally {
	try {
		await cdp('Browser.close');
	} catch {}
	ws.close();
	proc.kill();
	await dormir(800);
	fs.rmSync(perfil, {recursive: true, force: true});
	process.exit(saida);
}
