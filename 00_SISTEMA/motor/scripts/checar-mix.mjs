// Checagens do YOUTUBE - MIX EDIT antes da prévia (guia: "Checagens antes da prévia", "Ritmo", correções da crítica).
// Uso: node scripts/checar-mix.mjs <proj> [--edicao 03_roteiro/edicao.json] [--video <previa.mp4>] [--sem-relatorio]
//   --video  mede também os flashes de verdade numa prévia já renderizada (YAVG por quadro: inversões ≥ 26 com o lado
//            escuro < 204, WCAG 2.3.1) além da conta pelo edicao.json, e as piscadas de 1–2 quadros (≥ 6 de YAVG)
//   --sem-relatorio  só no console, sem gravar o .md (usado pelo validar-edicao.mjs, que roda a cada edição)
// Relatório no console e em 03_roteiro/checagem_<edicao>.md. Sai com código 1 se houver ERRO (avisos não travam).
// Confere:
//   ERRO  B-roll repetido (arquivos de 04_broll/ em cenas e camadas; ícones e peças do kit podem repetir) · mais de 3
//         flashes em 1 s (transição flash, silhueta, golpes, fotos que o flash-foto aceita) · camada 'atras' fora da
//         cobertura dos recortes · cena com buraco ou sobreposição · piscadas (plano de fala < 30 q trocando o
//         enquadramento; corte dentro do rosto desfocado) · cena 'fala' com zoom × punch dos golpes > 1,20 por
//         mais de 1 s ou > 1,25 em qualquer quadro (limites × tamanho do bruto / quadro: 2K aguenta 1,33× mais) ·
//         arquivo ou som referenciado que não existe · capítulos que o YouTube recusa (< 3, < 10 s)
//   aviso B-roll com nomes diferentes e o mesmo conteúdo · capítulos fora de 2,5–4 min (ou fora de 5–8 num vídeo de
//         20–25 min) · tempo sem rosto fora de 25–35% no corpo (sem a intro; por capítulo de ≥ 1 min: 25–40%) · SFX
//         abaixo de 0,45 durante a fala · sons de peças diferentes a < 8 q · rosto nítido > 10 s sem evento · junções
//         do bruto (02_analise/juncoes.json, avisando se foi medido com outra montagem) e cortes da montagem sem
//         reenquadramento (≥ 10% de escala ou ≥ 5% W de rosto), transição nem cobertura · avisos das próprias peças
// Volumes e sons das peças: lidos do próprio motor (registro de camadas, estilos e curvas, compilados com o esbuild do
// Remotion) e da tabela de sons de transição/golpe do MotorCamadas.tsx. Se o motor não compilar, essas partes avisam.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {MOTOR, RAIZ, lerEdicao, montarSegs, paraSaida, palavrasNaSaida, duracaoSaida, quadrosSaida, mmss, relogio, assinaturaMontagem} from './lib/saida.mjs';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opcao = (n, p) => (args.indexOf(n) === -1 ? p : args[args.indexOf(n) + 1]);

let edicao;
try {
	edicao = lerEdicao(proj, opcao('--edicao'));
} catch (e) {
	console.error(e.message);
	process.exit(1);
}
const {ed, edPath, idModelo, fps} = edicao;
const segs = montarSegs(ed, fps);
const dur = duracaoSaida(segs);
const NQ = quadrosSaida(segs, fps);
const Q = 1 / fps;

const linhas = [];
let nErros = 0, nAvisos = 0;
const secao = (t) => linhas.push('', `## ${t}`);
const ok = (t) => linhas.push(`✓ ${t}`);
const erro = (t) => (nErros++, linhas.push(`✗ ERRO: ${t}`));
const aviso = (t) => (nAvisos++, linhas.push(`! aviso: ${t}`));
const info = (t) => linhas.push(`  ${t}`);
const lista = (itens, max = 12) => {
	itens.slice(0, max).forEach((x) => info(`- ${x}`));
	if (itens.length > max) info(`- … e mais ${itens.length - max}`);
};
if (idModelo !== 'mix-edit-youtube') linhas.push(`(feito para o YOUTUBE - MIX EDIT; esta edição é "${idModelo}": as regras do MIX podem não valer)`);

// ---------- motor: registro de peças, estilo e curvas (compilados) + tabelas de som do MotorCamadas ----------
let REG = null, EST = null, CURVAS = null;
const problemasMotor = [];
try {
	const esbuild = await import('esbuild');
	const cache = path.join(MOTOR, 'node_modules', '.cache', 'checar-mix');
	fs.mkdirSync(cache, {recursive: true});
	const compilar = async (exports, nome) => {
		const out = path.join(cache, nome);
		await esbuild.build({stdin: {contents: exports, resolveDir: MOTOR, loader: 'ts'}, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', outfile: out, logLevel: 'silent'});
		return import(`${pathToFileURL(out).href}?t=${Date.now()}`);
	};
	try {
		const m = await compilar("export {CAMADAS} from './src/modelos/camadas.tsx'; export {ESTILOS} from './src/modelos/estilos.ts'; export {CURVAS} from './src/kit/tempo.ts';", 'registro.mjs');
		REG = m.CAMADAS;
		EST = m.ESTILOS[idModelo] ?? null;
		CURVAS = m.CURVAS;
	} catch (e) {
		problemasMotor.push(`o registro de camadas não compilou (${String(e.message).split('\n')[0]}): sons das peças não conferidos`);
		const m = await compilar("export {ESTILOS} from './src/modelos/estilos.ts'; export {CURVAS} from './src/kit/tempo.ts';", 'estilos.mjs');
		EST = m.ESTILOS[idModelo] ?? null;
		CURVAS = m.CURVAS;
	}
} catch (e) {
	problemasMotor.push(`o motor não compilou (${String(e.message).split('\n')[0]}): uso curvas e estilo de reserva`);
}
// curvas de reserva (as mesmas de src/kit/tempo.ts) se o motor não compilar
const bezier = (x1, y1, x2, y2) => (x) => {
	if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x));
	const bx = (t) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3;
	let a = 0, b = 1, t = x;
	for (let i = 0; i < 40; i++) (bx(t) < x ? (a = t) : (b = t)), (t = (a + b) / 2);
	return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
};
CURVAS ??= {suave: bezier(0.65, 0, 0.35, 1), entrada: bezier(0.16, 1, 0.3, 1), saida: bezier(0.7, 0, 0.84, 0), linear: (t) => t, expo: bezier(0.87, 0, 0.13, 1)};
EST ??= {zoom: [1, 1.03], curva: 'suave'};
const curva = (nome) => CURVAS[nome] ?? CURVAS.suave;

