// Título quente→frio da tela escura (MIX EDIT, peça `titulo-quente`; guia: beat 4 da intro + correções 7 e 8 da crítica).
// Título LEVE: Inter Tight 300, caixa baixa, ~70% da largura (corpo até 200 px), sublinhado de 2–3 px no acento.
// Nasce do ponto: no quadro 0 ele desenha o mesmo ponto de luz da peça `ponto-luz` (pulso na mesma fase) em (x, y),
// que estica em linha para os dois lados em 12 q (curva "desenho") e vira o sublinhado. A partir do q 6 as letras
// "digitam" da esquerda para a direita (1,25 q por letra, sem interpolar posição): cada uma nasce no acento com glow e
// esfria para creme em ~9 q, em onda. Subtítulo opcional em Instrument Serif itálica (creme a 70%), em cascata Apple
// por palavra, 4 q depois da última letra. Câmera: push de 1,00 a 1,04 (linear) na camada inteira, ancorado no ponto.
// Saída padrão na ÚLTIMA NOTA da trilha (`colapsoEm`, relativo ao início da camada, ou `colapsoNa`, s da saída): N, N+1, N+2 =
// estouro de brilho (brightness 1,27 → 1,53 → 1,8; o quadro N já muda); de N+3 a N+10 colapso para o ponto
// (scaleY 1→0,02 em 4 q, scaleX 1→0 em 5 q, curva de saída; de N+5 em diante o título achatado vira um traço claro,
// como TV desligando, que encolhe até o ponto) com o fundo indo para o preto por baixo; o ponto residual some
// até N+13; depois, preto até o fim da camada (3–6 q de preto antes do beat 5: fim = colapsoEm + ~0,45–0,55 s).
// Parâmetros:
//   texto (obrigatório), subtitulo, x, y (0..1: ONDE ESTÁ O PONTO = centro do sublinhado; 0.5, 0.47; o título fica acima),
//   largura (fração da largura do quadro, 0.7), tamanho (corpo máximo, px em 1080, 200 = maiúscula 145), caixaBaixa (true),
//   inicio (s em que o ponto começa a esticar, 0), linha (q de 30 fps para a linha abrir, 12),
//   intervalo (q por letra, 1.25), esfriar (q da cor quente até o creme, 9), espessura (px do sublinhado, 2.5),
//   sublinhado (true), cor (creme do texto; est.creme), corQuente (est.acento), corLinha (est.acento),
//   subTamanho (corpo do subtítulo, px, 54), push (0.04), nucleo/halo (o ponto: 7 / 100, como no ponto-luz),
//   saida: 'colapso' (padrão) | 'blur' (Apple, 10 q no fim) | 'corte',
//   colapsoEm (s desde o início da camada; padrão: 17 q antes do fim) ou colapsoNa (s da SAÍDA = ataque da última nota;
//     tem prioridade). O quadro N é contado no relógio da saída (round(nota·fps)), então cai no quadro da nota mesmo com
//     ini fora da grade de quadros; aviso no console se a nota cair fora da camada ou com menos de 14 q depois dela,
//   preto (true: fundo vai ao preto no colapso).
// Sons: entrada = whoosh lento e suave (a linha abrindo); 1 tique de digitação por palavra (0,45; ≥ 3 q entre tiques). No beat 4 do guia
// a trilha fica sozinha: nenhum som na nota do colapso (use "sons": false / "sfx": false se quiser só a trilha).
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {CURVA_DESENHO, PontoNucleo, pulsoEm, rgba} from './ponto-luz';

export const sfxTituloQuente: [string, number] = ['motionix/whooshes/whooshes_15_slow-and-smooth-whoosh', 0.3]; // x1,5 = 0,45
const SOM_TECLA = 'motionix/ui-sound-effects/ui-sound-effects_21_v4-type-delete-2';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const avisados = new Set<string>();
const avisar = (m: string) => {
	if (avisados.has(m)) return;
	avisados.add(m);
	console.warn(m);
};

// Métricas da Inter Tight (em): com line-height 1, maiúscula de 0,136 a 0,864 (base); descendentes até ~1,07.
const BASE = 0.864;
const GAP_LINHA = 0.3; // sublinhado abaixo das descendentes
const TRACKING = '0.01em';
const AMOSTRA = 'AaÁáÃãÇçÉéÍíÓóÕõÚú';

