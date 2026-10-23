// Tela final do YouTube (YOUTUBE - MIX EDIT, peça `encerramento-youtube`, 10–20 s): sobre `tela` grade/escura ou
// rosto desfocado (escurecer 0,45). Tudo fica na coluna da esquerda (x 0,08–0,45); a METADE DIREITA FICA LIVRE para
// o vídeo sugerido e o botão de inscrever, que o usuário posiciona no YouTube Studio.
// Sequência (q a 30 fps): o ponto de luz acende (núcleo creme de 8 px + halo no acento, expo-out em 8 q) e pulsa de
// 0,9 a 1,1 em 30 q (é o mesmo ponto que abriu a tela escura: fecha o vídeo como abriu); os ícones (Instagram e
// YouTube) nascem do ponto e deslizam para os lados em 14 q (expo-out + mola snappy, 3 q entre eles; o do Instagram se
// desenha); o ponto encolhe e fica entre os dois como separador (com 1 ou 3 redes, o ponto vira o ícone do centro);
// o @ sobe 4 q depois; a linha opcional em serifa itálica vem 6 q depois. O gradiente do Instagram passa 1× por 48 q
// (`brilho`). Deriva leve (escala +2%).
// Fechamento (`fechar`, padrão sim): nos últimos ~0,6 s tudo converge para o ponto (9 q, ease-in), o ponto brilha
// (3 q) e colapsa em 6 q: achata numa linha de luz (Y → 0,03) e a linha encolhe até sumir (X → 0). Termina no ponto:
// corte para o preto ou fim do vídeo. Sem `fechar`: sai com fade + blur em 9 q.
// Parâmetros:
//   arroba (est.arroba), redes (['instagram', 'youtube']; 1–3 redes cabem na coluna; também tiktok, spotify,
//   whatsapp, threads, x, facebook, telegram), texto ('' = sem; ex. 'obrigado por assistir'),
//   x (0.265: centro da coluna esquerda), y (0.44: altura dos ícones), tamanho (ícones, 132 px em 1080),
//   fonte (@: 44), fonteTexto (46), brilho (s do gradiente do Instagram: 1.6; false = sem), fechar (true),
//   guias (false; true = molduras-guia tracejadas do vídeo sugerido e do botão de inscrever na metade direita, SÓ NA
//   PRÉVIA), fundo (false | 'escuro' | 'grade': pinta a tela por baixo, com fade de 9 q).
// Sons: entrada sfxEncerramentoYoutube (shimmer: o ponto de luz acendendo); sonsEncerramentoYoutube = pop quando os
// ícones nascem do ponto (8 q) e no brilho do Instagram. Nada no colapso final: ali manda a última nota da trilha
// (`fim` na última nota e `fade` 0,25 no edicao.json), como no beat 4.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {siFacebook, siSpotify, siTelegram, siThreads, siTiktok, siWhatsapp, siX, siYoutube} from 'simple-icons';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {IconeInstagram} from './marca';
import {FundoTela} from './capitulo';
import {MOLAS, SAIDA_APPLE, bool, coresMix, filhoEntra, mola, num, prog, rgba, txt} from './card-vidro';

export const sfxEncerramentoYoutube: [string, number] = ['shimmer', 0.45];
const SOM_ICONE = 'motionix/pop/pop_06_sweet-ui-open';
const GLIFOS: Record<string, {path: string}> = {youtube: siYoutube, tiktok: siTiktok, spotify: siSpotify, whatsapp: siWhatsapp, threads: siThreads, x: siX, facebook: siFacebook, telegram: siTelegram};
const lerRedes = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((r): r is string => typeof r === 'string' && (r === 'instagram' || Object.hasOwn(GLIFOS, r))))] : ['instagram', 'youtube']);
const ICONES_Q = 8; // os ícones começam a sair do ponto

export const sonsEncerramentoYoutube = (c: Camada): Som[] => {
	const redes = lerRedes(c.redes);
	const out: Som[] = redes.length ? [{t: ICONES_Q / 30, som: SOM_ICONE, vol: 0.45}] : [];
	const b = c.brilho === false ? undefined : num(c.brilho, 1.6);
	if (b !== undefined && redes.includes('instagram') && b * 30 - ICONES_Q >= 8) out.push({t: b, som: SOM_ICONE, vol: 0.45});
	return out;
};

