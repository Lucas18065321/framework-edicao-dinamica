// Gráfico de linha (YOUTUBE - MIX EDIT, peça `grafico-linha`): 1–3 séries que se desenham com cabeça de brilho
// (getPointAtLength), anéis no ponto final em 6 q, eixos com rótulos e o cruzamento entre as duas primeiras séries
// destacado. Uso: curva no tempo (o gasto que volta: "economizei 10 mil e gastei 12 depois"; audiência ao longo do dia;
// seguidores depois de parar de postar, com dado). Sobre a tela grade ou o rosto desfocado. 150–270 q, no máximo 1 por minuto.
// Ética (guia, correção 7): sem `fonte`, o gráfico é "esquemático" por padrão: selo ESQUEMÁTICO (pílula tracejada,
// corpo 26 px) no rodapé, no lugar da procedência, com a nota "ilustração, sem escala real", e eixo Y sem números
// (não inventa escala). Com dado real, passe `fonte` (rodapé de 26 px) e `esquematico: false`; com poucos pontos medidos,
// `interpolacao: 'reta'` (segmentos retos: nenhuma forma inventada entre as medidas).
// Sequência: frase de apoio em cascata Apple (alto à esquerda) e selo; os eixos se desenham em 10 q com setas; cada série
// desenha no seu `t` (16 q por segmento, curva "desenho"; interpolação monotônica: sem barriga falsa entre pontos) com
// a cabeça brilhando; pontos com `rotulo` (ex.: "−10 mil") ganham marcador e etiqueta quando a cabeça passa; no fim
// da série, 2 anéis abrem em 6 q e o nome da série entra ao lado do ponto final (que pulsa de leve, ambiente). A etiqueta
// do ÚLTIMO ponto entra embaixo do nome (à direita da área, onde nunca passa linha); a do 1º ponto vai para dentro.
// Quando as duas primeiras séries já passaram do cruzamento: anel no acento, linha tracejada até o eixo X e a etiqueta
// `cruzamento` numa pílula no acento. Rodapé de fonte depois da 1ª série (≥ 3 s no ar). Saída: 10 q, blur 0→10, subida.
// Parâmetros:
//   series: [{nome, pontos (números = y com x 0,1,2…; ou [x, y]; ou {x?, y, rotulo?}), cor? ('creme' | 'acento' | 'gelo'
//     | hex; padrão creme, acento, gelo), t? (s em que começa a desenhar; padrão 0,45), dur? (s; padrão 16 q por segmento,
//     entre 0,9 e 3 s)}],
//   eixoX ({rotulo?, marcas?} ou só o texto do rótulo; marcas = strings espalhadas de ponta a ponta ('' = só o traço)
//     ou [{x, texto}] / [[x, texto]] na posição do dado),
//   eixoY ({rotulo?, min?, max?, marcas?: number[] (só sem esquemático)} ou só o texto do rótulo),
//   cruzamento (texto da etiqueta no cruzamento das séries 1 e 2; false = sem destaque; padrão: só o anel e a linha),
//   cruzamentoN (qual troca de lado destacar: 1 = a primeira; padrão 1),
//   interpolacao ('curva' | 'reta'; padrão 'curva'),
//   titulo (frase de apoio; *palavra* = destaque), rotulo (micro-rótulo acima do título), fonte (rodapé "Fonte: …"),
//   fonteT (s; padrão 0,3 s depois do fim da 1ª série, antecipado para ficar ≥ 3 s no ar),
//   esquematico (padrão: true se não houver fonte), seloTexto ("Esquemático"), seloNota ("ilustração, sem escala real";
//     com `fonte` junto, a nota sai e a fonte vem logo depois do selo, na mesma linha),
//   area ([x0, y0, x1, y1] da área do gráfico em fração do quadro; padrão [0.13, 0.32, 0.68, 0.74], com a base subindo
//     sozinha para marcas e rótulo do eixo X não encostarem no rodapé),
//   espessura (px da linha, 5), tamanhoNome (58), tamanhoNota (60), tamanhoEixo (38: marcas e rótulos dos eixos),
//   tituloX (0.1), tituloY (0.22).
// Sons (registro): sfxGraficoLinha na entrada (whoosh de dados, cobre a 1ª série); sonsGraficoLinha = whoosh nas séries
// que começam ≥ 1 s depois, pop no fim de cada série, clique no cruzamento, seleção nas etiquetas dos pontos e clique
// alto no rodapé de fonte (se não cair a < 8 q de outro som).
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import type {Estilo} from '../../modelos/estilos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {ALTURA_RODAPE, FraseApoio, Rodape, comSomFonte, tempoFonte} from './grafico-barras';

