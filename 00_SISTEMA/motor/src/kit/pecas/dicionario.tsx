// Dicionário (YOUTUBE - MIX EDIT, peça `dicionario`): termo técnico (procrastinação, dopamina, mise en place) num card escuro,
// como um verbete: palavra-entrada em Instrument Serif NORMAL (FONTES.serifaReta) separada em sílabas, classe
// gramatical, pronúncia opcional e definições numeradas em Instrument Serif itálica. 90–150 q, 2–3 por vídeo.
// Lugar: sobre o rosto desfocado (escurecer ≥ 0,4) ou tela grade/escura, no centro. Com o rosto nítido, só na área
// livre da parede: x 0.8, y 0.32, largura 520, tamanho 80 (o card nunca cobre o rosto).
// Sequência (q a 30 fps): o card entra como o card-vidro (16 q: sobe 40 px, escala 0,96→1, blur 12→0); a palavra
// chega "fantasma" (creme a 30%) e as sílabas acendem no acento da esquerda para a direita (cada uma esquenta em 2 q,
// com brilho, e esfria para creme em 10 q, em onda: "digitação quente"); a sílaba tônica (opcional) ganha um traço
// no acento que fica; a linha fina se desenha em 16 q; as definições sobem por máscara de linha (15 q, 4 q entre
// elas, ou no tempo da fala; o card cresce para baixo quando uma chega). Reflexo diagonal 1×. Saída: blur 0→12 +
// escala 0,96 + fade em 8 q.
// Parâmetros:
//   palavra ('pro·cras·ti·na·ção': sílabas separadas por "·" (ou "|"), palavras por espaço; os "·" aparecem, discretos),
//   classe ('adjetivo', 'substantivo masculino'...), pronuncia (opcional, ex. '/pɾo.kɾas.tʃi.na.ˈsɐ̃w̃/'),
//   definicoes (strings, ou [{t (s desde o início da camada), texto}] no tempo da fala),
//   rotulo ('Dicionário'; '' = sem), tonica (índice da sílaba tônica, contando todas as sílabas a partir de 0; opcional),
//   silabasEm (s em que a 1ª sílaba acende: 0.5), ritmo (s entre sílabas: 0.13),
//   x (0.5), y (0.5: centro do card), ancora ('centro' | 'topo' | 'base'), largura (mínima, 880 px em 1080: o card
//   alarga até 86% do quadro para a palavra caber no corpo pedido; definições com no máximo 900 px por linha),
//   tamanho (corpo da palavra: 124; encolhe para caber; faixa do guia 110–130), tamanhoDef (34; faixa 30–36),
//   material ('escuro' padrão; 'solido' sobre tela grade/escura; 'claro' sobre imagem rica), vidro (0.62), cor, corTexto.
// Sons: entrada sfxDicionario (UI enter); sonsDicionario = tecla de digitação quando cada palavra começa a acender
// (1 por palavra) + pop suave em cada definição com `t` (≥ 8 q do som anterior).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS} from '../tempo';
import {FONTES} from '../fontes';
import {Abre, DESENHO, IconeLucide, Vidro, coresMix, entradaCard, filhoEntra, lerMaterial, num, prog, rgba, sombraTexto, txt, useFontesProntas} from './card-vidro';

export const sfxDicionario: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_10_ui-enter', 0.5];
const SOM_DEF = 'motionix/pop/pop_05_smooth-pop';
const SOM_SILABA = 'motionix/ui-sound-effects/ui-sound-effects_21_v4-type-delete-2'; // "digitação" do guia (1 por palavra)
const REF = 100;
const SEP = 0.05; // em de respiro de cada lado do "·"
const ESP = 0.06; // em a mais de cada lado do espaço entre palavras (separa mais que o "·")

