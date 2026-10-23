// Legenda palavra a palavra dos formatos novos (mesma lógica do Tela Dividida, com tamanho proporcional ao quadro).
// Estilo próprio de cada formato entra nas fases 3 e 4.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {PAIRS} from '../fonts';
import {limparPalavra, type Bloco} from '../legendas';
import type {Palavra} from '../tipos';
import {CURVAS, clamp} from '../kit/tempo';

const p = PAIRS[0]; // fonte A (decidida pelo usuário)

export const LegendaCamadas: React.FC<{bloco: Bloco; y: number}> = ({bloco, y}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t0 = bloco.ini;
	const q = fps / 30; // tempos calibrados em quadros de 30 fps
	const saida = interpolate(frame, [(bloco.fim - t0) * fps - 4 * q, (bloco.fim - t0) * fps], [1, 0], clamp);
	const normais = bloco.palavras.filter((w) => !w.destaque);
	const chave = bloco.palavras.find((w) => w.destaque);
	const anim = (w: Palavra): React.CSSProperties => {
		const f = (w.ini - t0) * fps;
		const e = interpolate(frame, [f - q, f + 6 * q], [0, 1], {...clamp, easing: CURVAS.suave});
		return {opacity: e, filter: `blur(${(1 - e) * 8}px)`, transform: `translateY(${(1 - e) * 10 * u}px)`, display: 'inline-block'};
	};
	return (
		<AbsoluteFill style={{opacity: saida}}>
			<div style={{position: 'absolute', top: y * H, left: W * 0.06, right: W * 0.06, transform: 'translateY(-50%)', textAlign: 'center', color: '#fff', textShadow: '0 3px 24px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)'}}>
				{normais.length > 0 && (
					<div style={{fontFamily: p.base.family, fontWeight: chave ? p.base.weight : 500, letterSpacing: p.base.tracking, fontSize: (chave ? 46 : 58) * u, lineHeight: 1.15}}>
						{normais.map((w, i) => (
							<span key={i} style={{...anim(w), marginRight: '0.28em'}}>
								{limparPalavra(w.w)}
							</span>
						))}
					</div>
				)}
				{chave && (
					<div style={{...anim(chave), display: 'block', fontFamily: p.keyword.family, fontWeight: p.keyword.weight, fontStyle: p.keyword.style, letterSpacing: p.keyword.tracking, fontSize: p.keyword.size * u, lineHeight: 0.95, marginTop: 4 * u}}>
						{limparPalavra(chave.w)}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
