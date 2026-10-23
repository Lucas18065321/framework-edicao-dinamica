// Checklist "Apple-clean" (CUT DINÂMICO, peça `checklist`): card de vidro escuro com uma lista de hábitos que entra
// item a item no tempo da fala. Uso: a solução do vídeo ("desligue as notificações, blocos de 50 min, pausa curta…"); 1× por vídeo.
// Sequência: o card entra (escala 0,96→1 + fade + blur 12→0 em 0,35 s; o vidro "materializa" pelo raio do desfoque)
// já com espaço para os itens que caem na entrada. Cada item: contorno do círculo + texto deslizando 24 px da esquerda
// com fade; o círculo se enche de carmim (mola, com onda), o ✓ creme se desenha em 0,25 s e a barra sob o título avança.
// Item que chega depois: o card cresce para baixo (mola) e o revela. Itens já marcados baixam para 85%; o mais novo fica
// a 100%. Saída: fade + blur em 0,25 s (o vidro desfaz o desfoque).
// Sobre fundo claro (B-roll de lençol, papel), use vidro 0.7 para o creme ler bem.
// Parâmetros:
//   titulo (caixa-alta pequena, tracking aberto; '' = sem cabeçalho),
//   itens: [{t (s desde o início da camada), texto}] (ou só strings: um a cada 0,5 s; o 1º entra no mínimo em 0,15 s e
//     itens colados ganham 0,12 s de intervalo, sempre na ordem da lista),
//   x (0.5), y (0.42: centro do card COMPLETO; o topo fica fixo e o card cresce para baixo), largura (fração do quadro, 0.78),
//   tamanho (px do texto em 1080, 52; encolhe até 40 para o item mais longo caber numa linha; abaixo disso, quebra),
//   progresso (true: barra fina sob o título que enche a cada ✓), vidro (opacidade do fundo escuro, 0.55),
//   cor (est.acento), corTexto (est.creme), deriva (0.015: o card cresce devagar até a saída),
//   seguro (true: card em y 10–80% e fora da coluna de botões do Reels, x > 86% e y 55–90%).
// Som de cada ✓ (opcional, à mão no `sfx` da edição, em ini + t + 0,15 s): sfxChecklistItem.
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxChecklist: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_15_ui-open', 0.3];
export const sfxChecklistItem: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_14_ui-granular-button-select', 0.2];

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
// medidas em px de 1080
const PAD_X = 56;
const PAD_TOPO = 50;
const PAD_BASE = 54;
const TITULO = 26;
const TRACK_TITULO = '0.2em';
const GAP_TITULO = 22;
const BARRA = 3;
const GAP_CABECALHO = 34;
const CIRCULO = 44;
const GAP_CIRCULO = 26;
const GAP_ITEM = 34;
const RAIO = 40;
const ALTURA_LINHA = 1.15;
// tempos (s)
const ENTRADA = 0.35;
const SAIDA = 0.25;
const PRIMEIRO = 0.15; // 1º item entra depois do card começar a aparecer
const INTERVALO = 0.12; // mínimo entre itens colados
const ABRE = 0.12; // o card começa a crescer antes do item chegar
// ✓ no espaço do círculo (44 × 44)
const CHECK = 'M 12.8 22.9 L 19.3 29.4 L 31.4 16.4';
const DESENHO = Easing.bezier(0.45, 0, 0.2, 1);

type Item = {t: number; texto: string};
const lerItens = (v: unknown): Item[] =>
	Array.isArray(v)
		? v
				.map((it, i): Item => (typeof it === 'string' ? {t: i * 0.5, texto: it} : {t: num(it?.t, i * 0.5), texto: txt(it?.texto, '')}))
				.map((it) => ({...it, texto: it.texto.replace(/\s+/g, ' ').trim()}))
				.filter((it) => it.texto)
		: [];

