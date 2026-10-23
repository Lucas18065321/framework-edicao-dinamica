// Papel rasgado (CUT DINÂMICO): painel de papel em tela cheia no acento profundo, com textura sutil gerada por
// código (polpa, grão e fibras; sem imagem), que RASGA numa linha serrilhada e se abre revelando a cena de baixo.
// Mecânica: a fenda creme corre pela linha da esquerda para a direita (0,15 s antes do rasgo) → pequeno salto
// (as metades se soltam em cunha, com mola) → abertura rápida: a metade de cima sai para cima/esquerda e a de baixo
// para baixo/direita, girando de leve, com motion blur, fora da tela ~0,5 s depois do rasgo. Bordas rasgadas creme,
// irregulares (3–6 px), com fibras soltas. A camada some sozinha depois do rasgo: pode terminar logo depois.
// Parâmetros:
//   texto (opcional: escrito no papel antes de rasgar, Inter Tight 900 creme; '\n' força a quebra, senão quebra sozinho),
//   y (centro do texto, 0..1, 0.47), largura (largura máx. do texto, fração do quadro, 0.72), tamanho (corpo máx., px em 1080, 210),
//   caixaAlta (true), rasgarEm (s relativos à camada; padrão 45% da duração), angulo (graus da linha de rasgo, −8),
//   linhaY (altura em que a linha cruza o centro, 0..1, 0.5), entrada ('corte' padrão: já está na tela e assenta 1,04 → 1 até o
//   rasgo | 'desliza': entra pela direita em 0,45 s, com motion blur), cor (est.acentoProfundo), seed (forma do rasgo e das fibras, 7).
// Som: sfxPapelRasgado toca na entrada (padrão do registro). O rasgo tem o par sfxRasgo ([som, vol, atraso em s]),
// a tocar em ini + rasgoSegundos(c, dur, fps) + atraso (no edicao.json: "sfx": [{"t": …, "som": …, "vol": …}]).
import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, DUR, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxPapelRasgado: [string, number] = ['motionix/whooshes/whooshes_14_simple-whoosh', 0.25];
export const sfxRasgo: [string, number, number][] = [
	['motionix/clicks/clicks_01_cinematic-click', 0.35, 0], // o salto
	['motionix/whooshes/whooshes_20_epic-fast-whoosh-345469', 0.4, 0.1], // a abertura
];

const num = (v: unknown, padrao: number) => (typeof v === 'number' ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);

const PRETO = '#0B0B0C';
const FENDA = 0.15; // s: a fenda corre pela linha antes do rasgo
const SALTO = 0.125; // s: do salto até a abertura (os "degraus")
const ABRE = 0.42; // s: abertura até as metades saírem da tela
const ENTRA = 0.45; // s: entrada 'desliza'
const CURVA_DESLIZA = Easing.bezier(0.25, 0.75, 0.25, 1); // rápida, mas deixa ver o papel deslizando
// Métricas da Inter Tight (em): com line-height 1, a maiúscula vai de 0,136 a 0,864.
const CAP = 0.727;
const TOPO_CAP = 0.136;
const ACENTO_ALTO = /[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÅ]/;
const REF = 100;

// Segundo (relativo à camada) em que o papel rasga, alinhado ao grid de quadros. Sempre sobra tempo para a abertura.
export const rasgoSegundos = (c: Camada, dur: number, fps: number) => {
	const total = dur / fps;
	const r = Math.max(FENDA + (txt(c.entrada, 'corte') === 'desliza' ? ENTRA : 0.05), Math.min(num(c.rasgarEm, total * 0.45), total - SALTO - ABRE));
	return Math.round(r * fps) / fps;
};

type P = {x: number; y: number};
type Fibra = {i: number; f: number; ang: number; len: number; larg: number; op: number};

