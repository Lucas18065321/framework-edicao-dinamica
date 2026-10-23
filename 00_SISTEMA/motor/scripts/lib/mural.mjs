// Biblioteca do gerador do INSTAGRAM - PAPER VOX ANIMATION (modelo fixo paper-vox-instagram): tudo o que vale para
// qualquer áudio. O gerador de cada vídeo (03_roteiro/montar_quadro.mjs) só escreve o criativo: as células do mural,
// as peças de cada estação, onde cada montagem mergulha, os SFX curados, os cortes da trilha e as opções de trilha.
//   - âncoras nas palavras (T, PAL, primeira, ultimaFim) dentro da faixa de cada estação da shotlist.json;
//   - mural em serpentina (colunas = blocos), estação com contexto (ctx) e atalhos de peça;
//   - câmera: chegada por tipo, punch-in nas palavras-chave, deriva, mergulho/teleporte/emergência das montagens,
//     recuo final para o mural inteiro e mergulho no card;
//   - "voa" (de fora da tela, depois que a câmera assenta) + "boiando"; degradês da marca em rodízio;
//   - SFX: banco por categoria, rodízio sem repetir em seguida, volume relativo à voz (12–17 dB abaixo) e travas;
//   - trilha: medida (≤ 1/4 da voz), pausas e cortes só voz; card da marca; decoração de parallax; gravação.
// Nasceu no lab (lib-quadro.mjs + montar_quadro.mjs do vídeo piloto do formato). Mudou algo aqui?
// Rode o gerador do seu piloto e confira que o quadro.json não mudou (só muda de propósito, com pedido do usuário).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RAIZ = path.resolve(MOTOR, '..', '..');
export const ID_MODELO = 'paper-vox-instagram';

// ---------- marca do usuário ----------
// 02_BIBLIOTECA/kit/marca/marca.json: nome (palavras no degradê), profissao (linha de apoio, como deve aparecer),
// credencial ('' = sem a linha) e handle (o @). Campo que faltar cai no texto neutro de exemplo.
export const lerMarca = () => {
	let m = {};
	try {
		m = JSON.parse(fs.readFileSync(path.join(RAIZ, '02_BIBLIOTECA', 'kit', 'marca', 'marca.json'), 'utf8'));
	} catch {
		console.warn('[mural] 02_BIBLIOTECA/kit/marca/marca.json não encontrado ou inválido: card da marca com textos de exemplo');
	}
	const palavras = (v, padrao) => String(typeof v === 'string' && v.trim() ? v : padrao).trim().split(/\s+/);
	return {
		nome: palavras(m.nome, 'Seu Nome'),
		profissao: palavras(m.profissao, 'sua profissão'),
		credencial: typeof m.credencial === 'string' ? m.credencial.trim() : '',
		handle: typeof m.handle === 'string' && m.handle.trim() ? m.handle.trim() : '@seu_perfil',
	};
};

// ---------- SFX ----------
// Fontes por categoria (relativas a RAIZ). "papel" (a pestana): os do próprio projeto, se houver (piloto), senão a
// biblioteca 05_LAB/sfx/papel (sintetizados até o Mixkit chegar).
const LAB = '05_LAB/sfx', MX = '02_BIBLIOTECA/sfx/motionix', BIB = '02_BIBLIOTECA/sfx';
const lista = (dir, filtro = () => true) => (fs.existsSync(path.join(RAIZ, dir)) ? fs.readdirSync(path.join(RAIZ, dir)).filter((f) => f.endsWith('.wav') && filtro(f)).sort().map((f) => `${dir}/${f}`) : []);
export const BANCO = (proj) => ({
	whoosh: lista(`${MX}/whooshes`, (f) => /fast|simple|short|mediam|smooth-and-fast/.test(f)),
	impacto: [...lista(`${LAB}/impacto`), `${BIB}/impact_sub.wav`],
	clique: lista(`${LAB}/clique`),
	glitch: lista(`${LAB}/glitch`).slice(0, 8),
	'scroll-ui': lista(`${LAB}/scroll-ui`),
	ding: lista(`${LAB}/ding`),
	pop: lista(`${MX}/pop`),
	ui: lista(`${MX}/ui-sound-effects`, (f) => /click|button|enter|open|select/.test(f)),
	gear: lista(`${MX}/gear`),
	riser: lista(`${MX}/risers`),
	swell: [`${BIB}/reverse_swell.wav`, `${BIB}/shimmer.wav`],
	papel: fs.existsSync(path.join(proj, '05_audio/sfx/lab/papel'))
		? fs.readdirSync(path.join(proj, '05_audio/sfx/lab/papel')).filter((f) => f.endsWith('.wav')).sort().map((f) => `@proj/05_audio/sfx/lab/papel/${f}`)
		: lista(`${LAB}/papel`),
});
// Alvo de loudness para voz a −19,8 LUFS (o piloto): sons longos pelo M máx. (LUFS momentâneo), curtos (< 0,4 s) pelo
// pico. Na prévia 1 do piloto os SFX ficaram altos → transições ~12 dB e pops ~17 dB abaixo da voz.
// Com outra gravação, os alvos andam junto com a voz (opção vozI do criarSfx).
const VOZ_REF = -19.8;
const ALVO_M = {whoosh: -32, impacto: -31, swell: -33, riser: -33, gear: -34, papel: -35, pop: -36, ui: -36, ding: -35, 'scroll-ui': -36, glitch: -35};
const ALVO_PICO = {clique: -25, pop: -24, ui: -25, ding: -24, 'scroll-ui': -26, glitch: -25, papel: -24, gear: -22, whoosh: -17, impacto: -13, riser: -19, swell: -19};

const medir = (arq) => {
	const o = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-v', 'verbose', '-i', arq, '-af', 'astats=measure_perchannel=none:measure_overall=Peak_level,ebur128=framelog=verbose', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).stderr ?? '';
	const pico = Number(o.match(/Peak level dB:\s*(-?[\d.]+)/)?.[1] ?? -20);
	const ms = [...o.matchAll(/ M: *(-?[\d.]+)/g)].map((m) => Number(m[1]));
	const mmax = ms.length ? Math.max(...ms) : -120;
	const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], {encoding: 'utf8'}).stdout) || 0;
	return {pico, mmax, dur};
};

