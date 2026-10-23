// Card de capítulo (YOUTUBE - MIX EDIT, peça `card-capitulo`): número "01" + título em Instrument Serif itálica
// + linha que se desenha entre os dois. 60–90 q, sobre rosto desfocado (cena `fala` com desfoque 24 e escurecer 0,45)
// ou sobre tela grade/escura; `{pausa: 0.8–1.5}` opcional com a trilha subindo. Os mesmos títulos vão para a descrição.
// Sequência (q a 30 fps): número sobe 0,25em + blur 12→0 + fade em 12 q (expo-out); rótulo "CAPÍTULO" 3 q depois;
// a linha se desenha em 16 q (curva `desenho`) com a ponta no acento e brilho, e esfria para creme em 10 q; o título
// entra palavra por palavra (cascata Apple: blur 12→0, sobe 0,35em, escala 0,94→1, 12 q, 3 q entre palavras).
// Vazamento de luz na entrada (o "light leak" do guia, em CSS: faixa vertical âmbar e macia, em `screen`, varrendo da
// esquerda para a direita em 16 q; nada de WebGL). Deriva leve (escala +1,5%). Saída: blur 0→12 + sobe 16 px +
// escala 0,98 + fade em 8 q (ease-in).
// Parâmetros:
//   numero (1 ou "01": vira 2 dígitos), titulo, rotulo ('Capítulo'; '' = sem), x (0.1: borda esquerda do bloco,
//   coluna 2 da grade), y (0.5: centro do bloco), alinhar ('esquerda' | 'centro': com centro, x é o centro, padrão 0.5),
//   tamanho (corpo do título, 88; faixa do guia 72–96), tamanhoNumero (132), largura (máximo de uma linha do título,
//   fração: 0.72; o título é quebrado por medida em até 3 linhas equilibradas e a linha desenhada tem a largura do texto),
//   vazamento (true: luz quente na entrada), fundo (false | 'escuro' | 'grade': pinta a tela por baixo, com fade de
//   9 q na entrada e na saída; útil sobre `{pausa}`), cor (acento da ponta da linha), corTexto (creme).
// Creme sobre fundo escuro com sombra 0 4px 14px rgba(0,0,0,.35) (legível sobre o rosto escurecido).
// Sons: entrada sfxCapitulo (UI premium open) + sonsCapitulo (whoosh lento e suave no mesmo instante).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps, Som} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {DESENHO, SAIDA_APPLE, bool, coresMix, num, prog, rgba, txt, useFontesProntas} from './card-vidro';

const REF = 100;
const ESPACO = 0.05; // em a mais entre as palavras do título (a itálica tem espaço estreito)
// Quebra equilibrada: 1 linha se couber; senão a divisão em 2 (ou 3) linhas com a menor "linha mais larga".
const quebrar = (palavras: string[], larg: (s: string) => number, maxW: number): string[][] => {
	const n = palavras.length;
	if (n <= 1) return n ? [palavras] : [];
	const L = (a: number, b: number) => larg(palavras.slice(a, b).join(' '));
	if (L(0, n) <= maxW) return [palavras];
	let melhor: string[][] | null = null;
	let melhorW = Infinity;
	for (let i = 1; i < n; i++) {
		const w = Math.max(L(0, i), L(i, n));
		if (w <= maxW && w < melhorW) [melhorW, melhor] = [w, [palavras.slice(0, i), palavras.slice(i)]];
	}
	if (melhor) return melhor;
	for (let i = 1; i < n - 1; i++)
		for (let j = i + 1; j < n; j++) {
			const w = Math.max(L(0, i), L(i, j), L(j, n));
			if (w < melhorW) [melhorW, melhor] = [w, [palavras.slice(0, i), palavras.slice(i, j), palavras.slice(j)]];
		}
	return melhor ?? [palavras];
};

export const sfxCapitulo: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_03_ui-premium-open', 0.55];
export const sonsCapitulo = (): Som[] => [{t: 0, som: 'motionix/whooshes/whooshes_15_slow-and-smooth-whoosh', vol: 0.45}];

