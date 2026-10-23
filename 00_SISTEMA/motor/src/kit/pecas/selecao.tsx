// Caixa de seleção estilo Figma (CUT DINÂMICO, peça `selecao`): moldura tracejada com 4 alças em volta de uma palavra
// que a própria peça desenha. Uso: a palavra do mito que o público acha que importa ("MULTITAREFA", "HACK"); 30–34 q, até 2× por vídeo.
// Sequência (s): 0 ponto carmim com pop e onda num canto; 0,1–0,25 as 4 alças saem do ponto e abrem a caixa (contorno
// tracejado "8 6" que corre devagar); 0,16 a palavra entra creme (fantasma 60% + blur 4 px → nítida em 0,08 s); 0,22 etiqueta;
// virarEm: clarão curto e a palavra vira carmim; +0,25 s: 3 faíscas saem de um canto; últimos 0,25 s: encolhe 5% + fade + blur.
// Parâmetros:
//   texto (desenhado como vem; ex.: "MULTITAREFA"), x, y (0..1, centro da caixa; padrão 0.5, 0.3),
//   tamanho (px de corpo em 1080, 110; encolhe para a caixa caber em 80% da largura),
//   rotulo (etiqueta pequena acima do canto superior esquerdo, ex.: "mito.txt"; padrão: sem),
//   virarEm (s, 0.45; false = a palavra fica creme), canto (onde nasce o ponto: 'se' superior esquerdo (padrão) | 'sd' | 'ie' | 'id'),
//   faiscas (canto das faíscas; padrão: o vizinho do ponto na mesma borda; false = sem), rot (graus, 0; 0–4 nas explicações),
//   veu (0..1, 0: vidro escuro desfocado no miolo da caixa, para ler sobre fundo claro; ~0.6), cor (est.acento), corTexto (est.creme),
//   seguro (true: caixa e etiqueta em y 10–80% e fora da coluna de botões do Reels, x > 86% e y 55–90%).
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxSelecao: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_07_ui-click-digital-04', 0.3];

const num = (v: unknown, padrao: number) => (typeof v === 'number' ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// progresso 0..1 entre dois instantes (s), com curva
const fase = (t: number, ini: number, fim: number, curva = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});

const PRETO = '#0B0B0C';
const REF = 100; // tamanho de medição (px)
const ACENTO_ALTO = /[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÅ]/; // acento acima da maiúscula: abre o topo da caixa
const DESCE = /[gjpqyçQ,;]/; // descendente: abre a base da caixa
const VOLTA = Easing.bezier(0.2, 1.35, 0.4, 1); // expo-out com leve overshoot (a caixa passa ~5% e assenta)

type Canto = 'se' | 'sd' | 'ie' | 'id'; // superior/inferior + esquerdo/direito
const CANTOS: Record<Canto, [number, number]> = {se: [0, 0], sd: [1, 0], ie: [0, 1], id: [1, 1]};
const VIZINHO: Record<Canto, Canto> = {se: 'sd', sd: 'se', ie: 'id', id: 'ie'};
const canto = (v: unknown, padrao: Canto): Canto => (typeof v === 'string' && v in CANTOS ? (v as Canto) : padrao);