type Token = {texto: string; tipo: 'silaba' | 'sep' | 'espaco'; indice: number};
const separar = (palavra: string): Token[] => {
	const out: Token[] = [];
	let n = 0;
	palavra
		.replace(/\s+/g, ' ')
		.trim()
		.split(' ')
		.forEach((w, i) => {
			if (i > 0) out.push({texto: ' ', tipo: 'espaco', indice: -1});
			w.split(/[·|]/)
				.filter(Boolean)
				.forEach((s, j) => {
					if (j > 0) out.push({texto: '·', tipo: 'sep', indice: -1});
					out.push({texto: s, tipo: 'silaba', indice: n++});
				});
		});
	return out;
};

type Def = {t?: number; texto: string};
const lerDefs = (v: unknown): Def[] =>
	(Array.isArray(v) ? v : typeof v === 'string' ? [v] : [])
		.map((d): Def => (typeof d === 'string' ? {texto: d} : {t: typeof d?.t === 'number' ? d.t : undefined, texto: txt(d?.texto, '')}))
		.map((d) => ({...d, texto: d.texto.replace(/\s+/g, ' ').trim()}))
		.filter((d) => d.texto);

// início de cada definição (q a 30 fps)
const planoDefs = (c: Camada) => {
	let ordem = 0;
	return lerDefs(c.definicoes).map((d) => (d.t !== undefined ? Math.max(6, d.t * 30) : 18 + 4 * ordem++));
};

// Sons dos eventos (q a 30 fps desde o início da camada): "digitação quente" = 1 som por palavra, quando a 1ª sílaba
// dela acende (não por sílaba); pop suave em cada definição com `t`. Nunca 2 a menos de 8 q (o 1º conta da entrada).
export const sonsDicionario = (c: Camada): Som[] => {
	const s0 = num(c.silabasEm, 0.5);
	const ritmo = num(c.ritmo, 0.13);
	const eventos: Som[] = [];
	separar(txt(c.palavra, 'pro·cras·ti·na·ção')).forEach((tk, i, todos) => {
		if (tk.tipo === 'silaba' && (i === 0 || todos[i - 1].tipo === 'espaco')) eventos.push({t: s0 + tk.indice * ritmo, som: SOM_SILABA, vol: 0.35});
	});
	const inicios = planoDefs(c);
	lerDefs(c.definicoes).forEach((d, i) => d.t !== undefined && eventos.push({t: inicios[i] / 30, som: SOM_DEF, vol: 0.5}));
	const out: Som[] = [];
	let ultimo = 0; // o som de entrada toca em 0
	eventos
		.sort((a, b) => a.t - b.t)
		.forEach((e) => {
			if ((e.t - ultimo) * 30 < 8) return;
			out.push(e);
			ultimo = e.t;
		});
	return out;
};

