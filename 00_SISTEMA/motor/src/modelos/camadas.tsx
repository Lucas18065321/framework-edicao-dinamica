// Peças que entram como `camadas` no edicao.json dos formatos novos. Cada peça recebe a camada (parâmetros),
// a duração em quadros e o estilo do modelo. Peças novas do kit (fase 2) entram neste registro.
import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {fitTextOnNLines} from '@remotion/layout-utils';
import type {Camada} from '../tipos';
import {CURVAS, DUR, clamp} from '../kit/tempo';
import {FONTES} from '../kit/fontes';
import type {Estilo} from './estilos';
import {PalavraImpacto, sfxPalavraImpacto} from '../kit/pecas/palavra-impacto';
import {Selecao, sfxSelecao} from '../kit/pecas/selecao';
import {Checklist, sfxChecklist, sfxChecklistItem} from '../kit/pecas/checklist';
import {MarcaArroba, EncerramentoInsta, sfxMarcaArroba, sfxEncerramentoInsta, sfxBrilhoArroba} from '../kit/pecas/marca';
import {PapelRasgado, sfxPapelRasgado, sfxRasgo, rasgoSegundos} from '../kit/pecas/papel-rasgado';
import {EscalaPh, Fonte, sfxEscalaPh, sfxFonte} from '../kit/pecas/escala-ph';
// kit do YOUTUBE - MIX EDIT (piloto do formato; parâmetros no topo de cada arquivo em src/kit/pecas/)
import {PontoLuz, sfxPontoLuz, sonsPontoLuz} from '../kit/pecas/ponto-luz';
import {TituloQuente, sfxTituloQuente, sonsTituloQuente} from '../kit/pecas/titulo-quente';
import {FlashFoto, sonsFlashFoto} from '../kit/pecas/flash-foto';
import {MatchCut, MatchCutTipo, sonsMatchCut, sonsMatchCutTipo} from '../kit/pecas/match-cut';
import {MancheteFalada, sfxMancheteFalada} from '../kit/pecas/manchete-falada';
import {PainelTecnico, sfxPainelTecnico, sonsPainelTecnico} from '../kit/pecas/painel-tecnico';
import {GraficoBarras, sfxGraficoBarras, sonsGraficoBarras} from '../kit/pecas/grafico-barras';
import {GraficoLinha, sfxGraficoLinha, sonsGraficoLinha} from '../kit/pecas/grafico-linha';
import {Contador, sfxContador, sonsContador} from '../kit/pecas/contador';
import {Diff, sfxDiff, sonsDiff} from '../kit/pecas/diff';
import {FichaPapel, sfxFichaPapel, sonsFichaPapel} from '../kit/pecas/ficha-papel';
import {CardVidro, sfxCardVidro, sonsCardVidro} from '../kit/pecas/card-vidro';
import {Apresentacao, sfxApresentacao, sonsApresentacao} from '../kit/pecas/apresentacao';
import {CardCapitulo, sfxCapitulo, sonsCapitulo} from '../kit/pecas/capitulo';
import {Dicionario, sfxDicionario, sonsDicionario} from '../kit/pecas/dicionario';
import {EncerramentoYoutube, sfxEncerramentoYoutube, sonsEncerramentoYoutube} from '../kit/pecas/encerramento-youtube';
import {Texto3d, sfxTexto3d, sonsTexto3d} from '../kit/pecas/texto-3d';
import {Objeto3d, sonsObjeto3d} from '../kit/pecas/objeto-3d';
import {Piso3d, sfxPiso3d, sonsPiso3d} from '../kit/pecas/piso-3d';
import {Colagem, sfxColagem, sonsColagem} from '../kit/pecas/colagem';
import {ColagemTitulo, sonsColagemTitulo} from '../kit/pecas/colagem-titulo';