// Tela escura ou grade do MIX (passo 96 px, linhas passando pelo centro; valores de est.grade quando existem),
// para o `fundo` opcional das peças sobre `{pausa}`.
export const FundoTela: React.FC<{tipo: 'escuro' | 'grade'; cores: ReturnType<typeof coresMix>; opacidade: number}> = ({tipo, cores, opacidade}) => {
	const {width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const g = cores.grade;
	const passo = g.passo * u;
	const e = g.espessura * u;
	const meio = (n: number) => (((n / 2 - e / 2) % passo) + passo) % passo;
	return (
		<AbsoluteFill style={{background: cores.fundo, opacity: opacidade}}>
			{tipo === 'grade' && (
				<AbsoluteFill
					style={{
						backgroundImage: `linear-gradient(${g.cor} ${e}px, transparent ${e}px), linear-gradient(90deg, ${g.cor} ${e}px, transparent ${e}px)`,
						backgroundSize: `${passo}px ${passo}px`,
						backgroundPosition: `${meio(W)}px ${meio(H)}px`,
					}}
				/>
			)}
			{g.luz > 0 && <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 50% at 50% -10%, rgba(255,255,255,${g.luz}), transparent 70%)`}} />}
		</AbsoluteFill>
	);
};

export const CardCapitulo: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k = fps / 30;
	const q = (n: number) => n * k;
	const cor = coresMix(est);
	const acento = txt(c.cor, cor.acento);
	const creme = txt(c.corTexto, cor.creme);
	const centro = txt(c.alinhar, 'esquerda') === 'centro';
	const tam = num(c.tamanho, 88) * u;
	const tamN = num(c.tamanhoNumero, 132) * u;
	const numero = typeof c.numero === 'number' ? String(c.numero).padStart(2, '0') : txt(c.numero, '01');
	const rotulo = txt(c.rotulo, 'Capítulo').toUpperCase();
	const palavras = txt(c.titulo, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
	const sombra = `0 ${4 * u}px ${14 * u}px rgba(0,0,0,0.35)`;

	// medidas: título em linhas equilibradas e a largura do bloco = a da linha mais larga (a linha desenhada acompanha
	// o texto). Mede a face itálica explicitamente (additionalStyles), a mesma que aparece na tela.
	const fs = FONTES.serifa;
	const pronto = useFontesProntas([`italic 400 ${REF}px "${fs.family}"`, `300 ${REF}px "${FONTES.leve.family}"`, `600 ${REF}px "${FONTES.base.family}"`], 'capitulo: fontes');
	const medidas = useMemo(() => {
		if (!pronto) return null;
		const larg = (s: string) => (measureText({text: s, fontFamily: fs.family, fontWeight: '400', fontSize: REF, letterSpacing: fs.tracking, additionalStyles: {fontStyle: 'italic'}}).width / REF) * tam + (s.split(' ').length - 1) * ESPACO * tam;
		const maxW = num(c.largura, 0.72) * W;
		const linhas = quebrar(palavras, larg, maxW);
		const larguraTitulo = Math.max(0, ...linhas.map((l) => larg(l.join(' '))));
		const nW = (measureText({text: numero, fontFamily: FONTES.leve.family, fontWeight: '300', fontSize: REF, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums'}).width / REF) * tamN;
		const rW = rotulo ? (measureText({text: rotulo, fontFamily: FONTES.base.family, fontWeight: '600', fontSize: REF, letterSpacing: '0.2em'}).width / REF) * 22 * u + 22 * u : 0;
		return {linhas, largura: Math.ceil(Math.max(larguraTitulo, nW + rW, 280 * u)) + 2};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pronto, palavras.join(' '), tam, tamN, numero, rotulo, W, u, c.largura]);
	if (!medidas) return null;
	const {linhas, largura: larguraBloco} = medidas;

	// saída (8 q, ease-in) e deriva
	const qs = Math.max(1, Math.min(q(8), dur * 0.35));
	const s = interpolate(frame, [dur - 1 - qs, dur - 1], [0, 1], {...clamp, easing: SAIDA_APPLE});
	const deriva = 1 + 0.015 * interpolate(frame, [0, dur], [0, 1], clamp);

	// número e rótulo
	const eN = prog(frame, 0, q(12));
	const eR = prog(frame, q(3), q(15));
	// linha: desenho em 16 q a partir do q4; ponta no acento esfriando para creme em 10 q
	const pL = prog(frame, q(4), q(20), DESENHO);
	const frio = prog(frame, q(20), q(30), CURVAS.suave);
	const corPonta = interpolateColors(frio, [0, 1], [acento, rgba(creme, 0.55)]);
	// luz de entrada (vazamento quente atravessando da esquerda para a direita)
	const pV = prog(frame, 0, q(16), CURVAS.suave);
	const xV = -30 + 160 * pV; // centro da faixa (% da largura)
	// fundo opcional
	const fundo = c.fundo === 'escuro' || c.fundo === 'grade' ? c.fundo : null;
	const opFundo = fundo ? Math.min(prog(frame, 0, q(9), CURVAS.suave), 1 - interpolate(frame, [dur - 1 - q(9), dur - 1], [0, 1], clamp)) : 0;

	const left = centro ? num(c.x, 0.5) * W : num(c.x, 0.1) * W;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{fundo && <FundoTela tipo={fundo} cores={cor} opacidade={opFundo} />}
			{bool(c.vazamento, true) && pV > 0 && pV < 1 && (
				// vazamento de luz: faixa vertical larga e macia, núcleo âmbar claro caindo para laranja (sem traço duro),
				// varrendo da esquerda para a direita; some nas pontas (seno)
				<AbsoluteFill
					style={{
						background: `radial-gradient(ellipse 24% 100% at ${xV}% 42%, rgba(255,192,136,0.17) 0%, rgba(255,120,48,0.1) 38%, rgba(255,84,24,0.04) 62%, transparent 82%)`,
						mixBlendMode: 'screen',
						opacity: Math.sin(Math.PI * pV),
					}}
				/>
			)}
			<div
				style={{
					position: 'absolute',
					left,
					top: num(c.y, 0.5) * H,
					width: larguraBloco,
					transform: `translate(${centro ? -50 : 0}%, -50%) translateY(${-16 * u * s}px) scale(${deriva * (1 - 0.02 * s)})`,
					transformOrigin: centro ? '50% 50%' : '0% 50%',
					opacity: 1 - s,
					filter: s > 0.001 ? `blur(${12 * u * s}px)` : undefined,
					textAlign: centro ? 'center' : 'left',
				}}
			>
				{/* número + rótulo */}
				<div style={{display: 'flex', alignItems: 'flex-end', justifyContent: centro ? 'center' : 'flex-start', gap: 22 * u}}>
					<div
						style={{
							fontFamily: FONTES.leve.family,
							fontWeight: 300,
							fontSize: tamN,
							lineHeight: 0.8,
							letterSpacing: '-0.04em',
							fontVariantNumeric: 'tabular-nums',
							color: creme,
							textShadow: sombra,
							opacity: eN,
							transform: `translateY(${(1 - eN) * 0.25 * tamN}px) scale(${0.96 + 0.04 * eN})`,
							transformOrigin: '0% 100%',
							filter: eN < 0.995 ? `blur(${(1 - eN) * 12 * u}px)` : undefined,
						}}
					>
						{numero}
					</div>
					{rotulo && (
						<div
							style={{
								fontFamily: FONTES.base.family,
								fontWeight: 600,
								fontSize: 22 * u,
								lineHeight: 1,
								letterSpacing: '0.2em',
								color: rgba(creme, 0.62),
								marginBottom: 0.04 * tamN,
								opacity: eR,
								transform: `translateY(${(1 - eR) * 10 * u}px)`,
								filter: eR < 0.995 ? `blur(${(1 - eR) * 6 * u}px)` : undefined,
							}}
						>
							{rotulo}
						</div>
					)}
				</div>
				{/* linha que se desenha: corpo creme a 55%, ponta no acento com brilho */}
				<div style={{position: 'relative', height: 2 * u, marginTop: 30 * u, marginBottom: 30 * u}}>
					<div
						style={{
							position: 'absolute',
							top: 0,
							height: '100%',
							borderRadius: u,
							...(centro ? {left: `${50 - 50 * pL}%`, width: `${100 * pL}%`} : {left: 0, width: `${100 * pL}%`}),
							background: centro
								? `linear-gradient(90deg, ${corPonta}, ${rgba(creme, 0.55)} 22%, ${rgba(creme, 0.55)} 78%, ${corPonta})`
								: `linear-gradient(90deg, ${rgba(creme, 0.55)} 0%, ${rgba(creme, 0.55)} 72%, ${corPonta} 100%)`,
						}}
					/>
					{pL > 0.001 && frio < 1 &&
						(centro ? [50 - 50 * pL, 50 + 50 * pL] : [100 * pL]).map((x, i) => (
							<div
								key={i}
								style={{
									position: 'absolute',
									left: `${x}%`,
									top: u,
									width: 8 * u,
									height: 8 * u,
									marginLeft: -4 * u,
									marginTop: -4 * u,
									borderRadius: '50%',
									background: acento,
									boxShadow: `0 0 ${14 * u}px ${3 * u}px ${rgba(acento, 0.55)}`,
									opacity: 1 - frio,
								}}
							/>
						))}
				</div>
				{/* título: linhas equilibradas (medidas), cascata Apple palavra por palavra */}
				<div style={{fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: tam, lineHeight: 1.04, letterSpacing: FONTES.serifa.tracking, wordSpacing: `${ESPACO}em`, color: creme, textShadow: sombra}}>
					{linhas.map((linha, li) => (
						<div key={li} style={{whiteSpace: 'nowrap'}}>
							{linha.map((w, j) => {
								const i = linhas.slice(0, li).reduce((a, l) => a + l.length, 0) + j;
								const a = q(6 + 3 * i);
								const e = prog(frame, a, a + q(12));
								return (
									<React.Fragment key={j}>
										{j > 0 && ' '}
										<span style={{display: 'inline-block', opacity: e, filter: e < 0.995 ? `blur(${(1 - e) * 12 * u}px)` : undefined, transform: `translateY(${(1 - e) * 0.35}em) scale(${0.94 + 0.06 * e})`}}>{w}</span>
									</React.Fragment>
								);
							})}
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};