// Cria o seletor: escolher(cat) devolve {som (relativo ao projeto), vol}, copiando o arquivo para 05_audio/sfx/lab/<cat>/.
export const criarSfx = (proj, {vozI = VOZ_REF, pontos = false} = {}) => {
	const banco = BANCO(proj);
	const desvio = Number.isFinite(vozI) ? vozI - VOZ_REF : 0;
	const cacheArq = path.join(proj, '05_audio', 'sfx', 'lab', 'medidas.json');
	const cache = fs.existsSync(cacheArq) ? JSON.parse(fs.readFileSync(cacheArq, 'utf8')) : {};
	const pos = {};
	let ultimo = null;
	const usados = new Set();
	const escolher = (catBruta) => {
		const cat = String(catBruta).split(/[ (]/)[0];
		const fontes = banco[cat];
		if (!fontes?.length) throw new Error(`[mural] sem som na categoria "${cat}" (banco vazio)`);
		let k = pos[cat] ?? 0, src = fontes[k % fontes.length];
		if (src === ultimo && fontes.length > 1) src = fontes[++k % fontes.length];
		pos[cat] = k + 1;
		ultimo = src;
		const abs = src.startsWith('@proj/') ? path.join(proj, src.slice(6)) : path.join(RAIZ, src);
		const rel = src.startsWith('@proj/') ? src.slice(6) : `05_audio/sfx/lab/${cat}/${path.basename(src)}`;
		if (!src.startsWith('@proj/')) {
			fs.mkdirSync(path.join(proj, path.dirname(rel)), {recursive: true});
			if (!fs.existsSync(path.join(proj, rel))) fs.copyFileSync(abs, path.join(proj, rel));
		}
		if (!cache[rel]) cache[rel] = medir(abs);
		const m = cache[rel];
		const curto = m.mmax < -70 || m.dur < 0.4;
		const db = desvio + (curto ? (ALVO_PICO[cat] ?? -16) - m.pico : Math.min((ALVO_M[cat] ?? -27) - m.mmax, (ALVO_PICO[cat] ?? -10) - m.pico));
		usados.add(rel);
		if (pontos) {
			// t_ataque/t_pico = instantes (s) no arquivo; não confundir com pico (nível em dB) da medida de volume
			if (cache[rel].t_ataque == null) { const p = pontosDoSom(abs); cache[rel].t_ataque = p.ataque; cache[rel].t_pico = p.pico; }
			return {som: rel, vol: +Math.min(1, Math.pow(10, db / 20)).toFixed(3), _pontos: {ataque: cache[rel].t_ataque, pico: cache[rel].t_pico}};
		}
		return {som: rel, vol: +Math.min(1, Math.pow(10, db / 20)).toFixed(3)};
	};
	const salvar = () => {
		fs.mkdirSync(path.dirname(cacheArq), {recursive: true});
		fs.writeFileSync(cacheArq, JSON.stringify(cache, null, 1));
		return [...usados];
	};
	return {escolher, salvar};
};

// ---------- refino milimétrico dos SFX ----------
// Cada SFX declara o instante VISUAL que marca e qual ponto do som cai nele: "ataque" (o transiente: impacto, papel,
// clique, pop, ding, glitch, ui, engrenagem) ou "pico" (o ponto mais alto: whoosh no meio da viagem, riser/swell no
// clímax). O t do arquivo = evento − posição desse ponto no arquivo (+ ajuste em ms, se o usuário pedir).
export const ALVO_PADRAO = {whoosh: 'pico', riser: 'pico', swell: 'pico'};
const cubica = (x1, y1, x2, y2) => {
	const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
	const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
	return (x) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (bx(m) < x) a = m; else b = m; } return by((a + b) / 2); };
};
// As mesmas curvas do src/kit/tempo.ts e do camera.ts (Easing.bezier): para achar o quadro em que o movimento "bate".
export const CURVA = {entrada: cubica(0.16, 1, 0.3, 1), assento: cubica(0.22, 1, 0.36, 1), suave: cubica(0.65, 0, 0.35, 1), snap: cubica(0.3, 1.45, 0.45, 1)};
// fração do tempo em que a curva chega a "frac" do caminho (ex.: o recorte que voa "pousa" a 92% do caminho)
export const quando = (curva, frac) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (curva(m) < frac) a = m; else b = m; } return (a + b) / 2; };
// posição (s) do ataque e do pico dentro do arquivo: envelope de 5 ms; ataque = 1ª janela a −10 dB do pico,
// refinado na amostra (1ª que passa de 30% do pico daquela janela)
export const pontosDoSom = (arq) => {
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', arq, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], {maxBuffer: 256 * 1024 * 1024});
	const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
	const J = 240; // 5 ms
	const env = [];
	for (let i = 0; i < x.length; i += J) { let q = 0; for (let k = i; k < Math.min(i + J, x.length); k++) q += x[k] * x[k]; env.push(Math.sqrt(q / J)); }
	const max = Math.max(...env), ipico = env.indexOf(max);
	const iataque = env.findIndex((v) => v >= max * 0.316);
	let amostra = iataque * J;
	let pjan = 0;
	for (let k = iataque * J; k < Math.min((iataque + 1) * J, x.length); k++) pjan = Math.max(pjan, Math.abs(x[k]));
	while (amostra < (iataque + 1) * J && Math.abs(x[amostra]) < pjan * 0.3) amostra++;
	return {ataque: +(amostra / 48000).toFixed(4), pico: +(((ipico + 0.5) * J) / 48000).toFixed(4)};
};