// SOM_TRANS e SOM_GOLPE lidos do código do motor (não são exportados)
const fonteMotor = fs.readFileSync(path.join(MOTOR, 'src', 'modelos', 'MotorCamadas.tsx'), 'utf8');
const tabela = (nome) => {
	const bloco = fonteMotor.match(new RegExp(`const ${nome}[^=]*=\\s*([\\[{][\\s\\S]*?\\n[\\]}];)`))?.[1] ?? '';
	return [...bloco.matchAll(/(?:(\w+):\s*)?\[\s*'([^']+)',\s*([\d.]+),\s*(-?[\d.]+)\s*\]/g)].map((m) => ({chave: m[1], som: m[2], vol: Number(m[3]), atraso: Number(m[4])}));
};
const SOM_TRANS = Object.fromEntries(tabela('SOM_TRANS').map((x) => [x.chave, x]));
const SOM_GOLPE = tabela('SOM_GOLPE');
if (!Object.keys(SOM_TRANS).length) problemasMotor.push('não achei a tabela SOM_TRANS no MotorCamadas.tsx: sons de transição não conferidos');

// ---------- cenas resolvidas (rodízio de zoom e enquadramento, como o resolverCenas do motor) ----------
const cenasJson = Array.isArray(ed.cenas) ? ed.cenas : [];
let kFala = 0;
const cenas = cenasJson.map((c, i) => {
	const r = {...c, n: i + 1};
	if (c.layout !== 'fala') return r;
	const sentido = kFala++ % 2;
	const pre = c.enquadramento ? EST.enquadramentos?.[c.enquadramento] : undefined;
	if (pre) return {...r, zoom: c.zoom ?? (sentido ? [pre.zoom[1], pre.zoom[0]] : [pre.zoom[0], pre.zoom[1]]), foco: c.foco ?? pre.foco};
	return c.zoom ? r : {...r, zoom: sentido ? [EST.zoom[1], EST.zoom[0]] : [EST.zoom[0], EST.zoom[1]]};
});
const cenaEm = (t) => cenas.find((c) => t >= c.ini - 1e-6 && t < c.fim - 1e-6);
// valor de um campo animado por chaves (mesma conta do animar() do motor)
const animar = (chaves, campo, s, base, cv) => {
	const pts = chaves.filter((k) => k[campo] !== undefined).map((k) => ({t: k.t, v: k[campo], curva: k.curva ?? cv})).sort((a, b) => a.t - b.t);
	if (!pts.length) return null;
	if (pts[0].t > 0) pts.unshift({t: 0, v: base, curva: cv});
	if (s <= pts[0].t) return pts[0].v;
	const mix = (a, b, e) => (typeof a === 'number' ? a + (b - a) * e : [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]);
	for (let i = 1; i < pts.length; i++) if (s < pts[i].t) return mix(pts[i - 1].v, pts[i].v, curva(pts[i].curva)((s - pts[i - 1].t) / (pts[i].t - pts[i - 1].t)));
	return pts[pts.length - 1].v;
};
const FOCO = ed.foco ?? [0.5, 0.4];
const camera = (c, t) => {
	const [z0, z1] = c.zoom ?? (c.layout === 'fala' ? EST.zoom : [1, 1]);
	const p = Math.min(1, Math.max(0, (t - c.ini) / Math.max(1e-6, c.fim - c.ini)));
	const cv = c.curva ?? EST.curva ?? 'suave';
	const ch = Array.isArray(c.chaves) && c.chaves.length ? c.chaves : null;
	const s = t - c.ini;
	return {
		zoom: (ch && animar(ch, 'zoom', s, z0, cv)) ?? z0 + (z1 - z0) * curva(cv)(p),
		foco: (ch && animar(ch, 'foco', s, c.foco ?? FOCO, cv)) ?? c.foco ?? FOCO,
		desfoque: (ch && animar(ch, 'desfoque', s, c.desfoque ?? 0, cv)) ?? c.desfoque ?? 0,
		escurecer: (ch && animar(ch, 'escurecer', s, c.escurecer ?? 0, cv)) ?? c.escurecer ?? 0,
	};
};
// punch dos golpes na escala (mesma conta do golpeEm do motor): sobe em 4 q (entrada) e volta no resto (suave)
const punchEm = (c, t) => {
	let p = 1;
	for (const g of Array.isArray(c?.golpes) ? c.golpes : []) {
		const durG = g.dur ?? 12;
		const q0 = (t - Math.round(g.t * fps) / fps) * 30 + 1e-6;
		if (q0 < -0.5 || q0 >= durG) continue;
		const q = Math.max(0, q0);
		const subida = Math.min(4, durG / 2);
		const pp = q < subida ? curva('entrada')(q / subida) : 1 - curva('suave')((q - subida) / (durG - subida));
		p *= 1 + ((g.punch ?? 1.1) - 1) * pp;
	}
	return p;
};
// posição do rosto (fração da largura) na saída: bruto com o mesmo aspecto do quadro → escala em volta do foco
const rostoX = (cam) => cam.foco[0] + cam.zoom * (FOCO[0] - cam.foco[0]);
const semRosto = (c, t) => !c || c.layout !== 'fala' || camera(c, t).desfoque >= 8;

const camadas = Array.isArray(ed.camadas) ? ed.camadas : [];
const golpes = cenas.flatMap((c) => (Array.isArray(c.golpes) ? c.golpes.map((g) => ({...g, cena: c.n})) : []));
const capitulos = (Array.isArray(ed.capitulos) ? ed.capitulos : []).filter((c) => typeof c?.t === 'number').sort((a, b) => a.t - b.t);

linhas.push(`# Checagem MIX: ${path.basename(proj)} · ${path.relative(proj, edPath)}`);
linhas.push(`Saída de ${mmss(dur)} (${NQ} quadros a ${fps} fps) · ${cenas.length} cenas · ${camadas.length} camadas · ${capitulos.length} capítulos · ${segs.length} trechos na montagem`);
problemasMotor.forEach((p) => aviso(p));

// ---------- 1. cenas: buracos, sobreposições, ordem ----------
secao('Cenas');
{
	const probs = [];
	if (!cenas.length) erro('nenhuma cena');
	cenas.forEach((c, i) => {
		if (!(c.fim > c.ini)) probs.push(['erro', `cena ${c.n}: fim (${c.fim}) não é maior que ini (${c.ini})`]);
		const ant = cenas[i - 1];
		if (!ant) {
			if (c.ini > Q / 2) probs.push(['erro', `buraco de ${(c.ini).toFixed(2)} s no começo (a 1ª cena começa em ${mmss(c.ini)}): tela preta`]);
			return;
		}
		if (c.ini < ant.ini) probs.push(['erro', `cena ${c.n} (${mmss(c.ini)}) está antes da cena ${ant.n} (${mmss(ant.ini)}): fora de ordem`]);
		const d = c.ini - ant.fim;
		if (d > Q / 2) probs.push(['erro', `buraco de ${d.toFixed(2)} s entre a cena ${ant.n} e a ${c.n} (${mmss(ant.fim)}–${mmss(c.ini)}): tela preta`]);
		else if (d < -Q / 2) probs.push(['erro', `cena ${c.n} começa ${(-d).toFixed(2)} s antes do fim da cena ${ant.n} (${mmss(c.ini)}): sobreposição`]);
	});
	const ult = cenas[cenas.length - 1];
	if (ult && dur - ult.fim > Q / 2) probs.push(['erro', `buraco de ${(dur - ult.fim).toFixed(2)} s no fim (a última cena acaba em ${mmss(ult.fim)}, o vídeo em ${mmss(dur)})`]);
	if (ult && ult.fim - dur > Q) probs.push(['aviso', `a última cena passa ${(ult.fim - dur).toFixed(2)} s do fim do vídeo (${mmss(dur)})`]);
	probs.forEach(([tipo, t]) => (tipo === 'erro' ? erro(t) : aviso(t)));
	if (!probs.length) ok(`${cenas.length} cenas cobrem 0:00–${mmss(dur)} sem buraco nem sobreposição`);
}

// ---------- 1b. piscadas (erro apontado pelo usuário em 06/10/2026: "a cada vez que ele dá o zoom a imagem pisca") ----------
// Plano de fala com menos de 30 q trocando o enquadramento pisca o zoom; corte dentro do rosto desfocado refazia o
// desfoque (24 → 0 → 24) e mostrava 1 quadro nítido e mais claro.
secao('Piscadas (plano de fala ≥ 30 q; rosto desfocado sem corte no meio)');
{
	const curtos = [], quebras = [];
	const desfocadoPerto = (cena, de, ate) => {
		for (let t = de; t <= ate + 1e-6; t += Q) if (camera(cena, t).desfoque >= 8) return true;
		return false;
	};
	cenas.forEach((c, i) => {
		const ant = cenas[i - 1], prox = cenas[i + 1];
		const troca = (v) => v?.layout === 'fala' && v.enquadramento !== c.enquadramento;
		if (c.layout === 'fala' && c.fim - c.ini < 1 - Q / 2 && (troca(ant) || troca(prox))) curtos.push(`cena ${c.n} (${mmss(c.ini)}): ${Math.round((c.fim - c.ini) * fps)} q no enquadramento ${c.enquadramento ?? '?'}, entre ${ant?.layout ?? '–'} ${ant?.enquadramento ?? ''} e ${prox?.layout ?? '–'} ${prox?.enquadramento ?? ''}`);
		if (!ant || c.layout !== 'fala' || ant.layout !== 'fala') return;
		const fimAnt = camera(ant, c.ini - Q).desfoque, iniC = camera(c, c.ini).desfoque;
		if (fimAnt >= 8 && iniC >= 8) quebras.push(`${mmss(c.ini)} (cenas ${ant.n} → ${c.n}): corte e troca de enquadramento sob o desfoque`);
		else if (Math.min(fimAnt, iniC) < 8 && desfocadoPerto(ant, Math.max(ant.ini, c.ini - 0.4), c.ini - Q) && desfocadoPerto(c, c.ini, Math.min(c.fim, c.ini + 0.4))) quebras.push(`${mmss(c.ini)} (cenas ${ant.n} → ${c.n}): o desfoque cai a ${Math.min(fimAnt, iniC).toFixed(0)} px no corte e volta`);
	});
	if (curtos.length) {
		erro(`${curtos.length} plano(s) de fala com menos de 30 q e outro enquadramento (pisca o zoom; junte ao vizinho):`);
		lista(curtos);
	} else ok('nenhum plano de fala com menos de 30 q trocando o enquadramento');
	if (quebras.length) {
		erro(`${quebras.length} corte(s) dentro do rosto desfocado (o bloco desfocado é uma cena só, com o desfoque entrando e saindo só nas pontas):`);
		lista(quebras);
	} else ok('rosto desfocado sem corte no meio');
}

// ---------- 2. zoom da pessoa > 1,20 por mais de 1 s (e nunca > 1,25), com o punch dos golpes ----------
// Os limites valem para bruto do tamanho do quadro (1080 no MIX); bruto maior aguenta mais zoom com a mesma nitidez
// (2K: × 1,33), então eles crescem na proporção do bruto (meta.json).
let fBruto = 1;
try {
	const m = JSON.parse(fs.readFileSync(path.join(proj, '02_analise', 'meta.json'), 'utf8'));
	const [bw, bh] = Math.abs(m.rotacao) === 90 ? [m.altura, m.largura] : [m.largura, m.altura];
	fBruto = Math.max(1, Math.min(bw / edicao.mod.largura, bh / edicao.mod.altura)) || 1;
} catch {}
const LIM = 1.2 * fBruto, LIM_GOLPE = 1.25 * fBruto;
const vg = (x) => x.toFixed(2).replace('.', ',');
secao(`Zoom na pessoa (máx. ${vg(LIM)} no corpo; ${vg(LIM_GOLPE)} só em golpe ≤ 1 s${fBruto > 1 ? `; bruto ${fBruto.toFixed(2)}× o quadro` : ''})`);
{
	const runs = [], picos = [];
	const corrida = {lim: null, alto: null}; // trecho em curso acima de cada limite
	const abrir = (k, t, c) => (corrida[k] ??= {ini: t, cen: c, pico: 0});
	const fechar = (k, t) => {
		const r = corrida[k];
		if (!r) return;
		if (k === 'lim' && t - r.ini > 1 + 1e-6) runs.push(`cena ${r.cen.n}: ${mmss(r.ini)}–${mmss(t)} (${(t - r.ini).toFixed(1)} s, até ${r.pico.toFixed(3)})`);
		if (k === 'alto') picos.push(`cena ${r.cen.n}: ${mmss(r.ini)}–${mmss(t)} (${(t - r.ini).toFixed(2)} s, até ${r.pico.toFixed(3)})`);
		corrida[k] = null;
	};
	for (let f = 0; f <= NQ; f++) {
		const t = f / fps;
		const c = f < NQ ? cenaEm(t) : null;
		const z = c?.layout === 'fala' ? camera(c, t).zoom * punchEm(c, t) : 0;
		for (const [k, lim] of [['lim', LIM], ['alto', LIM_GOLPE]]) {
			if (corrida[k] && (z <= lim + 1e-3 || c !== corrida[k].cen)) fechar(k, t);
			if (z > lim + 1e-3) abrir(k, t, c).pico = Math.max(corrida[k].pico, z);
		}
	}
	if (runs.length) {
		erro(`${runs.length} trecho(s) de cena 'fala' com zoom acima de ${vg(LIM)} por mais de 1 s (o bruto perde nitidez):`);
		lista(runs);
	}
	if (picos.length) {
		erro(`${picos.length} trecho(s) de cena 'fala' acima de ${vg(LIM_GOLPE)} (teto até no golpe; zoom da cena × punch):`);
		lista(picos);
	}
	if (!runs.length && !picos.length) ok(`nenhuma cena 'fala' passa de ${vg(LIM)} por mais de 1 s nem de ${vg(LIM_GOLPE)} (punch dos golpes incluído)`);
}

// ---------- 3. arquivos: repetidos e inexistentes ----------
secao('Arquivos');
{
	const ARQ = /\.(png|jpe?g|webp|gif|svg|avif|mp4|mov|webm|m4v|mkv|mp3|wav|m4a|aac|ogg|json|lottie)$/i;
	const coletar = (v, onde, out) => {
		if (typeof v === 'string') {
			if (/^https?:/i.test(v)) return;
			if (ARQ.test(v) || (/[/\\]$/.test(v) && /[/\\]./.test(v))) out.push({arq: v, onde});
		} else if (Array.isArray(v)) v.forEach((x, i) => coletar(x, `${onde}[${i}]`, out));
		else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => coletar(x, `${onde}.${k}`, out));
	};
	const visuais = []; // B-roll e arquivos de camada (regra: nenhum repetido)
	cenas.forEach((c) => {
		if (c.broll) visuais.push({arq: c.broll, onde: `cena ${c.n} (${mmss(c.ini)}) broll`});
		if (Array.isArray(c.sequencia)) c.sequencia.forEach((s, i) => visuais.push({arq: s, onde: `cena ${c.n} sequencia[${i}]`}));
	});
	camadas.forEach((c, i) => {
		const out = [];
		Object.entries(c).forEach(([k, v]) => !['ini', 'fim', 'tipo', 'plano', 'sfx'].includes(k) && coletar(v, k, out));
		out.forEach((o) => visuais.push({arq: o.arq, onde: `camada ${i + 1} ${c.tipo} (${mmss(c.ini)}) ${o.onde}`}));
	});
	const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
	// a regra vale para o material de B-roll (tudo em 04_broll/, menos os recortes da pessoa); ícones, logos e outras
	// peças fixas do kit podem (e devem) se repetir
	const ehBroll = (p) => /^04_broll\//.test(norm(p)) && !/^04_broll\/recortes\//.test(norm(p));
	const grupos = new Map();
	visuais.filter((v) => ehBroll(v.arq)).forEach((v) => grupos.set(norm(v.arq), [...(grupos.get(norm(v.arq)) ?? []), v]));
	const rep = [...grupos.values()].filter((g) => g.length > 1);
	if (rep.length) {
		erro(`${rep.length} arquivo(s) de B-roll repetido(s) (diretriz: nenhuma repetição no vídeo):`);
		lista(rep.map((g) => `${g[0].arq}: ${g.map((x) => x.onde).join(' · ')}`));
	} else ok(`${[...grupos.values()].reduce((a, g) => a + g.length, 0)} referências de B-roll (04_broll/) em cenas e camadas, nenhuma repetida`);
	// o mesmo arquivo com outro nome (ex.: copiado da biblioteca para meus/ e também baixado no banco): tamanho + 1º MB
	const porConteudo = new Map();
	for (const k of grupos.keys()) {
		try {
			const p = path.resolve(proj, k);
			const st = fs.statSync(p);
			if (!st.isFile() || !st.size) continue;
			const fd = fs.openSync(p, 'r');
			const buf = Buffer.alloc(Math.min(st.size, 1 << 20));
			fs.readSync(fd, buf, 0, buf.length, 0);
			fs.closeSync(fd);
			const h = `${st.size}:${crypto.createHash('md5').update(buf).digest('hex')}`;
			porConteudo.set(h, [...(porConteudo.get(h) ?? []), k]);
		} catch {}
	}
	const copias = [...porConteudo.values()].filter((g) => g.length > 1);
	if (copias.length) {
		aviso(`${copias.length} grupo(s) de arquivos de B-roll com nomes diferentes e o MESMO conteúdo:`);
		lista(copias.map((g) => g.join(' = ')));
	}

	// existência
	const todos = [...visuais];
	for (const [k, v] of [['bruto', ed.bruto], ['voz', ed.voz], ['palavras', ed.palavras]]) if (v) todos.push({arq: v, onde: k});
	const musicas = Array.isArray(ed.musica) ? ed.musica : ed.musica ? [ed.musica] : [];
	musicas.forEach((m, i) => m?.arquivo && todos.push({arq: m.arquivo, onde: `musica${musicas.length > 1 ? `[${i}]` : ''}`}));
	(ed.recortes ?? []).forEach((r, i) => todos.push({arq: r.arquivo, onde: `recortes[${i}]`}));
	const faltando = todos.filter(({arq}) => {
		const p = path.resolve(proj, arq);
		if (/[/\\]$/.test(arq)) return !fs.existsSync(path.join(p, 'q0001.webp')) && !(fs.existsSync(p) && fs.readdirSync(p).length);
		return !fs.existsSync(p);
	});
	// sons: o render copia 02_BIBLIOTECA/sfx para 05_audio/sfx; vale qualquer um dos dois
	const sonsUsados = new Set();
	(ed.sfx ?? []).forEach((s) => s?.som && sonsUsados.add(s.som));
	camadas.forEach((c) => typeof c.sfx === 'string' && sonsUsados.add(c.sfx));
	const somFalta = [...sonsUsados].filter((s) => !fs.existsSync(path.join(proj, '05_audio', 'sfx', `${s}.wav`)) && !fs.existsSync(path.join(RAIZ, '02_BIBLIOTECA', 'sfx', `${s}.wav`)));
	if (faltando.length || somFalta.length) {
		erro(`${faltando.length + somFalta.length} arquivo(s) referenciado(s) não existe(m):`);
		lista([...faltando.map((f) => `${f.arq} (${f.onde})`), ...somFalta.map((s) => `som ${s}.wav (nem em 05_audio/sfx nem em 02_BIBLIOTECA/sfx)`)]);
	} else ok(`${todos.length} arquivos e ${sonsUsados.size} sons manuais existem`);
}

