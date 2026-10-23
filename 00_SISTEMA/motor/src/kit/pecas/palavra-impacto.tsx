// Palavra de impacto (CUT DINÂMICO): palavra ou número gigante em caixa-alta, Inter Tight 900, definida pela LARGURA
// (a linha mais larga ocupa `largura` do quadro), com falsa condensada, extrusão creme para baixo e para a direita
// e sombra escura suave. Serve na frente ou atrás da pessoa ("plano": "atras" + recorte; escolha o y para a cabeça
// cobrir no máximo ~30% da palavra, numa letra que não muda a leitura). Guia: reservar para número ou conceito central.
// Parâmetros:
//   texto ('\n' quebra em 2 linhas), x, y (0..1, centro do bloco de maiúsculas; padrão 0.5, 0.3),
//   largura (fração da largura do quadro, 0.8), condensar (scaleX, 0.8), alturaMax (altura máx. da maiúscula, px em 1080: 460),
//   cor (est.acento), corInicial (est.creme: cor em que a letra nasce), corExtrusao (est.creme),
//   extrusao (true = 5% da altura da letra; número = fração; false = sem), skew (graus, 0; −8 a −12 = inclinada),
//   entrada: 'letras' (padrão; letra a letra, creme a 50% → cor) | 'pop' (escala 1,18→1 com mola + blur) | 'virar' (rotateY por letra),
//   intervalo (s entre letras, 0.06; encurta sozinho para a palavra fechar em ≤ 0,36 s),
//   saida: 'blur' (padrão, 0,25 s) | 'chicote' (desliza para a direita com motion blur, 0,33 s) | 'corte',
//   caixaAlta (true; false para "pH"), brilho (true: brilho creme na entrada), deriva (0.03: crescimento lento até a saída),
//   seguro (true: afasta da coluna de botões do Reels, x > 86% e y 55–90%).
import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxPalavraImpacto: [string, number] = ['motionix/whooshes/whooshes_02_cinematic-fast-normal-whoosh', 0.3];

const num = (v: unknown, padrao: number) => (typeof v === 'number' ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);

const PRETO = '#0B0B0C';
// Métricas da Inter Tight (em): com line-height 1, a maiúscula fica centrada na caixa (topo em 0,136; base em 0,864).
const CAP = 0.727;
const TOPO_CAP = 0.136;
const ACENTO_ALTO = /[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÅ]/; // acento acima da maiúscula: abre a entrelinha para não bater na linha de cima
const REF = 100; // tamanho de medição (px)
const SOLTOS = /[–—/-]/; // traços e barra: folga em volta em vez do tracking negativo

const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

type Glifo = {ch: string; linha: number; x: number; w: number; k: number}; // x e w em em (unidades de fontSize); k = ordem entre as letras visíveis

