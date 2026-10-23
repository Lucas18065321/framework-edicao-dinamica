// Ficha de papel (YOUTUBE - MIX EDIT, peça `ficha-papel`): quebra de modo tátil. Papel creme com textura leve, itens
// impressos com caixinha e marcas de caneta vermelha "tremida" (ruído fixo no traço, nada treme no tempo): ☒, ✓ e
// risco sobre o texto; no fim, um carimbo (ex.: "INVIÁVEL", "MITO") bate girado −5°. Uso: "Estudo duplo-cego com gente
// sem celular?" ☒. Claramente gráfica: sem timbre, registro profissional ou cara de documento oficial. Sobre a tela escura/grade (cartão girado
// −1,5° com sombra) ou o quadro todo de papel (`cheio: true`). 120–300 q, no máximo 2 por vídeo.
// Sequência: o papel sobe e assenta girando (14 q, quint-out, blur 10→0); o micro-rótulo e o filete acendem; o título
// (Instrument Serif itálica) entra; cada item no seu `t`: a caixinha se desenha (8 q) e o texto sobe por máscara (12 q);
// em `marcaT` a caneta faz o ☒ (2 traços de 5 q) ou o ✓ (7 q) e, com `riscar`, risca o texto (8 q, curva "risco").
// Carimbo: escala 1,3→1 em 3 q, tinta aparece em 2 q, borda gasta (ruído). Saída: 10 q, blur 0→10 e subida.
// Parâmetros:
//   titulo (Instrument Serif itálica, ex.: "Dá para testar?"), rotulo (micro-rótulo, ex.: "FICHA 01"; '' = sem),
//   itens: [{t (s desde o início da camada), texto, marca ('x' | 'v' | ''; padrão 'x'), marcaT (s; padrão t + 0,45),
//     riscar (true = risco sobre o texto depois da marca; padrão false)}] ou strings (☒, um a cada 0,7 s),
//   carimbo (string ou {t, texto}; padrão: 0,4 s depois da última marca), carimboPos ([x, y] = centro do carimbo em
//     fração do papel; padrão: embaixo à direita, numa faixa reservada abaixo dos itens, sem cobrir texto nem cortar na
//     borda), tamanhoCarimbo (px, 104),
//   x, y (centro do papel, 0.5), largura (px em 1080; padrão: a do conteúdo, de 900 px até 80% do quadro: cada item numa
//     linha só), rot (graus, −1.5), cheio (false: papel em tela cheia),
//   tamanho (corpo dos itens, 58), tamanhoTitulo (96), cor (tinta da caneta e do carimbo; padrão est.acento),
//   papel (cor do papel; padrão est.papel ou #EFEBE4), tinta (texto impresso; padrão est.tinta ou #1C0A06).
// Sons (registro): sfxFichaPapel na entrada (papel deslizando); sonsFichaPapel = caneta (swish_air) em cada marca e
// risco + carimbo (impact_sub + clique).
import React, {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {noise2D} from '@remotion/noise';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxFichaPapel: [string, number] = ['motionix/whooshes/whooshes_02_cinematic-fast-normal-whoosh', 0.35];
const SOM_CANETA = 'swish_air';
const SOM_CARIMBO: [string, number][] = [
	['impact_sub', 0.45],
	['motionix/clicks/clicks_01_cinematic-click', 0.6],
];

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fase = (t: number, ini: number, fim: number, curva: (x: number) => number = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const RISCO = Easing.bezier(0.37, 0, 0.63, 1);
const ASSENTO = Easing.bezier(0.22, 1, 0.36, 1);
const TRACO_X = 5 / 30; // cada traço do ☒
const TRACO_V = 7 / 30; // o ✓
const TRACO_RISCO = 8 / 30;

// ---------- tempos (peça e sons usam a mesma conta) ----------
type ItemF = {t: number; texto: string; marca: 'x' | 'v' | ''; marcaT: number; riscar: boolean; riscoT: number};
export const temposFicha = (c: Camada) => {
	const itens: ItemF[] = [];
	(Array.isArray(c.itens) ? c.itens : []).forEach((it, i) => {
		const o = (typeof it === 'string' ? {texto: it} : it ?? {}) as Record<string, unknown>;
		const texto = txt(o.texto, '').replace(/\s+/g, ' ').trim();
		if (!texto) return;
		const t = Math.max(num(o.t, 0.55 + i * 0.7), 0.3, itens.length ? itens[itens.length - 1].t + 0.15 : -Infinity);
		const marca = o.marca === 'v' || o.marca === '✓' ? 'v' : o.marca === '' || o.marca === false ? '' : 'x';
		const marcaT = Math.max(t + 0.15, num(o.marcaT, t + 0.45));
		const fimMarca = marcaT + (marca === 'x' ? 2 * TRACO_X + 1 / 30 : marca === 'v' ? TRACO_V : 0);
		itens.push({t, texto, marca, marcaT, riscar: bool(o.riscar, false), riscoT: fimMarca + 0.05});
	});
	const ultima = itens.reduce((a, it) => Math.max(a, it.marca ? (it.riscar ? it.riscoT + TRACO_RISCO : it.marcaT + TRACO_V) : it.t + 0.4), 0.6);
	const cb = c.carimbo;
	const carimboTexto = (typeof cb === 'string' ? cb : txt((cb as {texto?: unknown} | undefined)?.texto, '')).trim();
	const carimboT = typeof cb === 'object' && cb ? num((cb as {t?: unknown}).t, ultima + 0.4) : ultima + 0.4;
	return {itens, carimbo: carimboTexto ? {texto: carimboTexto, t: carimboT} : null};
};

export const sonsFichaPapel = (c: Camada): Som[] => {
	const T = temposFicha(c);
	const out: Som[] = [];
	T.itens.forEach((it) => {
		if (it.marca) out.push({t: it.marcaT, som: SOM_CANETA, vol: 0.45});
		if (it.riscar) out.push({t: it.riscoT, som: SOM_CANETA, vol: 0.4});
	});
	if (T.carimbo) SOM_CARIMBO.forEach(([som, vol]) => out.push({t: T.carimbo!.t, som, vol}));
	return out;
};

// ---------- caneta tremida ----------
type P = [number, number];
// Reamostra a polilinha a cada `passo` px e desloca cada ponto na perpendicular por ruído fixo (semente), como a mão;
// o caminho sai suavizado por curvas quadráticas entre os pontos médios.
const tremido = (pts: P[], semente: string, amp: number, passo: number) => {
	const out: P[] = [];
	let s = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const [x0, y0] = pts[i];
		const [x1, y1] = pts[i + 1];
		const L = Math.hypot(x1 - x0, y1 - y0) || 1;
		const nx = -(y1 - y0) / L;
		const ny = (x1 - x0) / L;
		const n = Math.max(2, Math.round(L / passo));
		for (let k = i === 0 ? 0 : 1; k <= n; k++) {
			const f = k / n;
			const d = noise2D(semente, s * 0.09, 0) * amp + noise2D(semente, s * 0.35, 3) * amp * 0.35;
			out.push([x0 + (x1 - x0) * f + nx * d, y0 + (y1 - y0) * f + ny * d]);
			s++;
		}
	}
	let d = `M ${out[0][0].toFixed(2)} ${out[0][1].toFixed(2)}`;
	for (let i = 1; i < out.length - 1; i++) {
		const mx = (out[i][0] + out[i + 1][0]) / 2;
		const my = (out[i][1] + out[i + 1][1]) / 2;
		d += ` Q ${out[i][0].toFixed(2)} ${out[i][1].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
	}
	const ult = out[out.length - 1];
	return `${d} L ${ult[0].toFixed(2)} ${ult[1].toFixed(2)}`;
};

const Traco: React.FC<{d: string; p: number; cor: string; largura: number}> = ({d, p, cor, largura}) => {
	if (p <= 0) return null;
	const ev = evolvePath(p, d);
	return <path d={d} fill="none" stroke={cor} strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />;
};

export const FichaPapel: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const id = useId().replace(/[^a-zA-Z0-9]/g, '');
	const T = React.useMemo(() => temposFicha(c), [c]);

	const cheio = bool(c.cheio, false);
	const papel = txt(c.papel, (est as {papel?: string}).papel ?? '#EFEBE4');
	const tinta = txt(c.tinta, (est as {tinta?: string}).tinta ?? '#1C0A06');
	const caneta = txt(c.cor, est.acento);
	const fs = num(c.tamanho, 58) * u;
	const fsT = num(c.tamanhoTitulo, 96) * u;
	const largura: number | 'max-content' = cheio ? W : typeof c.largura === 'number' ? c.largura * u : 'max-content';
	const rot = cheio ? 0 : num(c.rot, -1.5);
	const B = fs * 0.86; // lado da caixinha
	const titulo = txt(c.titulo, '').trim();
	const rotulo = txt(c.rotulo, '').trim().toUpperCase();

	const qSai = Math.max(1, Math.min(Math.round(fps * 0.34), Math.floor(dur * 0.3)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const entra = cheio ? 1 : fase(t, 0, 14 / 30, ASSENTO);
	const aparece = cheio ? 1 : fase(t, 0, 8 / 30);
	const deriva = 1 + 0.012 * interpolate(frame, [0, dur], [0, 1], clamp);
	const microE = fase(t, 0.15, 0.45);
	const filete = fase(t, 0.2, 0.2 + 12 / 30, Easing.bezier(0.25, 0.15, 0.5, 1));
	const tituloE = fase(t, 0.22, 0.22 + 11 / 30);

	// carimbo
	const C = T.carimbo;
	const cbE = C ? fase(t, C.t, C.t + 3 / 30, Easing.out(Easing.quad)) : 0;
	const cbTinta = C ? fase(t, C.t, C.t + 2 / 30, CURVAS.linear) : 0;
	const pos = Array.isArray(c.carimboPos) && c.carimboPos.length === 2 ? (c.carimboPos as unknown[]).map((v, k) => num(v, k ? 0.2 : 0.7)) : null;
	const fsC = num(c.tamanhoCarimbo, 104) * u;
	// sem carimboPos: faixa reservada embaixo (altura do carimbo + folga para a rotação de −5°); o carimbo fica ancorado
	// à direita e gira/escala em torno do próprio centro (a 1,3× no 1º quadro a tinta ainda é 0, então nada corta)
	const reserva = C && !pos && !cheio ? fsC + 36 * u + 44 * u : 0;

	const sombra = cheio ? undefined : `0 ${34 * u}px ${90 * u}px ${rgba('#000000', 0.5)}, 0 ${8 * u}px ${22 * u}px ${rgba('#000000', 0.3)}`;
	const larguraCaneta = 5.5 * u;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<defs>
					{/* grão fino do papel */}
					<filter id={`fp-grao-${id}`} x="0" y="0" width="100%" height="100%">
						<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
						<feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.28  0.4 0 0 0 -0.13" />
					</filter>
					{/* manchas largas (fibra) */}
					<filter id={`fp-mancha-${id}`} x="0" y="0" width="100%" height="100%">
						<feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="3" seed="11" />
						<feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0 0.3  0.3 0 0 0 -0.1" />
					</filter>
					{/* tinta de carimbo gasta: buracos por ruído + borda irregular */}
					<filter id={`fp-carimbo-${id}`} x="-5%" y="-10%" width="110%" height="120%">
						<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="3" result="ruido" />
						<feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -6 0 0 0 4.2" result="buracos" />
						<feComposite in="SourceGraphic" in2="buracos" operator="in" result="gasto" />
						<feDisplacementMap in="gasto" in2="ruido" scale={3 * u} xChannelSelector="R" yChannelSelector="G" />
					</filter>
				</defs>
			</svg>

			<div
				style={{
					position: 'absolute',
					left: cheio ? 0 : num(c.x, 0.5) * W,
					top: cheio ? 0 : num(c.y, 0.5) * H,
					width: largura,
					minWidth: cheio ? undefined : 900 * u,
					maxWidth: cheio ? undefined : 0.8 * W,
					minHeight: cheio ? H : undefined,
					transform: cheio
						? `translateY(${-20 * u * ps}px)`
						: `translate(-50%, -50%) translateY(${(1 - entra) * 70 * u - 20 * u * ps}px) rotate(${rot - 2.5 * (1 - entra)}deg) scale(${deriva})`,
					opacity: aparece * (1 - ps),
					filter: (1 - entra) * 10 + ps * 10 > 0.05 ? `blur(${((1 - entra) * 10 + ps * 10) * u}px)` : undefined,
					background: papel,
					boxShadow: sombra,
					borderRadius: cheio ? 0 : 4 * u,
					overflow: 'hidden',
					boxSizing: 'border-box',
					padding: cheio ? `${0.16 * H}px ${0.16 * W}px` : `${62 * u}px ${74 * u}px ${70 * u + reserva}px`,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: cheio ? 'center' : undefined,
				}}
			>
				{/* textura: grão + manchas + bordas levemente mais escuras */}
				<svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply'}}>
					<rect width="100%" height="100%" filter={`url(#fp-mancha-${id})`} />
					<rect width="100%" height="100%" filter={`url(#fp-grao-${id})`} opacity={0.8} />
				</svg>
				<div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 ${110 * u}px ${rgba('#6E5A3C', 0.16)}`}} />

				<div style={{position: 'relative'}}>
					{rotulo && (
						<div style={{display: 'flex', alignItems: 'center', gap: 18 * u, opacity: microE, marginBottom: 20 * u}}>
							<div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: 22 * u, letterSpacing: '0.16em', color: rgba(tinta, 0.55), whiteSpace: 'pre'}}>{rotulo}</div>
							<div style={{flex: 1, height: Math.max(1, 1.5 * u), background: rgba(tinta, 0.22), transform: `scaleX(${filete})`, transformOrigin: '0 50%'}} />
						</div>
					)}
					{titulo && (
						<div style={{fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: fsT, lineHeight: 1.02, letterSpacing: '-0.01em', color: tinta, marginBottom: 34 * u, opacity: tituloE, filter: tituloE < 0.99 ? `blur(${(1 - tituloE) * 10 * u}px)` : undefined, transform: `translateY(${(1 - tituloE) * 0.3}em)`}}>
							{titulo}
						</div>
					)}
					<div style={{display: 'flex', flexDirection: 'column', gap: 30 * u}}>
						{T.itens.map((it, i) => {
							const caixa = fase(t, it.t, it.t + 8 / 30, Easing.bezier(0.25, 0.15, 0.5, 1));
							const sobe = fase(t, it.t + 0.03, it.t + 0.03 + 12 / 30);
							const ladoC = `M 0 0 H ${B} V ${B} H 0 Z`;
							const evC = evolvePath(caixa, ladoC);
							const semente = `${id}-${i}`;
							// marcas da caneta (passando um pouco da caixinha, como à mão)
							const x1 = tremido([[-0.14 * B, -0.12 * B], [1.1 * B, 1.06 * B]], `${semente}a`, 1.6 * u, 5 * u);
							const x2 = tremido([[1.08 * B, -0.16 * B], [-0.1 * B, 1.12 * B]], `${semente}b`, 1.6 * u, 5 * u);
							const v1 = tremido([[0.02 * B, 0.52 * B], [0.38 * B, 0.92 * B], [1.18 * B, -0.24 * B]], `${semente}v`, 1.4 * u, 5 * u);
							const pX1 = it.marca === 'x' ? fase(t, it.marcaT, it.marcaT + TRACO_X, RISCO) : 0;
							const pX2 = it.marca === 'x' ? fase(t, it.marcaT + TRACO_X + 1 / 30, it.marcaT + 2 * TRACO_X + 1 / 30, RISCO) : 0;
							const pV = it.marca === 'v' ? fase(t, it.marcaT, it.marcaT + TRACO_V, RISCO) : 0;
							const pR = it.riscar ? fase(t, it.riscoT, it.riscoT + TRACO_RISCO, RISCO) : 0;
							const risco = tremido([[0, 22], [1000, 18]], `${semente}r`, 4, 40);
							return (
								<div key={i} style={{display: 'flex', alignItems: 'flex-start', gap: 30 * u}}>
									<svg width={B} height={B} style={{flexShrink: 0, overflow: 'visible', marginTop: (fs * 1.18 - B) / 2}}>
										<path d={ladoC} fill="none" stroke={rgba(tinta, 0.78)} strokeWidth={3 * u} strokeLinejoin="round" strokeDasharray={evC.strokeDasharray} strokeDashoffset={evC.strokeDashoffset} />
										<g style={{mixBlendMode: 'multiply'}} opacity={0.94}>
											<Traco d={x1} p={pX1} cor={caneta} largura={larguraCaneta} />
											<Traco d={x2} p={pX2} cor={caneta} largura={larguraCaneta} />
											<Traco d={v1} p={pV} cor={caneta} largura={larguraCaneta} />
										</g>
									</svg>
									<div style={{overflow: 'hidden', paddingBottom: '0.08em'}}>
										<div style={{position: 'relative', display: 'inline-block', transform: `translateY(${(1 - sobe) * 105}%)`, fontFamily: FONTES.base.family, fontWeight: 500, fontSize: fs, lineHeight: 1.18, letterSpacing: '-0.015em', color: tinta}}>
											{it.texto}
											{pR > 0 && (
												<svg viewBox="0 0 1000 40" preserveAspectRatio="none" style={{position: 'absolute', left: '-0.12em', width: 'calc(100% + 0.24em)', top: '0.36em', height: '0.5em', overflow: 'visible', clipPath: `inset(-50% ${(1 - pR) * 100}% -50% 0)`, mixBlendMode: 'multiply', opacity: 0.94}}>
													<path d={risco} fill="none" stroke={caneta} strokeWidth={larguraCaneta} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
												</svg>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{C && cbE > 0 && (
					<div
						style={{
							position: 'absolute',
							...(pos ? {left: `${pos[0] * 100}%`, top: `${pos[1] * 100}%`} : cheio ? {right: 0.16 * W, bottom: 0.12 * H} : {right: 74 * u, bottom: 56 * u}),
							transform: `${pos ? 'translate(-50%, -50%) ' : ''}rotate(-5deg) scale(${1.3 - 0.3 * cbE})`,
							transformOrigin: '50% 50%',
							padding: `${10 * u}px ${30 * u}px`,
							border: `${8 * u}px double ${caneta}`,
							borderRadius: 8 * u,
							fontFamily: FONTES.impacto.family,
							fontWeight: 900,
							fontSize: fsC,
							lineHeight: 1,
							letterSpacing: '0.05em',
							color: caneta,
							whiteSpace: 'pre',
							opacity: 0.9 * cbTinta,
							mixBlendMode: 'multiply',
							filter: `url(#fp-carimbo-${id})${cbE < 1 ? ` blur(${(1 - cbE) * 2 * u}px)` : ''}`,
						}}
					>
						{C.texto.toUpperCase()}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
