// Diff mito/verdade (YOUTUBE - MIX EDIT, peça `diff`): como um diff de código. A linha "−" (o que se acha) entra
// numa faixa escura em creme a 82% (legível) e, riscada, esfria para cinza; a linha "+" (o que a evidência diz) entra
// embaixo numa faixa no acento, com o texto em creme.
// Uso: "− 3 h de tela à noite / + 30 min de leitura" (uma troca concreta, sem exagero). Sobre a tela grade ou o rosto
// desfocado. 60–120 q, no máximo 2 por vídeo.
// Sequência: o micro-rótulo acende; a linha "−" sobe por máscara (14 q, expo-out) com a faixa cinza; em `risco` s o
// traço atravessa o texto da esquerda para a direita em 8 q (curva "risco") e o texto vira cinza a 60%; em `tMais` s a
// faixa no acento se abre da esquerda (10 q) e o texto "+" sobe por máscara logo atrás. As duas faixas têm a mesma
// largura (a da linha mais longa). Ambiente: deriva 1→1,015. Saída: 10 q, blur 0→10 e subida de 20 px.
// Parâmetros:
//   menos (texto da linha "−"), mais (texto da linha "+"), rotulo (micro-rótulo acima, ex.: "MITO × EVIDÊNCIA"; '' = sem),
//   t (s em que a linha "−" entra, 0.1), risco (s do traço, padrão t + 0,55), tMais (s da linha "+", padrão risco + 0,35),
//   x (borda esquerda, 0.1; com alinhar 'center' é o centro), y (centro do bloco, 0.5), alinhar ('left' | 'center'),
//   tamanho (corpo em px de 1080, 76), cor (faixa "+"; padrão est.acento).
// Sons (registro): sfxDiff na entrada; sonsDiff = traço riscando (swish_air, sintetizado) + pop na linha "+".
import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxDiff: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_10_ui-enter', 0.35];
const SOM_RISCO = 'swish_air';
const SOM_MAIS = 'motionix/pop/pop_05_smooth-pop';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fase = (t: number, ini: number, fim: number, curva: (x: number) => number = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const RISCO = Easing.bezier(0.37, 0, 0.63, 1);
const CINZA = '#9C9CA8';

export const temposDiff = (c: Camada) => {
	const t = Math.max(0, num(c.t, 0.1));
	const risco = Math.max(t + 0.2, num(c.risco, t + 0.55));
	const mais = Math.max(risco + 0.1, num(c.tMais, risco + 0.35));
	return {t, risco, mais};
};

export const sonsDiff = (c: Camada): Som[] => {
	const T = temposDiff(c);
	return [
		{t: T.risco, som: SOM_RISCO, vol: 0.5},
		{t: T.mais, som: SOM_MAIS, vol: 0.55},
	];
};

export const Diff: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const T = temposDiff(c);
	const menos = txt(c.menos, '').trim();
	const mais = txt(c.mais, '').trim();
	const rotulo = txt(c.rotulo, '').trim().toUpperCase();
	const fs = num(c.tamanho, 76) * u;
	const cor = txt(c.cor, est.acento);
	const creme = est.creme;
	const centro = c.alinhar === 'center';

	const qSai = Math.max(1, Math.min(Math.round(fps * 0.34), Math.floor(dur * 0.3)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const deriva = 1 + 0.015 * interpolate(frame, [0, dur], [0, 1], clamp);

	const microE = fase(t, T.t - 0.1, T.t + 0.25);
	const faixaM = fase(t, T.t, T.t + 0.3);
	const sobeM = fase(t, T.t, T.t + 14 / 30);
	const risco = fase(t, T.risco, T.risco + 8 / 30, RISCO);
	const apagaM = fase(t, T.risco + 4 / 30, T.risco + 0.45, CURVAS.suave);
	const abreP = fase(t, T.mais, T.mais + 10 / 30);
	const sobeP = fase(t, T.mais + 3 / 30, T.mais + 3 / 30 + 14 / 30);

	const sinal: React.CSSProperties = {width: '1.25em', textAlign: 'center', fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0};
	const celula: React.CSSProperties = {display: 'flex', alignItems: 'center', padding: `${0.2 * fs}px ${0.5 * fs}px ${0.2 * fs}px 0`, position: 'relative', borderRadius: 6 * u};
	const mascara = (p: number): React.CSSProperties => ({display: 'inline-block', transform: `translateY(${(1 - p) * 105}%)`, opacity: Math.min(1, p * 1.4)});

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: num(c.x, centro ? 0.5 : 0.1) * W,
					top: num(c.y, 0.5) * H,
					transform: `translate(${centro ? '-50%' : '0'}, -50%) translateY(${-20 * u * ps}px) scale(${deriva})`,
					transformOrigin: centro ? '50% 50%' : '0 50%',
					opacity: 1 - ps,
					filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined,
				}}
			>
				{rotulo && (
					<div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: 22 * u, letterSpacing: '0.16em', color: CINZA, opacity: microE, marginBottom: 22 * u, display: 'flex', alignItems: 'center', gap: 12 * u, whiteSpace: 'pre'}}>
						<div style={{width: 8 * u, height: 8 * u, background: cor}} />
						{rotulo}
					</div>
				)}
				{/* grade de 1 coluna: as duas faixas ficam com a largura da linha mais longa */}
				<div style={{display: 'inline-grid', gridTemplateColumns: 'auto', rowGap: 12 * u, fontFamily: FONTES.base.family, fontSize: fs, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'pre'}}>
					{menos && (
						<div style={celula}>
							<div style={{position: 'absolute', inset: 0, borderRadius: 6 * u, background: `linear-gradient(${rgba(CINZA, 0.1)}, ${rgba(CINZA, 0.1)}), ${rgba('#0A0B0F', 0.5)}`, opacity: faixaM}} />
							<div style={{position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingBottom: '0.04em'}}>
								<span style={{...sinal, ...mascara(sobeM), color: interpolateColors(apagaM, [0, 1], [rgba(creme, 0.75), rgba(CINZA, 0.7)])}}>−</span>
								<span style={{position: 'relative', ...mascara(sobeM), fontWeight: 600, color: interpolateColors(apagaM, [0, 1], [rgba(creme, 0.82), rgba(CINZA, 0.6)])}}>
									{menos}
									{/* traço riscando, um pouco além das letras */}
									<span style={{position: 'absolute', left: '-0.08em', right: '-0.08em', top: '54%', height: Math.max(3, 0.075 * fs), marginTop: -Math.max(3, 0.075 * fs) / 2, borderRadius: 99, background: rgba('#C9CFDA', 0.95), transform: `scaleX(${risco})`, transformOrigin: '0 50%'}} />
								</span>
							</div>
						</div>
					)}
					{mais && (
						<div style={celula}>
							<div style={{position: 'absolute', inset: 0, borderRadius: 6 * u, background: cor, transform: `scaleX(${abreP})`, transformOrigin: '0 50%', boxShadow: `0 ${16 * u}px ${44 * u}px ${rgba('#000000', 0.35 * abreP)}`}} />
							<div style={{position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingBottom: '0.04em'}}>
								<span style={{...sinal, ...mascara(sobeP), color: creme}}>+</span>
								<span style={{...mascara(sobeP), fontWeight: 800, color: creme}}>{mais}</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</AbsoluteFill>
	);
};