export const PalavraImpacto: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const fonte = FONTES.impacto;
	const caixaAlta = bool(c.caixaAlta, true);
	const linhas = txt(c.texto, '')
		.split('\n')
		.map((l) => (caixaAlta ? l.toLocaleUpperCase('pt-BR') : l).trim())
		.filter(Boolean);
	const todas = linhas.join('');

	// mede só depois que a Inter Tight 900 carregou (o measureText guarda em cache a 1ª medida)
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('palavra-impacto: fonte'));
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
			.load(`${fonte.weight} ${REF}px "${fonte.family}"`, todas || 'A')
			.then(() => document.fonts.ready)
			.then(libera, libera);
		return () => {
			vivo = false;
		};
	}, [continueRender, espera, fonte.family, fonte.weight, todas]);

	const tracking = parseFloat(fonte.tracking); // em
	const layout = useMemo(() => {
		if (!pronto) return null;
		const glifos: Glifo[] = [];
		const largLinhas: number[] = [];
		let k = 0;
		linhas.forEach((l, i) => {
			const chars = Array.from(l);
			let x = 0;
			chars.forEach((ch, j) => {
				const medida = measureText({text: ch, fontFamily: fonte.family, fontWeight: String(fonte.weight), fontSize: REF}).width / REF;
				const w = ch === ' ' ? Math.max(medida, 0.28) : medida;
				glifos.push({ch, linha: i, x, w, k: ch === ' ' ? -1 : k++});
				// entre letras, tracking apertado; espaço inteiro e um pouco aberto (senão "SHOT DE" vira "SHOTDE");
				// traço e barra sem tracking negativo (o traço não cola no "7" de "7–8")
				const prox = chars[j + 1];
				x += w + (prox === undefined || ch === ' ' || prox === ' ' || SOLTOS.test(ch) || SOLTOS.test(prox) ? 0 : tracking);
			});
			largLinhas.push(x);
		});
		return {glifos, largLinhas, letras: k};
	}, [pronto, linhas.join('\n'), fonte.family, fonte.weight, tracking]);

	const filtroId = `pi-chicote-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
	if (!layout || layout.letras === 0) return null;

	// ---------- tamanho: a linha mais larga ocupa `largura` do quadro (já condensada) ----------
	const condensar = num(c.condensar, 0.8);
	const largEm = Math.max(...layout.largLinhas);
	let fs = (num(c.largura, 0.8) * W) / (largEm * condensar);
	fs = Math.min(fs, (num(c.alturaMax, 460) * u) / CAP);
	const cap = CAP * fs;

	// entrelinha 0,85 (FONTES.impacto.altura), aberta quando a linha de baixo tem acento alto
	const topos: number[] = [];
	linhas.forEach((l, i) => topos.push(i === 0 ? 0 : topos[i - 1] + fs * fonte.altura + (ACENTO_ALTO.test(l) ? 0.16 * fs : 0)));
	const larg = largEm * fs; // largura do bloco antes do scaleX
	const altCaps = topos[topos.length - 1] + CAP * fs; // do topo da 1ª maiúscula à base da última linha

	const ext = c.extrusao === false ? 0 : (typeof c.extrusao === 'number' ? c.extrusao : 0.05) * cap;
	const copias = Math.max(8, Math.min(12, Math.round(ext / (1.2 * u))));

	// ---------- posição (com a área segura dos botões do Reels) ----------
	let cx = num(c.x, 0.5) * W;
	const cy = num(c.y, 0.3) * H;
	let encolhe = 1;
	const meiaVis = (larg * condensar) / 2;
	if (bool(c.seguro, true) && cy + altCaps / 2 + ext > 0.55 * H && cy - altCaps / 2 < 0.9 * H && cx + meiaVis > 0.86 * W) {
		cx = Math.max(0.86 * W - meiaVis, 0.04 * W + meiaVis);
		if (cx + meiaVis > 0.86 * W) {
			encolhe = (0.82 * W) / (2 * meiaVis);
			cx = 0.45 * W;
		}
	}

	// ---------- tempo ----------
	const t = frame / fps;
	const entrada = txt(c.entrada, 'letras');
	const saida = txt(c.saida, 'blur');
	const n = layout.letras;
	const passo = n > 1 ? Math.min(num(c.intervalo, 0.06), 0.36 / (n - 1)) : 0;
	const inicioLetra = (k: number) => (entrada === 'pop' ? 0 : k * passo - 1e-6);
	const fimEntrada = entrada === 'pop' ? 0.2 : inicioLetra(n - 1) + (entrada === 'virar' ? 0.25 : 0.1);

	const cor = txt(c.cor, est.acento);
	const corIni = txt(c.corInicial, est.creme);
	const corExt = txt(c.corExtrusao, est.creme);

	// pop: palavra inteira
	const mola = spring({frame: frame + 1, fps, config: {damping: 13, stiffness: 170, mass: 0.8}});
	const popEscala = entrada === 'pop' ? 1.18 - 0.18 * mola : 1;
	const popBlur = entrada === 'pop' ? Math.max(0, 1 - mola) * 10 * u : 0;
	const popOpac = entrada === 'pop' ? Math.min(1, mola * 2.5) : 1;

	// saída (a duração encolhe se a camada for curta)
	const qSaida = Math.max(1, Math.min(Math.round(fps * (saida === 'chicote' ? 0.33 : 0.25)), Math.floor(dur * 0.4)));
	const iniSaida = dur - 1 - qSaida;
	const ps = saida === 'corte' ? 0 : interpolate(frame, [iniSaida, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const blurSai = saida === 'blur' ? ps * 16 * u : 0;
	const escSai = saida === 'blur' ? 1 + 0.05 * ps : 1;
	const opacSai = saida === 'blur' ? 1 - ps : saida === 'chicote' ? interpolate(ps, [0.75, 1], [1, 0], clamp) : 1;

	// chicote: anda até a borda direita com motion blur horizontal proporcional à velocidade
	const percurso = W - (cx - meiaVis * encolhe) + 0.05 * W;
	const posChicote = (f: number) => {
		const p = interpolate(f, [iniSaida, dur - 1], [0, 1], clamp);
		const recuo = -0.025 * W * Math.sin(Math.PI * Math.min(1, p / 0.45));
		return (p < 0.45 ? recuo : 0) + percurso * Easing.in(Easing.cubic)(interpolate(p, [0.25, 1], [0, 1], clamp));
	};
	const dx = saida === 'chicote' ? posChicote(frame) : 0;
	const vel = saida === 'chicote' ? Math.abs(posChicote(frame) - posChicote(frame - 1)) : 0;
	const mBlur = Math.min(vel * 0.45, 140 * u);

	// brilho creme que decai depois que a palavra fecha; deriva lenta até a saída
	const brilho = bool(c.brilho, true) ? interpolate(t, [0, fimEntrada, fimEntrada + 0.3], [0.7, 1, 0], clamp) : 0;
	const deriva = 1 + num(c.deriva, 0.03) * interpolate(frame, [0, dur], [0, 1], clamp);

	const sombra = `drop-shadow(${0.25 * ext}px ${0.6 * ext + 0.03 * cap}px ${0.09 * cap}px ${rgba(PRETO, 0.55)})`;
	const filtros = [blurSai + popBlur > 0.05 ? `blur(${blurSai + popBlur}px)` : '', brilho > 0.01 ? `drop-shadow(0 0 ${14 * u}px ${rgba(est.creme, 0.4 * brilho)})` : '', sombra].filter(Boolean).join(' ');

	// extrusão: cópias deslocadas para baixo e para a direita (compensando o scaleX), creme na face e mais escuras ao fundo
	const corFundoExt = interpolateColors(0.5, [0, 1], [corExt, PRETO]);
	const coresExt = Array.from({length: copias}, (_, j) => interpolateColors(Math.pow((j + 1) / copias, 1.6), [0, 1], [corExt, corFundoExt]));
	const extrusao = (prog: number) => {
		if (ext <= 0 || prog <= 0) return 'none';
		return coresExt
			.map((corJ, j) => {
				const d = ((j + 1) / copias) * ext * prog;
				return `${d / condensar}px ${d}px 0 ${corJ}`;
			})
			.join(', ');
	};

	const skew = num(c.skew, 0);
	const origemY = TOPO_CAP * fs + altCaps / 2;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{saida === 'chicote' && (
				<svg width={0} height={0} style={{position: 'absolute'}}>
					<defs>
						<filter id={filtroId} x="-40%" y="-10%" width="180%" height="120%" colorInterpolationFilters="sRGB">
							<feGaussianBlur stdDeviation={`${mBlur} ${mBlur * 0.03}`} />
						</filter>
					</defs>
				</svg>
			)}
			<div
				style={{
					position: 'absolute',
					left: cx - larg / 2,
					top: cy - origemY,
					width: larg,
					height: topos[topos.length - 1] + fs,
					transform: `translateX(${dx}px) scale(${popEscala * escSai * deriva * encolhe}) skewX(${skew}deg) scaleX(${condensar})`,
					transformOrigin: `50% ${origemY}px`,
					opacity: popOpac * opacSai,
					filter: [mBlur > 0.3 ? `url(#${filtroId})` : '', filtros].filter(Boolean).join(' ') || undefined,
				}}
			>
				{layout.glifos.map((g, i) => {
					if (g.k < 0) return null;
					const off = (largEm - layout.largLinhas[g.linha]) / 2;
					const tau = t - inicioLetra(g.k);
					if (tau < 0) return null;
					let corLetra = cor;
					let opac = 1;
					let escala = 1;
					let rotY = 0;
					let blurLetra = 0;
					let prog = 1;
					if (entrada === 'letras') {
						const v = interpolate(tau, [0, 0.08], [0, 1], clamp);
						corLetra = interpolateColors(v, [0, 1], [corIni, cor]);
						opac = 0.5 + 0.5 * v;
						escala = 1 + 0.1 * (1 - CURVAS.entrada(Math.min(1, tau / 0.17)));
						blurLetra = (1 - v) * 4 * u;
						prog = CURVAS.entrada(Math.min(1, tau / 0.17));
					} else if (entrada === 'virar') {
						const m = spring({frame: tau * fps + 1, fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
						rotY = 90 * (1 - m);
						corLetra = interpolateColors(m, [0.42, 0.58], [corIni, cor]);
						opac = interpolate(m, [0, 0.15], [0, 1], clamp);
						prog = interpolate(m, [0.5, 1], [0, 1], clamp);
					} else {
						corLetra = interpolateColors(t, [0, 0.12], [corIni, cor]);
						prog = interpolate(mola, [0, 1], [0.3, 1], clamp);
					}
					return (
						<span
							key={i}
							style={{
								position: 'absolute',
								left: (off + g.x) * fs,
								top: topos[g.linha],
								width: g.w * fs,
								height: fs,
								fontFamily: fonte.family,
								fontWeight: fonte.weight,
								fontSize: fs,
								lineHeight: `${fs}px`,
								letterSpacing: 0,
								whiteSpace: 'pre',
								color: corLetra,
								opacity: opac,
								textShadow: extrusao(prog),
								transform: `${rotY ? `perspective(${6 * fs}px) rotateY(${rotY}deg) ` : ''}scale(${escala})`,
								transformOrigin: '50% 55%',
								filter: blurLetra > 0.05 ? `blur(${blurLetra}px)` : undefined,
							}}
						>
							{g.ch}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