// ---------- 4. flashes (WCAG 2.3.1: no máximo 3 por segundo) ----------
secao('Flashes (máx. 3 por segundo)');
{
	const fl = [];
	cenas.forEach((c, i) => {
		if (c.transicao === 'flash' && i > 0) fl.push({t: c.ini, o: `transição flash da cena ${c.n}`});
		if (c.transicao === 'silhueta') fl.push({t: c.ini, o: `silhueta da cena ${c.n}`});
	});
	golpes.forEach((g) => (g.flash ?? 0.7) > 0 && fl.push({t: g.t, o: `golpe da cena ${g.cena}`}));
	camadas.forEach((c, i) => {
		if (c.tipo !== 'flash-foto' || !Array.isArray(c.fotos)) return;
		// as fotos que o motor aceita (a peça descarta sozinha as que quebram o respiro ou o limite): 1 obturador por foto
		let tempos = null;
		const peca = REG?.['flash-foto'];
		if (peca?.sons) {
			// a peça explica no console cada foto descartada (e só uma vez por mensagem): vira aviso aqui
			const motivos = [];
			const warn = console.warn;
			console.warn = (...m) => motivos.push(m.join(' '));
			try {
				tempos = peca.sons(c, fps).map((s) => s.t);
			} catch {
			} finally {
				console.warn = warn;
			}
			motivos.forEach((m) => aviso(`camada ${i + 1} (${mmss(c.ini)}), aviso do motor: ${m}`));
		}
		if (tempos) tempos.forEach((t, k) => fl.push({t: c.ini + t, o: `flash-foto (camada ${i + 1}) foto aceita ${k + 1}`}));
		else c.fotos.forEach((f, k) => Number.isFinite(f?.t) && fl.push({t: c.ini + f.t, o: `flash-foto (camada ${i + 1}) foto ${k + 1}`}));
	});
	fl.sort((a, b) => a.t - b.t);
	// janelas de 1 s com mais de 3 flashes; janelas que se encostam viram um trecho só (com o pior número)
	const juntarJanelas = (tempos, nomes, limite = Infinity) => {
		const out = [];
		for (let i = 0; i < tempos.length; i++) {
			const dentro = tempos.map((t, k) => k).filter((k) => tempos[k] >= tempos[i] - 1e-6 && tempos[k] < tempos[i] + 1 - 1e-6);
			const n = nomes ? dentro.length : Math.floor(dentro.length / 2); // medido: 2 inversões = 1 flash
			if (n <= 3) continue;
			const u = out[out.length - 1];
			if (u && tempos[i] <= u.fim + 1e-6) (u.fim = Math.max(u.fim, tempos[i] + 1)), (u.n = Math.max(u.n, n)), dentro.forEach((k) => nomes && u.itens.add(nomes[k]));
			else out.push({ini: tempos[i], fim: tempos[i] + 1, n, itens: new Set(nomes ? dentro.map((k) => nomes[k]) : [])});
		}
		return out.map((u) => `${mmss(u.ini)}–${mmss(Math.min(u.fim, limite))}: até ${u.n} flashes em 1 s${u.itens.size ? ` (${[...u.itens].join(', ')})` : ''}`);
	};
	const ruins = juntarJanelas(fl.map((x) => x.t), fl.map((x) => x.o), dur);
	if (ruins.length) {
		erro('mais de 3 flashes em 1 s (transições flash, golpes e fotos do flash-foto que o motor aceita):');
		lista(ruins);
	} else ok(`${fl.length} flashes no edicao.json, nunca mais de 3 em 1 s`);

	const video = opcao('--video');
	if (video) {
		const v = path.resolve(video);
		const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', v, '-an', '-vf', 'scale=320:-2,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
		const ys = [...(r.stdout ?? '').matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
		const fpsV = Number((spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', v], {encoding: 'utf8'}).stdout.trim() || `${fps}/1`).split('/').reduce((a, b) => a / b));
		// inversões: mudanças ≥ 26 (0–255) no sentido contrário ao anterior, com o lado escuro < 204
		// o extremo acompanha a subida (máximo) ou a descida (mínimo); inverter ≥ 26 a partir dele é uma transição
		const trans = [];
		let ext = ys[0], dir = 0;
		for (let n = 1; n < ys.length; n++) {
			const y = ys[n];
			if ((dir === 1 && y > ext) || (dir === -1 && y < ext)) {
				ext = y;
				continue;
			}
			if (Math.abs(y - ext) >= 26) {
				if (Math.min(y, ext) < 204) trans.push(n);
				dir = Math.sign(y - ext);
				ext = y;
			}
		}
		const piores = juntarJanelas(trans.map((n) => n / fpsV), null, ys.length / fpsV);
		if (!ys.length) aviso(`não consegui medir ${v}`);
		else if (piores.length) {
			erro(`medido na prévia (${path.basename(v)}): mais de 3 flashes em 1 s:`);
			lista(piores);
		} else ok(`medido na prévia (${path.basename(v)}, ${ys.length} quadros): ${Math.floor(trans.length / 2)} flashes no total, nunca mais de 3 em 1 s`);
		// piscadas: 1–2 quadros que fogem ≥ 6 dos vizinhos (que ficam a < 3 um do outro). O flash acima (≥ 26) não pega:
		// o quadro nítido no meio do rosto desfocado subia só 14–24 (06/10/2026). Transição flash e golpe são de propósito.
		const proposito = [...cenas.filter((c) => c.transicao === 'flash').map((c) => c.ini), ...golpes.map((g) => g.t)];
		const piscas = [];
		for (let n = 1; n + 2 < ys.length; n++) {
			const [a, b, c2, d] = [ys[n - 1], ys[n], ys[n + 1], ys[n + 2]];
			const um = Math.abs(b - a) >= 6 && Math.abs(b - c2) >= 6 && Math.abs(a - c2) < 3 && Math.sign(b - a) === Math.sign(b - c2);
			const dois = !um && Math.abs(b - a) >= 6 && Math.abs(c2 - d) >= 6 && Math.abs(a - d) < 3 && Math.abs(b - c2) < 6 && Math.sign(b - a) === Math.sign(c2 - d);
			const t = n / fpsV;
			if ((um || dois) && !proposito.some((p) => Math.abs(p - t) < 0.2)) piscas.push(`${mmss(t)} (q ${n}): ${a.toFixed(0)} → ${b.toFixed(0)} por ${um ? 1 : 2} q`);
		}
		if (piscas.length) {
			erro(`medido na prévia: ${piscas.length} piscada(s) de 1–2 quadros (conferir o corte mais perto):`);
			lista(piscas, 20);
		} else ok('medido na prévia: nenhuma piscada de 1–2 quadros');
	}
}

// ---------- 5. camadas 'atras' x recortes ----------
secao("Texto atrás da pessoa (camadas 'atras' x recortes)");
{
	const cob = (ed.recortes ?? []).flatMap((r) =>
		segs.flatMap((s) => {
			if (s.bruto == null) return [];
			const a = Math.max(r.brutoIni, s.bruto), b = Math.min(r.brutoFim, s.bruto + (s.fim - s.ini));
			return b - a > Q ? [[s.ini + (a - s.bruto), s.ini + (b - s.bruto)]] : [];
		}),
	).sort((x, y) => x[0] - y[0]);
	const atras = camadas.map((c, i) => ({...c, n: i + 1})).filter((c) => c.plano === 'atras');
	const fora = [];
	atras.forEach((c) => {
		let t = c.ini;
		const buracos = [];
		for (const [a, b] of cob) {
			if (b <= t + Q / 2) continue;
			if (a > t + Q) buracos.push([t, Math.min(a, c.fim)]);
			t = Math.max(t, b);
			if (t >= c.fim - Q / 2) break;
		}
		if (t < c.fim - Q) buracos.push([t, c.fim]);
		const sobra = buracos.filter(([a, b]) => b - a > Q);
		if (sobra.length) fora.push(`camada ${c.n} ${c.tipo} (${mmss(c.ini)}–${mmss(c.fim)}): sem recorte em ${sobra.map(([a, b]) => `${mmss(a)}–${mmss(b)}`).join(', ')}`);
	});
	if (fora.length) {
		erro(`${fora.length} camada(s) 'atras' fora da cobertura dos recortes (o texto passaria na frente da pessoa):`);
		lista(fora);
	} else ok(atras.length ? `${atras.length} camada(s) 'atras', todas dentro dos recortes` : "nenhuma camada 'atras'");
	const totalRec = cob.reduce((s, [a, b]) => s + (b - a), 0);
	if (totalRec > 10) aviso(`${totalRec.toFixed(1)} s de recorte na saída (orçamento: ≤ 10 s por vídeo, ≤ 4 usos)`);
}

// ---------- 6. capítulos ----------
secao('Capítulos (YouTube: 0:00, ≥ 3, cada um ≥ 10 s; guia: a cada 2,5–4 min, 5–8 em 20–25 min)');
{
	if (!capitulos.length) erro('o edicao.json não tem "capitulos" (o render por partes e a descrição do YouTube usam)');
	else {
		const lst = capitulos[0].t <= 0.5 ? capitulos.map((c, i) => (i ? c : {...c, t: 0})) : [{t: 0, titulo: '(Introdução, automática)'}, ...capitulos];
		if (capitulos[0].t > 0.5) aviso(`o 1º capítulo começa em ${relogio(capitulos[0].t)}: o srt-saida.mjs põe "0:00 Introdução" antes`);
		if (lst.length < 3) erro(`só ${lst.length} capítulos: o YouTube exige no mínimo 3`);
		const min = dur / 60;
		if (min >= 20 && min <= 25 && (lst.length < 5 || lst.length > 8)) aviso(`${lst.length} capítulos num vídeo de ${min.toFixed(1)} min (guia: 5–8)`);
		lst.forEach((c, i) => {
			const fim = lst[i + 1]?.t ?? dur;
			const d = fim - c.t;
			const nome = `${relogio(c.t)} ${c.titulo ?? ''}`.trim();
			if (c.t >= dur) erro(`"${nome}" começa depois do fim do vídeo`);
			else if (d < 10) erro(`"${nome}" tem ${d.toFixed(1)} s (o YouTube exige ≥ 10 s)`);
			else if (i > 0 && i < lst.length - 1 && (d < 150 || d > 240)) aviso(`"${nome}" dura ${mmss(d)} (guia: 2,5–4 min entre capítulos)`);
			info(`${nome.padEnd(48)} ${mmss(d)}`);
		});
	}
}

// ---------- 7. tempo sem rosto (cobertura: B-roll, telas, rosto desfocado) ----------
// O alvo é do CORPO: a intro (1º capítulo) tem regras próprias e fica fora da conta, como capítulo de menos de 1 min
// (tela final, encerramento curto), que não dá para medir em porcentagem.
secao('Tempo sem rosto (alvo 25–35% do corpo, sem a intro; por capítulo 25–40%)');
{
	const lim = [0, ...capitulos.map((c) => c.t).filter((t) => t > 0.5 && t < dur), dur];
	const nomes = [capitulos[0]?.t <= 0.5 ? capitulos[0].titulo : 'Introdução', ...capitulos.filter((c) => c.t > 0.5 && c.t < dur).map((c) => c.titulo)];
	let tot = 0;
	const por = lim.slice(1).map(() => 0);
	for (let f = 0; f < NQ; f++) {
		const t = f / fps;
		if (!semRosto(cenaEm(t), t)) continue;
		tot++;
		por[Math.max(0, lim.findIndex((x, k) => t >= x && t < lim[k + 1]))]++;
	}
	const comIntro = lim.length > 2; // com capítulos, o corpo começa no 2º
	const iniCorpo = comIntro ? lim[1] : 0;
	const qCorpo = por.slice(comIntro ? 1 : 0).reduce((a, b) => a + b, 0);
	const pctCorpo = (100 * qCorpo) / Math.max(1, (dur - iniCorpo) * fps);
	(pctCorpo < 25 || pctCorpo > 35 ? aviso : ok)(`sem rosto em ${pctCorpo.toFixed(0)}% do corpo (${mmss(qCorpo / fps)} de ${mmss(dur - iniCorpo)}${comIntro ? `, de ${relogio(iniCorpo)} ao fim` : ''})`);
	info(`vídeo todo: ${((100 * tot) / NQ).toFixed(0)}% (${mmss(tot / fps)} de ${mmss(dur)})`);
	por.forEach((q, k) => {
		const d = lim[k + 1] - lim[k];
		const p = (100 * q) / Math.max(1, d * fps);
		const nota = k === 0 && comIntro ? ' (intro: fora da conta)' : d < 60 ? ' (menos de 1 min: fora da conta)' : '';
		if (!nota && (p < 25 || p > 40)) aviso(`capítulo "${nomes[k]}": ${p.toFixed(0)}% sem rosto`);
		else info(`${String(nomes[k]).padEnd(48)} ${p.toFixed(0)}%${nota}`);
	});
}

// ---------- 8. SFX: volume durante a fala e espaçamento ----------
secao('SFX (MIX: ≥ 0,45 durante a fala; nunca 2 sons a < 8 q)');
{
	const palavras = (() => {
		try {
			return palavrasNaSaida(JSON.parse(fs.readFileSync(path.resolve(proj, ed.palavras), 'utf8')), segs);
		} catch {
			aviso('não consegui ler o palavras.json: SFX durante a fala não conferido');
			return [];
		}
	})();
	const falando = new Uint8Array(NQ + 1);
	palavras.forEach((w) => {
		for (let f = Math.floor((w.ini - 0.15) * fps); f <= Math.ceil((w.fim + 0.3) * fps); f++) if (f >= 0 && f <= NQ) falando[f] = 1;
	});
	const sons = [];
	(ed.sfx ?? []).forEach((s, i) => sons.push({t: s.t, som: s.som, vol: s.vol ?? 0.5, o: `sfx manual ${i + 1}`, peca: `sfx ${i}`}));
	if (ed.sfxAuto !== false) {
		const gs = EST.ganhoSfx;
		const ganho = (v) => (gs ? Math.min(gs.teto, Math.max(gs.piso ?? 0, v * gs.fator)) : v);
		let lentes = 0;
		cenas.forEach((c, i) => {
			if (!c.transicao || (i === 0 && c.transicao !== 'silhueta')) return;
			if (c.transicao === 'lente' && lentes++ % 3 !== 0) return;
			const s = SOM_TRANS[c.transicao];
			if (s) sons.push({t: Math.max(0, c.ini + s.atraso), som: s.som, vol: EST.volTrans?.[c.transicao] ?? s.vol, o: `transição ${c.transicao} (cena ${c.n})`, peca: `trans ${c.n}`});
		});
		golpes.forEach((g, k) => g.som !== false && SOM_GOLPE.forEach((s) => sons.push({t: Math.max(0, g.t + s.atraso), som: s.som, vol: s.vol, o: `golpe (cena ${g.cena})`, peca: `golpe ${k}`})));
		camadas.forEach((c, i) => {
			const peca = REG?.[c.tipo];
			if (REG && !peca) aviso(`camada ${i + 1}: tipo "${c.tipo}" não está no registro do motor (não aparece no vídeo)`);
			const o = `camada ${i + 1} ${c.tipo}`;
			if (c.sfx !== false) {
				if (typeof c.sfx === 'string') sons.push({t: c.ini, som: c.sfx, vol: gs ? ganho(0.55) : 0.55, o, peca: o});
				else if (peca?.sfx) sons.push({t: c.ini, som: peca.sfx[0], vol: gs ? ganho(peca.sfx[1]) : Math.min(0.7, peca.sfx[1] * 1.5), o, peca: o});
			}
			if (c.sons !== false && peca?.sons) {
				// os avisos que a própria peça imprime (ex.: flash-foto descartando foto) entram no relatório
				const avisosPeca = [];
				const warn = console.warn;
				console.warn = (...m) => avisosPeca.push(m.join(' '));
				try {
					peca.sons(c, fps).forEach((s) => s.t >= 0 && s.t < c.fim - c.ini && sons.push({t: c.ini + s.t, som: s.som, vol: ganho(s.vol), o: `${o} (evento)`, peca: o}));
				} catch (e) {
					aviso(`${o}: os sons internos da peça falharam (${e.message})`);
				} finally {
					console.warn = warn;
				}
				avisosPeca.forEach((m) => aviso(`${o} (${mmss(c.ini)}), aviso do motor: ${m}`));
			}
		});
	}
	sons.sort((a, b) => a.t - b.t);
	const baixos = sons.filter((s) => s.vol < 0.45 && falando[Math.round(s.t * fps)] === 1);
	if (baixos.length) {
		aviso(`${baixos.length} de ${sons.length} SFX abaixo de 0,45 durante a fala (somem por baixo da voz; piso da correção 3: 0,55):`);
		lista(baixos.map((s) => `${mmss(s.t)} ${s.som.split('/').pop()} vol ${s.vol.toFixed(2)} (${s.o})`));
	} else ok(`${sons.length} SFX; nenhum abaixo de 0,45 durante a fala`);
	const colados = [];
	for (let i = 1; i < sons.length; i++) {
		const a = sons[i - 1], b = sons[i];
		if (b.t - a.t < 8 / 30 && a.peca !== b.peca) colados.push(`${mmss(a.t)}: ${a.o} + ${b.o} (${((b.t - a.t) * 30).toFixed(1).replace('.', ',')} q)`);
	}
	if (colados.length) {
		aviso(`${colados.length} par(es) de sons de peças diferentes a menos de 8 q:`);
		lista(colados);
	}
}

// ---------- 9. ritmo: rosto nítido sem evento, junções sem reenquadramento ----------
secao('Ritmo (rosto nítido ≤ 10 s sem evento; toda junção visível reenquadra ou é coberta)');
{
	const eventos = [...cenas.map((c) => c.ini), ...camadas.flatMap((c) => [c.ini, c.fim]), ...golpes.map((g) => g.t), ...cenas.flatMap((c) => (Array.isArray(c.chaves) ? c.chaves.map((k) => c.ini + k.t) : []))].sort((a, b) => a - b);
	const longos = [];
	cenas.forEach((c) => {
		if (c.layout !== 'fala' || (c.desfoque ?? 0) >= 8) return;
		const ev = [c.ini, ...eventos.filter((t) => t > c.ini && t < c.fim), c.fim];
		for (let i = 1; i < ev.length; i++) if (ev[i] - ev[i - 1] > 10 + 1e-6) longos.push(`cena ${c.n}: ${mmss(ev[i - 1])}–${mmss(ev[i])} (${(ev[i] - ev[i - 1]).toFixed(1)} s)`);
	});
	if (longos.length) {
		aviso(`${longos.length} trecho(s) de rosto nítido com mais de 10 s sem evento novo (cena, camada, chave, golpe):`);
		lista(longos);
	} else ok('nenhum trecho de rosto nítido passa de 10 s sem evento');

	// junções: as do bruto (juncoes.mjs, tempos do bruto convertidos pela montagem atual) + os cortes da montagem
	const arqJ = path.join(proj, '02_analise', 'juncoes.json');
	const juncoes = [];
	if (fs.existsSync(arqJ)) {
		const j = JSON.parse(fs.readFileSync(arqJ, 'utf8'));
		// o detector só procura dentro dos trechos da montagem com que rodou: montagem diferente pode ter emendas não medidas
		const mesma = j.montagem === assinaturaMontagem(ed);
		if (!mesma) aviso(`02_analise/juncoes.json foi medido com outra montagem (${j.edicao ?? '?'}): rode node scripts/juncoes.mjs <proj> --edicao ${path.relative(proj, edPath).replace(/\\/g, '/')} (usa o cache, ~15 s)`);
		(j.juncoes ?? []).forEach((x) => {
			// mesma montagem: o tempo na saída do próprio arquivo (certo também em trecho do bruto usado 2×)
			const t = mesma && Number.isFinite(x.saida) ? x.saida : paraSaida(x.bruto, segs);
			if (t != null) juncoes.push({t, o: `emenda do bruto ${x.bruto.toFixed(2)} s (${x.nivel})`, borda: x.borda});
		});
	} else info('(sem 02_analise/juncoes.json: rode scripts/juncoes.mjs para conferir as emendas internas do bruto)');
	for (let i = 1; i < segs.length; i++) {
		const p = segs[i - 1], s = segs[i];
		if (p.bruto != null && s.bruto != null && Math.abs(p.bruto + (p.fim - p.ini) - s.bruto) > Q / 2) juncoes.push({t: s.ini, o: `corte da montagem (trecho ${i + 1})`, corte: true});
	}
	// emenda colada num corte da montagem (a ≤ 3 q) é o mesmo salto visto duas vezes: fica uma linha só
	juncoes.sort((a, b) => a.t - b.t);
	const unicas = [];
	for (const j of juncoes) {
		const u = unicas[unicas.length - 1];
		if (u && j.t - u.t <= 3 * Q + 1e-6) {
			u.o += ` + ${j.o}`;
			u.borda ??= j.borda;
		} else unicas.push({...j});
	}
	const pct1 = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
	const semTroca = [], fracas = [];
	unicas.forEach((j) => {
		const c = cenaEm(j.t);
		if (semRosto(c, j.t) || semRosto(cenaEm(j.t - Q), j.t - Q)) return; // coberta (B-roll, tela, rosto desfocado)
		const cobre = camadas.some((k) => k.tipo === 'flash-foto' && Array.isArray(k.fotos) && k.fotos.some((f) => Math.abs(k.ini + f.t - j.t) < 0.2));
		if (cobre) return;
		const dica = j.borda ? ` · emenda colada na borda do trecho: ${j.borda}` : '';
		const ini = cenas.find((x) => Math.abs(x.ini - j.t) <= 2 * Q + 1e-6);
		if (!ini) return semTroca.push(`${mmss(j.t)} ${j.o}${dica}`);
		if (ini.transicao && ini.transicao !== 'corte') return; // a transição (blur, lente, flash...) já disfarça o salto
		const ant = cenaEm(ini.ini - Q);
		if (!ant || ant.layout !== 'fala') return;
		const a = camera(ant, ini.ini - Q), b = camera(ini, ini.ini);
		const dEsc = Math.abs(b.zoom / a.zoom - 1), dX = Math.abs(rostoX(b) - rostoX(a));
		// tolerância de 0,5 ponto: 1,00 → 1,10 medido 1 q antes do fim da cena dá 9,97%
		if (dEsc < 0.095 && dX < 0.05) fracas.push(`${mmss(j.t)} ${j.o}: escala ${pct1(dEsc)} e rosto ${pct1(dX)} W (precisa de ≥ 10% ou ≥ 5% W)${dica}`);
	});
	if (semTroca.length) {
		aviso(`${semTroca.length} de ${unicas.length} junções visíveis caem no meio de uma cena de rosto nítido (sem troca de enquadramento nem cobertura):`);
		lista(semTroca);
	}
	if (fracas.length) {
		aviso(`${fracas.length} junções com troca de cena mas enquadramento quase igual (correção 1):`);
		lista(fracas);
	}
	if (unicas.length && !semTroca.length && !fracas.length) ok(`${unicas.length} junções visíveis, todas reenquadradas ou cobertas`);
}

// ---------- relatório ----------
const resumo = nErros ? `${nErros} ERRO(S) e ${nAvisos} aviso(s)` : nAvisos ? `nenhum erro · ${nAvisos} aviso(s)` : 'tudo certo';
linhas.splice(2, 0, `**Resultado: ${resumo}**`);
const texto = linhas.join('\n') + '\n';
const base = path.basename(edPath, '.json').replace(/^edicao_?/, '');
const destino = path.join(proj, '03_roteiro', `checagem${base ? `_${base}` : ''}.md`);
const semRelatorio = args.includes('--sem-relatorio');
if (!semRelatorio) fs.writeFileSync(destino, texto);
console.log(texto);
console.log(`[checar-mix] ${resumo}${semRelatorio ? '' : ` · relatório em ${path.relative(proj, destino)}`}`);
process.exit(nErros ? 1 : 0);