// Molduras-guia da tela final (só na prévia): vídeo sugerido 16:9 e botão de inscrever (círculo) na metade direita.
const Guias: React.FC<{creme: string; u: number; W: number; H: number}> = ({creme, u, W, H}) => {
	const traco = `${2 * u}px dashed ${rgba(creme, 0.45)}`;
	const rot: React.CSSProperties = {position: 'absolute', fontFamily: FONTES.base.family, fontWeight: 600, fontSize: 20 * u, letterSpacing: '0.16em', color: rgba(creme, 0.55), whiteSpace: 'nowrap'};
	const vw = 0.37 * W;
	const vh = (vw * 9) / 16;
	const d = 0.18 * H;
	return (
		<AbsoluteFill>
			<div style={{position: 'absolute', left: 0.5 * W, top: 0.05 * H, bottom: 0.05 * H, borderLeft: `${1 * u}px dashed ${rgba(creme, 0.18)}`}} />
			<div style={{position: 'absolute', left: 0.54 * W, top: 0.13 * H, width: vw, height: vh, border: traco, borderRadius: 14 * u, boxSizing: 'border-box'}}>
				<div style={{...rot, left: 20 * u, top: 18 * u}}>VÍDEO SUGERIDO</div>
			</div>
			<div style={{position: 'absolute', left: 0.54 * W + vw / 2 - d / 2, top: 0.13 * H + vh + 0.07 * H, width: d, height: d, border: traco, borderRadius: '50%', boxSizing: 'border-box'}} />
			<div style={{...rot, left: 0.54 * W + vw / 2 + d / 2 + 24 * u, top: 0.13 * H + vh + 0.07 * H + d / 2 - 10 * u}}>INSCREVER-SE</div>
			<div style={{...rot, right: 0.05 * W, bottom: 0.05 * H, fontSize: 16 * u, color: rgba(creme, 0.4)}}>GUIAS · SÓ NA PRÉVIA</div>
		</AbsoluteFill>
	);
};