export const Checklist: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const base = FONTES.base;
	const dest = FONTES.destaque;
	const titulo = txt(c.titulo, '').replace(/\s+/g, ' ').trim().toUpperCase();
	const itens = useMemo(() => lerItens(c.itens), [c.itens]);
	const chave = itens.map((it) => it.texto).join('\n');

	// mede só depois que as fontes carregaram (o measureText guarda em cache a 1ª medida)
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('checklist: fonte'));
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
		Promise.all([
			document.fonts.load(`${base.weight} ${REF}px "${base.family}"`, chave || 'A'),
			document.fonts.load(`${dest.weight} ${REF}px "${dest.family}"`, titulo || 'A'),
		])
			.then(() => document.fonts.ready)
			.then(libera, libera);
		return () => {
			vivo = false;
		};
	}, [continueRender, espera, base.family, base.weight, dest.family, dest.weight, chave, titulo]);

	const medidas = useMemo(() => {
		if (!pronto) return null;
		const larg = (s: string) => measureText({text: s, fontFamily: base.family, fontWeight: String(base.weight), fontSize: REF, letterSpacing: base.tracking}).width / REF;
		return {
			itens: chave ? chave.split('\n').map(larg) : [],
			titulo: titulo ? measureText({text: titulo, fontFamily: dest.family, fontWeight: String(dest.weight), fontSize: REF, letterSpacing: TRACK_TITULO}).width / REF : 0,
		};
	}, [pronto, chave, titulo, base.family, base.weight, base.tracking, dest.family, dest.weight]);
	if (!medidas) return null;

	// ---------- diagramação (px) ----------
	const progresso = bool(c.progresso, true);
	const D = CIRCULO * u;
	const gapC = GAP_CIRCULO * u;
	const monta = (cw: number) => {
		const util = cw - 2 * PAD_X * u;
		const avail = util - D - gapC;
		const maior = Math.max(0.01, ...medidas.itens);
		const tam = num(c.tamanho, 52) * u;
		const fs = Math.max(Math.min(tam, avail / maior), Math.min(tam, 40 * u));
		const lh = ALTURA_LINHA * fs;
		const linhas = medidas.itens.map((w) => Math.max(1, Math.ceil((w * fs) / avail - 0.02)));
		const alturas = linhas.map((n) => Math.max(D, n * lh));
		const fsTit = titulo ? Math.min(TITULO * u, util / Math.max(0.01, medidas.titulo)) : 0;
		const cabecalho = (titulo ? fsTit + (progresso ? GAP_TITULO * u : 0) : 0) + (progresso ? BARRA * u : 0) + (titulo || progresso ? GAP_CABECALHO * u : 0);
		const total = PAD_TOPO * u + cabecalho + alturas.reduce((a, b) => a + b, 0) + Math.max(0, alturas.length - 1) * GAP_ITEM * u + PAD_BASE * u;
		return {cw, util, avail, fs, lh, linhas, alturas, fsTit, cabecalho, total};
	};

	// ---------- posição (áreas seguras do Reels) ----------
	let cx = num(c.x, 0.5) * W;
	let L = monta(num(c.largura, 0.78) * W);
	cx = Math.min(Math.max(cx, 0.04 * W + L.cw / 2), 0.96 * W - L.cw / 2);
	const yC = num(c.y, 0.42) * H;
	let topo = yC - L.total / 2;
	if (bool(c.seguro, true)) {
		const encaixa = () => Math.max(0.1 * H, Math.min(yC - L.total / 2, 0.8 * H - L.total)); // y 10–80%
		topo = encaixa();
		const sobra = topo + L.total - 0.55 * H; // quanto o card desce na faixa da coluna de botões
		if (cx + L.cw / 2 > 0.86 * W && sobra > 0 && topo < 0.9 * H) {
			if (sobra <= 0.06 * H && 0.55 * H - L.total >= 0.1 * H) topo = 0.55 * H - L.total; // pouco: sobe
			else {
				// muito: estreita (simétrico, até 60% do quadro) e, se ainda faltar, empurra para a esquerda
				L = monta(Math.max(0.6 * W, Math.min(L.cw, 2 * (0.86 * W - cx))));
				cx = Math.min(cx, 0.86 * W - L.cw / 2);
				topo = encaixa();
			}
		}
	}

	// ---------- tempo (s) ----------
	const t = frame / fps;
	const tIni: number[] = [];
	itens.forEach((it, i) => tIni.push(Math.max(it.t, PRIMEIRO, i > 0 ? tIni[i - 1] + INTERVALO : -Infinity)));
	const molaDe = (ini: number, config: Parameters<typeof spring>[0]['config']) => (t < ini ? 0 : spring({frame: (t - ini) * fps, fps, config}));

	// entrada e saída do card (a saída encolhe se a camada for curta)
	const eIn = fase(t, 0, ENTRADA);
	const qSai = Math.max(1, Math.min(Math.round(fps * SAIDA), Math.floor(dur * 0.4)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)}); // ease-in suave: a saída se vê nos 6 q, não só nos 2 últimos
	const deriva = 1 + num(c.deriva, 0.015) * interpolate(frame, [0, dur], [0, 1], clamp);
	const escala = (0.96 + 0.04 * eIn) * (1 - 0.02 * ps) * deriva;
	const opCard = eIn * (1 - ps);
	const blurCard = 12 * u * (1 - eIn) + 12 * u * ps;

	// altura atual: itens da entrada já têm espaço; os seguintes abrem com mola um pouco antes de chegar
	const cresce = itens.map((_, i) => (tIni[i] <= ENTRADA ? 1 : molaDe(tIni[i] - ABRE, {damping: 19, stiffness: 160, mass: 0.8})));
	const altura =
		PAD_TOPO * u + L.cabecalho + PAD_BASE * u + L.alturas.reduce((a, h, i) => a + cresce[i] * (h + (i > 0 ? GAP_ITEM * u : 0)), 0);
	const topoItem: number[] = [];
	L.alturas.forEach((h, i) => topoItem.push(i === 0 ? PAD_TOPO * u + L.cabecalho : topoItem[i - 1] + L.alturas[i - 1] + GAP_ITEM * u));

	const cor = txt(c.cor, est.acento);
	const corTexto = txt(c.corTexto, est.creme);
	const vidro = Math.min(1, Math.max(0, num(c.vidro, 0.55)));
	const marcado = itens.reduce((a, _, i) => a + molaDe(tIni[i] + 0.14, {damping: 22, stiffness: 140, mass: 0.8}), 0);

	const caixa: React.CSSProperties = {
		position: 'absolute',
		left: cx - L.cw / 2,
		top: topo,
		width: L.cw,
		height: altura,
		borderRadius: RAIO * u,
		transform: `scale(${escala})`,
		transformOrigin: '50% 50%',
	};
	const tituloE = fase(t, 0.04, 0.4);

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* vidro: fora do grupo com filtro (filtro/opacidade num pai cortariam o backdrop-filter). Entra e sai pelo raio
			    do desfoque e pela tinta (sem opacidade no elemento, que mostraria o fundo nítido e o desfocado juntos) */}
			{opCard > 0.001 && (
				<div
					style={{
						...caixa,
						background: `linear-gradient(180deg, ${rgba(est.creme, 0.05 * opCard)} 0%, ${rgba(est.creme, 0)} 38%), ${rgba(PRETO, vidro * opCard)}`,
						backdropFilter: `blur(${24 * u * opCard}px)`,
						WebkitBackdropFilter: `blur(${24 * u * opCard}px)`,
						border: `${Math.max(1, u)}px solid ${rgba(est.creme, 0.14 * opCard)}`,
						boxSizing: 'border-box',
						boxShadow: [
							`inset 0 ${Math.max(1, u)}px 0 ${rgba(est.creme, 0.06 * opCard)}`,
							`0 ${36 * u}px ${90 * u}px ${rgba(PRETO, 0.5 * opCard)}`,
							`0 ${10 * u}px ${28 * u}px ${rgba(PRETO, 0.28 * opCard)}`,
						].join(', '),
					}}
				/>
			)}
			{/* conteúdo: recortado pela altura atual do card (o item que chega é revelado pelo crescimento) */}
			<div style={{...caixa, overflow: 'hidden', opacity: opCard, filter: blurCard > 0.05 ? `blur(${blurCard}px)` : undefined}}>
				{titulo && (
					<div
						style={{
							position: 'absolute',
							left: PAD_X * u,
							top: PAD_TOPO * u,
							height: L.fsTit,
							fontFamily: dest.family,
							fontWeight: dest.weight,
							fontSize: L.fsTit,
							lineHeight: `${L.fsTit}px`,
							letterSpacing: TRACK_TITULO,
							whiteSpace: 'pre',
							color: rgba(corTexto, 0.7),
							opacity: tituloE,
							transform: `translateY(${(1 - tituloE) * 8 * u}px)`,
						}}
					>
						{titulo}
					</div>
				)}
				{progresso && (
					<div
						style={{
							position: 'absolute',
							left: PAD_X * u,
							top: PAD_TOPO * u + (titulo ? L.fsTit + GAP_TITULO * u : 0),
							width: L.util,
							height: BARRA * u,
							borderRadius: BARRA * u,
							background: rgba(corTexto, 0.12),
							overflow: 'hidden',
							opacity: tituloE,
						}}
					>
						<div style={{width: L.util * Math.min(1, marcado / Math.max(1, itens.length)), height: '100%', borderRadius: BARRA * u, background: cor}} />
					</div>
				)}
				{itens.map((it, i) => {
					const t0 = tIni[i];
					if (t < t0 - ABRE) return null;
					const h = L.alturas[i];
					const lh = L.lh;
					const meio = Math.max(D, lh) / 2; // centro da 1ª linha = centro do círculo
					const contorno = fase(t, t0, t0 + 0.2);
					const enche = molaDe(t0 + 0.08, {damping: 12, stiffness: 210, mass: 0.6});
					const onda = fase(t, t0 + 0.1, t0 + 0.55, Easing.out(Easing.quad));
					const risco = fase(t, t0 + 0.14, t0 + 0.39, DESENHO);
					const ev = evolvePath(risco, CHECK);
					const texto = fase(t, t0, t0 + 0.32);
					const apaga = i < itens.length - 1 ? fase(t, tIni[i + 1], tIni[i + 1] + 0.25, CURVAS.suave) : 0;
					return (
						<div key={i} style={{position: 'absolute', left: PAD_X * u, top: topoItem[i], width: L.util, height: h, opacity: 1 - 0.15 * apaga}}>
							<svg width={D} height={D} viewBox={`0 0 ${CIRCULO} ${CIRCULO}`} style={{position: 'absolute', left: 0, top: meio - D / 2, overflow: 'visible'}}>
								{onda > 0 && onda < 1 && (
									<circle cx={22} cy={22} r={22 + 16 * onda} fill="none" stroke={cor} strokeWidth={2.4 * (1 - onda)} opacity={0.55 * (1 - onda)} />
								)}
								<circle
									cx={22}
									cy={22}
									r={20.75 * (0.7 + 0.3 * contorno)}
									fill={rgba(corTexto, 0.04)}
									stroke={rgba(corTexto, 0.38)}
									strokeWidth={2.5}
									opacity={contorno}
								/>
								{enche > 0.001 && <circle cx={22} cy={22} r={22 * enche} fill={cor} />}
								{risco > 0 && (
									<path
										d={CHECK}
										fill="none"
										stroke={corTexto}
										strokeWidth={4.2}
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeDasharray={ev.strokeDasharray}
										strokeDashoffset={ev.strokeDashoffset}
									/>
								)}
							</svg>
							<div
								style={{
									position: 'absolute',
									left: D + gapC,
									top: meio - lh / 2,
									width: L.avail,
									fontFamily: base.family,
									fontWeight: base.weight,
									fontSize: L.fs,
									lineHeight: `${lh}px`,
									letterSpacing: base.tracking,
									whiteSpace: L.linhas[i] > 1 ? 'normal' : 'pre',
									color: corTexto,
									opacity: texto,
									transform: `translateX(${-24 * u * (1 - texto)}px)`,
									filter: texto < 0.99 ? `blur(${5 * u * (1 - texto)}px)` : undefined,
									textShadow: `0 ${2 * u}px ${8 * u}px ${rgba(PRETO, 0.35)}`,
								}}
							>
								{it.texto}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
