// Colagem em papel (YOUTUBE - MIX EDIT, peça `colagem-papel`): cards de dado/ideia em papel creme texturizado, no
// estilo editorial da referência do usuário (intro do Thiago Nigro, 05/10/2026): palavra/número GRANDE em carmim
// (serifa), frase curta em preto, caneta vermelha circulando ou sublinhando o destaque, foto recortada em P&B à
// direita (borda rasgada, leve rotação, sombra) e troca rápida entre cards (desliza da direita com motion blur).
// Cobre a tela inteira enquanto dura (a voz continua por baixo).
// Parâmetros:
//   cards: [{t (s desde o início da camada; o 1º em 0), grande (texto grande em carmim, ex. "03:47"), texto (frase;
//     *trecho* = sublinhado à mão em carmim), imagem (caminho no projeto; vira P&B), rotulo (micro-rótulo opcional),
//     circular (true: círculo de caneta em volta do texto grande em vez de sublinhar)}],
//   papel (cor, '#ECE5D8'), cor (carmim; est.acento), tinta ('#1C0A06'), troca (q da transição entre cards, 6).
// Sons: whoosh curto em cada troca (o 1º card entra com o sfx da peça).
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {noise2D} from '@remotion/noise';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxColagem: [string, number] = ['motionix/whooshes/whooshes_16_smooth-and-fast-whoosh', 0.5];
const SOM_TROCA = 'motionix/whooshes/whooshes_14_simple-whoosh';

type Card = {t: number; grande?: string; texto?: string; imagem?: string; rotulo?: string; circular?: boolean};
const cardsDe = (c: Camada): Card[] => (Array.isArray(c.cards) ? (c.cards as Card[]) : []).map((k, i) => ({...k, t: i === 0 ? 0 : Number(k.t) || 0}));

export const sonsColagem = (c: Camada): Som[] => cardsDe(c).slice(1).map((k) => ({t: Math.max(0, k.t - 0.08), som: SOM_TROCA, vol: 0.5}));

// borda rasgada: polígono serrilhado em volta de um retângulo (fração 0..1), determinístico pela semente
const rasgado = (semente: string) => {
	const pts: string[] = [];
	const n = 26;
	const lado = (a: [number, number], b: [number, number], k: number) => {
		for (let i = 0; i < n; i++) {
			const f = i / n;
			const j = noise2D(semente, k * 10 + i * 0.7, 0) * 1.6;
			const x = a[0] + (b[0] - a[0]) * f + (a[1] === b[1] ? 0 : j);
			const y = a[1] + (b[1] - a[1]) * f + (a[1] === b[1] ? j : 0);
			pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
		}
	};
	lado([2, 2], [98, 2], 1);
	lado([98, 2], [98, 98], 2);
	lado([98, 98], [2, 98], 3);
	lado([2, 98], [2, 2], 4);
	return `polygon(${pts.join(',')})`;
};