export const EncerramentoYoutube: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k = fps / 30;
	const q = (n: number) => n * k;
	const t = frame / fps;
	const cor = coresMix(est);
	const creme = cor.creme;
	const acento = cor.acento;
	const redes = lerRedes(c.redes);
	const T = num(c.tamanho, 132) * u;
	const cx = num(c.x, 0.265) * W;
	const cy = num(c.y, 0.44) * H;
	const fsA = num(c.fonte, 44) * u;
	const fsT = num(c.fonteTexto, 46) * u;
	const texto = txt(c.texto, '');

	// ---------- fechamento: converge (9 q) → brilho (3 q) → colapso (6 q) ----------
	const fechar = bool(c.fechar, true);
	const fimQ = dur - 1;
	const qC = q(9);
	const qB = q(3);
	const qX = q(6);
	const tColapso = fimQ - qX;
	const tBrilho = tColapso - qB;
	const tConverge = tBrilho - qC;
	const conv = fechar ? interpolate(frame, [tConverge, tBrilho], [0, 1], {...clamp, easing: SAIDA_APPLE}) : 0;
	const estouro = fechar ? prog(frame, tBrilho, tColapso, CURVAS.entrada) : 0;
	// colapso: achata primeiro (vira uma linha de luz) e depois a linha encolhe até sumir
	const colapsoY = fechar ? interpolate(frame, [tColapso, tColapso + 0.55 * qX], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
	const colapsoX = fechar ? interpolate(frame, [tColapso + 0.3 * qX, fimQ], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
	// sem `fechar`: sai com fade + blur em 9 q
	const saida = fechar ? 0 : interpolate(frame, [fimQ - q(9), fimQ], [0, 1], {...clamp, easing: SAIDA_APPLE});

	// ---------- ponto de luz ----------
	const acende = prog(frame, 0, q(8));
	const pulso = 1 + 0.1 * Math.sin((2 * Math.PI * frame) / q(30));
	const separa = prog(frame, q(ICONES_Q), q(ICONES_Q + 14)); // encolhe quando os ícones saem dele
	// com nº par de ícones o ponto fica no vão do meio (separador); com nº ímpar há um ícone no centro: o ponto "vira"
	// esse ícone (some ao separar) e volta quando tudo converge no fechamento
	const pontoNoIcone = redes.length % 2 === 1;
	const escalaPonto = acende * pulso * (pontoNoIcone ? Math.max(1 - separa, conv) : 1 - 0.45 * separa + 0.45 * conv) * (1 + 0.8 * estouro);
	const halo = (90 + 30 * estouro) * u;

	// ---------- ícones ----------
	const BR = 0.25;
	const b = c.brilho === false ? undefined : num(c.brilho, 1.6);
	const grad: [number, number] = b === undefined ? [0, 0] : [prog(t, b, b + BR, CURVAS.suave), prog(t, b + 1.6 - BR, b + 1.6, CURVAS.suave)];
	const brilhoIg = Math.min(grad[0], 1 - grad[1]);
	const vao = T / 2 + 44 * u; // distância do centro de cada ícone ao ponto
	const posicoes = redes.map((_, i) => (i - (redes.length - 1) / 2) * (2 * vao));
	const deriva = 1 + 0.02 * interpolate(frame, [0, dur], [0, 1], clamp);

	const eA = filhoEntra(frame, q(ICONES_Q + 3 + redes.length * 3 + 4), fps, u, 14);
	const eT = filhoEntra(frame, q(ICONES_Q + 3 + redes.length * 3 + 10), fps, u, 14);
	const fundo = c.fundo === 'escuro' || c.fundo === 'grade' ? c.fundo : null;
	const opFundo = fundo ? prog(frame, 0, q(9), CURVAS.suave) : 0;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{fundo && <FundoTela tipo={fundo} cores={cor} opacidade={opFundo} />}
			{bool(c.guias, false) && <Guias creme={creme} u={u} W={W} H={H} />}
			<AbsoluteFill style={{transform: `scale(${deriva})`, transformOrigin: `${cx}px ${cy}px`, opacity: 1 - saida, filter: saida > 0.001 ? `blur(${12 * u * saida}px)` : undefined}}>
				{/* halo do ponto (fica atrás dos ícones) */}
				<div
					style={{
						position: 'absolute',
						left: cx - halo,
						top: cy - halo,
						width: 2 * halo,
						height: 2 * halo,
						borderRadius: '50%',
						background: `radial-gradient(circle, ${rgba(acento, 0.5)} 0%, ${rgba(acento, 0.16)} 34%, transparent 70%)`,
						transform: `scale(${escalaPonto}) scaleX(${(1 + 1.6 * colapsoY) * (1 - colapsoX)}) scaleY(${1 - 0.97 * colapsoY})`,
						opacity: Math.min(1, acende * 1.2),
					}}
				/>
				{/* ícones: nascem do ponto e voltam para ele no fechamento */}
				{redes.map((r, i) => {
					const a = q(ICONES_Q + 3 * i);
					const sai = prog(frame, a, a + q(14));
					const pop = mola(frame, fps, a, MOLAS.snappy);
					const dx = posicoes[i] * sai * (1 - conv);
					const esc = (0.2 + 0.8 * pop) * (1 - 0.85 * conv);
					const op = Math.min(1, pop * 1.6) * (1 - conv);
					const blur = (1 - sai) * 8 * u + conv * 8 * u;
					const estilo: React.CSSProperties = {position: 'absolute', left: cx - T / 2 + dx, top: cy - T / 2, width: T, height: T, transform: `scale(${esc})`, opacity: op, filter: blur > 0.05 ? `blur(${blur}px)` : undefined};
					if (r === 'instagram') {
						const d: [number, number, number] = [prog(frame, a, a + q(6)), prog(frame, a + q(4), a + q(11)), prog(frame, a + q(9), a + q(13))];
						return (
							<div key={r} style={estilo}>
								<IconeInstagram tamanho={T} traco={T * 0.09} cor={creme} desenho={d} gradiente={grad} brilho={brilhoIg * 0.8} sombra={false} />
							</div>
						);
					}
					return (
						<svg key={r} viewBox="0 0 24 24" style={{...estilo, display: 'block'}}>
							<path d={GLIFOS[r].path} fill={creme} />
						</svg>
					);
				})}
				{/* núcleo do ponto (por cima: é o separador entre os ícones) */}
				<div
					style={{
						position: 'absolute',
						left: cx - 4 * u,
						top: cy - 4 * u,
						width: 8 * u,
						height: 8 * u,
						borderRadius: '50%',
						background: creme,
						boxShadow: `0 0 ${(10 + 18 * estouro) * u}px ${(2 + 6 * estouro) * u}px ${rgba(creme, 0.55 + 0.4 * estouro)}, 0 0 ${26 * u}px ${6 * u}px ${rgba(acento, 0.55)}`,
						transform: `scale(${escalaPonto}) scaleX(${(1 + 1.6 * colapsoY) * (1 - colapsoX)}) scaleY(${1 - 0.97 * colapsoY})`,
						opacity: Math.min(1, acende * 1.4),
					}}
				/>
				{/* @ e linha opcional */}
				<div style={{position: 'absolute', left: cx - 0.2 * W, width: 0.4 * W, top: cy + T / 2 + 0.3 * T, textAlign: 'center', opacity: 1 - conv, filter: conv > 0.001 ? `blur(${10 * u * conv}px)` : undefined, transform: `translateY(${-24 * u * conv}px) scale(${1 - 0.1 * conv})`}}>
					<div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: fsA, lineHeight: 1, letterSpacing: '0.01em', color: rgba(creme, 0.94), whiteSpace: 'nowrap', ...eA}}>{txt(c.arroba, est.arroba)}</div>
					{texto && (
						<div style={{marginTop: 0.5 * fsT, fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: fsT, lineHeight: 1.05, letterSpacing: '-0.01em', color: rgba(creme, 0.78), ...eT}}>
							{texto}
						</div>
					)}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