export const PapelRasgado: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const seed = num(c.seed, 7);
	const cor = txt(c.cor, est.acentoProfundo);
	const entrada = txt(c.entrada, 'corte');
	const r = rasgoSegundos(c, dur, fps);
	const MX = 0.34 * W;
	const MY = 0.04 * H;
	const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '');

	// ---------- texto: espera a Inter Tight 900 carregar para medir ----------
	const fonte = FONTES.impacto;
	const caixaAlta = bool(c.caixaAlta, true);
	const textoBruto = txt(c.texto, '').trim();
	const texto = caixaAlta ? textoBruto.toLocaleUpperCase('pt-BR') : textoBruto;
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('papel-rasgado: fonte'));
	const [pronto, setPronto] = useState(false);
	const liberado = useRef(false);
	useEffect(() => {
		let vivo = true;
		const libera = () => {
			if (vivo) setPronto(true);
			if (!liberado.current) {
				liberado.current = true;
				continueRender(espera);
			}
		};
		document.fonts
			.load(`${fonte.weight} ${REF}px "${fonte.family}"`, texto || 'A')
			.then(() => document.fonts.ready)
			.then(libera, libera);
		return () => {
			vivo = false;
		};
	}, [continueRender, espera, fonte.family, fonte.weight, texto]);

	const largMax = num(c.largura, 0.72) * W;
	const corpoMax = num(c.tamanho, 210) * u;
	const linhasTexto = useMemo(() => {
		if (!pronto || !texto) return null;
		const mede = (s: string) => measureText({text: s, fontFamily: fonte.family, fontWeight: String(fonte.weight), fontSize: REF, letterSpacing: fonte.tracking}).width / REF;
		const corpo = (ls: string[]) => {
			const fs = Math.min(corpoMax, largMax / Math.max(...ls.map(mede)));
			const alt = (ls.length - 1) * fonte.altura * fs + CAP * fs;
			return alt > 0.36 * H ? fs * ((0.36 * H) / alt) : fs;
		};
		if (texto.includes('\n')) {
			const ls = texto.split('\n').map((l) => l.trim()).filter(Boolean);
			return {ls, fs: corpo(ls)};
		}
		// quebra equilibrada: para 1–4 linhas, a divisão que deixa a linha mais larga menor; fica com a de menos linhas
		// que chega a 90% do maior corpo possível
		const ws = texto.split(/\s+/);
		const opcoes: {ls: string[]; fs: number}[] = [];
		const divide = (de: number, k: number): string[][] => {
			if (k === 1) return [[ws.slice(de).join(' ')]];
			const out: string[][] = [];
			for (let i = de + 1; i <= ws.length - k + 1; i++) divide(i, k - 1).forEach((resto) => out.push([ws.slice(de, i).join(' '), ...resto]));
			return out;
		};
		for (let k = 1; k <= Math.min(4, ws.length); k++) {
			let melhor: {ls: string[]; fs: number} | null = null;
			for (const ls of divide(0, k)) {
				const fs = corpo(ls);
				if (!melhor || fs > melhor.fs) melhor = {ls, fs};
			}
			if (melhor) opcoes.push(melhor);
		}
		const maior = Math.max(...opcoes.map((o) => o.fs));
		return opcoes.find((o) => o.fs >= 0.9 * maior) ?? opcoes[0];
	}, [pronto, texto, fonte.family, fonte.weight, fonte.tracking, fonte.altura, corpoMax, largMax, H]);

	// ---------- geometria do rasgo (fixa: só depende do quadro, do ângulo e da seed) ----------
	const geo = useMemo(() => {
		const a = (num(c.angulo, -8) * Math.PI) / 180;
		const d = {x: Math.cos(a), y: Math.sin(a)}; // ao longo da linha
		const n = {x: -Math.sin(a), y: Math.cos(a)}; // normal, "para baixo"
		const C = {x: W / 2, y: num(c.linhaY, 0.5) * H};
		const S = (p: P): P => ({x: C.x + p.x * d.x + p.y * n.x, y: C.y + p.x * d.y + p.y * n.y});
		// o papel passa das bordas do quadro (MX, MY): ao sair de lado e girar, nenhuma borda reta aparece
		const cantos = [
			[-MX, -MY],
			[W + MX, -MY],
			[-MX, H + MY],
			[W + MX, H + MY],
		].map(([x, y]) => ({d: (x - C.x) * d.x + (y - C.y) * d.y, n: (x - C.x) * n.x + (y - C.y) * n.y}));
		const L0 = Math.min(...cantos.map((k) => k.d)) - 40 * u;
		const L1 = Math.max(...cantos.map((k) => k.d)) + 40 * u;
		const N0 = Math.min(...cantos.map((k) => k.n)) - 300 * u;
		const N1 = Math.max(...cantos.map((k) => k.n)) + 300 * u;
		// linha serrilhada: deriva lenta + ondulação média + aspereza irregular (sem zigue-zague regular) + lascas raras
		const pts: P[] = [];
		const bandaCima: number[] = [];
		const bandaBaixo: number[] = [];
		let x = L0;
		for (let i = 0; x <= L1 + 1; i++) {
			const dente = (random(`pr-${seed}-dente-${i}`) - 0.5) * 2 * (0.6 + 3.4 * random(`pr-${seed}-dente2-${i}`) ** 2) * u;
			const rasgao = random(`pr-${seed}-rasgao-${i}`) < 0.05 ? (random(`pr-${seed}-rasgao2-${i}`) - 0.5) * 14 * u : 0;
			pts.push({x, y: 30 * u * noise2D(`pr-${seed}-a`, x / (320 * u), 0) + 9 * u * noise2D(`pr-${seed}-b`, x / (70 * u), 0) + 3.5 * u * noise2D(`pr-${seed}-c`, x / (18 * u), 0) + dente + rasgao});
			const lento = (noise2D(`pr-${seed}-w`, x / (55 * u), 0) + 1) / 2;
			bandaCima.push((3 + 3.2 * lento + 1.2 * random(`pr-${seed}-bc-${i}`)) * u);
			bandaBaixo.push((1.4 + 1.8 * lento + 0.8 * random(`pr-${seed}-bb-${i}`)) * u);
			x += (4 + 8 * random(`pr-${seed}-passo-${i}`)) * u;
		}
		const fibras = (lado: string): Fibra[] => {
			const out: Fibra[] = [];
			for (let i = 0; i < pts.length - 1; i++) {
				if (random(`pr-${seed}-${lado}-f-${i}`) > 0.5) continue;
				out.push({
					i,
					f: random(`pr-${seed}-${lado}-ff-${i}`),
					ang: (random(`pr-${seed}-${lado}-fa-${i}`) - 0.5) * 1.6,
					len: (2 + 6 * random(`pr-${seed}-${lado}-fl-${i}`)) * u,
					larg: (0.6 + 0.6 * random(`pr-${seed}-${lado}-fw-${i}`)) * u,
					op: 0.45 + 0.45 * random(`pr-${seed}-${lado}-fo-${i}`),
				});
			}
			return out;
		};
		// fibras da textura do papel (curtas, curvas, quase invisíveis)
		const textura = Array.from({length: 260}, (_, i) => {
			const px = random(`pr-${seed}-tx-${i}`) * W;
			const py = random(`pr-${seed}-ty-${i}`) * H;
			const ang = random(`pr-${seed}-ta-${i}`) * Math.PI * 2;
			const len = (8 + 26 * random(`pr-${seed}-tl-${i}`)) * u;
			const curva = (random(`pr-${seed}-tc-${i}`) - 0.5) * len * 0.6;
			const ex = px + Math.cos(ang) * len;
			const ey = py + Math.sin(ang) * len;
			const cx = (px + ex) / 2 - Math.sin(ang) * curva;
			const cy = (py + ey) / 2 + Math.cos(ang) * curva;
			const claro = random(`pr-${seed}-tk-${i}`) < 0.85;
			return {d: `M${px.toFixed(1)} ${py.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, claro, larg: (0.5 + 0.6 * random(`pr-${seed}-tw-${i}`)) * u, op: claro ? 0.035 + 0.05 * random(`pr-${seed}-to-${i}`) : 0.04 + 0.04 * random(`pr-${seed}-to-${i}`)};
		});
		const tela = pts.map(S);
		const poli = (borda: number) => [S({x: L0, y: borda}), ...tela, S({x: pts[pts.length - 1].x, y: borda})].map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(',');
		// pivô do giro: onde a linha cruza a borda direita (as metades abrem em cunha a partir da esquerda, onde a fenda começa)
		const piv = S({x: (W * 0.97 - C.x) / d.x, y: 0});
		// direções de saída e distância para sair da tela (com folga para a borda, as fibras e a sombra)
		const dirCima = {x: -n.x - 0.18 * d.x, y: -n.y - 0.18 * d.y};
		const dirBaixo = {x: -dirCima.x, y: -dirCima.y};
		const ys = tela.filter((p) => p.x > -0.1 * W && p.x < 1.1 * W).map((p) => p.y);
		const distCima = (Math.max(...ys) + 90 * u) / Math.abs(dirCima.y) / 0.9;
		const distBaixo = (H - Math.min(...ys) + 90 * u) / Math.abs(dirBaixo.y) / 0.9;
		return {a, d, n, C, S, L0, L1, pts, tela, bandaCima, bandaBaixo, fibrasCima: fibras('c'), fibrasBaixo: fibras('b'), textura, poliCima: poli(N0), poliBaixo: poli(N1), piv, dirCima, dirBaixo, distCima, distBaixo};
	}, [W, H, u, seed, c.angulo, c.linhaY]);

	if (texto && !linhasTexto) return null;
	if (t >= r + SALTO + ABRE) return null;

	// ---------- tempo ----------
	const pose = (tt: number) => {
		const j = tt < r ? 0 : spring({frame: Math.round((tt - r) * fps), fps, config: {damping: 10, stiffness: 300, mass: 0.45}});
		const o = interpolate(tt, [r + SALTO, r + SALTO + ABRE], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
		return {j, o};
	};
	const agora = pose(t);
	const antes = pose(t - 1 / fps);
	const fenda = interpolate(t, [r - FENDA, r], [0, 1], {...clamp, easing: Easing.bezier(0.3, 0.3, 0.6, 1)});
	const kBorda = t < r - FENDA ? 0 : interpolate(t, [r, r + 2 / fps], [0.45, 1], clamp);
	const SALTO_PX = 6 * u;
	const CUNHA = 0.55; // graus no salto
	const sepCima = (p: {j: number; o: number}) => SALTO_PX * p.j + geo.distCima * p.o;
	const sepBaixo = (p: {j: number; o: number}) => SALTO_PX * p.j + geo.distBaixo * p.o;

	// entrada
	const eIn = entrada === 'desliza' ? interpolate(t, [0, ENTRA], [0, 1], {...clamp, easing: CURVA_DESLIZA}) : 1;
	const eInAntes = entrada === 'desliza' ? interpolate(t - 1 / fps, [0, ENTRA], [0, 1], {...clamp, easing: CURVA_DESLIZA}) : 1;
	const desliza = (1 - eIn) * (W + MX + 80 * u);
	const blurEntrada = entrada === 'desliza' && t > 0 ? Math.min(30 * u, 0.12 * Math.abs((eIn - eInAntes) * (W + MX + 80 * u))) : 0;
	// 'corte': o papel assenta (1,04 → 1) até o rasgo; a câmera nunca para
	const assenta = entrada === 'desliza' ? 1 : 1 + 0.04 * (1 - interpolate(t, [0, Math.max(r, 0.3)], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}));

	// ---------- texto (palavras em cascata, como o título) ----------
	const fs = linhasTexto?.fs ?? 0;
	const yc = num(c.y, 0.47) * H;
	const topos: number[] = [];
	(linhasTexto?.ls ?? []).forEach((l, i) => topos.push(i === 0 ? 0 : topos[i - 1] + fs * fonte.altura + (ACENTO_ALTO.test(l) ? 0.1 * fs : 0)));
	const altCaps = topos.length ? topos[topos.length - 1] + CAP * fs : 0;
	const topo0 = yc - altCaps / 2 - TOPO_CAP * fs;
	const nPal = (linhasTexto?.ls ?? []).reduce((s, l) => s + l.split(/\s+/).length, 0);
	const t0Texto = entrada === 'desliza' ? 0.22 : 0.04;
	const passo = nPal > 1 ? Math.max(0, Math.min(0.07, (r - FENDA - DUR.lento - t0Texto) / (nPal - 1))) : 0;
	let kPal = 0;
	const blocoTexto = linhasTexto ? (
		<div style={{position: 'absolute', inset: 0}}>
			{linhasTexto.ls.map((l, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: 0,
						width: W,
						top: topo0 + topos[i],
						textAlign: 'center',
						fontFamily: fonte.family,
						fontWeight: fonte.weight,
						fontSize: fs,
						lineHeight: 1,
						letterSpacing: fonte.tracking,
						color: est.creme,
						whiteSpace: 'pre',
						textShadow: `0 ${3 * u}px ${12 * u}px rgba(0,0,0,0.28)`,
					}}
				>
					{l.split(/\s+/).map((w, k) => {
						const ini = t0Texto + kPal++ * passo;
						const e = interpolate(t, [ini, ini + DUR.lento], [0, 1], {...clamp, easing: CURVAS.entrada});
						return (
							<span key={k} style={{display: 'inline-block', marginLeft: k ? '0.22em' : 0, opacity: e, filter: e < 1 ? `blur(${(1 - e) * 10 * u}px)` : undefined, transform: `translateY(${(1 - e) * 0.3}em) scale(${0.92 + 0.08 * e})`}}>
								{w}
							</span>
						);
					})}
				</div>
			))}
		</div>
	) : null;

	// ---------- desenho ----------
	const S = geo.S;
	const fx = (p: P) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
	const banda = (larguras: number[], sinal: number, escala: number) => {
		const fora = geo.tela.map(fx);
		const dentro = geo.pts.map((p, i) => fx(S({x: p.x, y: p.y + sinal * larguras[i] * escala * kBorda}))).reverse();
		return [...fora, ...dentro].join(' ');
	};
	const linhaInterna = (larguras: number[], sinal: number, extra: number) => geo.pts.map((p, i) => fx(S({x: p.x, y: p.y + sinal * (larguras[i] + extra)}))).join(' ');
	const fibrasSvg = (lista: Fibra[], sinal: number) =>
		lista.map((f, k) => {
			const p0 = geo.pts[f.i];
			const p1 = geo.pts[f.i + 1];
			const base = {x: p0.x + (p1.x - p0.x) * f.f, y: p0.y + (p1.y - p0.y) * f.f};
			const a = S(base);
			const b = S({x: base.x + Math.sin(f.ang) * f.len * kBorda, y: base.y - sinal * Math.cos(f.ang) * f.len * kBorda});
			return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={est.creme} strokeWidth={f.larg} strokeOpacity={f.op} strokeLinecap="round" />;
		});
	// a fenda corre da esquerda para a direita: máscara que cresce ao longo da linha
	const compFenda = (geo.L1 - geo.L0) * (t >= r ? 1 : fenda);
	const angGraus = (geo.a * 180) / Math.PI;
	const iniFenda = S({x: geo.L0, y: 0});

	const corClara = interpolateColors(0.1, [0, 1], [cor, est.acento]);
	const corBorda = interpolateColors(0.55, [0, 1], [cor, PRETO]);

	// antes do rasgo o papel é uma peça só (duas metades encostadas deixariam um fio de antialias na linha)
	const papel = (metade: 'cima' | 'baixo' | 'inteiro') => {
		const cima = metade === 'cima';
		const levanta = metade === 'inteiro' ? 0 : Math.min(1, agora.j + agora.o * 3);
		return (
			<div style={{position: 'absolute', inset: 0, clipPath: metade === 'inteiro' ? undefined : `polygon(${cima ? geo.poliCima : geo.poliBaixo})`}}>
				<svg width={W + 2 * MX} height={H + 2 * MY} style={{position: 'absolute', left: -MX, top: -MY}}>
					<g transform={`translate(${MX} ${MY})`}>
					<rect x={-MX} y={-MY} width={W + 2 * MX} height={H + 2 * MY} fill={`url(#${ids}-luz)`} />
					<rect x={-MX} y={-MY} width={W + 2 * MX} height={H + 2 * MY} filter={`url(#${ids}-polpa)`} opacity={0.3} style={{mixBlendMode: 'soft-light'}} />
					<rect x={-MX} y={-MY} width={W + 2 * MX} height={H + 2 * MY} filter={`url(#${ids}-grao)`} opacity={0.14} style={{mixBlendMode: 'overlay'}} />
					<g fill="none" strokeLinecap="round">
						{geo.textura.map((f, i) => (
							<path key={i} d={f.d} stroke={f.claro ? est.creme : PRETO} strokeWidth={f.larg} strokeOpacity={f.op} />
						))}
					</g>
					{levanta > 0 ? (
						// a borda rasgada levanta: sombra suave logo atrás da faixa creme
						<polyline points={linhaInterna(cima ? geo.bandaCima : geo.bandaBaixo, cima ? -1 : 1, 4 * u)} fill="none" stroke={PRETO} strokeWidth={12 * u} strokeOpacity={0.22 * levanta} filter={`url(#${ids}-suave)`} />
					) : null}
					</g>
				</svg>
				{blocoTexto}
			</div>
		);
	};

	const borda = (metade: 'cima' | 'baixo') => {
		if (kBorda <= 0) return null;
		const cima = metade === 'cima';
		const larg = cima ? geo.bandaCima : geo.bandaBaixo;
		const sinal = cima ? -1 : 1;
		return (
			<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				<g clipPath={t < r ? `url(#${ids}-fenda)` : undefined}>
					<polygon points={banda(larg, sinal, 1)} fill={est.creme} fillOpacity={0.5} />
					<polygon points={banda(larg, sinal, 0.6)} fill={est.creme} fillOpacity={0.95} />
					{fibrasSvg(cima ? geo.fibrasCima : geo.fibrasBaixo, sinal)}
				</g>
			</svg>
		);
	};

	const metade = (qual: 'cima' | 'baixo') => {
		const cima = qual === 'cima';
		const dir = cima ? geo.dirCima : geo.dirBaixo;
		const sep = cima ? sepCima(agora) : sepBaixo(agora);
		const sepAntes = cima ? sepCima(antes) : sepBaixo(antes);
		const giro = (cima ? 1 : -1) * (CUNHA * agora.j + (cima ? 5 : 4) * agora.o);
		const escala = 1 + (cima ? 0.05 : 0.035) * agora.o;
		const mb = Math.min(14 * u, 0.09 * Math.abs(sep - sepAntes) * Math.hypot(dir.x, dir.y));
		const norma = Math.hypot(dir.x, dir.y);
		const sombra = Math.min(1, sep / (22 * u));
		const filtros = [
			mb > 0.5 ? `url(#${ids}-mb-${qual})` : '',
			sombra > 0 ? `drop-shadow(0 0 ${10 * u}px rgba(0,0,0,${(0.45 * sombra).toFixed(3)}))` : '',
			sombra > 0 && cima ? `drop-shadow(0 ${16 * u}px ${26 * u}px rgba(0,0,0,${(0.5 * sombra).toFixed(3)}))` : '',
		].filter(Boolean);
		return (
			<div
				key={qual}
				style={{
					position: 'absolute',
					inset: 0,
					transformOrigin: `${geo.piv.x}px ${geo.piv.y}px`,
					transform: `translate(${(dir.x * sep).toFixed(2)}px, ${(dir.y * sep).toFixed(2)}px) rotate(${giro.toFixed(3)}deg) scale(${escala.toFixed(4)})`,
					filter: filtros.length ? filtros.join(' ') : undefined,
				}}
			>
				<svg width={0} height={0} style={{position: 'absolute'}}>
					<filter id={`${ids}-mb-${qual}`} x="-50%" y="-25%" width="200%" height="150%">
						<feGaussianBlur stdDeviation={`${((mb * Math.abs(dir.x)) / norma).toFixed(2)} ${((mb * Math.abs(dir.y)) / norma).toFixed(2)}`} />
					</filter>
				</svg>
				{papel(qual)}
				{borda(qual)}
			</div>
		);
	};

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<defs>
					<radialGradient id={`${ids}-luz`} gradientUnits="userSpaceOnUse" cx={W * 0.42} cy={H * 0.38} r={Math.hypot(W, H) * 0.62}>
						<stop offset="0" stopColor={corClara} />
						<stop offset="0.5" stopColor={cor} />
						<stop offset="1" stopColor={corBorda} />
					</radialGradient>
					<filter id={`${ids}-polpa`} x={-MX} y={-MY} width={W + 2 * MX} height={H + 2 * MY} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
						<feTurbulence type="fractalNoise" baseFrequency={0.0045 / u} numOctaves={3} seed={seed} />
						<feColorMatrix type="matrix" values="0.2 0.2 0.2 0 0.2  0.2 0.2 0.2 0 0.2  0.2 0.2 0.2 0 0.2  0 0 0 0 1" />
					</filter>
					<filter id={`${ids}-grao`} x={-MX} y={-MY} width={W + 2 * MX} height={H + 2 * MY} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
						<feTurbulence type="fractalNoise" baseFrequency={0.75 / u} numOctaves={2} seed={seed + 11} />
						<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
					</filter>
					<filter id={`${ids}-mbx`} x="-50%" y="-5%" width="200%" height="110%">
						<feGaussianBlur stdDeviation={`${blurEntrada.toFixed(2)} 0`} />
					</filter>
					<filter id={`${ids}-suave`} x="-5%" y="-5%" width="110%" height="110%">
						<feGaussianBlur stdDeviation={5 * u} />
					</filter>
					<clipPath id={`${ids}-fenda`} clipPathUnits="userSpaceOnUse">
						<rect x={iniFenda.x} y={iniFenda.y - 200 * u} width={Math.max(0, compFenda)} height={400 * u} transform={`rotate(${angGraus} ${iniFenda.x} ${iniFenda.y})`} />
					</clipPath>
				</defs>
			</svg>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					transformOrigin: '50% 50%',
					transform: `translateX(${desliza.toFixed(2)}px) scale(${assenta.toFixed(4)})`,
					filter: [blurEntrada > 0.5 ? `url(#${ids}-mbx)` : '', eIn < 1 ? `drop-shadow(${-24 * u}px 0 ${40 * u}px rgba(0,0,0,${(0.55 * (1 - eIn * 0.5)).toFixed(3)}))` : ''].filter(Boolean).join(' ') || undefined,
				}}
			>
				{t < r ? (
					<div style={{position: 'absolute', inset: 0}}>
						{papel('inteiro')}
						{borda('baixo')}
						{borda('cima')}
					</div>
				) : (
					<>
						{metade('baixo')}
						{metade('cima')}
					</>
				)}
				{t < r && fenda > 0 ? (
					// fio escuro no meio da fenda (a separação começando)
					<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
						<g clipPath={`url(#${ids}-fenda)`}>
							<polyline points={geo.tela.map(fx).join(' ')} fill="none" stroke={PRETO} strokeWidth={1.1 * u} strokeOpacity={0.4} />
						</g>
					</svg>
				) : null}
			</div>
		</AbsoluteFill>
	);
};