// ---------- trilha ----------
// Mede um trecho de áudio: integrado (I) e pico curto (S máx., janela de 3 s). Regra do formato: música ≤ 1/4 da voz.
export const medirTrilha = (arq, ini = 0, dur = null) => {
	const o = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-v', 'verbose', '-ss', String(ini), ...(dur ? ['-t', String(dur)] : []), '-i', arq, '-af', 'ebur128=framelog=verbose', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 256 * 1024 * 1024}).stderr ?? '';
	const ss = [...o.matchAll(/ S: *(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((x) => x > -70);
	return {I: Number(o.match(/Integrated loudness:\s*I:\s*(-?[\d.]+)/)?.[1] ?? NaN), smax: ss.length ? Math.max(...ss) : NaN};
};
// Com fala: o pico curto da trilha fica 13 dB abaixo da voz; sem fala (pausas, montagens): 12 dB, o teto da regra.
export const volTrilha = (vozI, smax) => ({vol: +Math.pow(10, (vozI - 13 - smax) / 20).toFixed(4), volSemFala: +Math.pow(10, (vozI - 12 - smax) / 20).toFixed(4)});

// ---------- câmera ----------
// Chegada por tipo: duração, curva, arco (recuo de zoom no meio) e giro. "emerge" é feita pela montagem.
export const CHEGADA = {
	abre: {dur: 0, curva: 'suave'},
	chicote: {dur: 0.55, curva: 'suave', arco: 0.22},
	deslize: {dur: 0.8, curva: 'suave', arco: 0.06},
	snap: {dur: 0.32, curva: 'snap', arco: 0},
	'snap-zoom': {dur: 0.32, curva: 'snap', arco: 0},
	giro: {dur: 0.6, curva: 'suave', arco: 0.1, rot: 8},
	queda: {dur: 0.45, curva: 'assento', arco: 0.04},
	recuo: {dur: 0.7, curva: 'suave', arco: 0.35},
	recursao: {dur: 0.6, curva: 'expo', arco: 0},
	emerge: {dur: 0.45, curva: 'assento'},
};
export const tipoChegada = (txt) => {
	const s = String(txt ?? '').toLowerCase();
	for (const k of ['chicote', 'deslize', 'snap-zoom', 'snap', 'giro', 'queda', 'recuo', 'recursão', 'emerge', 'abre']) if (s.includes(k)) return k === 'recursão' ? 'recursao' : k;
	return 'deslize';
};

// Tamanho da palavra-chave (Instrument Serif itálica ≈ 0,46 em por letra) para caber em larg px.
export const tamChave = (t, larg = 900, max = 210) => Math.round(Math.min(max, larg / (Math.max(...String(t).split(' ').map((p) => p.length)) * 0.47)));

// ---------- o mural ----------
// criarMural(PROJ, {celulas, voz}) devolve o estado e os atalhos. Ordem das chamadas no gerador do vídeo:
//   estações (ctx/base/alvo/extraCam) → caminho() → estação do mural inteiro → card() → decoracao() → camera() →
//   voaBoia() → degrades() → sfx(plano) → trilha({cortes, opcoes}) → gravar().
// A ordem importa: ids, sementes e o sorteio (rnd) dependem dela.
export const criarMural = (PROJ, op = {}) => {
	const pal = JSON.parse(fs.readFileSync(path.join(PROJ, '02_analise/palavras.json'), 'utf8'));
	const sl = JSON.parse(fs.readFileSync(path.join(PROJ, '03_roteiro/shotlist.json'), 'utf8'));
	const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}%]/gu, '');
	const r2 = (x) => +x.toFixed(2);
	const EST = Object.fromEntries(sl.estacoes.map((e) => [e.id, e]));
	const ORDEM = sl.estacoes.map((e) => e.id);
	const meio = (w) => (w.ini + w.fim) / 2;
	const faixa = Object.fromEntries(sl.estacoes.map((e) => [e.id, pal.map((w, i) => (meio(w) >= e.ini && meio(w) < e.fim ? i : -1)).filter((i) => i >= 0)]));
	const voz = op.voz ?? (() => {
		const f = fs.readdirSync(path.join(PROJ, '01_bruto')).find((x) => /^bruto\.(mp3|wav|m4a)$/i.test(x));
		if (!f) throw new Error('[mural] sem 01_bruto/bruto.mp3|wav|m4a (converta o áudio do WhatsApp antes: .oga → .mp3)');
		return `01_bruto/${f}`;
	})();

	// palavras de uma frase dentro da estação (n-ésima ocorrência)
	const achar = (id, frase, n = 1) => {
		const idx = faixa[id], alvo = frase.split(/\s+/).map(norm).filter(Boolean);
		if (!idx) throw new Error(`[mural] estação ${id} não existe na shotlist`);
		let k = 0;
		for (let a = 0; a + alvo.length <= idx.length; a++) if (alvo.every((p, j) => norm(pal[idx[a + j]].w) === p) && ++k === n) return idx.slice(a, a + alvo.length);
		throw new Error(`${id}: não achei "${frase}"#${n}`);
	};
	const T = (id, frase, n = 1) => pal[achar(id, frase, n)[0]].ini;
	const PAL = (id, frase, n = 1) => achar(id, frase, n).map((i) => ({t: r2(pal[i].ini - 0.03), w: pal[i].w.replace(/[.,!?]$/, '')}));
	const primeira = (id) => pal[faixa[id][0]].ini;
	const ultimaFim = (id) => pal[faixa[id][faixa[id].length - 1]].fim;

	// layout: colunas = blocos; bloco ímpar desce, par sobe (serpentina); desvio sorteado com semente fixa
	const COLW = op.colw ?? 1500, ROWH = op.rowh ?? 1900;
	if (!op.celulas) throw new Error('[mural] falta celulas: {1: [ids…], 2: […]} (uma coluna por bloco; a última termina em CARD)');
	const pos = {};
	let linha = 0;
	const rnd = (() => { let a = op.semente ?? 1234567; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })();
	for (const [b, ids] of Object.entries(op.celulas)) {
		const desce = Number(b) % 2 === 1;
		ids.forEach((id, k) => {
			if (k > 0) linha += desce ? 1 : -1;
			pos[id] = {x: (Number(b) - 1) * COLW + (rnd() - 0.5) * 320, y: linha * ROWH + (rnd() - 0.5) * 240, rot: (rnd() - 0.5) * 5};
		});
	}

	const elementos = [];
	let nid = 0;
	let estAtual = null, kAtual = 1;
	const add = (el) => { const x = {id: `${el.tipo}${++nid}`, ini: 0, _est: estAtual, _k: kAtual, ...el}; elementos.push(x); return x; };
	const B = '04_broll/ia_flow', BIB = '04_broll/meus';

	// fotos da biblioteca em P&B (cópia no projeto; o original na 02_BIBLIOTECA não muda)
	const pb = (rel) => {
		const nome = path.basename(rel).replace(/\.jpg$/, '_pb.jpg');
		const dest = path.join(PROJ, BIB, nome);
		if (!fs.existsSync(dest)) spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(RAIZ, '02_BIBLIOTECA/broll-reutilizavel', rel), '-vf', 'scale=1200:-2,format=gray,eq=contrast=1.22:brightness=-0.05', '-q:v', '3', dest]);
		return `${BIB}/${nome}`;
	};

	// estação: contexto com centro, escala (k) e atalhos. bases guarda o centro e o k (o mergulho das montagens usa).
	const bases = {};
	const ctx = (id, base, k = 1) => {
		estAtual = id;
		kAtual = k;
		bases[id] = {x: base.x, y: base.y, k};
		const c = {id, x: base.x, y: base.y, k};
		c.p = (dx, dy) => [base.x + dx * k, base.y + dy * k];
		c.tx = (frase, escala, dx, dy, o = {}) => {
			const [x, y] = c.p(dx, dy);
			const palavras = PAL(id, frase, o.n ?? 1);
			return add({tipo: 'texto', x, y, w: (o.w ?? 940) * k, escala, tamanho: (o.tamanho ?? (escala === 'chave' ? tamChave(frase, o.w ?? 920) : 64)) * k, alinhar: o.alinhar ?? 'center', palavras, ini: palavras[0].t, rot: o.rot, entra: o.entra, recua: o.recua, torto: o.torto, cor: o.cor ?? (escala === 'chave' ? 'marca' : undefined), plano: o.plano});
		};
		c.obj = (nome, dx, dy, w, h, ev, p = {}, o = {}) => { const [x, y] = c.p(dx, dy); return add({tipo: 'objeto', nome, x, y, w: w * k, h: h == null ? undefined : h * k, ev, p, ini: o.ini ?? 0, rot: o.rot, entra: o.voa ? {tipo: 'voa', dur: 0.36} : undefined, boia: o.boia}); };
		c.papel = (dx, dy, w, h, o = {}) => { const [x, y] = c.p(dx, dy); return add({tipo: 'papel', x, y, w: w * k, h: h * k, rot: o.rot ?? base.rot, cor: o.cor, colunas: o.colunas, vincos: o.vincos, semente: o.semente ?? nid + 3, rasgado: o.rasgado, ini: o.ini ?? 0, entra: o.entra, passo: o.passo, plano: o.plano}); };
		c.foto = (src, dx, dy, w, h, o = {}) => { const [x, y] = c.p(dx, dy); return add({tipo: 'foto', src, x, y, w: w * k, h: h * k, rot: o.rot ?? (rnd() - 0.5) * 4, ini: o.ini ?? 0, entra: o.entra ?? {tipo: 'voa', dur: 0.36}, boia: o.boia, zoomInterno: o.zoom ?? [1, 1.07], semente: nid + 9, halftone: o.halftone}); };
		c.rec = (src, dx, dy, w, h, o = {}) => { const [x, y] = c.p(dx, dy); return add({tipo: 'recorte', src, x, y, w: w * k, h: h * k, ini: o.ini ?? 0, entra: o.entra ?? {tipo: 'voa', dur: 0.42}, rot: o.rot, boia: o.boia}); };
		c.fita = (dx, dy, ini, rot = -30) => { const [x, y] = c.p(dx, dy); return add({tipo: 'fita', x, y, w: 230 * k, h: 56 * k, rot, ini, entra: {tipo: 'pousa'}, passo: 2}); };
		c.marca = (dx, dy, w, h, ini, o = {}) => { const [x, y] = c.p(dx, dy); return add({tipo: 'marca', x, y, w: w * k, h: h * k, ini, dur: o.dur ?? 0.26, rot: o.rot ?? -1.5}); };
		c.traco = (d, vb, dx, dy, w, ini, o = {}) => { const [x, y] = c.p(dx, dy); return add({tipo: 'traco', d, vb, x, y, w: w * k, ini, dur: o.dur ?? 0.4, passo: o.passo ?? 3, cor: o.cor, espessura: o.espessura, boia: o.boiaId ? 1 : undefined, boiaId: o.boiaId}); };
		c.luz = (forca = 0.07) => add({tipo: 'luz', x: base.x, y: base.y - 80 * k, w: 1500 * k, forca});
		return c;
	};
	const FUNDO = {editorial: {cor: '#1C1A18', colunas: true, vincos: true}, colagem: {cor: '#2E2620'}, marmore: {cor: '#141316'}};
	const base = (c, look, o = {}) => { c.papel(0, 0, o.w ?? 1040, o.h ?? 1640, {...FUNDO[look], ...o}); c.luz(look === 'marmore' ? 0.1 : 0.07); };

	const cam = {}; // alvo de câmera de cada estação: {x, y, zoom, rot}
	const alvo = (id, dx = 0, dy = 0, zoom = 1, rot = 0, ref = id) => (cam[id] = {x: pos[ref].x + dx, y: pos[ref].y + dy, zoom, rot});
	const extraCam = {}; // chaves próprias de uma estação (depois da chegada)

	const M = {PROJ, pal, sl, EST, ORDEM, T, PAL, primeira, ultimaFim, r2, pos, rnd, elementos, add, B, BIB, pb, ctx, FUNDO, base, cam, alvo, extraCam, bases};

	// caminho: da estação "de" de volta pelas células até a 1ª, pelo centro delas (traço à mão sobre o mural);
	// devolve o centro e o zoom do mural inteiro (a estação seguinte mostra o mural com textos gigantes)
	M.caminho = ({de, ev, espessura = 30}) => {
		const celulas = ORDEM.filter((id) => pos[id]).slice().reverse().filter((id) => id !== de);
		const pts = [pos[de], ...celulas.map((id) => pos[id])];
		const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
		const bb = {x0: Math.min(...xs) - 700, x1: Math.max(...xs) + 700, y0: Math.min(...ys) - 1100, y1: Math.max(...ys) + 1100};
		const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0, bcx = (bb.x0 + bb.x1) / 2, bcy = (bb.y0 + bb.y1) / 2;
		let d = `M ${(pts[0].x - bb.x0).toFixed(0)} ${(pts[0].y + 420 - bb.y0).toFixed(0)}`;
		for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const mx = (a.x + b.x) / 2 + (i % 2 ? 260 : -260), my = (a.y + b.y) / 2; d += ` Q ${(mx - bb.x0).toFixed(0)} ${(my + 420 - bb.y0).toFixed(0)} ${(b.x - bb.x0).toFixed(0)} ${(b.y + 420 - bb.y0).toFixed(0)}`; }
		add({tipo: 'objeto', nome: 'caminho', x: bcx, y: bcy, w: bw, h: bh, ev, p: {d, espessura}, ini: ev.desenha});
		const zMural = Math.min(1080 / bw, 1920 / bh) * 0.96;
		return (M.mural = {bcx, bcy, bw, bh, zMural, de});
	};

	// card da marca (fixo): nome no degradê, profissão, credencial, ícones e @. A duração do vídeo fecha 3,1 s depois.
	// Os textos vêm de 02_BIBLIOTECA/kit/marca/marca.json (nome, profissao, credencial, handle); credencial vazia = sem a linha.
	M.card = (id, b) => {
		const tCard = ultimaFim(id) + 0.1, DUR = r2(tCard + 3.1);
		const T0 = r2(tCard);
		const mc = lerMarca();
		const pecas = [
			{tipo: 'papel', x: b.x - 160, y: b.y - 180, w: 520, h: 340, cor: '#2B2522', rot: -4, ini: T0, entra: {tipo: 'pousa'}, passo: 2, semente: 501},
			{tipo: 'papel', x: b.x + 170, y: b.y + 180, w: 480, h: 300, cor: '#2B2522', rot: 5, ini: T0 + 0.15, entra: {tipo: 'pousa'}, passo: 2, semente: 502},
			{tipo: 'texto', x: b.x, y: b.y - 240, w: 900, escala: 'chave', tamanho: 170, alinhar: 'center', palavras: mc.nome.map((w, i) => ({t: T0 + 0.3 + i * 0.12, w})), ini: T0 + 0.3, cor: 'marca'},
			{tipo: 'texto', x: b.x, y: b.y - 60, w: 900, escala: 'apoio', tamanho: 56, alinhar: 'center', palavras: mc.profissao.map((w, i) => ({t: T0 + 0.6 + i * 0.06, w})), ini: T0 + 0.6},
			...(mc.credencial ? [{tipo: 'texto', x: b.x, y: b.y + 40, w: 900, escala: 'apoio', tamanho: 44, alinhar: 'center', palavras: [{t: T0 + 0.9, w: mc.credencial}], ini: T0 + 0.9}] : []),
			{tipo: 'objeto', nome: 'icones', x: b.x, y: b.y + 250, w: 600, h: 120, ev: {entra: T0 + 1.1}, ini: T0 + 1.1},
			{tipo: 'texto', x: b.x, y: b.y + 400, w: 900, escala: 'apoio', tamanho: 60, alinhar: 'center', palavras: [{t: T0 + 1.3, w: mc.handle}], ini: T0 + 1.3},
		];
		for (const el of pecas) add(el);
		M.tCard = tCard;
		M.DUR = DUR;
		return {tCard, DUR};
	};

	// decoração de profundidade: folhas grandes no plano de fundo e lascas de papel na frente
	M.decoracao = () => {
		for (const id of Object.keys(pos)) {
			const p = pos[id];
			elementos.unshift({id: `bg-${id}`, tipo: 'papel', plano: 'fundo', x: p.x * 0.55 + 300, y: p.y * 0.55 - 200, w: 1300, h: 1000, rot: (rnd() - 0.5) * 10, cor: '#141215', semente: 700 + elementos.length, ini: 0});
			// plano da frente anda 1,35× a câmera: a coordenada é a da estação × 1,35, e a lasca fica no canto, fora da zona de texto
			const lado = rnd() > 0.5 ? 1 : -1;
			elementos.push({id: `fr-${id}`, tipo: 'papel', plano: 'frente', x: p.x * 1.35 + lado * 640, y: p.y * 1.35 + (rnd() > 0.5 ? 1 : -1) * 980, w: 140 + rnd() * 70, h: 180 + rnd() * 70, rot: (rnd() - 0.5) * 40, cor: '#26221F', semente: 800 + elementos.length, ini: 0});
		}
	};

	// câmera: mergulho = {M1: [estação, dx, dy], …} (onde cada montagem some); escurecer = {M27: 0.68, …} (plano claro);
	// final = {de, recuo, card, tRecuo, tMural, tSegura, tSai, tCard} (recuo para o mural inteiro e mergulho no card)
	const chaves = [];
	const pushK = (k) => { const u = chaves[chaves.length - 1]; if (u && k.t <= u.t + 0.005) return; chaves.push({...k, t: r2(k.t), x: Math.round(k.x), y: Math.round(k.y), zoom: +k.zoom.toFixed(4), rot: +(k.rot ?? 0).toFixed(2)}); };
	const estado = () => chaves[chaves.length - 1];
	const montagens = [];
	const chegou = {}; // s em que a câmera assenta em cada estação (o "voa" só começa depois)
	const partiu = {}; // s em que a câmera sai rumo à estação (a viagem do whoosh vai de partiu a chegou)
	M.chaves = chaves;
	M.partiu = partiu;
	M.montagens = montagens;
	M.chegou = chegou;
	M.camera = ({mergulho, escurecer = {}, final}) => {
		const DUR = M.DUR;
		const MONT = (sl.montagens ?? []).map((m) => ({...m, depois: sl.estacoes.find((e) => Math.abs(e.fim - m.pausa[0]) < 0.02)?.id, antes: sl.estacoes.find((e) => Math.abs(e.ini - m.pausa[1]) < 0.02)?.id}));
		const tChave = (id) => (EST[id].texto ?? []).filter((x) => x.escala === 'chave').map((x) => Number(x.ancora.split('@')[1]));
		let emergiu = null;
		for (let i = 0; i < ORDEM.length; i++) {
			const id = ORDEM[i], e = EST[id], alvoC = cam[id];
			if (!alvoC) throw new Error(`sem alvo de câmera: ${id}`);
			const t0 = primeira(id), tipo = i === 0 ? 'abre' : emergiu === id ? 'emerge' : tipoChegada(e.chegada?.tipo);
			const ch = CHEGADA[tipo] ?? CHEGADA.deslize;
			if (tipo === 'abre') { pushK({t: 0, ...alvoC, zoom: alvoC.zoom * 0.98}); chegou[id] = 0; }
			else if (tipo !== 'emerge') {
				const prevFim = ultimaFim(ORDEM[i - 1]);
				const ts = Math.max(prevFim - 0.05, t0 - ch.dur * 0.8, (estado()?.t ?? 0) + 0.05), te = ts + ch.dur;
				const u = estado();
				pushK({t: ts, x: u.x, y: u.y, zoom: u.zoom, rot: u.rot, curva: 'suave'});
				pushK({t: te, ...alvoC, rot: (alvoC.rot ?? 0) + (ch.rot ? (i % 2 ? ch.rot : -ch.rot) : 0), curva: ch.curva, arco: ch.arco});
				chegou[id] = te;
				partiu[id] = ts;
			}
			// chaves próprias da estação (viagem dentro dela)
			for (const k of extraCam[id] ?? []) pushK({t: k.t, x: alvoC.x + (k.dx ?? 0), y: alvoC.y + (k.dy ?? 0), zoom: alvoC.zoom * (k.zoom ?? 1), rot: k.rot ?? 0, curva: k.curva ?? 'suave'});
			// pulsos de punch-in nas palavras-chave
			const prox = ORDEM[i + 1] ? primeira(ORDEM[i + 1]) - 0.5 : DUR;
			for (const tc of tChave(id)) {
				const u = estado();
				if (tc < u.t + 0.12 || tc > prox - 0.35 || (extraCam[id] ?? []).some((k) => Math.abs(k.t - tc) < 0.8)) continue;
				pushK({t: tc - 0.02, x: u.x, y: u.y, zoom: u.zoom, rot: u.rot, curva: 'suave'});
				pushK({t: tc + 0.16, x: u.x, y: u.y - 8 / u.zoom, zoom: u.zoom * 1.055, rot: u.rot, curva: 'snap'});
			}
			// deriva lenta até o fim da estação
			const u = estado();
			const mSeg = MONT.find((x) => x.depois === id);
			const fimEst = Math.min(mSeg ? mSeg.pausa[0] - 0.03 : Infinity, Math.max(u.t + 0.3, (ORDEM[i + 1] ? primeira(ORDEM[i + 1]) : DUR) - 0.6));
			if (id !== final.recuo && id !== final.card) pushK({t: fimEst, x: u.x, y: u.y, zoom: u.zoom * 1.03, rot: u.rot, curva: 'suave'});
			// montagem depois desta estação: mergulho, troca escondida, emergência na seguinte
			const m = MONT.find((x) => x.depois === id);
			if (m) {
				if (!mergulho[m.id]) throw new Error(`[mural] falta o mergulho da ${m.id} (em que estação e peça a câmera some)`);
				const [mid, mdx, mdy] = mergulho[m.id];
				const bm = bases[mid] ?? {...pos[mid], k: 1};
				const ref = {x: bm.x, y: bm.y}, kM = bm.k ?? 1;
				const zRef = 1 / kM;
				const a = m.pausa[0], ent = m.entrada.dur, soma = m.planos.reduce((s, p) => s + p.dur, 0), t2 = a + ent + soma, saida = m.saida.dur;
				const B2 = cam[m.antes];
				const v = estado();
				pushK({t: a, x: v.x, y: v.y, zoom: v.zoom, rot: v.rot, curva: 'suave'});
				pushK({t: a + ent, x: ref.x + mdx * kM, y: ref.y + mdy * kM, zoom: zRef * 3.4, rot: 0, curva: 'saida'});
				pushK({t: a + ent + 0.03, x: B2.x, y: B2.y, zoom: B2.zoom * 3.4, rot: 0, curva: 'linear'});
				pushK({t: t2, x: B2.x, y: B2.y, zoom: B2.zoom * 3.4, rot: 0, curva: 'linear'});
				pushK({t: t2 + Math.max(0.45, saida + 0.2), ...B2, curva: 'assento'});
				chegou[m.antes] = t2 + Math.max(0.45, saida + 0.2);
				const movs = ['push', 'pan-e', 'pull', 'pan-d', 'tilt'];
				montagens.push({ini: r2(a), entrada: ent, saida, planos: m.planos.map((p, j) => {
					const nome = p.fonte.slice(5);
					return {src: `${B}/${nome}.jpg`, dur: p.dur, mov: movs[j % movs.length], ...(escurecer[nome] != null ? {escurecer: escurecer[nome]} : {})};
				})});
				emergiu = m.antes;
			}
		}
		// recuo acompanhando o traço até o mural inteiro, depois o mergulho no papel em branco do card
		{
			const {tRecuo: tC, tMural: tI, tSegura: tR, tSai: tM, tCard: tP} = final;
			const {bcx, bcy} = M.mural;
			const ix = chaves.findIndex((k) => k.t > tC);
			if (ix >= 0) chaves.splice(ix);
			const u = estado();
			const mural = cam[final.recuo], card = cam[final.card];
			pushK({t: tC, x: u.x, y: u.y, zoom: u.zoom, rot: 0, curva: 'suave'});
			pushK({t: tI, x: (pos[final.de].x + bcx) / 2, y: (pos[final.de].y + bcy) / 2, zoom: 0.32, rot: 0, curva: 'suave'});
			pushK({t: tI + 1.6, ...mural, curva: 'suave'});
			pushK({t: tR + 0.6, ...mural, zoom: mural.zoom * 1.02, curva: 'suave'});
			pushK({t: tM + 0.1, ...mural, zoom: mural.zoom * 1.03, curva: 'suave'});
			pushK({t: tP - 0.1, x: card.x, y: card.y, zoom: 0.35, rot: 0, curva: 'suave'});
			pushK({t: tP + 0.7, x: card.x, y: card.y, zoom: 1, rot: 0, curva: 'assento'});
			pushK({t: DUR, x: card.x, y: card.y, zoom: 1.04, rot: 0, curva: 'suave'});
			chegou[final.recuo] = tI + 1.6;
			chegou[final.card] = tP + 0.7;
		}
	};

	// voa + boiando: a peça entra de fora DEPOIS que a câmera chega, vinda do lado em que mora na
	// estação; peças no centro alternam a direção. Estações em escala (k) boiam proporcionalmente (mesmo "boiando" na tela).
	M.voaBoia = () => {
		const BOIA = {recorte: 1, foto: 0.7, objeto: 0.8, texto: 0.3};
		const LADOS = ['dir', 'se', 'baixo', 'so', 'esq', 'no', 'cima', 'ne']; // ângulo 0 = direita, horário (y para baixo)
		let giro = 0;
		for (const el of elementos) {
			const est = el._est, k = el._k ?? 1;
			delete el._est;
			delete el._k;
			if (k !== 1 && BOIA[el.tipo] && el.boia == null) el.boia = +(BOIA[el.tipo] * k).toFixed(3);
			if (el.boia == null) delete el.boia;
			if (el.entra === undefined) delete el.entra;
			if (el.entra?.tipo !== 'voa') continue;
			if (chegou[est] != null) el.ini = r2(Math.max(el.ini, chegou[est] + 0.05)); // o painel assenta primeiro, a peça chega depois
			const c = cam[est] ?? pos[est], dx = el.x - c.x, dy = el.y - c.y;
			el.entra.de ??= Math.hypot(dx, dy) < 160 ? ['baixo', 'esq', 'cima', 'dir'][giro++ % 4] : LADOS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
			delete el.passo;
		}
	};

	// degradês da marca em rodízio nas palavras-chave, por ordem de entrada (dois seguidos nunca iguais)
	M.degrades = () => {
		const DEG = ['salmao-vermelho', 'vermelho-laranja', 'salmao-laranja'];
		elementos.filter((e) => e.tipo === 'texto' && e.cor === 'marca').sort((a, b) => a.ini - b.ini).forEach((e, i) => (e.degrade = DEG[i % 3]));
	};

	// SFX curados: plano = [[t, categoria, multiplicador?, evento?], …]. evento = {tipo, t} = o instante visual que o som
	// marca (o refinar-sfx.mjs acerta o t por ele). Travas do formato: ≥ 1,15 s entre SFX e nunca a mesma categoria em seguida.
	M.S = (id, cat, n = 1) => { const x = (EST[id].sfx ?? []).filter((q) => q.cat.startsWith(cat))[n - 1]; if (!x) throw new Error(`${id}: sem SFX ${cat}#${n}`); return Number(x.ancora.split('@')[1]); };
	M.WH = 0.14; // o whoosh começa antes do movimento
	M.mergulho = (j) => montagens[j].ini + montagens[j].entrada; // instante em que a câmera some no elemento
	M.vozI = () => (M._vozI ??= medirTrilha(path.join(PROJ, voz)).I);
	// Instantes visuais para ancorar SFX (use depois de M.camera() e M.voaBoia()):
	const dDe = (el) => el.entra?.dur ?? ({voa: 0.42, pousa: 0.4, slam: 0.16, sobe: 0.24, desliza: 0.3, escala: 0.15}[el.entra?.tipo] ?? 0.25);
	M.ev = {
		palavra: (id, frase, n = 1) => ({tipo: 'palavra "' + frase + '"', t: T(id, frase, n)}), // o som cai no começo da palavra
		slam: (el) => ({tipo: 'slam "' + (el.palavras ?? []).map((p) => p.w).join(' ') + '"', t: el.palavras[0].t + dDe(el) * quando(CURVA.entrada, 0.9)}), // a palavra bate (90% da escala)
		pouso: (el) => ({tipo: 'pouso ' + (el.nome ?? el.tipo), t: el.ini + dDe(el) * quando(CURVA.entrada, 0.92)}), // a peça que voa assenta (92% do caminho)
		viagem: (id) => ({tipo: 'viagem → ' + id, t: (partiu[id] + chegou[id]) / 2}), // meio da viagem da câmera (velocidade máxima)
		chegada: (id) => ({tipo: 'chegada ' + id, t: chegou[id]}),
		mergulho: (j) => ({tipo: 'mergulho M' + (j + 1), t: M.mergulho(j)}),
		objeto: (el, chave, atraso = 0) => ({tipo: el.nome + '.' + chave, t: el.ev[chave] + atraso}), // evento interno de um objeto
		em: (tipo, t) => ({tipo, t}),
	};
	// plano: [[t, categoria, multiplicador?], …] (piloto) ou, com refino, [[null, categoria, mult, evento, {alvo, ajuste}], …]:
	// o t sai do evento (ataque/pico do som no instante visual, na amostra) + ajuste em ms pedido pelo usuário.
	M.sfx = (plano, {naMixagem = false} = {}) => {
		const comEvento = plano.some((p) => p[3]);
		const sfxSel = criarSfx(PROJ, {vozI: M.vozI(), pontos: comEvento});
		const tDe = (p) => (p[0] != null ? p[0] : p[3].t);
		const sfx = [];
		for (const [t0, cat, mult = 1, evento, o = {}] of plano.slice().sort((a, b) => tDe(a) - tDe(b))) {
			const c = sfxSel.escolher(cat);
			const {_pontos, ...som} = c;
			let t = t0, extra = {};
			if (evento) {
				const alvo = o.alvo ?? ALVO_PADRAO[String(cat).split(/[ (]/)[0]] ?? 'ataque';
				t = evento.t - _pontos[alvo] + (o.ajuste ?? 0) / 1000;
				extra = {evento: {tipo: evento.tipo, t: +evento.t.toFixed(4)}, alvo, ...(o.ajuste ? {ajuste: o.ajuste} : {})};
			}
			sfx.push({t: evento ? +Math.max(0, t).toFixed(4) : r2(Math.max(0, t)), ...som, vol: +(c.vol * mult).toFixed(3), ...extra});
		}
		sfx.sort((a, b) => a.t - b.t);
		// a distância conta onde o som BATE (o evento), não o início do arquivo (o whoosh começa antes do pico)
		const bate = (x) => x.evento?.t ?? x.t;
		for (let i = 1; i < sfx.length; i++) {
			const a = sfx[i - 1], b = sfx[i];
			if (bate(b) - bate(a) < 1.15) throw new Error(`SFX colados: ${a.t} e ${b.t}${a.evento || b.evento ? ` (batem em ${bate(a).toFixed(2)} e ${bate(b).toFixed(2)})` : ''}`);
			if (a.som.split('/')[3] === b.som.split('/')[3]) throw new Error(`mesma categoria em seguida: ${a.t} e ${b.t} (${a.som})`);
		}
		M.sfxLista = sfx;
		M.sfxNaMixagem = naMixagem;
		M.sfxUsados = sfxSel.salvar();
		return sfx;
	};

	// trilha: cortes = trechos SÓ voz (momentos tensos ou de ênfase); opcoes = {A: [arquivo em 02_BIBLIOTECA/musicas, ini, nome], …}
	M.fimFala = (id) => r2(ultimaFim(id) + 0.06);
	M.ateProxima = (id) => r2(Math.max(ultimaFim(id) + 0.06, primeira(ORDEM[ORDEM.indexOf(id) + 1]) - 0.08)); // o silêncio segura até a frase seguinte
	M.trilha = ({cortes, opcoes, escolhida = 'A'}) => {
		const vozI = M.vozI(), DUR = M.DUR;
		const CORTES = cortes.map(([a, b]) => [r2(a), b]);
		const PAUSAS = [];
		for (let i = 1; i < pal.length; i++) if (pal[i].ini - pal[i - 1].fim >= 0.5) PAUSAS.push([r2(pal[i - 1].fim + 0.05), r2(pal[i].ini - 0.05)]);
		const trilha = (arq, ini, nome) => {
			const abs = path.join(RAIZ, '02_BIBLIOTECA/musicas', arq);
			if (!fs.existsSync(abs)) throw new Error(`[mural] trilha não está na biblioteca: ${arq}`);
			const m = medirTrilha(abs, ini, DUR);
			return {nome, src: `@raiz/02_BIBLIOTECA/musicas/${arq}`, ini, ...volTrilha(vozI, m.smax), vozI, smax: m.smax, pausas: PAUSAS, cortes: CORTES, fim: DUR, fade: 2.5};
		};
		M.musicas = Object.fromEntries(Object.entries(opcoes).map(([k, [arq, ini, nome]]) => [k, trilha(arq, ini, nome)]));
		M.musica = M.musicas[escolhida];
		M.cortes = CORTES;
		M.pausas = PAUSAS;
		return M.musicas;
	};

	// objetos que existem no motor (o MAPA do objetos.tsx): nome fora dele não dá erro no render, a peça só some
	const OBJETOS = (() => {
		const src = fs.readFileSync(path.join(MOTOR, 'src/modelos/paper-vox/objetos.tsx'), 'utf8');
		const bloco = src.slice(src.indexOf('const MAPA'), src.indexOf('};', src.indexOf('const MAPA')));
		return new Set([...bloco.matchAll(/(\w+):\s*\w+/g)].map((m) => m[1]));
	})();

	// grava 03_roteiro/quadro.json (ou --saida <arquivo>, para conferir sem sobrescrever) e imprime o resumo
	const saidaArg = process.argv.includes('--saida') ? process.argv[process.argv.indexOf('--saida') + 1] : null;
	M.gravar = ({grao = 0.09, viva = 5, blur = {ativo: true, limiar: 18, maxAmostras: 8, obturador: 0.5, espaco: 14}, arquivo = saidaArg ?? '03_roteiro/quadro.json'} = {}) => {
		const faltam = [...new Set(elementos.filter((e) => e.tipo === 'objeto' && !OBJETOS.has(e.nome)).map((e) => e.nome))];
		if (faltam.length) throw new Error(`[mural] objeto(s) que não existem no motor: ${faltam.join(', ')}. Objeto novo é peça nova num modelo fixo: só com ok do usuário, implementado em src/modelos/paper-vox/objetos.tsx (componente + linha no MAPA) e depois regressao-paper-vox.`);
		const quadro = {modelo: ID_MODELO, voz, vozIni: 0, duracao: M.DUR, grao, viva, blur, camera: chaves, elementos, montagens, sfx: M.sfxLista ?? [], ...(M.sfxNaMixagem ? {sfxNaMixagem: true} : {}), musica: M.musica, musicas: M.musicas};
		fs.writeFileSync(path.resolve(PROJ, arquivo), JSON.stringify(quadro));
		const tipos = elementos.reduce((m, e) => ((m[e.tipo === 'objeto' ? `objeto:${e.nome}` : e.tipo] = (m[e.tipo === 'objeto' ? `objeto:${e.nome}` : e.tipo] ?? 0) + 1), m), {});
		const {bw = 0, bh = 0, zMural = 0} = M.mural ?? {};
		console.log(`[quadro] ${M.DUR} s · ${elementos.length} elementos · ${chaves.length} chaves de câmera · ${montagens.length} montagens · ${(M.sfxLista ?? []).length} SFX (${(M.sfxUsados ?? []).length} arquivos${M.sfxNaMixagem ? ', na mixagem' : ''}) · mural ${Math.round(bw)}×${Math.round(bh)} px (zoom do recuo ${zMural.toFixed(3)})`);
		console.log(JSON.stringify(tipos));
		if (M.musicas) console.log(`[trilha] voz ${M.vozI()} LUFS · ${M.cortes.length} cortes só voz (${M.cortes.reduce((s, [a, b]) => s + b - a, 0).toFixed(1)} s) · ${M.pausas.length} pausas · ` + Object.entries(M.musicas).map(([k, m]) => `${k}: vol ${m.vol} / ${m.volSemFala} (S máx ${m.smax})`).join(' · '));
		console.log(`[voa] ${elementos.filter((e) => e.entra?.tipo === 'voa').length} peças voam · SFX: ${(M.sfxLista ?? []).map((x) => `${x.t}:${x.som.split('/')[3]}`).join(' ')}`);
		return quadro;
	};
	return M;
};

// Acha a raiz (pasta com 00_SISTEMA/motor) subindo a partir de um projeto: o gerador funciona em 03_PROJETOS/<proj>,
// 03_PROJETOS/<canal>/<proj> ou 05_LAB/testes/<proj>.
export const acharRaiz = (dir) => {
	let d = path.resolve(dir);
	while (!fs.existsSync(path.join(d, '00_SISTEMA', 'motor'))) {
		const p = path.dirname(d);
		if (p === d) throw new Error('[mural] não achei 00_SISTEMA/motor acima de ' + dir);
		d = p;
	}
	return d;
};
