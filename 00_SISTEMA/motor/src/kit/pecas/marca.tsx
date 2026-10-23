// Marca do Instagram (CUT DINÂMICO): ícone de linha desenhado em SVG + @ do usuário. Três exports:
//
// IconeInstagram: o SVG reutilizável (proporções do glifo oficial). Desenho por partes com stroke-dasharray
//   (`desenho` = progresso [quadrado, lente, ponto], 0..1) e varredura diagonal para o gradiente do Instagram
//   (`gradiente` = [entrada, saída], 0..1: o gradiente nasce no canto inferior esquerdo e sai pelo superior direito).
//
// MarcaArroba (camada 'marca-arroba', fixa de ~0,1 s até o card final): quadrado em 0,13 s, lente em 0,27 s,
//   ponto em 0,33 s, ícone completo em 0,4 s; o @ entra de 0,85 a 1,0 s; sai com fade de 0,25 s.
//   Parâmetros: pos ('a' = alto à direita, padrão | 'b' = alto à esquerda, espelhado);
//   trocas ([{t, pos}], troca de canto com cruzamento de 0,25 s; t em s relativos à camada);
//   brilho ([s] relativos à camada: o ícone se enche com o gradiente por `brilhoDur` s, virada de 0,25 s e volta
//   ao creme; som sugerido em sfxBrilhoArroba); brilhoDur (2); tamanho (ícone, px em 1080: 58); traco (5,5);
//   fonte (px do @: 27); arroba (padrão: est.arroba); montar (true; false = entra pronto, com fade de 0,25 s).
//
// EncerramentoInsta (camada 'encerramento-insta', card final de até 2,5 s, sobre `tela` escura + {pausa}):
//   ícone de 150 px no centro (y 47%) se desenhando como acima, virada creme → gradiente em 0,4 s com pulso e halo;
//   @ de 40 px entra 0,25 s depois da virada (fade + subida); linha opcional em Instrument Serif itálica;
//   sai com fade de 0,3 s. Parâmetros: texto ('' = sem linha; ex.: "segue para mais"), arroba (est.arroba),
//   tamanho (150), traco (14), y (0,47), virada (s do início da virada: 0,4), volta (s em que volta ao creme;
//   padrão: não volta), fonte (40), fonteTexto (46), halo (true), fundo (true = pinta #0B0B0C por baixo).
import React, {useId} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PecaProps} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxMarcaArroba: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_14_ui-granular-button-select', 0.2];
export const sfxBrilhoArroba: [string, number] = ['motionix/pop/pop_06_sweet-ui-open', 0.3]; // pôr no `sfx` da edição em cada `brilho`
export const sfxEncerramentoInsta: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_03_ui-premium-open', 0.35];

export const GRADIENTE_INSTA = ['#FEDA75', '#D62976', '#962FBF', '#4F5BD5'];
const PRETO = '#0B0B0C';