export const sfxGraficoLinha: [string, number] = ['motionix/whooshes/whooshes_07_data-whoosh', 0.45];
const SOM_DESENHA = 'motionix/whooshes/whooshes_07_data-whoosh';
const SOM_FIM = 'motionix/pop/pop_05_smooth-pop';
const SOM_CRUZA = 'motionix/clicks/clicks_01_cinematic-click';
const SOM_NOTA = 'motionix/ui-sound-effects/ui-sound-effects_13_ui-granular-button-select-9';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fase = (t: number, ini: number, fim: number, curva: (x: number) => number = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const DESENHO = Easing.bezier(0.25, 0.15, 0.5, 1);
const ASSENTO = Easing.bezier(0.22, 1, 0.36, 1);
const GELO = '#AFC8DA';

// inversa de uma curva monotônica crescente (busca binária)
const inversa = (f: (x: number) => number, y: number) => {
	let a = 0;
	let b = 1;
	for (let k = 0; k < 30; k++) {
		const m = (a + b) / 2;
		if (f(m) < y) a = m;
		else b = m;
	}
	return (a + b) / 2;
};

type P = [number, number];
// Curva monotônica em x (Steffen, como a curveMonotoneX do d3): passa por todos os pontos sem barriga falsa entre eles.
// Devolve o caminho SVG e y(x) exato (o x da bezier é linear no parâmetro, então cada trecho é um Hermite).
const monotonica = (pts: P[]) => {
	const n = pts.length;
	const sinal = (v: number) => (v < 0 ? -1 : 1);
	const tan: number[] = new Array(n).fill(0);
	const sec = (i: number) => (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1e-9);
	for (let i = 1; i < n - 1; i++) {
		const h0 = pts[i][0] - pts[i - 1][0];
		const h1 = pts[i + 1][0] - pts[i][0];
		const s0 = sec(i - 1);
		const s1 = sec(i);
		const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1e-9);
		tan[i] = (sinal(s0) + sinal(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
	}
	if (n > 1) {
		const h0 = pts[1][0] - pts[0][0];
		tan[0] = n > 2 ? (3 * sec(0) - tan[1]) / 2 : sec(0);
		const hN = pts[n - 1][0] - pts[n - 2][0];
		tan[n - 1] = n > 2 ? (3 * sec(n - 2) - tan[n - 2]) / 2 : sec(n - 2);
		if (!h0 || !hN) tan.fill(0);
	}
	const segs: string[] = [];
	for (let i = 0; i < n - 1; i++) {
		const [x0, y0] = pts[i];
		const [x1, y1] = pts[i + 1];
		const dx = (x1 - x0) / 3;
		segs.push(`C ${x0 + dx} ${y0 + dx * tan[i]} ${x1 - dx} ${y1 - dx * tan[i + 1]} ${x1} ${y1}`);
	}
	const d = `M ${pts[0][0]} ${pts[0][1]} ${segs.join(' ')}`;
	const yEm = (x: number) => {
		let i = 0;
		while (i < n - 2 && x > pts[i + 1][0]) i++;
		const [x0, y0] = pts[i];
		const [x1, y1] = pts[i + 1];
		const h = x1 - x0 || 1e-9;
		const s = Math.min(1, Math.max(0, (x - x0) / h));
		const s2 = s * s;
		const s3 = s2 * s;
		return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * tan[i] + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * tan[i + 1];
	};
	return {d, yEm};
};

// Segmentos retos entre os pontos (dado medido em poucos instantes: nenhuma forma inventada entre eles)
const reta = (pts: P[]) => {
	const d = `M ${pts[0][0]} ${pts[0][1]} ${pts
		.slice(1)
		.map(([x, y]) => `L ${x} ${y}`)
		.join(' ')}`;
	const yEm = (x: number) => {
		let i = 0;
		while (i < pts.length - 2 && x > pts[i + 1][0]) i++;
		const [x0, y0] = pts[i];
		const [x1, y1] = pts[i + 1];
		const s = Math.min(1, Math.max(0, (x - x0) / (x1 - x0 || 1e-9)));
		return y0 + (y1 - y0) * s;
	};
	return {d, yEm};
};

// comprimento do caminho até a cabeça chegar ao x dado (x cresce com o comprimento)
const compEmX = (d: string, len: number, x: number) => {
	let a = 0;
	let b = len;
	for (let k = 0; k < 22; k++) {
		const m = (a + b) / 2;
		const p = getPointAtLength(d, m);
		if ((p?.x ?? 0) < x) a = m;
		else b = m;
	}
	return (a + b) / 2;
};

type PontoIn = {x: number; y: number; rotulo?: string};
type Nota = {x: number; y: number; texto: string; tq: number; baixo: boolean; lado: 'centro' | 'direita'; ultimo: boolean};
type SerieG = {nome: string; cor: string; t: number; dur: number; d: string; len: number; yEm: (x: number) => number; px: P[]; notas: Nota[]; fim: number};

const corDe = (v: unknown, i: number, est: Pick<Estilo, 'creme' | 'acento'>) => {
	const nome = typeof v === 'string' ? v : ['creme', 'acento', 'gelo'][i % 3];
	return nome === 'creme' ? est.creme : nome === 'acento' ? est.acento : nome === 'gelo' ? ((est as {gelo?: string}).gelo ?? GELO) : nome;
};
const eixoDe = (v: unknown) => (typeof v === 'object' && v ? v : {rotulo: v}) as {rotulo?: unknown; marcas?: unknown; min?: unknown; max?: unknown};

// Geometria e tempos (a peça e os sons usam a mesma conta; os sons medem num quadro de 1920 × 1080)
export const geometriaLinha = (c: Camada, W: number, H: number, est: Pick<Estilo, 'creme' | 'acento'>) => {
	const u = Math.min(W, H) / 1080;
	const brutas = (Array.isArray(c.series) ? c.series : []).filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null);
	const dados = brutas
		.map((s, i) => {
			const lista = Array.isArray(s.pontos) ? (s.pontos as unknown[]) : [];
			const pontos: PontoIn[] = lista
				.map((p, k): PontoIn | null => {
					if (typeof p === 'number' && Number.isFinite(p)) return {x: k, y: p};
					if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') return {x: p[0], y: p[1]};
					if (p && typeof p === 'object' && typeof (p as {y?: unknown}).y === 'number') {
						const o = p as {x?: unknown; y: number; rotulo?: unknown};
						return {x: num(o.x, k), y: o.y, rotulo: typeof o.rotulo === 'string' && o.rotulo.trim() ? o.rotulo.trim() : undefined};
					}
					return null;
				})
				.filter((p): p is PontoIn => p !== null)
				.sort((a, b) => a.x - b.x);
			return {nome: txt(s.nome, ''), cor: corDe(s.cor, i, est), t: num(s.t, 0.45), dur: num(s.dur, NaN), pontos};
		})
		.filter((s) => s.pontos.length >= 2)
		.slice(0, 3);

	// área: a base sobe (se a área não vier pronta) para marcas e rótulo do eixo X não encostarem no rodapé
	const fonte = txt(c.fonte, '').trim();
	const esquematico = typeof c.esquematico === 'boolean' ? c.esquematico : !fonte;
	const ex = eixoDe(c.eixoX);
	const fsEixo = num(c.tamanhoEixo, 38) * u;
	const temMarcas = Array.isArray(ex.marcas) && ex.marcas.length > 0;
	const temRotuloX = txt(ex.rotulo, '').trim() !== '';
	const temRodape = !!fonte || esquematico;
	const padraoArea = [0.13, 0.32, 0.68, 0.74];
	const dada = Array.isArray(c.area) && c.area.length === 4;
	const area = dada ? (c.area as unknown[]).map((v, k) => num(v, padraoArea[k])) : padraoArea;
	const chao = 0.88 * H - (temRodape ? (ALTURA_RODAPE + 18) * u : 0);
	const abaixo = (temMarcas ? 20 * u + fsEixo : 0) + (temRotuloX ? (temMarcas ? 6 * u + fsEixo * 1.3 : 26 * u + fsEixo) : 0);
	const [ax0, ay0, ax1] = [area[0] * W, area[1] * H, area[2] * W];
	const ay1 = dada ? area[3] * H : Math.max(ay0 + 160 * u, Math.min(area[3] * H, chao - abaixo));

	const todos = dados.flatMap((s) => s.pontos);
	const xMin = Math.min(...todos.map((p) => p.x));
	const xMax = Math.max(...todos.map((p) => p.x));
	const ey = eixoDe(c.eixoY);
	const yLo = Math.min(...todos.map((p) => p.y));
	const yHi = Math.max(...todos.map((p) => p.y));
	// folga de 12% em cima e embaixo; +24% do lado em que uma etiqueta de ponto encosta na borda (vale embaixo, pico em cima)
	const faixa = yHi - yLo || 1;
	let folgaBaixo = 0.12;
	let folgaCima = 0.12;
	dados.forEach((s) =>
		s.pontos.forEach((p, k) => {
			if (!p.rotulo || k === s.pontos.length - 1) return; // a etiqueta do último ponto fica junto do nome, fora da área
			const viz = [s.pontos[k - 1], s.pontos[k + 1]].filter(Boolean);
			const vale = viz.length > 0 && viz.every((v) => p.y <= v.y);
			if (vale && p.y - yLo < faixa * 0.2) folgaBaixo = 0.36;
			if (!vale && yHi - p.y < faixa * 0.2) folgaCima = 0.36;
		}),
	);
	const yMin = num(ey.min, yLo - faixa * folgaBaixo);
	const yMax = num(ey.max, yHi + faixa * folgaCima);
	const X = (x: number) => ax0 + ((x - xMin) / (xMax - xMin || 1)) * (ax1 - ax0);
	const Y = (y: number) => ay1 - ((y - yMin) / (yMax - yMin || 1)) * (ay1 - ay0);
	const retas = c.interpolacao === 'reta';

	const series: SerieG[] = dados.map((s) => {
		const px: P[] = s.pontos.map((p) => [X(p.x), Y(p.y)]);
		const {d, yEm} = retas ? reta(px) : monotonica(px);
		const len = getLength(d);
		const dur = Number.isFinite(s.dur) ? s.dur : Math.min(3, Math.max(0.9, ((px.length - 1) * 16) / 30));
		const quando = (x: number) => s.t + dur * inversa(DESENHO, compEmX(d, len, x) / (len || 1));
		const notas = s.pontos.flatMap((p, k): Nota[] => {
			if (!p.rotulo) return [];
			const vizinhos = [px[k - 1], px[k + 1]].filter(Boolean) as P[];
			// vale (y maior na tela que os vizinhos) → etiqueta embaixo; pico ou rampa → em cima
			const baixo = vizinhos.length > 0 && vizinhos.every((v) => px[k][1] >= v[1]);
			// 1º ponto: etiqueta para dentro (não cruza o eixo Y); último: vai para baixo do nome da série (fora da área)
			const lado = k === 0 ? 'direita' : 'centro';
			return [{x: px[k][0], y: px[k][1], texto: p.rotulo, tq: k === 0 ? s.t : quando(px[k][0]), baixo, lado, ultimo: k === px.length - 1}];
		});
		return {nome: s.nome, cor: s.cor, t: s.t, dur, d, len, yEm, px, notas, fim: s.t + dur};
	});

	// cruzamento das duas primeiras séries (a N-ésima troca de lado)
	let cruz: {x: number; y: number; t: number} | null = null;
	if (series.length >= 2 && c.cruzamento !== false) {
		const [a, b] = series;
		const alvo = Math.max(1, Math.round(num(c.cruzamentoN, 1)));
		let achados = 0;
		const lo = Math.max(a.px[0][0], b.px[0][0]);
		const hi = Math.min(a.px[a.px.length - 1][0], b.px[b.px.length - 1][0]);
		let ant = a.yEm(lo) - b.yEm(lo);
		for (let k = 1; k <= 400 && hi > lo; k++) {
			const x = lo + ((hi - lo) * k) / 400;
			const dif = a.yEm(x) - b.yEm(x);
			if (ant !== 0 && dif !== 0 && Math.sign(dif) !== Math.sign(ant) && ++achados === alvo) {
				const x0 = x - (hi - lo) / 400;
				const xc = x0 + ((x - x0) * ant) / (ant - dif);
				const tA = a.t + a.dur * inversa(DESENHO, compEmX(a.d, a.len, xc) / (a.len || 1));
				const tB = b.t + b.dur * inversa(DESENHO, compEmX(b.d, b.len, xc) / (b.len || 1));
				cruz = {x: xc, y: a.yEm(xc), t: Math.max(tA, tB) + 0.05};
				break;
			}
			if (dif !== 0) ant = dif;
		}
	}
	return {series, cruz, ax0, ay0, ax1, ay1, xMin, xMax, yMin, yMax, X, Y, fonte, esquematico, fsEixo};
};

// instante (s) em que o rodapé de fonte entra
const fonteLinha = (c: Camada, series: SerieG[], durS: number) => tempoFonte(num(c.fonteT, (series[0]?.fim ?? 1.4) + 0.3), durS); // 9 q depois do pop: o clique do rodapé soa separado

export const sonsGraficoLinha = (c: Camada): Som[] => {
	const g = geometriaLinha(c, 1920, 1080, {creme: '#F5F1EA', acento: '#B90015'});
	const out: Som[] = [];
	let whoosh = 0; // o sfx de entrada (t = 0) já cobre a 1ª série
	g.series.forEach((s, i) => {
		if (s.t - whoosh >= 1) {
			out.push({t: s.t, som: SOM_DESENHA, vol: 0.45});
			whoosh = s.t;
		}
		if (i === 0 || Math.abs(s.fim - g.series[0].fim) > 0.27) out.push({t: s.fim, som: SOM_FIM, vol: 0.55});
		// etiqueta no ponto final já soa com o pop do fim da série
		s.notas.forEach((n) => Math.abs(n.tq - s.fim) > 0.1 && out.push({t: n.tq, som: SOM_NOTA, vol: 0.5}));
	});
	if (g.cruz) out.push({t: g.cruz.t, som: SOM_CRUZA, vol: 0.6});
	return comSomFonte(out, g.fonte ? fonteLinha(c, g.series, c.fim - c.ini) : null);
};

export const GraficoLinha: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const G = React.useMemo(() => geometriaLinha(c, W, H, est), [c, W, H, est]);
	if (!G.series.length) return null;
	const {series, cruz, ax0, ay0, ax1, ay1, fonte, esquematico, fsEixo} = G;

	const creme = est.creme;
	const acento = est.acento;
	const esp = num(c.espessura, 5) * u;
	const fsNome = num(c.tamanhoNome, 58) * u;
	const fsNota = num(c.tamanhoNota, 60) * u;
	const ex = eixoDe(c.eixoX);
	const ey = eixoDe(c.eixoY);
	// marcas do eixo X: strings espalhadas de ponta a ponta, ou {x, texto} / [x, texto] na posição do dado
	const brutasX = Array.isArray(ex.marcas) ? (ex.marcas as unknown[]) : [];
	const marcasX = brutasX
		.map((m, k) => {
			if (typeof m === 'string' || typeof m === 'number') return {px: brutasX.length > 1 ? ax0 + (k / (brutasX.length - 1)) * (ax1 - ax0) : ax0, texto: String(m)};
			if (Array.isArray(m) && typeof m[0] === 'number') return {px: G.X(m[0]), texto: String(m[1] ?? '')};
			if (m && typeof m === 'object' && typeof (m as {x?: unknown}).x === 'number') return {px: G.X((m as {x: number}).x), texto: txt((m as {texto?: unknown}).texto, '')};
			return null;
		})
		.filter((m): m is {px: number; texto: string} => m !== null);
	const marcasY = !esquematico && Array.isArray(ey.marcas) ? (ey.marcas as unknown[]).filter((m): m is number => typeof m === 'number') : [];

	const qSai = Math.max(1, Math.min(Math.round(fps * 0.34), Math.floor(dur * 0.3)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const eixos = fase(t, 0.05, 0.05 + 10 / 30, DESENHO);
	const setas = fase(t, 0.3, 0.45);
	const marcasE = fase(t, 0.2, 0.55);
	const deriva = 1 + 0.025 * interpolate(frame, [0, dur], [0, 1], clamp);
	const fmtY = new Intl.NumberFormat('pt-BR');

	// nomes no fim das séries, afastados para não encostar
	// (cada bloco = nome centrado no ponto final + valor do último ponto embaixo, se houver)
	const valorFinal = (s: SerieG) => s.notas.find((n) => n.ultimo)?.texto ?? '';
	const nomes = series
		.map((s, i) => ({i, y: s.px[s.px.length - 1][1], h: fsNome * 1.25 + (valorFinal(s) ? fsNota * 1.1 : 0)}))
		.sort((a, b) => a.y - b.y)
		.reduce<{i: number; y: number; h: number}[]>((acc, n) => {
			const ant = acc[acc.length - 1];
			acc.push({...n, y: ant && n.y - ant.y < ant.h ? ant.y + ant.h : n.y});
			return acc;
		}, []);
	const yNome = (i: number) => nomes.find((n) => n.i === i)!.y;

	const titulo = txt(c.titulo, '');
	const seloTexto = txt(c.seloTexto, 'Esquemático').trim();
	const seloNota = txt(c.seloNota, 'ilustração, sem escala real').trim();

	// etiqueta do cruzamento: o primeiro lugar (acima, abaixo, ao lado, no pé da linha tracejada) em que a pílula não
	// encosta em nenhuma série nem sai da área; sem lugar livre, o de menos sobreposição (largura estimada pelas letras)
	const textoCruz = typeof c.cruzamento === 'string' ? c.cruzamento.trim() : '';
	const pilula = (() => {
		if (!cruz || !textoCruz) return {x: 0, y: 0};
		const h = 66 * u;
		const meia = (textoCruz.length * 25 * u + 40 * u) / 2 + 10 * u;
		const toques = (cx: number, cy: number) =>
			series.reduce((soma, s) => {
				for (let x = cx - meia; x <= cx + meia; x += 8 * u) {
					if (x < s.px[0][0] || x > s.px[s.px.length - 1][0]) continue;
					if (Math.abs(s.yEm(x) - cy) < h / 2 + 10 * u) soma++;
				}
				return soma;
			}, 0) + (cx - meia < ax0 || cy - h / 2 < ay0 - 20 * u || cy + h / 2 > ay1 ? 1000 : 0);
		const lado = meia + 24 * u;
		const opcoes: [number, number][] = [
			[cruz.x, cruz.y - 34 * u - h / 2],
			[cruz.x, cruz.y + 34 * u + h / 2],
			[cruz.x + lado, cruz.y - 34 * u - h / 2],
			[cruz.x - lado, cruz.y - 34 * u - h / 2],
			[cruz.x + lado, cruz.y + 34 * u + h / 2],
			[cruz.x - lado, cruz.y + 34 * u + h / 2],
			[cruz.x, ay1 - 26 * u - h / 2],
			[cruz.x, cruz.y - 130 * u],
		];
		const notas = opcoes.map(([x, y]) => toques(x, y));
		const k = notas.indexOf(0) >= 0 ? notas.indexOf(0) : notas.indexOf(Math.min(...notas));
		return {x: opcoes[k][0], y: opcoes[k][1]};
	})();

	return (
		<AbsoluteFill style={{pointerEvents: 'none', opacity: 1 - ps, filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined, transform: `translateY(${-20 * u * ps}px)`}}>
			{titulo && <FraseApoio texto={titulo} rotulo={txt(c.rotulo, '')} x={num(c.tituloX, 0.1) * W} y={num(c.tituloY, 0.22) * H} tam={64 * u} est={est} />}
			<AbsoluteFill style={{transform: `scale(${deriva})`, transformOrigin: `${ax0}px ${ay1}px`}}>
				<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					<defs>
						<filter id="gl-brilho" x="-50%" y="-50%" width="200%" height="200%">
							<feGaussianBlur stdDeviation={6 * u} />
						</filter>
					</defs>
					{/* linhas-guia horizontais (só com escala real) */}
					{marcasY.map((m, k) => (
						<line key={k} x1={ax0} x2={ax0 + (ax1 - ax0) * marcasE} y1={G.Y(m)} y2={G.Y(m)} stroke={rgba(creme, 0.08)} strokeWidth={1.5 * u} strokeDasharray={`${6 * u} ${8 * u}`} />
					))}
					{/* eixos com setas */}
					<line x1={ax0} y1={ay1} x2={ax0} y2={ay1 - (ay1 - ay0 + 30 * u) * eixos} stroke={rgba(creme, 0.5)} strokeWidth={2 * u} strokeLinecap="round" />
					<line x1={ax0} y1={ay1} x2={ax0 + (ax1 - ax0 + 50 * u) * eixos} y2={ay1} stroke={rgba(creme, 0.5)} strokeWidth={2 * u} strokeLinecap="round" />
					<path d={`M ${ax0 - 8 * u} ${ay0 - 30 * u + 10 * u} L ${ax0} ${ay0 - 30 * u} L ${ax0 + 8 * u} ${ay0 - 30 * u + 10 * u}`} fill="none" stroke={rgba(creme, 0.5)} strokeWidth={2 * u} strokeLinecap="round" strokeLinejoin="round" opacity={setas} />
					<path d={`M ${ax1 + 50 * u - 10 * u} ${ay1 - 8 * u} L ${ax1 + 50 * u} ${ay1} L ${ax1 + 50 * u - 10 * u} ${ay1 + 8 * u}`} fill="none" stroke={rgba(creme, 0.5)} strokeWidth={2 * u} strokeLinecap="round" strokeLinejoin="round" opacity={setas} />
					{marcasX.map((m, k) => (
						<line key={k} x1={m.px} x2={m.px} y1={ay1} y2={ay1 + 10 * u} stroke={rgba(creme, 0.5)} strokeWidth={2 * u} opacity={marcasE} />
					))}

					{/* cruzamento: linha tracejada até o eixo X */}
					{cruz &&
						(() => {
							const p = fase(t, cruz.t, cruz.t + 8 / 30, DESENHO);
							return p > 0 ? <line x1={cruz.x} x2={cruz.x} y1={cruz.y + 14 * u} y2={cruz.y + 14 * u + (ay1 - cruz.y - 14 * u) * p} stroke={rgba(acento, 0.9)} strokeWidth={2 * u} strokeDasharray={`${5 * u} ${7 * u}`} /> : null;
						})()}

					{/* séries */}
					{series.map((s, i) => {
						const p = fase(t, s.t, s.t + s.dur, DESENHO);
						if (p <= 0) return null;
						const ev = evolvePath(p, s.d);
						const cab = p < 1 ? getPointAtLength(s.d, s.len * p) : null;
						const fimP = s.px[s.px.length - 1];
						const brilhante = s.cor === acento;
						return (
							<g key={i}>
								{brilhante && <path d={s.d} fill="none" stroke={rgba(s.cor, 0.55)} strokeWidth={esp * 2.2} strokeLinecap="round" strokeLinejoin="round" filter="url(#gl-brilho)" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />}
								<path d={s.d} fill="none" stroke={s.cor} strokeWidth={esp} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
								{cab && (
									<>
										<circle cx={cab.x} cy={cab.y} r={18 * u} fill={rgba(s.cor === creme ? creme : s.cor, 0.5)} filter="url(#gl-brilho)" />
										<circle cx={cab.x} cy={cab.y} r={6 * u} fill={creme} />
									</>
								)}
								{p >= 1 &&
									(() => {
										const tf = t - s.fim;
										const pulso = 1 + 0.08 * Math.sin((Math.max(0, tf - 0.4) * Math.PI * 2) / 1.6);
										return (
											<>
												{[0, 2 / 30].map((atraso, k) => {
													const e = fase(tf, atraso, atraso + 6 / 30, Easing.out(Easing.quad));
													return e > 0 && e < 1 ? <circle key={k} cx={fimP[0]} cy={fimP[1]} r={(8 + 34 * e) * u} fill="none" stroke={s.cor} strokeWidth={(3 - 2 * e) * u} opacity={0.85 * (1 - e)} /> : null;
												})}
												<circle cx={fimP[0]} cy={fimP[1]} r={9 * u * pulso} fill={s.cor} />
												<circle cx={fimP[0]} cy={fimP[1]} r={3.5 * u} fill={s.cor === creme ? '#0A0B0F' : creme} />
											</>
										);
									})()}
								{/* marcadores dos pontos com etiqueta */}
								{s.notas.map((n, k) => {
									if (n.ultimo) return null;
									const e = fase(t, n.tq, n.tq + 8 / 30, ASSENTO);
									return e > 0 ? <circle key={k} cx={n.x} cy={n.y} r={(7 + 4 * (1 - e)) * u} fill="#0A0B0F" stroke={s.cor} strokeWidth={3 * u} opacity={e} /> : null;
								})}
							</g>
						);
					})}

					{cruz &&
						(() => {
							const e = fase(t, cruz.t, cruz.t + 6 / 30, Easing.out(Easing.quad));
							const fixo = fase(t, cruz.t, cruz.t + 8 / 30, ASSENTO);
							return fixo > 0 ? (
								<>
									{e < 1 && <circle cx={cruz.x} cy={cruz.y} r={(10 + 40 * e) * u} fill="none" stroke={acento} strokeWidth={3 * u} opacity={1 - e} />}
									<circle cx={cruz.x} cy={cruz.y} r={13 * u} fill="none" stroke={acento} strokeWidth={3 * u} opacity={fixo} />
									<circle cx={cruz.x} cy={cruz.y} r={5 * u} fill={creme} opacity={fixo} />
								</>
							) : null;
						})()}
				</svg>

				{/* rótulos dos eixos e marcas */}
				{txt(ey.rotulo, '') && (
					<div style={{position: 'absolute', left: ax0 + 22 * u, top: ay0 - 30 * u - fsEixo * 0.5, fontFamily: FONTES.base.family, fontWeight: 500, fontSize: fsEixo, lineHeight: 1, color: rgba(creme, 0.66), whiteSpace: 'pre', opacity: setas}}>
						{txt(ey.rotulo, '')}
					</div>
				)}
				{txt(ex.rotulo, '') && (
					<div style={{position: 'absolute', right: W - (ax1 + 50 * u), top: ay1 + (marcasX.length ? 20 * u + fsEixo + 6 * u : 26 * u), fontFamily: FONTES.base.family, fontWeight: 500, fontSize: fsEixo, lineHeight: 1, color: rgba(creme, 0.66), whiteSpace: 'pre', opacity: setas}}>
						{txt(ex.rotulo, '')}
					</div>
				)}
				{marcasX.map((m, k) =>
					m.texto ? (
						<div key={k} style={{position: 'absolute', left: m.px, top: ay1 + 20 * u, transform: 'translateX(-50%)', fontFamily: FONTES.base.family, fontWeight: 500, fontSize: fsEixo, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: rgba(creme, 0.64), whiteSpace: 'pre', opacity: marcasE}}>
							{m.texto}
						</div>
					) : null,
				)}
				{marcasY.map((m, k) => (
					<div key={k} style={{position: 'absolute', right: W - ax0 + 16 * u, top: G.Y(m), transform: 'translateY(-50%)', fontFamily: FONTES.base.family, fontWeight: 500, fontSize: fsEixo, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: rgba(creme, 0.64), whiteSpace: 'pre', opacity: marcasE}}>
						{fmtY.format(m).replace('-', '−')}
					</div>
				))}

				{/* etiquetas dos pontos (ex.: "−10 mil") */}
				{series.flatMap((s, i) =>
					s.notas.map((n, k) => {
						const e = fase(t, n.tq + 0.05, n.tq + 0.05 + 10 / 30);
						if (e <= 0 || n.ultimo) return null;
						const dy = (n.baixo ? 1 : -1) * (26 * u + (n.baixo ? 0 : fsNota));
						const dx = n.lado === 'direita' ? `${14 * u}px` : '-50%';
						return (
							<div
								key={`${i}-${k}`}
								style={{
									position: 'absolute',
									left: n.x,
									top: n.y + dy,
									transform: `translateX(${dx}) translateY(${(1 - e) * (n.baixo ? -10 : 10) * u}px)`,
									fontFamily: FONTES.impacto.family,
									fontWeight: 800,
									fontSize: fsNota,
									lineHeight: 1,
									letterSpacing: '-0.02em',
									fontVariantNumeric: 'tabular-nums',
									color: creme,
									whiteSpace: 'pre',
									opacity: e,
									filter: e < 0.99 ? `blur(${(1 - e) * 6 * u}px)` : undefined,
									textShadow: `0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.45)}`,
								}}
							>
								{n.texto}
							</div>
						);
					}),
				)}

				{/* nome de cada série ao lado do ponto final; o valor do último ponto (ex.: "+12 mil") logo embaixo */}
				{series.map((s, i) => {
					const e = fase(t, s.fim + 0.08, s.fim + 0.08 + 10 / 30);
					const valor = valorFinal(s);
					if (e <= 0 || (!s.nome && !valor)) return null;
					const fimP = s.px[s.px.length - 1];
					const sombra = `0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.4)}`;
					const estiloNome: React.CSSProperties = {fontFamily: FONTES.base.family, fontWeight: 800, fontSize: fsNome, lineHeight: 1, letterSpacing: '-0.02em', color: creme, textShadow: sombra};
					const estiloValor: React.CSSProperties = {fontFamily: FONTES.impacto.family, fontWeight: 800, fontSize: fsNota, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: creme, textShadow: sombra};
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: fimP[0] + 30 * u,
								top: yNome(i) - (s.nome ? fsNome / 2 : (fsNota * 1.1) / 2),
								transform: `translateX(${(1 - e) * -14 * u}px)`,
								display: 'grid',
								gridTemplateColumns: 'auto auto',
								alignItems: 'center',
								columnGap: 14 * u,
								rowGap: 6 * u,
								whiteSpace: 'pre',
								opacity: e,
								filter: e < 0.99 ? `blur(${(1 - e) * 6 * u}px)` : undefined,
							}}
						>
							<div style={{width: 26 * u, height: 6 * u, borderRadius: 3 * u, background: s.cor, boxShadow: s.cor === acento ? `0 0 ${12 * u}px ${rgba(acento, 0.6)}` : undefined}} />
							{s.nome ? <div style={estiloNome}>{s.nome}</div> : <div style={estiloValor}>{valor}</div>}
							{s.nome && valor && <div style={{...estiloValor, gridColumn: 2}}>{valor}</div>}
						</div>
					);
				})}

				{/* etiqueta do cruzamento, numa pílula no acento */}
				{cruz &&
					textoCruz &&
					(() => {
						const e = fase(t, cruz.t + 0.08, cruz.t + 0.08 + 10 / 30, ASSENTO);
						return e > 0 ? (
							<div
								style={{
									position: 'absolute',
									left: pilula.x,
									top: pilula.y,
									transform: `translate(-50%, -50%) scale(${0.94 + 0.06 * e})`,
									padding: `${10 * u}px ${20 * u}px`,
									borderRadius: 999,
									background: acento,
									color: creme,
									fontFamily: FONTES.base.family,
									fontWeight: 800,
									fontSize: 46 * u,
									lineHeight: 1,
									letterSpacing: '-0.015em',
									whiteSpace: 'pre',
									opacity: e,
									boxShadow: `0 ${10 * u}px ${30 * u}px ${rgba('#000000', 0.45)}`,
								}}
							>
								{textoCruz}
							</div>
						) : null;
					})()}
			</AbsoluteFill>
			{/* rodapé: selo de ética no lugar da procedência (onde o olho procura a fonte) e/ou a fonte */}
			{(fonte || (esquematico && seloTexto)) && (
				<Rodape est={est} fonte={fonte} fonteT={fonteLinha(c, series, dur / fps)} selo={esquematico && seloTexto ? {texto: seloTexto, nota: fonte ? undefined : seloNota || undefined, tracejado: true} : null} seloT={0.25} />
			)}
		</AbsoluteFill>
	);
};