// Espera as fontes (o measureText guarda em cache a 1ª medida; medir antes da fonte carregar erra a largura).
// specs: shorthand CSS, ex. '300 100px "Inter Tight"'.
// O render só é liberado DEPOIS do commit do React com o texto (efeito em `pronto`): liberar junto com o setState
// deixaria o 1º quadro da peça em cada aba ser fotografado ainda sem o texto.
export const useFontesProntas = (specs: string[]): boolean => {
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('fontes da peça'));
	const [pronto, setPronto] = useState(false);
	const liberado = useRef(false);
	const libera = useCallback(() => {
		if (liberado.current) return;
		liberado.current = true;
		continueRender(espera);
	}, [continueRender, espera]);
	const chave = specs.join('|');
	useEffect(() => {
		let vivo = true;
		const fim = () => (vivo ? setPronto(true) : libera());
		Promise.all(chave.split('|').filter(Boolean).map((s) => document.fonts.load(s, AMOSTRA)))
			.then(() => document.fonts.ready)
			.then(fim, fim);
		return () => {
			vivo = false;
			libera();
		};
	}, [chave, libera]);
	useEffect(() => {
		if (pronto) libera();
	}, [pronto, libera]);
	return pronto;
};

// Linha do tempo em q de 30 fps (a peça e os sons usam a mesma conta)
const tempos = (c: Camada) => {
	const caixaBaixa = bool(c.caixaBaixa, true);
	const bruto = txt(c.texto, '').replace(/\s+/g, ' ').trim();
	const texto = caixaBaixa ? bruto.toLocaleLowerCase('pt-BR') : bruto;
	const q0 = num(c.inicio, 0) * 30;
	const qLinha = Math.max(4, num(c.linha, 12));
	const qLetras = q0 + Math.min(6, qLinha * 0.5); // 1ª letra quando a linha está na metade
	const intervalo = Math.max(0.5, num(c.intervalo, 1.25));
	return {texto, q0, qLinha, qLetras, intervalo, esfriar: Math.max(2, num(c.esfriar, 9))};
};

// Quadro da camada em que cai a nota (N). Conta no relógio da SAÍDA: o motor monta a camada em round(ini·fps), então
// N = round((ini + colapsoEm)·fps) − round(ini·fps) cai exatamente no quadro da nota (round(nota·fps)), sem o erro de
// ±1 q do arredondamento duplo. colapsoNa (s da saída) tem prioridade sobre colapsoEm (s desde o início da camada).
export const quadroDoColapso = (c: Camada, fps: number, dur: number) => {
	const ini = num(c.ini, 0);
	const nota = typeof c.colapsoNa === 'number' ? c.colapsoNa : typeof c.colapsoEm === 'number' ? ini + c.colapsoEm : null;
	if (nota === null) return Math.max(0, dur - Math.round((17 * fps) / 30));
	const n = Math.round(nota * fps) - Math.round(ini * fps);
	const resto = (dur - n) / (fps / 30); // q de 30 fps entre a nota e o fim da camada
	if (n < 0 || resto < 1) avisar(`titulo-quente: a nota (${nota.toFixed(3)} s) cai fora da camada (${ini}–${num(c.fim, 0)} s)`);
	else if (resto < 14) avisar(`titulo-quente: só ${resto.toFixed(1)} q depois da nota; o colapso + ponto residual pedem 14 q e o guia, 3–6 q de preto depois (fim ≈ nota + 0,55 s)`);
	return Math.min(Math.max(0, dur - 1), Math.max(0, n));
};

// 1 tique por palavra, na 1ª letra dela; palavra que começa < 3 q depois do tique anterior não ganha outro
// (em "o foco", os dois tiques ficariam a 1,25 q e soariam como um clique duplo)
export const sonsTituloQuente = (c: Camada) => {
	const {texto, qLetras, intervalo} = tempos(c);
	const out: {t: number; som: string; vol: number}[] = [];
	let k = 0;
	let ultimo = -Infinity;
	texto.split(' ').forEach((p) => {
		const q = qLetras + k * intervalo;
		if (p && q - ultimo >= 3) {
			out.push({t: q / 30, som: SOM_TECLA, vol: 0.45});
			ultimo = q;
		}
		k += p.length;
	});
	return out;
};