export const Selecao: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const fonte = FONTES.destaque;
	const texto = txt(c.texto, '').replace(/\s+/g, ' ').trim();

	// mede só depois que a Inter Tight 900 carregou (o measureText guarda em cache a 1ª medida)
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('selecao: fonte'));
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

	const largEm = useMemo(
		() => (pronto && texto ? measureText({text: texto, fontFamily: fonte.family, fontWeight: String(fonte.weight), fontSize: REF}).width / REF : 0),
		[pronto, texto, fonte.family, fonte.weight],
	);
	if (!pronto || !texto || largEm <= 0) return null;

	// ---------- medidas (em = corpo da palavra) ----------
	const tracking = parseFloat(fonte.tracking);
	const wEm = largEm + tracking * (Array.from(texto).length - 1);
	const padX = 0.17;
	const padTopo = 0.06 + (ACENTO_ALTO.test(texto) ? 0.12 : 0);
	const padBase = 0.06 + (DESCE.test(texto) ? 0.1 : 0);
	const fs = Math.min(num(c.tamanho, 110) * u, (0.8 * W) / (wEm + 2 * padX));
	const bw = (wEm + 2 * padX) * fs;
	const bh = (1 + padTopo + padBase) * fs;

	const traco = 2.6 * u;
	const alca = 18 * u;
	const rotulo = txt(c.rotulo, '').trim();
	const fRotulo = 27 * u;
	const hRotulo = fRotulo * 1.15 + 2 * 6 * u;
	const gapRotulo = 15 * u;

	// ---------- posição (áreas seguras do Reels) ----------
	let cx = num(c.x, 0.5) * W;
	let cy = num(c.y, 0.3) * H;
	if (bool(c.seguro, true)) {
		cx = Math.min(Math.max(cx, 0.04 * W + bw / 2), 0.96 * W - bw / 2);
		const topo = cy - bh / 2 - (rotulo ? gapRotulo + hRotulo : alca / 2);
		if (topo < 0.1 * H) cy += 0.1 * H - topo;
		if (cy + bh / 2 > 0.8 * H) cy = 0.8 * H - bh / 2;
		if (cx + bw / 2 + alca / 2 > 0.86 * W && cy + bh / 2 > 0.55 * H && cy - bh / 2 < 0.9 * H) cx = Math.max(0.86 * W - bw / 2 - alca / 2, 0.04 * W + bw / 2);
	}

	// ---------- tempo (s) ----------
	const t = frame / fps;
	const virar = c.virarEm === false ? null : Math.ceil(num(c.virarEm, 0.45) * fps - 1e-6) / fps; // no grid de quadros: o clarão cai inteiro num quadro
	const tFaisca = (virar ?? 0.35) + 0.25;

	// ponto: pop com overshoot (já visível no 1º quadro) e onda; some sob a alça quando as alças nascem
	const escPonto = interpolate(t, [0, 0.06, 0.1], [0.55, 1.25, 1], {...clamp, easing: Easing.out(Easing.quad)}) * (1 - fase(t, 0.11, 0.2, CURVAS.saida));
	const onda = fase(t, 0, 0.32);

	// alças saem do ponto e abrem a caixa (arrasto a partir do canto do ponto)
	const abre = t < 0.1 ? 0 : VOLTA(Math.min(1, (t - 0.1) / 0.15));
	const [ax, ay] = CANTOS[canto(c.canto, 'se')];
	const pos = (k: Canto): [number, number] => [ax * bw + (CANTOS[k][0] - ax) * bw * abre, ay * bh + (CANTOS[k][1] - ay) * bh * abre];
	const [x0, y0] = pos('se');
	const [x1, y1] = pos('id');
	const rx = Math.min(x0, x1);
	const ry = Math.min(y0, y1);
	const opCaixa = interpolate(abre, [0, 0.25], [0, 1], clamp);
	const escAlca = t < 0.1 ? 0 : interpolate(t, [0.1, 0.17], [0.45, 1], {...clamp, easing: CURVAS.entrada});

	// palavra: fantasma (60%, blur 4 px) → nítida em 0,08 s
	const tPal = 0.16;
	const vPal = fase(t, tPal, tPal + 0.08);
	const opPal = t < tPal ? 0 : 0.6 + 0.4 * vPal;

	// virada: clarão no quadro da virada, cor creme → carmim em ~2 q, pulso de escala e das alças
	const vira = virar === null ? 0 : fase(t, virar, virar + 0.09);
	const clarao = virar === null || t < virar ? 0 : interpolate(t, [virar, virar + 0.32], [1, 0], {...clamp, easing: Easing.out(Easing.quad)});
	const pulso = virar === null ? 0 : interpolate(t, [virar, virar + 0.06, virar + 0.3], [0, 1, 0], {...clamp, easing: CURVAS.suave});
	const cor = txt(c.cor, est.acento);
	const corTexto = txt(c.corTexto, est.creme);
	const corPal = interpolateColors(vira, [0, 1], [corTexto, cor]);

	// etiqueta: revelação da esquerda para a direita
	const vRot = fase(t, 0.22, 0.34);

	// faíscas: 3 traços saindo do canto, cabeça na frente e cauda alcançando
	const cantoF = c.faiscas === false ? null : canto(c.faiscas, VIZINHO[canto(c.canto, 'se')]);
	const pF = (t - tFaisca) / 0.3;

	// saída (encolhe se a camada for curta) e deriva lenta
	const qSai = Math.max(1, Math.min(Math.round(fps * 0.25), Math.floor(dur * 0.4)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const deriva = 1 + 0.015 * interpolate(frame, [0, dur], [0, 1], clamp);

	const M = 140 * u; // margem do SVG para alças, onda e faíscas
	const sombra = `drop-shadow(0 ${2 * u}px ${5 * u}px ${rgba(PRETO, 0.5)})`;
	const sombraTexto = [clarao > 0.01 ? `0 0 ${(10 + 18 * clarao) * u}px ${rgba(est.creme, 0.85 * clarao)}` : '', `0 ${4 * u}px ${10 * u}px ${rgba(PRETO, 0.45)}`].filter(Boolean).join(', ');

	const faiscas =
		cantoF && pF > 0 && pF < 1
			? [-34, 0, 34].map((da, i) => {
					const [sx, sy] = CANTOS[cantoF];
					const ang = Math.atan2(sy ? 1 : -1, sx ? 1 : -1) + (da * Math.PI) / 180;
					const d0 = 16 * u;
					const d1 = d0 + (i === 1 ? 62 : 46) * u;
					const cab = d0 + (d1 - d0) * CURVAS.entrada(Math.min(1, pF / 0.7));
					const cau = d0 + (d1 - d0) * CURVAS.entrada(Math.max(0, (pF - 0.3) / 0.7));
					const ox = sx * bw;
					const oy = sy * bh;
					return (
						<line
							key={i}
							x1={ox + Math.cos(ang) * cau}
							y1={oy + Math.sin(ang) * cau}
							x2={ox + Math.cos(ang) * cab}
							y2={oy + Math.sin(ang) * cab}
							stroke={cor}
							strokeWidth={5 * u * (1 - 0.5 * pF)}
							strokeLinecap="round"
						/>
					);
				})
			: null;

	const caixa: React.CSSProperties = {
		position: 'absolute',
		left: cx - bw / 2,
		top: cy - bh / 2,
		width: bw,
		height: bh,
		transform: `rotate(${num(c.rot, 0)}deg) scale(${deriva * (1 - 0.05 * ps)})`,
		transformOrigin: '50% 50%',
	};
	const veu = Math.min(1, Math.max(0, num(c.veu, 0)));

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* véu (vidro escuro desfocado) fora do grupo com filtro: filtro/opacidade no pai cortariam o backdrop-filter */}
			{veu > 0 && abre > 0 && (
				<div style={caixa}>
					<div
						style={{
							position: 'absolute',
							left: rx,
							top: ry,
							width: Math.abs(x1 - x0),
							height: Math.abs(y1 - y0),
							background: rgba(PRETO, veu),
							backdropFilter: `blur(${12 * u}px)`,
							opacity: opCaixa * (1 - ps),
						}}
					/>
				</div>
			)}
			<div style={{...caixa, opacity: 1 - ps, filter: ps > 0.01 ? `blur(${6 * u * ps}px)` : undefined}}>
				{/* moldura: contorno tracejado, ponto, onda, faíscas, alças */}
				<svg width={bw + 2 * M} height={bh + 2 * M} style={{position: 'absolute', left: -M, top: -M, overflow: 'visible', filter: sombra}}>
					<g transform={`translate(${M} ${M})`}>
						{abre > 0 && (
							<rect
								x={rx}
								y={ry}
								width={Math.abs(x1 - x0)}
								height={Math.abs(y1 - y0)}
								fill="none"
								stroke={cor}
								strokeWidth={traco}
								strokeDasharray={`${8 * u} ${6 * u}`}
								strokeDashoffset={-t * 22 * u}
								opacity={opCaixa}
							/>
						)}
						{onda < 1 && <circle cx={ax * bw} cy={ay * bh} r={(9 + 34 * onda) * u} fill="none" stroke={cor} strokeWidth={3 * u * (1 - onda)} opacity={0.85 * (1 - onda)} />}
						{escPonto > 0.01 && <circle cx={ax * bw} cy={ay * bh} r={10 * u * escPonto} fill={cor} />}
						{faiscas}
						{escAlca > 0 &&
							(Object.keys(CANTOS) as Canto[]).map((k) => {
								const [hx, hy] = pos(k);
								const s = alca * escAlca * (1 + 0.22 * pulso);
								return <rect key={k} x={hx - s / 2} y={hy - s / 2} width={s} height={s} rx={1.5 * u} fill={est.creme} stroke={cor} strokeWidth={traco} />;
							})}
					</g>
				</svg>

				{/* palavra */}
				{opPal > 0 && (
					<div
						style={{
							position: 'absolute',
							left: padX * fs,
							top: padTopo * fs,
							height: fs,
							fontFamily: fonte.family,
							fontWeight: fonte.weight,
							fontStyle: fonte.style,
							fontSize: fs,
							lineHeight: `${fs}px`,
							letterSpacing: fonte.tracking,
							whiteSpace: 'pre',
							color: corPal,
							opacity: opPal,
							filter: vPal < 0.99 ? `blur(${4 * u * (1 - vPal)}px)` : undefined,
							textShadow: sombraTexto,
							transform: `scale(${1 + 0.035 * (1 - CURVAS.entrada(vPal)) + 0.03 * pulso})`,
							transformOrigin: `${(wEm * fs) / 2}px 50%`,
						}}
					>
						{texto}
					</div>
				)}

				{/* etiqueta (nome da camada, como no Figma) */}
				{rotulo && vRot > 0 && (
					<div
						style={{
							position: 'absolute',
							left: rx - traco / 2,
							top: ry - gapRotulo - hRotulo,
							height: hRotulo,
							padding: `0 ${11 * u}px`,
							display: 'flex',
							alignItems: 'center',
							borderRadius: 5 * u,
							background: cor,
							color: est.creme,
							fontFamily: FONTES.base.family,
							fontWeight: FONTES.base.weight,
							fontSize: fRotulo,
							letterSpacing: '0.005em',
							whiteSpace: 'pre',
							clipPath: `inset(0 ${(1 - vRot) * 100}% 0 0 round ${5 * u}px)`,
							transform: `translateY(${(1 - vRot) * 8 * u}px)`,
							boxShadow: `0 ${3 * u}px ${10 * u}px ${rgba(PRETO, 0.4)}`,
						}}
					>
						{rotulo}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
