// Título em colagem stop-motion (YOUTUBE - MIX EDIT, peça `colagem-titulo`; ideia do usuário, 05/10/2026): papel creme,
// fotos recortadas em P&B caindo uma a uma em stop-motion (a cada `passo` quadros, com o "tremido" típico de animação
// quadro a quadro) e, em `bateEm`, o título entra de uma vez sobre uma tira de papel, junto com a parada brusca da trilha.
// Parâmetros:
//   fotos (caminhos no projeto, na ordem em que caem), texto ('rotina × foco'; *trecho* = carmim, o resto tinta),
//   bateEm (s desde o início da camada em que o título bate; padrão 55% da duração), passo (q de 30 fps por quadro do
//   stop-motion, 4 ≈ 7,5 qps), papel ('#ECE5D8'), cor (est.acento), tinta ('#1C0A06'), tamanho (corpo do título, 150).
// Sons: um clique de papel por foto que cai (nada no `bateEm`: ali manda a parada da trilha).
import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {FONTES} from '../fontes';

const fotosDe = (c: Camada) => (Array.isArray(c.fotos) ? (c.fotos as string[]) : []);
const passoDe = (c: Camada) => (typeof c.passo === 'number' ? c.passo : 4);
const bateDe = (c: Camada, durS: number) => (typeof c.bateEm === 'number' ? c.bateEm : durS * 0.55);

export const sonsColagemTitulo = (c: Camada, fps: number): Som[] => {
	const durS = c.fim - c.ini;
	const passo = passoDe(c) / 30;
	const bate = bateDe(c, durS);
	return fotosDe(c)
		.map((_, i) => ({t: i * passo, som: 'motionix/clicks/clicks_02_click-1', vol: 0.5}))
		.filter((s) => s.t < bate - 0.12);
};

// posições das fotos em volta do centro (onde o título bate), determinísticas
const POS: [number, number, number][] = [
	[0.2, 0.28, -9],
	[0.78, 0.25, 7],
	[0.3, 0.74, 6],
	[0.72, 0.72, -8],
	[0.5, 0.2, 3],
	[0.12, 0.6, 11],
	[0.88, 0.52, -5],
	[0.52, 0.8, -3],
];

export const ColagemTitulo: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const fotos = fotosDe(c);
	const passoQ = Math.max(1, Math.round((passoDe(c) * fps) / 30));
	const passo = Math.floor(frame / passoQ); // relógio do stop-motion (muda a cada `passo` quadros)
	const bateQ = Math.round(bateDe(c, dur / fps) * fps);
	const bateu = frame >= bateQ;
	const quantas = Math.min(fotos.length, passo + 1);
	const papel = typeof c.papel === 'string' ? c.papel : '#ECE5D8';
	const cor = typeof c.cor === 'string' ? c.cor : est.acento;
	const tinta = typeof c.tinta === 'string' ? c.tinta : '#1C0A06';
	const tamanho = (typeof c.tamanho === 'number' ? c.tamanho : 150) * u;
	const partes = String(c.texto ?? 'rotina × foco').split(/(\*[^*]+\*)/).filter(Boolean);
	// "tremido" de stop-motion: deslocamento e giro mudam a cada passo (e param quando o título bate)
	const boil = (i: number, k: string, amp: number) => (bateu ? 0 : (random(`${k}${i}-${passo}`) - 0.5) * 2 * amp);
	// o título "carimba": 2 passos em escala 1,12 → 1,04 → 1, sem curva (animação quadro a quadro)
	const qT = frame - bateQ;
	const escTitulo = qT < passoQ ? 1.12 : qT < 2 * passoQ ? 1.04 : 1;
	return (
		<AbsoluteFill style={{background: papel, overflow: 'hidden'}}>
			<svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.32, mixBlendMode: 'multiply'}}>
				<filter id="fibrasTitulo">
					<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={11} />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width="100%" height="100%" filter="url(#fibrasTitulo)" />
			</svg>
			{fotos.slice(0, quantas).map((f, i) => {
				const [x, y, rot] = POS[i % POS.length];
				const larg = (0.24 + random(`l${i}`) * 0.06) * W;
				const alt = larg * 0.62;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x * W - larg / 2 + boil(i, 'x', 5 * u),
							top: y * H - alt / 2 + boil(i, 'y', 5 * u),
							width: larg,
							height: alt,
							transform: `rotate(${rot + boil(i, 'r', 1.2)}deg)`,
							background: '#f7f3ea',
							padding: 10 * u,
							boxShadow: `0 ${10 * u}px ${22 * u}px rgba(0,0,0,0.32)`,
						}}
					>
						<Img src={staticFile(f)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.2)'}} />
					</div>
				);
			})}
			{bateu ? (
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
					<div style={{transform: `rotate(-2deg) scale(${escTitulo})`, background: papel, padding: `${22 * u}px ${56 * u}px ${30 * u}px`, boxShadow: `0 ${16 * u}px ${36 * u}px rgba(0,0,0,0.38)`}}>
						<div style={{fontFamily: FONTES.serifaReta.family, fontSize: tamanho, lineHeight: 1, color: tinta, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>
							{partes.map((p, i) => (p.startsWith('*') ? <span key={i} style={{color: cor, WebkitTextStroke: `${2 * u}px ${cor}`}}>{p.replace(/\*/g, '')}</span> : <span key={i}>{p}</span>))}
						</div>
						<div style={{height: 6 * u, background: cor, marginTop: 10 * u, borderRadius: 3 * u}} />
					</div>
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};