const UmCard: React.FC<{k: Card; q: number; durQ: number; W: number; H: number; cor: string; tinta: string; semente: string}> = ({k, q, durQ, W, H, cor, tinta, semente}) => {
	const u = Math.min(W, H) / 1080;
	const {fps} = useVideoConfig();
	const s30 = (n: number) => (n * fps) / 30;
	// texto grande entra em 8 q (sobe + blur), frase em cascata, caneta desenha em 10 q depois
	const eG = interpolate(q, [s30(1), s30(9)], [0, 1], {...clamp, easing: CURVAS.entrada});
	const eT = interpolate(q, [s30(5), s30(13)], [0, 1], {...clamp, easing: CURVAS.entrada});
	const eCaneta = interpolate(q, [s30(10), s30(20)], [0, 1], {...clamp, easing: CURVAS.saida});
	const eImg = interpolate(q, [0, s30(10)], [0, 1], {...clamp, easing: CURVAS.entrada});
	const deriva = interpolate(q, [0, Math.max(1, durQ)], [1, 1.03]);
	const partes = (k.texto ?? '').split(/(\*[^*]+\*)/).filter(Boolean);
	const tamGrande = (k.grande ?? '').length > 8 ? 150 : 210;
	const larguraCaneta = 6 * u;
	const tremor = (i: number) => noise2D(semente + 'c', i * 0.9, q * 0.02) * 6 * u;
	const elipse = `M ${20 + tremor(1)} ${110 + tremor(2)} C ${10 + tremor(3)} ${20 + tremor(4)}, ${520 + tremor(5)} ${-10 + tremor(6)}, ${540 + tremor(7)} ${80 + tremor(8)} C ${560 + tremor(9)} ${170 + tremor(10)}, ${60 + tremor(11)} ${200 + tremor(12)}, ${40 + tremor(13)} ${95 + tremor(14)}`;
	const ev = evolvePath(eCaneta, elipse);
	return (
		<AbsoluteFill style={{transform: `scale(${deriva})`, transformOrigin: '35% 50%'}}>
			{k.imagem ? (
				<div
					style={{
						position: 'absolute',
						left: 0.56 * W,
						top: 0.16 * H,
						width: 0.38 * W,
						height: 0.66 * H,
						transform: `rotate(${-2.5 + (1 - eImg) * 6}deg) translateX(${(1 - eImg) * 60 * u}px)`,
						opacity: eImg,
						filter: `drop-shadow(0 ${14 * u}px ${24 * u}px rgba(0,0,0,0.35))`,
					}}
				>
					<Img src={staticFile(k.imagem)} style={{width: '100%', height: '100%', objectFit: 'cover', clipPath: rasgado(semente), filter: 'grayscale(1) contrast(1.18) brightness(1.02)'}} />
				</div>
			) : null}
			<div style={{position: 'absolute', left: 0.08 * W, top: 0.22 * H, width: 0.5 * W}}>
				{k.rotulo ? <div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: 30 * u, letterSpacing: '0.14em', textTransform: 'uppercase', color: cor, opacity: eT, marginBottom: 18 * u}}>{k.rotulo}</div> : null}
				{k.grande ? (
					<div style={{position: 'relative', display: 'inline-block'}}>
						<div
							style={{
								fontFamily: FONTES.serifaReta.family,
								fontSize: tamGrande * u,
								lineHeight: 0.95,
								color: cor,
								WebkitTextStroke: `${3 * u}px ${cor}`,
								letterSpacing: '-0.02em',
								opacity: eG,
								filter: `blur(${(1 - eG) * 10}px)`,
								transform: `translateY(${(1 - eG) * 30 * u}px)`,
							}}
						>
							{k.grande}
						</div>
						{k.circular ? (
							<svg viewBox="0 0 560 200" preserveAspectRatio="none" style={{position: 'absolute', left: '-8%', top: '-12%', width: '116%', height: '124%', overflow: 'visible'}}>
								<path d={elipse} fill="none" stroke={cor} strokeWidth={larguraCaneta * (560 / (W * 0.5))} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
							</svg>
						) : null}
					</div>
				) : null}
				{k.texto ? (
					<div style={{fontFamily: FONTES.serifaReta.family, fontSize: 64 * u, lineHeight: 1.12, color: tinta, marginTop: 26 * u, opacity: eT, transform: `translateY(${(1 - eT) * 20 * u}px)`}}>
						{partes.map((p, i) => {
							const dest = p.startsWith('*');
							const txt = p.replace(/\*/g, '');
							return dest ? (
								<span key={i} style={{position: 'relative', whiteSpace: 'nowrap'}}>
									{txt}
									<svg viewBox="0 0 100 10" preserveAspectRatio="none" style={{position: 'absolute', left: '-2%', bottom: -10 * u, width: '104%', height: 16 * u, overflow: 'visible'}}>
										<path d={`M 0 ${6 + tremor(20) * 0.05} Q 50 ${2 + tremor(21) * 0.05} 100 ${5 + tremor(22) * 0.05}`} fill="none" stroke={cor} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (k.circular ? 1 : eCaneta)} />
									</svg>
								</span>
							) : (
								<span key={i}>{txt}</span>
							);
						})}
					</div>
				) : null}
			</div>
		</AbsoluteFill>
	);
};

export const Colagem: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const cards = cardsDe(c);
	const cor = typeof c.cor === 'string' ? c.cor : est.acento;
	const tinta = typeof c.tinta === 'string' ? c.tinta : '#1C0A06';
	const papel = typeof c.papel === 'string' ? c.papel : '#ECE5D8';
	const troca = Math.max(3, Math.round(((typeof c.troca === 'number' ? c.troca : 6) * fps) / 30));
	const t = frame / fps;
	const atual = Math.max(0, cards.findIndex((k, i) => t >= k.t && (i === cards.length - 1 || t < cards[i + 1].t)));
	// entrada e saída da peça inteira (desliza com motion blur, 6 q)
	const ent = interpolate(frame, [0, troca], [0, 1], {...clamp, easing: CURVAS.entrada});
	const sai = interpolate(frame, [dur - troca, dur], [0, 1], {...clamp, easing: CURVAS.saida});
	const desl = (1 - ent) * 0.35 * W - sai * 0.35 * W;
	const borr = (1 - ent) * 24 + sai * 24;
	return (
		<AbsoluteFill style={{transform: `translateX(${desl}px)`, filter: borr > 0.2 ? `blur(${borr}px)` : undefined, opacity: Math.min(1, ent * 1.4) * (1 - sai * 0.6)}}>
			<AbsoluteFill style={{background: papel}} />
			<svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.32, mixBlendMode: 'multiply'}}>
				<filter id="fibras">
					<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width="100%" height="100%" filter="url(#fibras)" />
			</svg>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 40% 45%, transparent 55%, rgba(60,40,20,0.22) 100%)'}} />
			{cards.map((k, i) => {
				const ini = Math.round(k.t * fps);
				const fim = i === cards.length - 1 ? dur : Math.round(cards[i + 1].t * fps);
				if (frame < ini || frame >= fim) return null; // o card que sai some no corte; só o novo anda (sem sobrepor textos)
				const q = frame - ini;
				// card novo entra da direita (6 q, blur direcional); o anterior sai para a esquerda junto
				const entra = i === 0 ? 1 : interpolate(q, [0, troca], [0, 1], {...clamp, easing: CURVAS.entrada});
				const saindo = 0;
				const x = (1 - entra) * W * 0.6 - saindo * W * 0.6;
				const blur = (1 - entra) * 30 + saindo * 30;
				return (
					<AbsoluteFill key={i} style={{transform: `translateX(${x}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: i === atual || saindo > 0 || entra < 1 ? 1 : 0}}>
						<UmCard k={k} q={q} durQ={fim - ini} W={W} H={H} cor={cor} tinta={tinta} semente={`card${i}`} />
					</AbsoluteFill>
				);
			})}
		</AbsoluteFill>
	);
};