const num = (v: unknown, padrao: number) => (typeof v === 'number' ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const alfa = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// progresso 0..1 entre dois instantes (s), com curva
const fase = (t: number, ini: number, fim: number, curva = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
// montagem do ícone (s): quadrado, lente, ponto (com expo-out cada parte assenta em ~0,13 / 0,27 / 0,33 s)
const desenhoEm = (t: number): [number, number, number] => [fase(t, 0, 0.15), fase(t, 0.09, 0.29), fase(t, 0.25, 0.35)];
// pulso (0 → 1 → 0) que acompanha a virada para o gradiente
const pulsoEm = (t: number, t0: number, sobe: number, desce: number) => (t < t0 + sobe ? fase(t, t0, t0 + sobe) : 1 - fase(t, t0 + sobe, t0 + sobe + desce, CURVAS.suave));

// ---------- Ícone ----------
export type IconeInstagramProps = {
	tamanho: number; // px (lado)
	traco?: number; // px (padrão: 9,5% do tamanho)
	cor?: string;
	desenho?: [number, number, number];
	gradiente?: [number, number];
	brilho?: number; // 0..1: halo colorido em volta do traço
	sombra?: boolean;
	style?: React.CSSProperties;
};

export const IconeInstagram: React.FC<IconeInstagramProps> = ({tamanho, traco, cor = '#F5F1EA', desenho = [1, 1, 1], gradiente = [0, 0], brilho = 0, sombra = true, style}) => {
	const id = 'ig' + useId().replace(/[^a-zA-Z0-9]/g, '');
	// geometria numa caixa 0..100 (linha central do traço); bordas externas fixas como no glifo oficial
	const sw = (100 * (traco ?? tamanho * 0.095)) / tamanho;
	const m = sw / 2;
	const a = 100 - m;
	const rx = 29.4 - m; // canto do quadrado (externo ≈ 29% do lado)
	const rl = 25.7 - m; // lente (externo ≈ 51% do lado)
	const rp = Math.max(3.5, sw * 0.63); // raio do ponto
	const [px, py] = [76.6, 23.4];
	// quadrado em duas metades que nascem no alto e se encontram embaixo
	const dir = `M50 ${m}H${a - rx}A${rx} ${rx} 0 0 1 ${a} ${m + rx}V${a - rx}A${rx} ${rx} 0 0 1 ${a - rx} ${a}H50`;
	const esq = `M50 ${m}H${m + rx}A${rx} ${rx} 0 0 0 ${m} ${m + rx}V${a - rx}A${rx} ${rx} 0 0 0 ${m + rx} ${a}H50`;
	// lente: começa no alto à direita (perto do ponto) e gira no sentido anti-horário, levando o olho ao ponto
	const k = Math.SQRT1_2 * rl;
	const lente = `M${50 + k} ${50 - k}A${rl} ${rl} 0 0 0 ${50 - k} ${50 + k}A${rl} ${rl} 0 0 0 ${50 + k} ${50 - k}`;
	// ponto: varredura de relógio (traço da largura do diâmetro) + leve pop
	const r2 = rp / 2;
	const ponto = `M${px} ${py - r2}A${r2} ${r2} 0 0 1 ${px} ${py + r2}A${r2} ${r2} 0 0 1 ${px} ${py - r2}`;
	const [pq, pl, pp] = desenho;
	const tr = (p: number) => ({pathLength: 1, strokeDasharray: `${p} 2`, opacity: p > 0.002 ? 1 : 0});
	const geo = (tinta: string) => (
		<>
			<path d={dir} stroke={tinta} {...tr(pq)} />
			<path d={esq} stroke={tinta} {...tr(pq)} />
			<path d={lente} stroke={tinta} {...tr(pl)} />
			<path d={ponto} stroke={tinta} strokeWidth={rp} strokeLinecap="butt" transform={`translate(${px} ${py}) scale(${0.45 + 0.55 * pp}) translate(${-px} ${-py})`} {...tr(pp)} />
		</>
	);
	// varredura: faixa [saída, entrada] ao longo da diagonal inferior esquerda → superior direita, borda suave
	const [ge, gs] = gradiente;
	const temGrad = ge > 0.001 && gs < 0.999;
	const s = 0.16;
	const ent = -s + ge * (1 + 2 * s);
	const sai = -s + gs * (1 + 2 * s);
	const offs = [sai - s, sai + s, ent - s, ent + s].map((o) => Math.min(1, Math.max(0, o)));
	for (let i = 1; i < 4; i++) offs[i] = Math.max(offs[i], offs[i - 1]);
	const mascara = (sufixo: string, cores: string[]) => (
		<>
			<linearGradient id={id + sufixo + 'l'} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="100" y2="0">
				{offs.map((o, i) => (
					<stop key={i} offset={o} stopColor={cores[i]} />
				))}
			</linearGradient>
			<mask id={id + sufixo} maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140">
				<rect x="-20" y="-20" width="140" height="140" fill={`url(#${id + sufixo}l)`} />
			</mask>
		</>
	);
	const filtros = [sombra ? `drop-shadow(0 ${tamanho * 0.035}px ${tamanho * 0.1}px rgba(0,0,0,0.45))` : '', brilho > 0.01 ? `drop-shadow(0 0 ${tamanho * 0.14 * brilho}px ${alfa(GRADIENTE_INSTA[1], 0.55 * brilho)})` : ''].filter(Boolean).join(' ');
	return (
		<svg viewBox="0 0 100 100" width={tamanho} height={tamanho} style={{overflow: 'visible', filter: filtros || undefined, ...style}}>
			{temGrad && (
				<defs>
					<radialGradient id={id + 'g'} gradientUnits="userSpaceOnUse" cx="22" cy="104" r="118">
						<stop offset="0" stopColor={GRADIENTE_INSTA[0]} />
						<stop offset="0.36" stopColor={GRADIENTE_INSTA[1]} />
						<stop offset="0.68" stopColor={GRADIENTE_INSTA[2]} />
						<stop offset="1" stopColor={GRADIENTE_INSTA[3]} />
					</radialGradient>
					{mascara('mg', ['#000', '#fff', '#fff', '#000'])}
					{mascara('mc', ['#fff', '#000', '#000', '#fff'])}
				</defs>
			)}
			<g fill="none" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
				<g mask={temGrad ? `url(#${id}mc)` : undefined}>{geo(cor)}</g>
				{temGrad && <g mask={`url(#${id}mg)`}>{geo(`url(#${id}g)`)}</g>}
			</g>
		</svg>
	);
};

// ---------- @ fixo no canto ----------
type Pos = 'a' | 'b';
const CANTOS: Record<Pos, {x: number; lado: 1 | -1}> = {a: {x: 0.896, lado: 1}, b: {x: 0.104, lado: -1}};
const Y_ICONE = 0.254;
const BASE_ARROBA = 0.305; // linha de base do @ (fração da altura)
const CRUZA = 0.25; // s: troca de canto, virada do brilho e saída

export const MarcaArroba: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const durS = dur / fps;
	const tam = num(c.tamanho, 58) * u;
	const fs = num(c.fonte, 27) * u;
	const montar = c.montar !== false;

	const desenho = montar ? desenhoEm(t) : ([1, 1, 1] as [number, number, number]);
	const escala = montar ? 0.9 + 0.1 * fase(t, 0, 0.4) : 1;
	const surge = montar ? 1 : fase(t, 0, CRUZA, CURVAS.suave);
	const eA = montar ? fase(t, 0.85, 1.0, CURVAS.suave) : fase(t, 0.1, 0.1 + CRUZA, CURVAS.suave);
	const saida = fase(t, durS - CRUZA, durS, CURVAS.saida);

	// brilho em gradiente: vale o último instante já alcançado
	const bDur = num(c.brilhoDur, 2);
	const brilhos = (Array.isArray(c.brilho) ? c.brilho : [c.brilho]).filter((b): b is number => typeof b === 'number').sort((x, y) => x - y);
	const b0 = brilhos.filter((b) => b <= t).pop();
	const grad: [number, number] = b0 === undefined ? [0, 0] : [fase(t, b0, b0 + CRUZA, CURVAS.suave), fase(t, b0 + bDur - CRUZA, b0 + bDur, CURVAS.suave)];
	const pulso = b0 === undefined ? 0 : pulsoEm(t, b0, 0.12, 0.45);
	const brilho = Math.min(grad[0], 1 - grad[1]);

	// trocas de canto
	const trocas = (Array.isArray(c.trocas) ? c.trocas : [])
		.filter((x): x is {t: number; pos: Pos} => typeof x?.t === 'number' && (x.pos === 'a' || x.pos === 'b'))
		.sort((x, y) => x.t - y.t);
	const segs = [{pos: (txt(c.pos, 'a') === 'b' ? 'b' : 'a') as Pos, ini: -1}, ...trocas.map((x) => ({pos: x.pos, ini: x.t}))];

	return (
		<AbsoluteFill style={{opacity: 1 - saida, filter: saida > 0.001 ? `blur(${saida * 3 * u}px)` : undefined}}>
			{segs.map((sg, i) => {
				const prox = segs[i + 1];
				const entra = i === 0 ? 1 : fase(t, sg.ini, sg.ini + CRUZA, CURVAS.suave);
				const sai = prox ? fase(t, prox.ini, prox.ini + CRUZA, CURVAS.suave) : 0;
				if (entra <= 0.001 || sai >= 0.999) return null;
				const {x, lado} = CANTOS[sg.pos];
				const cx = x * W;
				const cy = Y_ICONE * H;
				const mov = 1 - entra + sai; // cruzamento: quem sai vai para a borda, quem entra vem dela
				return (
					<div key={i} style={{position: 'absolute', inset: 0, opacity: entra * (1 - sai), transform: `translateX(${lado * 14 * u * mov}px)`, filter: mov > 0.001 ? `blur(${4 * u * mov}px)` : undefined}}>
						<IconeInstagram
							tamanho={tam}
							traco={num(c.traco, 5.5) * u}
							cor={est.creme}
							desenho={desenho}
							gradiente={grad}
							brilho={brilho}
							style={{position: 'absolute', left: cx - tam / 2, top: cy - tam / 2, opacity: surge, transform: `scale(${escala * (1 + 0.1 * pulso)})`}}
						/>
						<div
							style={{
								position: 'absolute',
								top: BASE_ARROBA * H - 0.86 * fs,
								...(lado === 1 ? {right: W - (cx + tam / 2)} : {left: cx - tam / 2}),
								fontFamily: FONTES.base.family,
								fontWeight: 600,
								fontSize: fs,
								lineHeight: 1,
								letterSpacing: '0.02em',
								whiteSpace: 'nowrap',
								color: alfa(est.creme, 0.92),
								textShadow: `0 ${2 * u}px ${6 * u}px rgba(0,0,0,0.45)`,
								opacity: eA,
								transform: `translateY(${(1 - eA) * 0.3 * fs}px)`,
								filter: eA < 0.999 ? `blur(${(1 - eA) * 3 * u}px)` : undefined,
							}}
						>
							{txt(c.arroba, est.arroba)}
						</div>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

// ---------- Card final ----------
export const EncerramentoInsta: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const durS = dur / fps;
	const tam = num(c.tamanho, 150) * u;
	const cy = num(c.y, 0.47) * H;
	const fsA = num(c.fonte, 40) * u;
	const fsT = num(c.fonteTexto, 46) * u;
	const texto = txt(c.texto, '');
	const virada = num(c.virada, 0.4);
	const VIRA = 0.4; // s da virada creme → gradiente
	const volta = typeof c.volta === 'number' ? c.volta : undefined;

	const fundo = fase(t, 0, 0.15, CURVAS.suave);
	const escala = 0.88 + 0.12 * fase(t, 0, 0.5);
	const grad: [number, number] = [fase(t, virada, virada + VIRA, CURVAS.suave), volta === undefined ? 0 : fase(t, volta, volta + VIRA, CURVAS.suave)];
	const cor = Math.min(grad[0], 1 - grad[1]);
	const pulso = pulsoEm(t, virada, 0.15, 0.55);
	const a0 = virada + 0.25;
	const eA = fase(t, a0, a0 + 0.35);
	const eT = fase(t, a0 + 0.15, a0 + 0.5);
	const saida = fase(t, durS - 0.3, durS, CURVAS.saida);

	const entra = (e: number, fs: number): React.CSSProperties => ({opacity: e, transform: `translateY(${(1 - e) * 0.5 * fs}px)`, filter: e < 0.999 ? `blur(${(1 - e) * 6 * u}px)` : undefined});

	return (
		<AbsoluteFill>
			{c.fundo !== false && <AbsoluteFill style={{background: PRETO, opacity: fundo}} />}
			<AbsoluteFill style={{opacity: 1 - saida, transform: `scale(${1 - 0.03 * saida})`, filter: saida > 0.001 ? `blur(${saida * 6 * u}px)` : undefined}}>
				{c.halo !== false && (
					<div
						style={{
							position: 'absolute',
							left: W / 2 - tam * 1.9,
							top: cy - tam * 1.9,
							width: tam * 3.8,
							height: tam * 3.8,
							borderRadius: '50%',
							background: `radial-gradient(circle, ${alfa(GRADIENTE_INSTA[1], 0.2)} 0%, ${alfa(GRADIENTE_INSTA[2], 0.09)} 34%, transparent 66%)`,
							opacity: cor * (0.85 + 0.15 * pulso),
						}}
					/>
				)}
				<IconeInstagram
					tamanho={tam}
					traco={num(c.traco, 14) * u}
					cor={est.creme}
					desenho={desenhoEm(t)}
					gradiente={grad}
					brilho={cor * 0.7}
					sombra={false}
					style={{position: 'absolute', left: W / 2 - tam / 2, top: cy - tam / 2, transform: `scale(${escala * (1 + 0.06 * pulso)})`}}
				/>
				<div style={{position: 'absolute', left: 0, right: 0, top: cy + tam / 2 + 0.27 * tam, textAlign: 'center', whiteSpace: 'nowrap'}}>
					<div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: fsA, lineHeight: 1, letterSpacing: '0.01em', color: alfa(est.creme, 0.92), ...entra(eA, fsA)}}>{txt(c.arroba, est.arroba)}</div>
					{texto && (
						<div style={{marginTop: 0.45 * fsT, fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: fsT, lineHeight: 1, letterSpacing: FONTES.serifa.tracking, color: alfa(est.creme, 0.8), ...entra(eT, fsT)}}>
							{texto}
						</div>
					)}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
