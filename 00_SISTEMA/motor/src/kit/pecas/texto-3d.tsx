// Texto 3D extrudado (MIX EDIT, peça `texto-3d`; linguagem "3D flash", vem das refs do CUT): palavra de pico em
// Inter Tight 900 caixa-alta com volume de verdade em CSS 3D. São N cópias empilhadas em translateZ(−i·k) dentro de
// um contexto preserve-3d (perspective ~1400 px): a face na cor da paleta e as laterais em gradiente do acento até o
// acentoProfundo. Entra voando da profundidade e girando (rotateY 70°→pose, z −800→0, mola snappy: assenta em ~11 q,
// sem quique visível), com blur só no pico de velocidade; segura com deriva lenta (4°/s) e um reflexo diagonal na
// face; sai voando para a câmera (escala ~2,5 + blur de 40 px em 5 q). Uso: 1 por pico, 30–48 q.
// Na frente ou atrás da pessoa ("plano": "atras" + recorte cobrindo o tempo): atrás da cabeça, largura ≤ 0,64,
// x entre 0,30 e 0,94 e y < 0,55 (só a parede lisa: abajur e tablet não entram no recorte e ficariam atrás do texto);
// atrás da pessoa, prefira saida 'blur' (o voo para a câmera cresce 2,5× e passaria por cima do abajur).
// Custo (medido em 05/10, só CSS, sem WebGL): +30–90 ms por quadro sobre a cena em 1080p (texto grande = mais cópias e
// mais área); no total, 0,17–0,39 s por quadro a meia resolução.
// Cor (decisões do usuário): direto na parede com o rosto nítido, paleta 'parede' (face em preto quente #1C0A06,
// laterais no carmim). Face creme ou no acento só sobre superfície escura (tela, rosto desfocado com escurecer ≥ 0,4).
// Parâmetros:
//   texto ('\n' quebra a linha; *palavra* = face no acento; na paleta 'parede', no acento profundo), x, y (0..1, centro do bloco; 0.5, 0.4),
//   largura (fração de W ocupada pela linha mais larga, 0.6), alturaMax (maiúscula máxima, px em 1080: 250),
//   paleta: 'escuro' (padrão: face creme, laterais acento→acentoProfundo) | 'parede' (face #1C0A06, laterais
//     acento→acentoProfundo) | 'acento' (face no acento, laterais acentoProfundo→quase preto),
//   cor (face), corLateral (lateral junto da face), corFundo (lateral no fundo da extrusão),
//   profundidade (fração do corpo da fonte, 0.2), camadas (cópias da extrusão; padrão automático entre 16 e 24, com
//     ≤ 3,5 px entre cópias: texto grande ganha mais cópias e a lateral fica lisa; aceita 8–32),
//   pose ([rotX, rotY] do repouso em graus; padrão [12, −24]: a extrusão aparece embaixo e à direita; com lado −1, [12, 24]),
//   lado (1 = chega girando pela direita; −1 = pela esquerda, pose espelhada), deriva (graus/s no repouso, 4),
//   entrada: 'voo' (padrão) | 'giro' (levanta do chão: rotateX −90°→pose) | 'surgir' (z −300→0 + blur, Apple),
//   saida: 'voo' (padrão: para a câmera) | 'blur' (Apple: 9 q, blur 0→10 + recuo) | 'corte',
//   qSaida (quadros a 30 fps da saída 'voo', 5; 4–6), mola ('snappy' padrão | 'bouncy' | 'smooth'),
//   perspectiva (px em 1080, 1400), pontoFuga ('texto' padrão | 'quadro': centro do quadro, mais "câmera real"),
//   brilho (glow creme que decai no assento; padrão true, false na paleta 'parede'),
//   reflexo (true: o reflexo atravessa a face 1× em 18 q depois do assento), sombra (sombra suave projetada: 0.3 na paleta 'parede', 0 nas outras, onde o fundo escuro não a mostra),
//   tracking (em, −0.02), entrelinha (0.9).
// Sons (volumes exportados; o MIX aplica ganhoSfx ×1,25 com piso 0,55): entrada = sfxTexto3d (whoosh épico, pico de
// energia em 0,24 s = quando o texto pousa); sonsTexto3d = impacto grave no assento (8 q) + whoosh curto com o pico no
// meio da saída 'voo' (whoosh_10: pico em ~0,46 s do arquivo). Com um `golpe` no mesmo pico, use "sons": false
// (o guia limita impact_sub a 1 por pico).
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, interpolate, interpolateColors, spring, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, MOLAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxTexto3d: [string, number] = ['motionix/whooshes/whooshes_20_epic-fast-whoosh-345469', 0.48]; // MIX: 0,6 no ar
const SOM_SAIDA = 'motionix/whooshes/whooshes_10_high-and-fast-whoosh';
const PICO_SAIDA = 0.46; // s do pico de energia do whoosh_10 (medido com astats em janelas de 30 ms)
// impacto no assento (~8 q depois do whoosh, par da mesma peça) e whoosh curto quando sai voando para a câmera
export const sonsTexto3d = (c: Camada, fps: number): Som[] => {
	const dur = c.fim - c.ini;
	const out: Som[] = [];
	if (txt(c.entrada, 'voo') !== 'surgir') out.push({t: 0.27, som: 'impact_sub', vol: 0.45});
	if (txt(c.saida, 'voo') === 'voo') out.push({t: Math.max(0.45, dur - num(c.qSaida, 5) / 60 - PICO_SAIDA), som: SOM_SAIDA, vol: 0.5});
	return out.filter((s) => s.t < dur - 1 / fps);
};

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const par = (v: unknown, padrao: [number, number]): [number, number] => (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number') ? [v[0], v[1]] : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const TINTA = '#1C0A06'; // preto quente (texto sobre a parede e sobre o acento)
const CAP = 0.727; // altura da maiúscula da Inter Tight (em)
const REF = 100; // corpo de medição (px)

type Seg = {texto: string; destaque: boolean};

export const Texto3d: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const fonte = FONTES.impacto;
	const tracking = num(c.tracking, -0.02);
	const linhas: Seg[][] = txt(c.texto, '')
		.toLocaleUpperCase('pt-BR')
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) =>
			l
				.split(/(\*[^*]+\*)/)
				.filter(Boolean)
				.map((p) => ({texto: p.replace(/\*/g, ''), destaque: p.startsWith('*')})),
		);
	const planas = linhas.map((l) => l.map((s) => s.texto).join(''));
	const chave = planas.join('\n');

	// mede só depois que a Inter Tight 900 carregou (o measureText guarda em cache a 1ª medida)
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('texto-3d: fonte'));
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
			.load(`${fonte.weight} ${REF}px "${fonte.family}"`, chave || 'A')
			.then(() => document.fonts.ready)
			.then(libera, libera);
		return () => {
			vivo = false;
		};
	}, [continueRender, espera, fonte.family, fonte.weight, chave]);

	const largEm = useMemo(() => {
		if (!pronto) return 0;
		return Math.max(0, ...planas.map((l) => measureText({text: l, fontFamily: fonte.family, fontWeight: String(fonte.weight), fontSize: REF, letterSpacing: `${tracking}em`}).width / REF));
	}, [pronto, chave, fonte.family, fonte.weight, tracking]);
	if (!pronto || largEm <= 0) return null;

	// ---------- tamanho: a linha mais larga ocupa `largura` do quadro, com teto na altura da maiúscula ----------
	const fs = Math.min((num(c.largura, 0.6) * W) / largEm, (num(c.alturaMax, 250) * u) / CAP);
	const entrelinha = num(c.entrelinha, 0.9);
	const larg = largEm * fs;
	const alt = linhas.length * entrelinha * fs;
	const cx = num(c.x, 0.5) * W;
	const cy = num(c.y, 0.4) * H;

	// ---------- cores ----------
	const paleta = txt(c.paleta, 'escuro');
	const corFace = txt(c.cor, paleta === 'parede' ? est.tinta ?? TINTA : paleta === 'acento' ? est.acento : est.creme);
	// destaque: na parede o carmim perde contraste (≈ 2,4:1), então vira o acento profundo (≈ 5:1); no acento, creme
	const corDestaque = paleta === 'acento' ? est.creme : paleta === 'parede' ? est.acentoProfundo : est.acento;
	const corLat = txt(c.corLateral, paleta === 'acento' ? est.acentoProfundo : est.acento);
	const corFim = txt(c.corFundo, paleta === 'acento' ? '#1A0503' : est.acentoProfundo);
	const prof = num(c.profundidade, 0.2) * fs;
	// cópias: padrão com ≤ 3,5 px entre elas (16 a 24), para a lateral não mostrar degraus em texto grande
	const n = Math.round(Math.max(8, Math.min(32, num(c.camadas, Math.max(16, Math.min(24, Math.ceil(prof / (3.5 * u))))))));
	const passo = prof / n;
	const gradiente = (de: string, ate: string) => Array.from({length: n}, (_, i) => interpolateColors(Math.pow((i + 1) / n, 0.8), [0, 1], [de, ate]));
	const coresLat = gradiente(corLat, corFim);
	// palavra com a face no acento: a lateral precisa ser mais escura que a face (senão a profundidade some)
	const coresLatDestaque = paleta === 'escuro' && c.corLateral === undefined ? gradiente(est.acentoProfundo, '#1A0503') : coresLat;

	// ---------- tempo (quadros a 30 fps, para o mesmo desenho valer em qualquer fps) ----------
	const q = (frame * 30) / fps;
	const t = frame / fps;
	// molas da Apple (kit/tempo.ts): snappy assenta em ~11 q com ~0,6% de passagem; bouncy (só 3D) passa ~4%
	const molaCfg = MOLAS[txt(c.mola, 'snappy') as keyof typeof MOLAS] ?? MOLAS.snappy;
	const mola = (f: number) => spring({frame: f, fps, config: molaCfg});
	const m = mola(frame);
	// fração do percurso por quadro (a 30 fps): o blur só existe no pico de velocidade (~q2–q6) e o assento é nítido
	const vel = (Math.abs(m - mola(frame - 1)) * fps) / 30;
	const blurVel = (max: number) => max * Math.pow(clamp01((vel - 0.05) / 0.12), 1.5) * u;
	const lado = num(c.lado, 1) < 0 ? -1 : 1;
	// pose padrão espelhada com o lado (lado −1: extrusão à esquerda); o giro de entrada nunca passa de 75°, para
	// não mostrar as costas do texto (espelhado) nos primeiros quadros
	const [poseX, poseY] = par(c.pose, [12, -24 * lado]);
	const giroEntrada = Math.max(0, Math.min(70, 75 - lado * poseY));
	const P = num(c.perspectiva, 1400) * u;
	const entrada = txt(c.entrada, 'voo');
	const saida = txt(c.saida, 'voo');

	let z = 0;
	let rx = poseX;
	let ry = poseY;
	let opac = 1;
	let blur = 0;
	if (entrada === 'voo') {
		z = -800 * u * (1 - m);
		ry += giroEntrada * lado * (1 - m);
		rx += 10 * (1 - m);
		opac = interpolate(q, [0, 3], [0, 1], clamp);
		blur = blurVel(16);
	} else if (entrada === 'giro') {
		rx += -90 * (1 - m);
		z = -200 * u * (1 - m);
		opac = interpolate(q, [0, 2], [0, 1], clamp);
		blur = blurVel(10);
	} else {
		const e = CURVAS.entrada(interpolate(q, [0, 12], [0, 1], clamp));
		z = -300 * u * (1 - e);
		opac = e;
		blur = 12 * u * (1 - e);
	}
	// deriva: continua o giro da entrada devagar e a câmera se aproxima um pouco até a saída
	ry -= lado * num(c.deriva, 4) * t;
	z += 40 * u * interpolate(frame, [0, dur], [0, 1], clamp);

	// saída
	const qSaidaVoo = Math.max(3, Math.round((num(c.qSaida, 5) * fps) / 30));
	const qSaidaBlur = Math.round((9 * fps) / 30);
	let escalaSaida = 1;
	if (saida === 'voo') {
		const p = interpolate(frame, [dur - 1 - qSaidaVoo, dur - 1], [0, 1], {...clamp, easing: CURVAS.saida});
		z += 0.6 * P * p; // com o ponto de fuga no texto: escala 1/(1 − 0,6) = 2,5
		ry -= 10 * lado * p;
		blur += 40 * u * p;
		opac *= 1 - interpolate(p, [0.45, 1], [0, 1], clamp);
	} else if (saida === 'blur') {
		const p = interpolate(frame, [dur - 1 - qSaidaBlur, dur - 1], [0, 1], {...clamp, easing: CURVAS.saida});
		z -= 60 * u * p;
		blur += 10 * u * p;
		opac *= 1 - p;
		escalaSaida = 1 - 0.02 * p;
	}

	// glow creme que decai em ~10 q depois do assento (slam); reflexo diagonal 1× em 18 q no repouso
	const assento = entrada === 'surgir' ? 8 : 9;
	const brilho = bool(c.brilho, paleta !== 'parede') ? interpolate(q, [assento - 3, assento, assento + 8], [0, 0.28, 0], clamp) : 0;
	const reflexo = bool(c.reflexo, true) ? interpolate(q, [assento + 2, assento + 20], [0, 1], {...clamp, easing: CURVAS.suave}) : 1;
	const brilhoReflexo = paleta === 'parede' ? 'rgba(96,56,44,0.85)' : 'rgba(255,255,255,0.6)';

	const sombra = num(c.sombra, paleta === 'parede' ? 0.3 : 0);
	const filtros = [
		blur > 0.3 ? `blur(${blur}px)` : '',
		brilho > 0.01 ? `drop-shadow(0 0 ${16 * u}px ${rgba(est.creme, brilho)})` : '',
		sombra > 0 ? `drop-shadow(0 ${0.05 * fs}px ${0.09 * fs}px rgba(0,0,0,${sombra}))` : '',
	]
		.filter(Boolean)
		.join(' ');

	const pontoFugaTexto = txt(c.pontoFuga, 'texto') !== 'quadro';
	const estiloLinha = (topo: number): React.CSSProperties => ({
		position: 'absolute',
		left: 0,
		top: topo,
		width: larg,
		textAlign: 'center',
		whiteSpace: 'pre',
		fontFamily: fonte.family,
		fontWeight: fonte.weight,
		fontSize: fs,
		lineHeight: `${entrelinha * fs}px`,
		letterSpacing: `${tracking}em`,
	});
	// uma "fatia" do texto: lateral (cor chapada + contorno fino para fechar as frestas entre cópias) ou face
	const fatia = (i: number) => {
		const face = i === 0;
		const contorno = face ? 0 : Math.min(passo, 2.5 * u) * 0.7;
		return (
			<div key={i} style={{position: 'absolute', left: 0, top: 0, width: larg, height: alt, transform: `translateZ(${-i * passo}px)`}}>
				{linhas.map((l, j) => (
					<div key={j} style={estiloLinha(j * entrelinha * fs)}>
						{l.map((s, k) => {
							const corSeg = s.destaque ? corDestaque : corFace;
							const cor = face ? undefined : (s.destaque ? coresLatDestaque : coresLat)[i - 1];
							return (
								<span
									key={k}
									style={
										face
											? {
													color: 'transparent',
													backgroundImage: `linear-gradient(110deg, ${corSeg} 0%, ${corSeg} 46%, ${brilhoReflexo} 50%, ${corSeg} 54%, ${corSeg} 100%)`,
													backgroundSize: '400% 100%',
													backgroundPosition: `${100 - 100 * reflexo}% 0`,
													WebkitBackgroundClip: 'text',
													backgroundClip: 'text',
												}
											: {color: cor, WebkitTextStroke: contorno > 0.2 ? `${contorno}px ${cor}` : undefined}
									}
								>
									{s.texto}
								</span>
							);
						})}
					</div>
				))}
			</div>
		);
	};

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* invólucro plano: filtros e opacidade ficam FORA do contexto 3D (num elemento preserve-3d eles achatam a extrusão) */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					perspective: P,
					perspectiveOrigin: pontoFugaTexto ? `${cx}px ${cy}px` : '50% 50%',
					opacity: opac,
					filter: filtros || undefined,
				}}
			>
				<div
					style={{
						position: 'absolute',
						left: cx - larg / 2,
						top: cy - alt / 2,
						width: larg,
						height: alt,
						transformStyle: 'preserve-3d',
						transformOrigin: `50% 50% ${-prof / 2}px`,
						transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${escalaSaida})`,
					}}
				>
					{Array.from({length: n + 1}, (_, k) => fatia(n - k))}
				</div>
			</div>
		</AbsoluteFill>
	);
};