export const Dicionario: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k = fps / 30;
	const q = (n: number) => n * k;
	const cor = coresMix(est);
	const acento = txt(c.cor, cor.acento);
	const creme = txt(c.corTexto, cor.creme);
	const material = lerMaterial(c.material);
	const reta = FONTES.serifaReta;
	const serifa = FONTES.serifa;
	const fb = FONTES.base;
	const palavra = txt(c.palavra, 'pro·cras·ti·na·ção');
	const tokens = useMemo(() => separar(palavra), [palavra]);
	const textoPlano = tokens.map((t) => t.texto).join('');

	const pronto = useFontesProntas([`400 ${REF}px "${reta.family}"`], 'dicionario: fonte');
	const nSep = tokens.filter((t) => t.tipo === 'sep').length;
	const nEsp = tokens.filter((t) => t.tipo === 'espaco').length;
	// largura da palavra por px de corpo (os "·" ganham SEP em de respiro de cada lado)
	const larguraRef = useMemo(() => (pronto ? measureText({text: textoPlano, fontFamily: reta.family, fontWeight: String(reta.weight), fontSize: REF, letterSpacing: reta.tracking}).width / REF + 2 * SEP * nSep + 2 * ESP * nEsp : 0), [pronto, textoPlano, nSep, nEsp, reta.family, reta.weight, reta.tracking]);
	if (!pronto) return null;

	const pad = 52 * u;
	const tamPedido = num(c.tamanho, 124) * u;
	// o card alarga (até 86% da largura do quadro) para a palavra caber no corpo pedido; se ainda faltar, a palavra encolhe
	const largura = Math.max(num(c.largura, 880) * u, Math.min(0.86 * W, larguraRef * 1.02 * tamPedido + 2 * pad));
	const util = largura - 2 * pad;
	const tamPalavra = Math.min(tamPedido, larguraRef > 0 ? util / (larguraRef * 1.02) : Infinity);
	const tamDef = num(c.tamanhoDef, 34) * u;
	const anim = entradaCard(frame, fps, dur, {u, deriva: 0.01});
	const reflexo = prog(frame, q(8), q(26), CURVAS.suave);
	const sombra = sombraTexto(material, u);
	const cx = Math.min(Math.max(num(c.x, 0.5) * W, 0.05 * W + largura / 2), 0.95 * W - largura / 2);
	const ancora = txt(c.ancora, 'centro');
	const ty = ancora === 'topo' ? 0 : ancora === 'base' ? -100 : -50;

	// sílabas: fantasma → acento (2 q, com brilho) → creme (10 q), em onda da esquerda para a direita
	const s0 = num(c.silabasEm, 0.5) * fps;
	const ritmo = num(c.ritmo, 0.13) * fps;
	const tonica = typeof c.tonica === 'number' ? c.tonica : -1;
	const nSil = tokens.filter((t) => t.tipo === 'silaba').length;
	const fimSilabas = s0 + (nSil - 1) * ritmo + q(12);
	const ePalavra = prog(frame, q(6), q(18));
	const corFantasma = rgba(creme, 0.3);

	const rotulo = txt(c.rotulo, 'Dicionário').toUpperCase();
	const classe = txt(c.classe, '');
	const pronuncia = txt(c.pronuncia, '');
	const defs = lerDefs(c.definicoes);
	const inicios = planoDefs(c);
	const pLinha = prog(frame, q(14), q(30), DESENHO);

	// conteúdo num quadro (o fantasma usa o estado final, com todas as definições abertas: o card cresce para baixo)
	const montar = (frame: number) => (
		<>
			{rotulo && (
				<div style={{display: 'flex', alignItems: 'center', gap: 12 * u, marginBottom: 18 * u, ...filhoEntra(frame, q(4), fps, u, 10)}}>
					<IconeLucide nome="book-open" tamanho={26 * u} cor={rgba(creme, 0.55)} traco={1.6} desenho={prog(frame, q(4), q(20), DESENHO)} />
					<span style={{fontFamily: fb.family, fontWeight: 600, fontSize: 20 * u, letterSpacing: '0.18em', color: rgba(creme, 0.55)}}>{rotulo}</span>
				</div>
			)}
			{/* palavra-entrada */}
			<div style={{fontFamily: reta.family, fontWeight: 400, fontStyle: 'normal', fontSize: tamPalavra, lineHeight: 1.02, letterSpacing: reta.tracking, whiteSpace: 'pre', opacity: ePalavra, filter: ePalavra < 0.995 ? `blur(${(1 - ePalavra) * 10 * u}px)` : undefined, transform: `translateY(${(1 - ePalavra) * 14 * u}px)`}}>
				{tokens.map((tk, i) => {
					if (tk.tipo !== 'silaba') return <span key={i} style={tk.tipo === 'sep' ? {color: rgba(creme, 0.5), margin: `0 ${SEP}em`} : {margin: `0 ${ESP}em`}}>{tk.texto}</span>;
					const L = s0 + tk.indice * ritmo;
					const quente = prog(frame, L, L + q(2), CURVAS.linear);
					const frio = prog(frame, L + q(2), L + q(12), CURVAS.suave);
					const corSil = frio > 0 ? interpolateColors(frio, [0, 1], [acento, creme]) : interpolateColors(quente, [0, 1], [corFantasma, acento]);
					const calor = quente * (1 - frio);
					const traco = tk.indice === tonica ? prog(frame, fimSilabas, fimSilabas + q(8)) : 0;
					return (
						<span key={i} style={{position: 'relative', color: corSil, textShadow: calor > 0.01 ? `0 0 ${18 * u}px ${rgba(acento, 0.6 * calor)}, 0 0 ${44 * u}px ${rgba(acento, 0.28 * calor)}` : sombra}}>
							{tk.texto}
							{traco > 0 && <span style={{position: 'absolute', left: '6%', right: '6%', bottom: '0.02em', height: 4 * u, borderRadius: 2 * u, background: acento, transform: `scaleX(${traco})`, transformOrigin: '0 50%', boxShadow: `0 0 ${10 * u}px ${rgba(acento, 0.5)}`}} />}
						</span>
					);
				})}
			</div>
			{/* classe gramatical e pronúncia */}
			{(classe || pronuncia) && (
				<div style={{display: 'flex', alignItems: 'baseline', gap: 16 * u, marginTop: 12 * u, ...filhoEntra(frame, q(10), fps, u, 10)}}>
					{classe && <span style={{fontFamily: serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: 36 * u, color: rgba(creme, 0.66), textShadow: sombra}}>{classe}</span>}
					{classe && pronuncia && <span style={{fontFamily: fb.family, fontSize: 24 * u, color: rgba(creme, 0.35)}}>·</span>}
					{pronuncia && <span style={{fontFamily: fb.family, fontWeight: 500, fontSize: 26 * u, letterSpacing: '0.02em', color: rgba(creme, 0.5)}}>{pronuncia}</span>}
				</div>
			)}
			{/* linha fina */}
			{defs.length > 0 && <div style={{height: Math.max(1, 1.5 * u), marginTop: 28 * u, marginBottom: 28 * u, background: rgba(creme, 0.16), transform: `scaleX(${pLinha})`, transformOrigin: '0 50%'}} />}
			{/* definições numeradas */}
			<div style={{maxWidth: 900 * u}}>
				{defs.map((d, i) => {
					const a = q(inicios[i]);
					const e = prog(frame, a, a + q(15));
					return (
						<Abre key={i} abre={prog(frame, a - q(5), a + q(7))} espaco={i > 0 ? 18 * u : 0}>
							<div style={{display: 'flex', alignItems: 'baseline', gap: 20 * u}}>
								<span style={{flex: 'none', width: 30 * u, fontFamily: fb.family, fontWeight: 600, fontSize: 24 * u, fontVariantNumeric: 'tabular-nums', color: rgba(creme, 0.5), opacity: e}}>{i + 1}</span>
								<div style={{overflow: 'hidden', paddingBottom: 0.2 * tamDef, marginBottom: -0.2 * tamDef}}>
									<div style={{fontFamily: serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: tamDef, lineHeight: 1.45, letterSpacing: '-0.005em', color: rgba(creme, 0.9), textShadow: sombra, textWrap: 'pretty', opacity: e, transform: `translateY(${(1 - e) * 60}%)`}}>{d.texto}</div>
								</div>
							</div>
						</Abre>
					);
				})}
			</div>
		</>
	);
	const ultimo = Math.max(30, ...inicios);

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<Vidro
				material={material}
				tinta={num(c.vidro, 0.62)}
				caixa={{left: cx - largura / 2, top: num(c.y, 0.5) * H, width: largura, transform: `translateY(${ty}%)`}}
				cartao={{transform: `translateY(${anim.dy}px) scale(${anim.escala})`, transformOrigin: '50% 30%'}}
				fantasma={montar(q(ultimo + 60))}
				raio={34 * u}
				aparece={anim.vis}
				conteudo={anim.vis}
				blur={anim.blur}
				reflexo={reflexo}
				padding={`${44 * u}px ${pad}px ${50 * u}px`}
				u={u}
				creme={creme}
			>
				{montar(frame)}
			</Vidro>
		</AbsoluteFill>
	);
};
