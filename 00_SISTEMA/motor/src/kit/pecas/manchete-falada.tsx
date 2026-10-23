// Manchete falada (MIX EDIT, peça `manchete-falada`): a frase dita, no topo à esquerda, com karaokê no acento.
// Só em telas gráficas (tela grade/escura) e no rosto desfocado com escurecer ≥ 0,4 (correção 6 do guia; no resto,
// palavras-chave). Inter Tight 600, sentence case, corpo até 72 px (maiúscula ~52 px), até 2 linhas em ≤ 66% da largura,
// 2ª linha a 1,63× a maiúscula (base a base). Linha de base da 1ª linha em y 21–27%, x 7,5–10%.
// Karaokê (tempos EXPLÍCITOS, relativos à camada; o motor não passa as palavras do bruto às peças): a palavra só aparece
// quando a fala dela começa (fantasma: creme a 35%, subindo 0,12 em em 2 q); enche no acento letra a letra durante a fala
// dela (com glow); vira creme a 85% quando a próxima começa (4 q). A próxima nunca aparece antes da hora. O layout das
// linhas é calculado com a frase inteira, então nada pula de lugar quando as palavras entram.
// Saída Apple nos últimos 10 q: blur 0→10 px, sobe 20 px, fade (curva de saída).
// Parâmetros:
//   palavras ([{w, t, fim?}]: t = início da fala da palavra em s desde o início da camada; fim = quando ela acaba,
//     opcional: sem fim, a palavra enche em 90% do intervalo até a próxima, entre 0,1 e 0,6 s),
//   x (borda esquerda, 0.075), y (linha de base da 1ª linha, 0.24), tamanho (corpo máximo em px de 1080, 72),
//   largura (fração da largura do quadro, 0.66), linhas (máx., 2; a fonte encolhe para caber), cor (est.creme),
//   corAtiva (est.acento), fantasma (opacidade da palavra recém-chegada, 0.35), opacidade (da palavra dita, 0.85),
//   sombra (true: sombra suave para ler sobre o rosto escurecido), esfriarFinal (s em que a última palavra vira creme;
//   padrão: 0,25 s depois de ela encher).
// Som: entrada com `ui-enter` (corpo de 0,8 s, audível por cima da voz); sem som por palavra (a fala marca o ritmo).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {fitTextOnNLines} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {useFontesProntas} from './titulo-quente';
import {rgba} from './ponto-luz';

export const sfxMancheteFalada: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_10_ui-enter', 0.35]; // x1,5 = 0,525

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const limite01 = (v: number) => Math.min(1, Math.max(0, v));

// Inter Tight (em): maiúscula 0,727; ascendente 0,969; descendente 0,242 (caixa de linha)
const CAP = 0.727;
const ASC = 0.969;
const DESC = 0.242;
const TRACKING = '-0.02em';

type Palavra = {w: string; t: number; fim?: number};

export const MancheteFalada: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const s = frame / fps;
	const fam = FONTES.base.family;
	const pronto = useFontesProntas([`600 100px "${fam}"`]);

	const palavras = useMemo<Palavra[]>(
		() =>
			(Array.isArray(c.palavras) ? c.palavras : [])
				.flatMap((v) => {
					const o = (v ?? {}) as Record<string, unknown>;
					const w = txt(o.w, '').trim();
					const t = num(o.t, NaN);
					return w && Number.isFinite(t) ? [{w, t, fim: typeof o.fim === 'number' ? o.fim : undefined}] : [];
				})
				.sort((a, b) => a.t - b.t),
		[c.palavras],
	);
	const texto = palavras.map((p) => p.w).join(' ');
	const larg = num(c.largura, 0.66) * W;
	const fs = useMemo(() => {
		const maximo = num(c.tamanho, 72) * u;
		if (!pronto || !texto) return maximo;
		return Math.min(maximo, fitTextOnNLines({text: texto, maxLines: Math.max(1, num(c.linhas, 2)), maxBoxWidth: larg, fontFamily: fam, fontWeight: '600', letterSpacing: TRACKING, maxFontSize: maximo}).fontSize);
	}, [pronto, texto, larg, fam, c.tamanho, c.linhas, u]);
	if (!pronto || !palavras.length) return null;

	const LH = 1.63 * CAP; // entrelinha: base a base = 1,63 × maiúscula
	const topo = num(c.y, 0.24) * H - ((LH - (ASC + DESC)) / 2 + ASC) * fs;
	const cor = txt(c.cor, est.creme);
	const corAtiva = txt(c.corAtiva, est.acento);
	const fantasma = rgba(cor, num(c.fantasma, 0.35));
	const dita = rgba(cor, num(c.opacidade, 0.85));
	const g = (CAP * fs) / 150;
	const sombra = bool(c.sombra, true) ? `0 ${4 * u}px ${14 * u}px rgba(0,0,0,0.35)` : '';
	const k30 = fps / 30;
	const sai = interpolate(frame / k30, [dur / k30 - 10, dur / k30], [0, 1], {...clamp, easing: CURVAS.saida});

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: num(c.x, 0.075) * W,
					top: topo,
					width: larg,
					fontFamily: fam,
					fontWeight: 600,
					fontSize: fs,
					lineHeight: LH,
					letterSpacing: TRACKING,
					opacity: 1 - sai,
					filter: sai > 0 ? `blur(${10 * sai * u}px)` : undefined,
					transform: sai > 0 ? `translateY(${-20 * sai * u}px)` : undefined,
				}}
			>
				{palavras.map((p, i) => {
					const prox = palavras[i + 1];
					const enche = p.fim != null ? Math.max(0.05, p.fim - p.t) : Math.min(0.6, Math.max(0.1, ((prox ? prox.t : p.t + 0.5) - p.t) * 0.9));
					const esfria = prox ? prox.t : num(c.esfriarFinal, p.t + enche + 0.25);
					const ap = limite01(((s - p.t) * 30 + 1) / 2); // no quadro em que a fala começa já está a meio caminho
					const frio = interpolate((s - esfria) * 30, [0, 4], [0, 1], {...clamp, easing: CURVAS.entrada});
					const letras = Array.from(p.w);
					return (
						<React.Fragment key={i}>
							<span style={{display: 'inline-block', opacity: ap, transform: ap < 1 ? `translateY(${(1 - ap) * 0.12}em)` : undefined}}>
								{letras.map((ch, j) => {
									const a = p.t + (enche * j) / letras.length;
									const cheio = interpolate((s - a) * 30, [0, 2], [0, 1], clamp);
									const quente = cheio * (1 - frio);
									const corL = interpolateColors(frio, [0, 1], [interpolateColors(cheio, [0, 1], [fantasma, corAtiva]), dita]);
									const brilho = quente > 0.01 ? `0 0 ${18 * g}px ${rgba(corAtiva, 0.55 * quente)}, 0 0 ${48 * g}px ${rgba(corAtiva, 0.25 * quente)}` : '';
									return (
										<span key={j} style={{color: corL, textShadow: [brilho, sombra].filter(Boolean).join(', ') || undefined}}>
											{ch}
										</span>
									);
								})}
							</span>
							{i < palavras.length - 1 ? ' ' : null}
						</React.Fragment>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