export type PecaProps = {c: Camada; dur: number; est: Estilo};
export type Som = {t: number; som: string; vol: number}; // t em s relativos ao início da camada
// sfx = som de entrada; sons = sons dos eventos internos da peça (cada ✓, cada movimento da agulha, o rasgo...)
type Peca = {comp: React.FC<PecaProps>; sfx?: [string, number]; sons?: (c: Camada, fps: number) => Som[]};
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const CLIQUE = 'motionix/clicks/clicks_01_cinematic-click';

const num = (v: unknown, padrao: number) => (typeof v === 'number' ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);

// Título cinético: palavras entram em cascata (blur + subida + escala, curva expo-out) e o bloco sai com blur.
// Parâmetros: texto (*destaque*), x, y (0..1, centro), tamanho (px em 1080, máximo: encolhe para caber),
// linhas (máx. de linhas, padrão 1 para uma palavra e 2 para frases), fonte (pesada|base|leve|serifa),
// cor, corDestaque, caixaAlta, alinhar (center|left|right), cascata (quadros entre palavras),
// largura (fração da largura máxima do bloco, 0.88; MIX: ~0.3 na parede direita), "\n" no texto força a quebra
// (o corpo é medido pela linha mais longa). Sem esses dois, o comportamento é o de sempre (CUT aprovado).
const Titulo: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const fonte = txt(c.fonte, 'pesada') as keyof typeof FONTES;
	const caixaAlta = Boolean(c.caixaAlta ?? fonte === 'pesada');
	const alinhar = txt(c.alinhar, 'center') as 'center' | 'left' | 'right';
	const cascata = num(c.cascata, 3);
	const saida = interpolate(frame, [dur - Math.round(fps * DUR.saida), dur], [0, 1], {...clamp, easing: CURVAS.saida});
	const partes = txt(c.texto, '').split(/(\*[^*]+\*)/).filter(Boolean);
	const plano = partes.join('').replace(/\*/g, '').trim();
	const maximo = num(c.tamanho, 120) * u;
	const largura = num(c.largura, 0.88);
	const linhasTxt = plano.split('\n').map((l) => l.trim());
	const quebrado = linhasTxt.length > 1;
	const {fontSize} = fitTextOnNLines({
		text: quebrado ? linhasTxt.reduce((a, b) => (b.length > a.length ? b : a)) : plano,
		maxLines: quebrado ? 1 : num(c.linhas, plano.includes(' ') ? 2 : 1),
		maxBoxWidth: W * largura,
		fontFamily: FONTES[fonte].family,
		fontWeight: String(FONTES[fonte].weight),
		letterSpacing: FONTES[fonte].tracking,
		textTransform: caixaAlta ? 'uppercase' : 'none',
		maxFontSize: maximo,
	});
	const desloc = alinhar === 'center' ? -50 : alinhar === 'right' ? -100 : 0;
	let n = 0;
	return (
		<AbsoluteFill>
			<div
				style={{
					position: 'absolute',
					left: num(c.x, 0.5) * W,
					top: num(c.y, 0.5) * H,
					width: 'max-content',
					maxWidth: W * (largura + 0.02),
					textAlign: alinhar,
					transform: `translate(${desloc}%, -50%) scale(${1 + 0.06 * saida})`,
					opacity: 1 - saida,
					filter: `blur(${saida * 14}px)`,
					color: txt(c.cor, '#fff'),
					fontSize: Math.min(maximo, fontSize),
				}}
			>
				{partes.map((parte, i) => {
					const destaque = parte.startsWith('*');
					const f = FONTES[destaque && fonte !== 'pesada' ? 'serifa' : fonte];
					return (
						<span key={i} style={{fontFamily: f.family, fontWeight: f.weight, fontStyle: f.style, letterSpacing: f.tracking, lineHeight: f.altura, color: destaque ? txt(c.corDestaque, est.acento) : undefined}}>
							{parte
								.replace(/\*/g, '')
								.replace(/\n/g, ' ⏎ ')
								.trim()
								.split(/\s+/)
								.map((w, k) => {
									if (w === '⏎') return <br key={k} />;
									const a = ((2 + n++ * cascata) * fps) / 30; // cascata em quadros de 30 fps
									const e = interpolate(frame, [a, a + Math.round(fps * DUR.lento)], [0, 1], {...clamp, easing: CURVAS.entrada});
									return (
										<span key={k} style={{display: 'inline-block', marginRight: '0.22em', opacity: e, filter: `blur(${(1 - e) * 12}px)`, transform: `translateY(${(1 - e) * 0.35}em) scale(${0.92 + 0.08 * e})`}}>
											{caixaAlta ? w.toUpperCase() : w}
										</span>
									);
								})}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

// Imagem/objeto recortado (PNG) que entra com "pop" de mola, flutua e sai encolhendo.
// Parâmetros: arquivo, x, y (0..1, centro), largura (px em 1080), rot (graus).
const Imagem: React.FC<PecaProps> = ({c, dur}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const pop = spring({frame, fps, config: {damping: 12, stiffness: 150, mass: 0.6}});
	const saida = interpolate(frame, [dur - Math.round(fps * DUR.saida), dur], [0, 1], {...clamp, easing: CURVAS.saida});
	const larg = num(c.largura, 300) * u;
	const flut = noise2D(txt(c.arquivo, 'img'), frame / 45, 0) * 10 * u;
	return (
		<Img
			src={staticFile(txt(c.arquivo, ''))}
			style={{
				position: 'absolute',
				left: num(c.x, 0.5) * W - larg / 2,
				top: num(c.y, 0.5) * H - larg / 2 + flut,
				width: larg,
				height: larg,
				objectFit: 'contain',
				transform: `scale(${pop * (1 - 0.3 * saida)}) rotate(${num(c.rot, 0) + (1 - pop) * -20}deg)`,
				opacity: Math.min(1, pop * 1.5) * (1 - saida),
				filter: `drop-shadow(0 ${18 * u}px ${30 * u}px rgba(0,0,0,0.45))`,
			}}
		/>
	);
};

export const CAMADAS: Record<string, Peca> = {
	titulo: {comp: Titulo, sfx: ['motionix/whooshes/whooshes_02_cinematic-fast-normal-whoosh', 0.3]},
	imagem: {comp: Imagem, sfx: ['motionix/pop/pop_05_smooth-pop', 0.35]},
	// kit do CUT DINÂMICO (piloto do formato; parâmetros no topo de cada arquivo em src/kit/pecas/)
	'palavra-impacto': {comp: PalavraImpacto, sfx: sfxPalavraImpacto, sons: () => [{t: 0.33, som: CLIQUE, vol: 0.45}]},
	selecao: {comp: Selecao, sfx: sfxSelecao, sons: (c) => (c.virarEm === false ? [] : [{t: num(c.virarEm, 0.45), som: 'motionix/ui-sound-effects/ui-sound-effects_06_ui-click-digital-03', vol: 0.45}])},
	checklist: {
		comp: Checklist,
		sfx: sfxChecklist,
		sons: (c) => lista(c.itens).map((it, i) => ({t: Math.max(0.15, typeof it === 'object' && it && typeof (it as {t?: unknown}).t === 'number' ? (it as {t: number}).t : i * 0.5), som: sfxChecklistItem[0], vol: 0.45})),
	},
	'marca-arroba': {comp: MarcaArroba, sfx: sfxMarcaArroba, sons: (c) => lista(c.brilho).filter((t): t is number => typeof t === 'number').map((t) => ({t, som: sfxBrilhoArroba[0], vol: 0.4}))},
	'encerramento-insta': {comp: EncerramentoInsta, sfx: sfxEncerramentoInsta},
	'papel-rasgado': {
		comp: PapelRasgado,
		sfx: sfxPapelRasgado,
		sons: (c, fps) => {
			const r = rasgoSegundos(c, Math.round((c.fim - c.ini) * fps), fps);
			return sfxRasgo.map(([som, vol, atraso]) => ({t: r + atraso, som, vol: Math.min(0.7, vol * 1.3)}));
		},
	},
	'escala-ph': {
		comp: EscalaPh,
		sfx: sfxEscalaPh,
		// cada movimento da agulha soa; sair da faixa normal (7,35–7,45) ganha um alerta
		sons: (c) =>
			lista(c.momentos)
				.slice(1)
				.flatMap((m) => {
					const {t, valor} = m as {t: number; valor: number};
					const fora = valor < 7.35 || valor > 7.45;
					return [{t, som: 'motionix/data-collect/data-collect_03_data-collect', vol: 0.4}, ...(fora ? [{t: t + 0.12, som: 'motionix/ui-sound-effects/ui-sound-effects_11_ui-glitch-click', vol: 0.45}] : [])];
				}),
	},
	fonte: {comp: Fonte, sfx: sfxFonte},
	// kit do YOUTUBE - MIX EDIT · intro cinematográfica
	'ponto-luz': {comp: PontoLuz, sfx: sfxPontoLuz, sons: sonsPontoLuz},
	'titulo-quente': {comp: TituloQuente, sfx: sfxTituloQuente, sons: sonsTituloQuente},
	'flash-foto': {comp: FlashFoto, sons: sonsFlashFoto},
	'match-cut': {comp: MatchCut, sons: sonsMatchCut},
	'match-cut-tipo': {comp: MatchCutTipo, sons: sonsMatchCutTipo},
	'manchete-falada': {comp: MancheteFalada, sfx: sfxMancheteFalada},
	// MIX · dados e papel
	'painel-tecnico': {comp: PainelTecnico, sfx: sfxPainelTecnico, sons: sonsPainelTecnico},
	'grafico-barras': {comp: GraficoBarras, sfx: sfxGraficoBarras, sons: sonsGraficoBarras},
	'grafico-linha': {comp: GraficoLinha, sfx: sfxGraficoLinha, sons: sonsGraficoLinha},
	contador: {comp: Contador, sfx: sfxContador, sons: sonsContador},
	diff: {comp: Diff, sfx: sfxDiff, sons: sonsDiff},
	'ficha-papel': {comp: FichaPapel, sfx: sfxFichaPapel, sons: sonsFichaPapel},
	// MIX · cards Apple
	'card-vidro': {comp: CardVidro, sfx: sfxCardVidro, sons: sonsCardVidro},
	'apresentacao-redes': {comp: Apresentacao, sfx: sfxApresentacao, sons: sonsApresentacao},
	'card-capitulo': {comp: CardCapitulo, sfx: sfxCapitulo, sons: sonsCapitulo},
	dicionario: {comp: Dicionario, sfx: sfxDicionario, sons: sonsDicionario},
	'encerramento-youtube': {comp: EncerramentoYoutube, sfx: sfxEncerramentoYoutube, sons: sonsEncerramentoYoutube},
	// MIX · 3D flash (objeto-3d usa WebGL: --gl=angle, já no modelos.json do MIX)
	'texto-3d': {comp: Texto3d, sfx: sfxTexto3d, sons: sonsTexto3d},
	'objeto-3d': {comp: Objeto3d, sons: sonsObjeto3d}, // sem sfx fixo: a entrada depende do modo e sai de sonsObjeto3d
	'piso-3d': {comp: Piso3d, sfx: sfxPiso3d, sons: sonsPiso3d},
	// MIX · colagem em papel (estilo da referência do usuário, 05/10)
	'colagem-papel': {comp: Colagem, sfx: sfxColagem, sons: sonsColagem},
	'colagem-titulo': {comp: ColagemTitulo, sons: sonsColagemTitulo},
};