export const TituloQuente: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k30 = fps / 30;
	const qq = frame / k30; // tempo em q de 30 fps
	const durQ = dur / k30;
	const {texto, q0, qLinha, qLetras, intervalo, esfriar} = tempos(c);
	const subtitulo = txt(c.subtitulo, '').trim();
	const leve = FONTES.leve;
	const serifa = FONTES.serifa;
	const pronto = useFontesProntas([`300 100px "${leve.family}"`, subtitulo ? `italic 400 100px "${serifa.family}"` : '']);

	const X = num(c.x, 0.5) * W;
	const Y = num(c.y, 0.47) * H;
	const largura100 = useMemo(
		() => (pronto && texto ? measureText({text: texto, fontFamily: leve.family, fontSize: 100, fontWeight: '300', letterSpacing: TRACKING}).width : 0),
		[pronto, texto, leve.family],
	);
	const fs = largura100 > 0 ? Math.min(num(c.tamanho, 200) * u, (num(c.largura, 0.7) * W * 100) / largura100) : num(c.tamanho, 200) * u;
	const larguraTexto = (largura100 * fs) / 100;
	const topo = Y - (BASE + GAP_LINHA) * fs; // topo da caixa da linha (line-height 1)

	const cor = txt(c.cor, est.creme);
	const corQuente = txt(c.corQuente, est.acento);
	const corLinha = txt(c.corLinha, est.acento);
	const capPx = 0.727 * fs;
	const g = capPx / 150; // glow do guia é para maiúscula de ~150 px

	// ---- saída ----
	const saida = (['colapso', 'blur', 'corte'].includes(txt(c.saida, '')) ? c.saida : 'colapso') as 'colapso' | 'blur' | 'corte';
	const fC = saida === 'colapso' ? quadroDoColapso(c, fps, dur) : Infinity;
	const rel = (frame - fC) / k30; // q desde a nota
	const estouro = saida === 'colapso' ? Math.min(1, Math.max(0, (rel + 1) / 3)) : 0; // N: 1/3, N+1: 2/3, N+2: 1
	const sy = saida === 'colapso' ? 1 - 0.98 * interpolate(rel, [3, 7], [0, 1], {...clamp, easing: CURVAS.saida}) : 1;
	const sx = saida === 'colapso' ? 1 - interpolate(rel, [5, 10], [0, 1], {...clamp, easing: CURVAS.saida}) : 1;
	const preto = saida === 'colapso' && bool(c.preto, true) ? interpolate(rel, [3, 10], [0, 1], {...clamp, easing: CURVAS.entrada}) : 0;
	const apagado = saida === 'colapso' && rel >= 10;
	const linhaCRT = saida === 'colapso' && rel < 10 ? interpolate(rel, [4.5, 6], [0, 1], clamp) : 0;
	const blurSai = saida === 'blur' ? interpolate(qq, [durQ - 10, durQ], [0, 1], {...clamp, easing: CURVAS.saida}) : 0;

	// ---- ponto → linha ----
	const nucleo = num(c.nucleo, 7) * u;
	const halo = num(c.halo, 100) * u;
	const pulso = pulsoEm((Math.round(num(c.ini, 0) * fps) + frame) / fps); // mesmo relógio da saída do ponto-luz
	const eLinha = CURVA_DESENHO(Math.min(1, Math.max(0, (qq - q0) / qLinha)));
	const meia = (larguraTexto / 2) * eLinha;
	const esp = num(c.espessura, 2.5) * u;
	const sublinhado = bool(c.sublinhado, true);
	// as duas cabeças da linha levam o brilho do ponto e esfriam quando a linha termina
	const cabeca = 1 - interpolate(qq, [q0 + qLinha * 0.6, q0 + qLinha + 6], [0, 1], {...clamp, easing: CURVAS.entrada});
	const sep = Math.min(1, meia / (halo * 0.35)); // ponto único no q0 → duas cabeças separadas (sem somar brilho na troca)

	// ---- push de câmera ----
	const push = 1 + num(c.push, 0.04) * Math.min(1, qq / Math.max(1, durQ));

	// ---- letras ----
	let k = -1;
	const letras = Array.from(texto).map((ch, i) => {
		if (ch === ' ') return <span key={i}> </span>;
		k++;
		const a = qLetras + k * intervalo;
		const op = Math.min(1, Math.max(0, (qq - a + 1) / 1.5));
		if (op <= 0) return <span key={i} style={{opacity: 0}}>{ch}</span>;
		const calor = 1 - interpolate(qq, [a + 1, a + 1 + esfriar], [0, 1], {...clamp, easing: CURVAS.entrada});
		const quente = Math.max(calor, 0.35 * estouro); // o estouro reaquece um pouco
		return (
			<span
				key={i}
				style={{
					opacity: op,
					color: interpolateColors(quente, [0, 1], [cor, corQuente]),
					textShadow: `0 0 ${18 * g}px ${rgba(corQuente, 0.75 * quente)}, 0 0 ${48 * g}px ${rgba(corQuente, 0.35 * quente)}, 0 0 ${30 * g}px ${rgba(cor, 0.18 + 0.4 * estouro)}`,
				}}
			>
				{ch}
			</span>
		);
	});
	const nLetras = k + 1;

	// ---- subtítulo (cascata Apple por palavra) ----
	const sfs = num(c.subTamanho, 54) * u;
	const qSub = qLetras + nLetras * intervalo + 4;
	const subPalavras = subtitulo ? subtitulo.split(/\s+/) : [];

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* preto do colapso: o fundo (a tela escura) vai ao preto POR BAIXO do título */}
			{preto > 0 && <AbsoluteFill style={{background: '#000', opacity: preto}} />}
			<AbsoluteFill
				style={{
					transformOrigin: `${X}px ${Y}px`,
					transform: `scale(${push * sx}, ${push * sy})`,
					filter: estouro > 0 ? `brightness(${1 + 0.8 * estouro})` : blurSai > 0 ? `blur(${10 * blurSai * u}px)` : undefined,
					opacity: apagado ? 0 : 1 - blurSai,
					translate: blurSai > 0 ? `0 ${-20 * blurSai * u}px` : undefined,
				}}
			>
				{/* título */}
				{pronto && texto && (
					<div
						style={{
							position: 'absolute',
							left: X,
							top: topo,
							transform: 'translateX(-50%)',
							whiteSpace: 'pre',
							fontFamily: leve.family,
							fontWeight: 300,
							fontSize: fs,
							lineHeight: 1,
							letterSpacing: TRACKING,
						}}
					>
						{letras}
					</div>
				)}
				{/* sublinhado (o ponto esticado) */}
				{sublinhado && meia > 0.5 && (
					<div
						style={{
							position: 'absolute',
							left: X - meia,
							top: Y - esp / 2,
							width: meia * 2,
							height: esp,
							borderRadius: esp,
							background: corLinha,
							boxShadow: `0 0 ${8 * u}px ${rgba(corLinha, 0.7)}, 0 0 ${22 * u}px ${rgba(corLinha, 0.3 + 0.4 * estouro)}`,
						}}
					/>
				)}
				{/* o ponto: inteiro no q0, vira duas cabeças que correm para as pontas da linha */}
				{(sublinhado
					? [
							{x: X, op: 1 - sep},
							{x: X - meia, op: sep * cabeca},
							{x: X + meia, op: sep * cabeca},
						]
					: [{x: X, op: 1 - eLinha}]
				).map((p, i) => (
					<PontoNucleo
						key={i}
						x={p.x}
						y={Y}
						nucleo={nucleo}
						halo={halo}
						cor={corQuente}
						corNucleo={est.creme}
						escalaNucleo={(0.55 + 0.45 * (1 - eLinha)) * (0.95 + 0.05 * pulso)}
						escalaHalo={(0.5 + 0.5 * (1 - eLinha)) * pulso}
						opacidade={p.op}
					/>
				))}
				{/* subtítulo */}
				{pronto && subPalavras.length > 0 && (
					<div
						style={{
							position: 'absolute',
							left: X,
							top: Y + 0.55 * sfs,
							transform: 'translateX(-50%)',
							whiteSpace: 'nowrap',
							fontFamily: serifa.family,
							fontStyle: 'italic',
							fontWeight: 400,
							fontSize: sfs,
							lineHeight: 1.1,
							letterSpacing: serifa.tracking,
							color: rgba(cor, 0.7),
						}}
					>
						{subPalavras.map((w, i) => {
							const e = interpolate(qq, [qSub + i * 3, qSub + i * 3 + 11], [0, 1], {...clamp, easing: CURVAS.entrada});
							return (
								<span key={i} style={{display: 'inline-block', marginRight: i < subPalavras.length - 1 ? '0.25em' : 0, opacity: e, filter: e < 1 ? `blur(${(1 - e) * 12 * u}px)` : undefined, transform: `translateY(${(1 - e) * 0.35}em) scale(${0.92 + 0.08 * e})`}}>
									{w}
								</span>
							);
						})}
					</div>
				)}
			</AbsoluteFill>
			{/* linha de TV desligando: o título achatado vira um traço claro que encolhe até o ponto */}
			{linhaCRT > 0.01 && (
				<div
					style={{
						position: 'absolute',
						left: X - (larguraTexto * push * sx) / 2,
						top: Y - 1.5 * u,
						width: larguraTexto * push * sx,
						height: 3 * u,
						borderRadius: 3 * u,
						opacity: linhaCRT,
						background: est.creme,
						boxShadow: `0 0 ${10 * u}px ${rgba(est.creme, 0.8)}, 0 0 ${26 * u}px ${rgba(corQuente, 0.7)}`,
					}}
				/>
			)}
			{/* ponto residual do colapso: acende no fim do achatamento e some até N+13 */}
			{saida === 'colapso' && rel >= 6 && rel < 13.5 && (
				<PontoNucleo
					x={X}
					y={Y}
					nucleo={nucleo}
					halo={halo * 0.8}
					cor={corQuente}
					corNucleo={est.creme}
					escalaNucleo={interpolate(rel, [6, 9, 13], [0.3, 1.1, 0], {...clamp, easing: CURVAS.saida})}
					escalaHalo={interpolate(rel, [6, 9, 13], [0.2, 1, 0], clamp)}
					opacidade={interpolate(rel, [6, 8], [0, 1], clamp)}
					brilho={1.3}
				/>
			)}
		</AbsoluteFill>
	);
};
