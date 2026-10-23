// Motor de camadas dos formatos INSTAGRAM - EDIÇÃO CUT DINÂMICO (9:16) e YOUTUBE - MIX EDIT (16:9).
// Pilha, de baixo para cima: cenas (fala/broll/tela) → camadas "atrás" → pessoa recortada → camadas "frente"
// → flash dos golpes → vinheta e grão → legenda (cinética no CUT). Áudio: voz por trecho da montagem, trilha(s) com ducking, SFX.
// O INSTAGRAM - TELA DIVIDIDA não passa por aqui: usa a composição Edicao, que está congelada.
// Recursos do MIX (todos opt-in: só agem quando o campo existe na cena/edição ou no estilo, então o CUT aprovado não muda):
// chaves, enquadramento, golpes, câmera nas telas (+ camadas com camera: true), transições chicote/mergulho/esticao,
// flash por estilo, grade nova, música em lista, microfade da voz e ganho de SFX do estilo. Formato dos campos: src/tipos.ts.
// Prop interna _soAudio (passe de áudio do render por partes): monta só voz, trilhas e SFX.
import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {zoomBlur} from '@remotion/effects/zoom-blur';
import {chromaticAberration} from '@remotion/effects/chromatic-aberration';
import MODELOS from '../modelos.json';
import {montarBlocos} from '../legendas';
import type {CenaCamadas, ChaveCena, Curva, EdicaoCamadas, FaixaMusica, Golpe, Palavra, Sfx} from '../tipos';
import {CURVAS, clamp} from '../kit/tempo';
import {FONTES} from '../kit/fontes';
import {Grao} from '../kit/Grao';
import {ESTILOS, type Estilo} from './estilos';
import {CAMADAS} from './camadas';
import {LegendaCamadas} from './LegendaCamadas';
import {BlocoCineticoView, montarBlocosCineticos} from './LegendaCinetica';

// _palavras: preenchido pelo calculateMetadata. _soAudio: passe de áudio do render por partes (scripts/lib/partes.mjs):
// só voz, trilha(s) e SFX, sem nenhuma camada visual (o áudio sai idêntico e o passe fica bem mais barato).
export type CamadasProps = EdicaoCamadas & {_palavras?: Palavra[]; _soAudio?: boolean};
type Trans = NonNullable<CenaCamadas['transicao']>;
type TransMix = 'chicote' | 'mergulho' | 'esticao';

const FOCO_PADRAO: [number, number] = [0.5, 0.4];
const LENTE_PX = 26; // pico do desfoque da transição lente (px em 1080)
// flash: [quadros no pico, quadros de decaimento] do estilo (MIX: 2 + 6 a 70%); sem o campo, 8 q a 100% (CUT)
const flashQ = (est: Estilo) => (est.trans.flash ? est.trans.flash[0] + est.trans.flash[1] : 8);
// quadros de uma cena. MIX (quadrosExatos): [round(ini), round(fim)), colada na seguinte. CUT: a conta de sempre, que às
// vezes deixa 1 quadro de sobra ou de buraco (preto) entre duas cenas quando os tempos não caem no grid de quadros
const quadrosCena = (c: CenaCamadas, est: Estilo, fps: number) => (est.quadrosExatos ? Math.round(c.fim * fps) - Math.round(c.ini * fps) : Math.round((c.fim - c.ini) * fps));
// sobreposição (quadros do formato) em que a cena que entra fica por cima da anterior; lente e silhueta são cortes secos
const cauda = (tipo: Trans | undefined, est: Estilo, fps: number) => Math.round(((tipo === 'flash' ? flashQ(est) : tipo === 'blur' ? 9 : tipo === 'zoom' ? est.trans.zoom : 0) * fps) / 30);
// [som, volume, atraso em s em relação ao início da cena]; whooshes alinhados pelo pico (medido no RMS) com o corte
const SOM_TRANS: Partial<Record<Trans, [string, number, number]>> = {
	flash: ['motionix/camera-shutters/camera-shutters_03_smooth-cammera-shutter', 0.45, -0.04],
	blur: ['motionix/whooshes/whooshes_16_smooth-and-fast-whoosh', 0.35, -0.25],
	zoom: ['motionix/whooshes/whooshes_20_epic-fast-whoosh-345469', 0.45, -0.1],
	lente: ['motionix/whooshes/whooshes_14_simple-whoosh', 0.2, -0.06], // só em 1 de cada 3 lentes (MIX: vol em est.volTrans)
	silhueta: ['motionix/camera-shutters/camera-shutters_02_little-bit-hard-cammera-shutter', 0.5, 0],
	chicote: ['motionix/whooshes/whooshes_16_smooth-and-fast-whoosh', 0.5, -0.62], // pico em 0,675 s
	mergulho: ['motionix/whooshes/whooshes_03_cinematic-fast-whoosh', 0.5, -0.5], // pico em 0,5 s (MIX: vol em est.volTrans)
	esticao: ['motionix/whooshes/whooshes_08_fast-whoosh', 0.4, -0.55], // pico em 0,575 s (MIX: vol em est.volTrans)
};
// Transições do MIX: [quadros de saída da cena anterior (antes do corte), quadros de entrada da nova], a 30 fps
const TRANS_MIX: Record<TransMix, [number, number]> = {chicote: [3, 4], mergulho: [11, 10], esticao: [3, 3]};
const CHICOTE = {desloc: 0.45, blur: 36}; // deslocamento máximo (fração de W) e desvio do blur direcional (px em 1080)
const ESTICAO = {escala: 3, blur: 24};
const MERGULHO = {escala: 6, blur: 6};
// Golpe (3D flash): whoosh com o pico no golpe + sub-impacto
const SOM_GOLPE: [string, number, number][] = [
	['motionix/whooshes/whooshes_20_epic-fast-whoosh-345469', 0.6, -0.22],
	['impact_sub', 0.5, -0.02],
];
const SILHUETA_Q = [2, 3]; // quadros a 24 fps: vermelha, depois branca com brilho (ref496 0,000–0,200)
const COR_SILHUETA = '#9D0A00';
const isVideo = (p?: string) => !!p && /\.(mp4|mov|webm|m4v)$/i.test(p);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ---------- Montagem: trechos do bruto e pausas inseridas, na ordem da saída ----------

type Seg = {ini: number; fim: number; bruto: number | null}; // tempos da saída; bruto = início no bruto (null = pausa)

export const montarSegs = (e: Pick<EdicaoCamadas, 'montagem' | 'duracao'>, fps: number): Seg[] => {
	const q = (s: number) => Math.round(s * fps) / fps; // cortes no grid de quadros: voz, vídeo e recorte casam exatos
	if (!e.montagem?.length) return [{ini: 0, fim: e.duracao, bruto: 0}];
	let t = 0;
	return e.montagem.map((m) => {
		const d = 'pausa' in m ? q(m.pausa) : q(m.fim) - q(m.ini);
		const s = {ini: t, fim: t + d, bruto: 'pausa' in m ? null : q(m.ini)};
		t += d;
		return s;
	});
};

const paraSaida = (tb: number, segs: Seg[]) => {
	for (const s of segs) if (s.bruto != null && tb >= s.bruto - 1e-6 && tb < s.bruto + (s.fim - s.ini) - 1e-6) return s.ini + (tb - s.bruto);
	return null;
};

// dois trechos seguidos que também são seguidos no bruto (a voz não tem emenda entre eles)
const colados = (a?: Seg, b?: Seg) => !!a && !!b && a.bruto != null && b.bruto != null && Math.abs(a.bruto + (a.fim - a.ini) - b.bruto) < 1e-6;

// Microfade da voz por quadro (o <Audio> aplica 1 volume por quadro): média da rampa linear de `m` s dentro do quadro.
// A 30 fps e m = 0,04 s: ≈ 0,42 no 1º e no último quadro do trecho, 1 no resto.
const microfade = (n: number, fps: number, m: number, entra: boolean, sai: boolean) => (f: number) => {
	const T = n / fps;
	let soma = 0;
	for (let k = 0; k < 8; k++) {
		const tau = (f + (k + 0.5) / 8) / fps;
		soma += clamp01(Math.min(1, entra ? tau / m : 1, sai ? (T - tau) / m : 1));
	}
	return soma / 8;
};

export const calcularCamadas: CalculateMetadataFunction<CamadasProps> = async ({props}) => {
	const m = MODELOS.modelos[props.modelo];
	const palavras: Palavra[] = await fetch(staticFile(props.palavras)).then((r) => r.json());
	const segs = montarSegs(props, m.fps);
	return {durationInFrames: Math.max(1, Math.ceil(segs[segs.length - 1].fim * m.fps)), fps: m.fps, width: m.largura, height: m.altura, props: {...props, _palavras: palavras}};
};

// Zoom padrão alternando entrada/saída entre cenas 'fala' vizinhas (a câmera nunca para e nunca repete o sentido).
// Com `enquadramento` (e predefinições no estilo): zoom e foco da tabela, no mesmo rodízio de sentido; zoom/foco da cena mandam.
const resolverCenas = (cenas: CenaCamadas[], est: Estilo): CenaCamadas[] => {
	let k = 0;
	return cenas.map((c) => {
		if (c.layout !== 'fala') return c;
		const sentido = k++ % 2;
		const pre = c.enquadramento ? est.enquadramentos?.[c.enquadramento] : undefined;
		if (pre) return {...c, zoom: c.zoom ?? (sentido ? [pre.zoom[1], pre.zoom[0]] : [pre.zoom[0], pre.zoom[1]]), foco: c.foco ?? pre.foco};
		return c.zoom ? c : {...c, zoom: sentido ? [est.zoom[1], est.zoom[0]] : [est.zoom[0], est.zoom[1]]};
	});
};

// ---------- Câmera ----------

// Caixa "cover" do bruto no quadro, com o foco o mais centralizado possível.
const geoCover = (W: number, H: number, aspecto: number, foco: [number, number]) => {
	const largo = W / H > aspecto;
	const w = largo ? W : H * aspecto;
	const h = largo ? W / aspecto : H;
	return {w, h, left: Math.min(0, Math.max(W - w, W / 2 - w * foco[0])), top: Math.min(0, Math.max(H - h, H / 2 - h * foco[1]))};
};

type Par = [number, number];
const misturar = <T extends number | Par>(a: T, b: T, e: number): T =>
	(typeof a === 'number' ? a + ((b as number) - a) * e : [a[0] + ((b as Par)[0] - a[0]) * e, a[1] + ((b as Par)[1] - a[1]) * e]) as T;

// Valor de um campo animado por chaves em s (s desde o início da cena), ou null se nenhuma chave define o campo.
// Segmento a segmento: a curva da chave de chegada (ou a da cena) dá o easing. Antes da 1ª chave do campo ele fica no
// valor-base até a chave anterior de QUALQUER campo (ex.: [{t: 2, desfoque: 0}, {t: 2.35, desfoque: 24, escurecer: 0.45}]
// escurece junto com o desfoque, entre 2 e 2,35 s, e não desde o início da cena).
function animar<T extends number | Par>(chaves: ChaveCena[], campo: 'zoom' | 'desfoque' | 'escurecer' | 'foco', s: number, base: T, curva: Curva): T | null {
	const pts = chaves
		.filter((k) => k[campo] !== undefined)
		.map((k) => ({t: k.t, v: k[campo] as T, curva: k.curva ?? curva}))
		.sort((a, b) => a.t - b.t);
	if (!pts.length) return null;
	if (pts[0].t > 0) pts.unshift({t: Math.max(0, ...chaves.map((k) => k.t).filter((t) => t < pts[0].t)), v: base, curva});
	if (s <= pts[0].t) return pts[0].v;
	for (let i = 1; i < pts.length; i++) if (s < pts[i].t) return misturar(pts[i - 1].v, pts[i].v, CURVAS[pts[i].curva]((s - pts[i - 1].t) / (pts[i].t - pts[i - 1].t)));
	return pts[pts.length - 1].v;
}

// Estado dos golpes no instante t (s da saída), ou null fora deles. q = quadros a 30 fps desde o golpe (início no grid).
// punch: 1 → punch em 4 q (entrada) e volta no resto (suave); flash: 2 q no pico + 2 q caindo;
// zoom-blur 60 px → 0 em 6 q e aberração 12 px → 0 em 4 q, caindo em curva suave (aparecem depois que o flash some).
type EstadoGolpe = {punch: number; flash: number; blur: number; aberracao: number};
const golpeEm = (golpes: Golpe[], t: number, fps: number): EstadoGolpe | null => {
	let r: EstadoGolpe | null = null;
	for (const g of golpes) {
		const dur = g.dur ?? 12;
		const q0 = (t - Math.round(g.t * fps) / fps) * 30 + 1e-6; // + 1e-6: 79/30 − 77/30 dava 1,9999 q
		if (q0 < -0.5 || q0 >= dur) continue;
		const q = Math.max(0, q0);
		r ??= {punch: 1, flash: 0, blur: 0, aberracao: 0};
		const subida = Math.min(4, dur / 2);
		const pp = q < subida ? CURVAS.entrada(q / subida) : 1 - CURVAS.suave((q - subida) / (dur - subida));
		r.punch *= 1 + ((g.punch ?? 1.1) - 1) * pp;
		r.flash = Math.max(r.flash, (g.flash ?? 0.7) * (q < 2 ? 1 : clamp01(1 - (q - 1) / 3) ** 2));
		const ef = g.efeito ?? 'zoomBlur';
		if (ef === 'zoomBlur') r.blur = Math.max(r.blur, 60 * (1 - CURVAS.suave(clamp01(q / 6))));
		if (ef === 'aberracao') r.aberracao = Math.max(r.aberracao, 12 * (1 - CURVAS.suave(clamp01(q / 4))));
	}
	return r;
};

// Efeitos WebGL (@remotion/effects, precisam de --gl=angle) do golpe no <Video> (@remotion/media); centro em UV do vídeo.
const efeitosGolpe = (g: EstadoGolpe | null, centro: Par) => {
	if (!g) return undefined;
	const fx = [];
	if (g.blur > 0.5) fx.push(zoomBlur({amount: g.blur, center: centro}));
	if (g.aberracao > 0.3) fx.push(chromaticAberration({amount: g.aberracao}));
	return fx.length ? fx : undefined;
};

// Valores de câmera de uma cena em t (s da saída): base da cena + chaves + golpes.
// Sem chaves e sem golpes a conta é exatamente a de antes (o CUT aprovado só passa por esse caminho).
const camCena = (c: CenaCamadas | undefined, t: number, est: Estilo, focoPadrao: Par, fps: number) => {
	const [z0, z1] = c?.zoom ?? (c?.layout === 'fala' ? est.zoom : [1, 1]);
	const p = c ? interpolate(t, [c.ini, c.fim], [0, 1], clamp) : 0;
	const curva = c?.curva ?? est.curva;
	const foco0 = c?.foco ?? focoPadrao;
	const ch = c?.chaves?.length ? c.chaves : null;
	const s = c ? t - c.ini : 0;
	return {
		zoom: (ch && animar(ch, 'zoom', s, z0, curva)) ?? z0 + (z1 - z0) * CURVAS[curva](p),
		foco: (ch && animar(ch, 'foco', s, foco0, curva)) ?? foco0,
		desfoque: (ch && animar(ch, 'desfoque', s, c?.desfoque ?? 0, curva)) ?? c?.desfoque ?? 0,
		escurecer: (ch && animar(ch, 'escurecer', s, c?.escurecer ?? 0, curva)) ?? c?.escurecer ?? 0,
		golpe: c?.golpes?.length ? golpeEm(c.golpes, t, fps) : null,
	};
};

// Enquadramento da pessoa numa cena no tempo t (s da saída). Pessoa e recorte usam a MESMA conta, então casam.
const enquadrar = (c: CenaCamadas | undefined, t: number, props: CamadasProps, est: Estilo, W: number, H: number, fps: number) => {
	const v = camCena(c, t, est, props.foco ?? FOCO_PADRAO, fps);
	const escala = v.zoom * (v.desfoque ? 1 + (2.5 * v.desfoque) / Math.min(W, H) : 1) * (v.golpe ? v.golpe.punch : 1);
	const g = geoCover(W, H, props.aspectoBruto ?? 9 / 16, v.foco);
	return {
		quadro: {position: 'absolute', inset: 0, transform: `scale(${escala})`, transformOrigin: `${g.left + g.w * v.foco[0]}px ${g.top + g.h * v.foco[1]}px`} as React.CSSProperties,
		midia: {position: 'absolute', left: g.left, top: g.top, width: g.w, height: g.h} as React.CSSProperties,
		focoPx: [g.left + g.w * v.foco[0], g.top + g.h * v.foco[1]] as [number, number],
		foco: v.foco,
		desfoque: v.desfoque,
		escurecer: v.escurecer,
		golpe: v.golpe,
	};
};

// Câmera virtual de uma cena 'tela' (zoom, foco = ponto do quadro, chaves, punch dos golpes).
// Vale para o fundo da tela e para as camadas com camera: true (mesma conta → andam juntos).
const temCamera = (c: CenaCamadas) => c.layout === 'tela' && !!(c.zoom || c.foco || c.chaves?.length || c.golpes?.length);
const cameraTela = (c: CenaCamadas, t: number, est: Estilo, W: number, H: number, fps: number) => {
	const v = camCena(c, t, est, [0.5, 0.5], fps);
	const escala = v.zoom * (v.golpe ? v.golpe.punch : 1);
	return {estilo: {position: 'absolute', inset: 0, transform: `scale(${escala})`, transformOrigin: `${v.foco[0] * W}px ${v.foco[1] * H}px`} as React.CSSProperties, v};
};

// Quadro (a 24 fps) dentro da silhueta de abertura de uma cena, ou -1 fora dela.
const quadroSilhueta = (c: CenaCamadas | undefined, t: number) => {
	if (c?.transicao !== 'silhueta') return -1;
	const q = Math.floor((t - c.ini) * 24 + 1e-6);
	return q >= 0 && q < SILHUETA_Q[0] + SILHUETA_Q[1] ? q : -1;
};

const filtroCena = (c: CenaCamadas, base: string) => `${base}${c.pb ? ' grayscale(1) contrast(1.12) brightness(0.88)' : ''}`;

// ---------- Cenas ----------

const Pessoa: React.FC<{cena: CenaCamadas; segs: Seg[]; props: CamadasProps; est: Estilo; filtro: string}> = ({cena, segs, props, est, filtro}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const t = cena.ini + frame / fps;
	const e = enquadrar(cena, t, props, est, W, H, fps);
	const sil = quadroSilhueta(cena, t) >= 0;
	const f = `${filtroCena(cena, filtro)}${e.desfoque ? ` blur(${e.desfoque}px)` : ''}${sil ? ' brightness(1.6) blur(6px)' : ''}`;
	const efeitos = efeitosGolpe(e.golpe, e.foco); // só existe em cena com golpes (MIX)
	// trechos do bruto que caem nesta cena (inclui a cauda da transição seguinte)
	const partes = segs.filter((g) => g.bruto != null && g.fim > cena.ini && g.ini < cena.fim + 1);
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<div style={e.quadro}>
				{partes.map((g, i) => {
					const de = Math.max(g.ini, cena.ini);
					return (
						<Sequence key={i} from={Math.round((de - cena.ini) * fps)} durationInFrames={Math.max(1, Math.round((g.fim - de) * fps))}>
							{/* @remotion/media (decodifica no navegador): o OffthreadVideo falhava às vezes com "No frame found" */}
							<Video src={staticFile(props.bruto)} trimBefore={Math.round((g.bruto! + de - g.ini) * fps)} muted objectFit="fill" style={{...e.midia, filter: f}} {...(efeitos ? {effects: efeitos} : {})} />
						</Sequence>
					);
				})}
			</div>
			{e.escurecer > 0 && <AbsoluteFill style={{background: '#000', opacity: e.escurecer}} />}
			{cena.reticula && <Reticula />}
		</AbsoluteFill>
	);
};

const Reticula: React.FC = () => {
	const {width: W} = useVideoConfig();
	const passo = (W / 1080) * 9.5;
	return <AbsoluteFill style={{backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.55) 32%, transparent 36%)`, backgroundSize: `${passo}px ${passo}px`, transform: 'rotate(45deg) scale(1.5)', mixBlendMode: 'multiply', opacity: 0.35}} />;
};

const Broll: React.FC<{cena: CenaCamadas; filtro: string}> = ({cena, filtro}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const t = Math.min(1, frame / Math.max(1, (cena.fim - cena.ini) * fps));
	const amp = isVideo(cena.broll) ? 0.06 : 0.12; // fotos se movem mais que vídeos (guia: 5–10% e 10–15%)
	const m = cena.movimento ?? 'in';
	const s = m === 'out' ? 1 + amp - amp * t : 1 + amp * t;
	const dx = m === 'esq' ? -3 * t : m === 'dir' ? 3 * t : 0;
	// golpe (MIX): punch na escala; zoom-blur/aberração pelos efeitos WebGL (@remotion/effects), no vídeo e na foto.
	// A foto com efeitos vira <canvas> só durante o golpe (fora dele continua <img>), com largura/altura numéricas para o
	// "cover" ser feito no tamanho do quadro (sem elas o canvas teria o tamanho da foto e o CSS esticaria a imagem).
	const g = cena.golpes?.length ? golpeEm(cena.golpes, cena.ini + frame / fps, fps) : null;
	const efeitos = efeitosGolpe(g, [0.5, 0.5]);
	const style: React.CSSProperties = {width: '100%', height: '100%', transform: `scale(${g ? s * g.punch : s}) translateX(${dx}%)`, filter: filtroCena(cena, filtro)};
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			{isVideo(cena.broll) ? (
				<Video src={staticFile(cena.broll!)} trimBefore={Math.round((cena.brollIni ?? 0) * fps)} muted objectFit="cover" style={style} {...(efeitos ? {effects: efeitos} : {})} />
			) : cena.broll ? (
				<Img src={staticFile(cena.broll)} style={{...style, objectFit: 'cover'}} {...(efeitos ? {effects: efeitos, width: W, height: H} : {})} />
			) : null}
			{cena.reticula && <Reticula />}
		</AbsoluteFill>
	);
};

const Tela: React.FC<{fundo: string; est: Estilo}> = ({fundo, est}) => {
	const {width: W, height: H} = useVideoConfig();
	if (fundo === 'grade' && est.grade) {
		// grade do MIX: fundo técnico azulado, linhas finas passando pelo centro do quadro (960, 540), luz de topo opcional
		const u = Math.min(W, H) / 1080;
		const passo = est.grade.passo * u;
		const esp = (est.grade.espessura ?? 1.5) * u;
		const linha = (dir: string) => `linear-gradient(${dir}, ${est.grade!.cor} ${esp}px, transparent ${esp}px)`;
		return (
			<AbsoluteFill style={{background: est.fundoEscuro ?? '#0D0E13'}}>
				<AbsoluteFill style={{backgroundImage: `${linha('180deg')}, ${linha('90deg')}`, backgroundSize: `${passo}px ${passo}px`, backgroundPosition: `${((W / 2) % passo) - esp / 2}px ${((H / 2) % passo) - esp / 2}px`}} />
				{(est.grade.luz ?? 0) > 0 && <AbsoluteFill style={{background: `radial-gradient(60% 50% at 50% -10%, rgba(255,255,255,${est.grade.luz}) 0%, transparent 100%)`}} />}
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, #00000080 100%)'}} />
			</AbsoluteFill>
		);
	}
	if (fundo === 'escuro' && est.fundoEscuro) return <AbsoluteFill style={{background: `radial-gradient(ellipse at center, #171922 0%, ${est.fundoEscuro} 70%, #08090C 100%)`}} />;
	const passo = Math.round((Math.min(W, H) / 1080) * 80);
	if (fundo === 'grade') {
		return (
			<AbsoluteFill style={{background: '#0b0b0c'}}>
				<AbsoluteFill style={{backgroundImage: 'linear-gradient(#ffffff17 1px, transparent 1px), linear-gradient(90deg, #ffffff17 1px, transparent 1px)', backgroundSize: `${passo}px ${passo}px`, backgroundPosition: `${(W % passo) / 2}px ${(H % passo) / 2}px`}} />
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, #000000b3 100%)'}} />
			</AbsoluteFill>
		);
	}
	return <AbsoluteFill style={{background: fundo === 'escuro' ? 'radial-gradient(ellipse at center, #161616 0%, #050505 100%)' : fundo}} />;
};

// Cena 'tela'. Sem zoom/foco/chaves/golpes é só o fundo (como sempre); com eles, ganha a câmera virtual.
const TelaCena: React.FC<{cena: CenaCamadas; est: Estilo}> = ({cena, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const fundo = <Tela fundo={cena.fundo ?? est.fundoTela} est={est} />;
	if (!temCamera(cena)) return fundo;
	const {estilo, v} = cameraTela(cena, cena.ini + frame / fps, est, W, H, fps);
	const blur = v.desfoque + (v.golpe ? v.golpe.blur / 10 : 0); // DOM não aceita os efeitos WebGL: zoom-blur vira blur CSS leve
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<AbsoluteFill style={{...estilo, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined}}>{fundo}</AbsoluteFill>
			{v.escurecer > 0 && <AbsoluteFill style={{background: '#000', opacity: v.escurecer}} />}
		</AbsoluteFill>
	);
};

// Camada presa à câmera da cena ativa (camera: true), quadro a quadro, como se estivesse "no mundo" da cena:
// - tela com câmera: mesma transformação do fundo (zoom, foco, chaves, punch) e o mesmo blur (desfoque + golpe);
// - fala: o enquadramento da pessoa (zoom, foco, chaves, punch), para texto "pintado" na parede ou atrás da pessoa
//   acompanhar o zoom; ganha o desfoque da cena (o zoom-blur do golpe vira blur CSS leve);
// - transições: sai junto com a cena (chicote, mergulho, esticão, lente) e entra junto com ela (as mesmas + blur e zoom).
// Card que deve ficar nítido sobre o rosto desfocado NÃO leva camera: true. Durante filtro/blur de transição, o vidro
// (backdrop-filter) de uma peça presa à câmera não enxerga o fundo; vale só para os poucos quadros da transição.
const CameraCamada: React.FC<{ini: number; cenas: CenaCamadas[]; props: CamadasProps; est: Estilo; id: string; children: React.ReactNode}> = ({ini, cenas, props, est, id, children}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const F = Math.round(ini * fps) + frame; // quadro global
	const i = cenas.findIndex((x) => F >= Math.round(x.ini * fps) && F < Math.round(x.fim * fps));
	const c = i >= 0 ? cenas[i] : undefined;
	const prox = i >= 0 ? cenas[i + 1] : undefined;
	let cam: React.CSSProperties = {};
	let blur = 0;
	let entra: MovCamada = {};
	let sai: MovCamada = {};
	if (c) {
		const fr = F - Math.round(c.ini * fps); // o mesmo t que a cena usa (início da Sequence da cena + quadro): não escorrega
		const t = c.ini + fr / fps;
		if (temCamera(c)) {
			const {estilo, v} = cameraTela(c, t, est, W, H, fps);
			cam = estilo;
			blur = v.desfoque + (v.golpe ? v.golpe.blur / 10 : 0);
		} else if (c.layout === 'fala') {
			const e = enquadrar(c, t, props, est, W, H, fps);
			cam = e.quadro;
			blur = e.desfoque + (e.golpe ? e.golpe.blur / 10 : 0);
		}
		sai = transCamadaSaida(prox, fr, quadrosCena(c, est, fps), est, fps, W, H);
		entra = transCamadaEntrada(i > 0 ? c : undefined, fr, est, fps, W, H);
	}
	return (
		<WrapMovCamada m={entra} id={`${id}e`}>
			<WrapMovCamada m={sai} id={`${id}s`}>
				<AbsoluteFill style={{...cam, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined}}>{children}</AbsoluteFill>
			</WrapMovCamada>
		</WrapMovCamada>
	);
};

// Flash branco dos golpes (por cima das camadas, embaixo da vinheta e da legenda).
const FlashGolpes: React.FC<{golpes: Golpe[]}> = ({golpes}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const g = golpeEm(golpes, frame / fps, fps);
	return g && g.flash > 0.004 ? <AbsoluteFill style={{background: '#fff', opacity: g.flash, pointerEvents: 'none'}} /> : null;
};

// Movimento das transições do MIX. a = intensidade (0 parado … 1 no corte). Na saída, a cena anterior corre/estica/mergulha;
// na entrada, a nova chega do mesmo movimento e assenta. O wrapper fica estável (a = 0 depois), para o vídeo não remontar.
// chicote: deslocamento lateral + blur direcional (filtro SVG feGaussianBlur "N 0"); o vão que abre é preenchido pelo
// reflexo da própria imagem (-webkit-box-reflect), invisível sob o rastro.
type Mov = {transform: string; origem: string; reflexo?: 'left' | 'right'; desvio: Par; filtroCss?: string; escuro: number};
const movimento = (tipo: TransMix, fase: 'sai' | 'entra', a: number, sentido: 1 | -1, alvo: Par, W: number, H: number): Mov => {
	const u = Math.min(W, H) / 1080;
	// rastro proporcional à velocidade, não à posição: a^(2/3) acompanha a derivada das curvas quadrática/cúbica,
	// então o blur ainda cobre o fim do movimento (e o reflexo do vão) quando o deslocamento já é pequeno
	const rastro = a ** (2 / 3);
	if (tipo === 'chicote') {
		const dx = (fase === 'sai' ? sentido : -sentido) * CHICOTE.desloc * W * a;
		return {transform: `translateX(${dx.toFixed(1)}px)`, origem: '50% 50%', reflexo: dx < -0.5 ? 'right' : dx > 0.5 ? 'left' : undefined, desvio: [CHICOTE.blur * u * rastro, 0], escuro: 0};
	}
	if (tipo === 'esticao') return {transform: `scaleY(${1 + (ESTICAO.escala - 1) * a})`, origem: '50% 50%', desvio: [0, ESTICAO.blur * u * rastro], escuro: 0};
	if (fase === 'sai') {
		const filtroCss = a > 0.01 ? `blur(${(MERGULHO.blur * u * a).toFixed(2)}px)` : undefined;
		return {transform: `scale(${1 + (MERGULHO.escala - 1) * a})`, origem: `${alvo[0] * W}px ${alvo[1] * H}px`, desvio: [0, 0], filtroCss, escuro: a};
	}
	return {transform: `scale(${1 + 0.04 * a})`, origem: '50% 50%', desvio: [0, 0], escuro: a};
};

// Filtro SVG do blur direcional (feGaussianBlur com desvio só em x ou só em y).
const FiltroDirecional: React.FC<{id: string; desvio: Par}> = ({id, desvio}) => (
	<svg width={0} height={0} style={{position: 'absolute'}}>
		<filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
			<feGaussianBlur stdDeviation={`${desvio[0].toFixed(2)} ${desvio[1].toFixed(2)}`} edgeMode="duplicate" />
		</filter>
	</svg>
);

const Movimento: React.FC<{tipo: TransMix; fase: 'sai' | 'entra'; a: number; sentido: 1 | -1; alvo: Par; id: string; children: React.ReactNode}> = ({tipo, fase, a, sentido, alvo, id, children}) => {
	const {width: W, height: H} = useVideoConfig();
	const m = movimento(tipo, fase, a, sentido, alvo, W, H);
	const svg = m.desvio[0] + m.desvio[1] > 0.05;
	return (
		<AbsoluteFill style={{filter: svg ? `url(#${id})` : m.filtroCss}}>
			{svg && <FiltroDirecional id={id} desvio={m.desvio} />}
			<AbsoluteFill style={{transform: m.transform, transformOrigin: m.origem, WebkitBoxReflect: m.reflexo}}>{children}</AbsoluteFill>
			{m.escuro > 0.001 && <AbsoluteFill style={{background: '#000', opacity: m.escuro}} />}
		</AbsoluteFill>
	);
};

// Intensidade (0 parado … 1 no corte) dos movimentos do MIX, a partir do quadro dentro da cena.
// Saída: acelera nos últimos quadros e chega ao máximo no último quadro antes do corte. Mergulho (11 q): ease-in do guia
// (0.55, 0, 1, 0.45), que já entra no alvo desde o 2º quadro (a expo-in ficava parada em 1,0–1,2 por 6 q e pulava para
// 6× nos 3 últimos); chicote e esticão (3 q): quadrática, porque a expo-in em 3 q só se mexeria no último quadro.
const CURVA_MERGULHO = Easing.bezier(0.55, 0, 1, 0.45);
const aSaidaMix = (tipo: TransMix, frame: number, durQ: number, fps: number) => {
	const n = Math.max(1, Math.round((TRANS_MIX[tipo][0] * fps) / 30));
	const p = clamp01((frame - (durQ - n) + 1) / n);
	return tipo === 'mergulho' ? CURVA_MERGULHO(p) : p * p;
};
// Entrada: chicote/esticão desaceleram em curva cúbica (com 3–4 q, a expo-out assentaria já no 2º quadro; a cúbica deixa
// no último quadro só ~1% do deslocamento, então o reflexo que preenche o vão quase não aparece); mergulho: surge do
// escuro sem pressa.
const aEntradaMix = (tipo: TransMix, frame: number, fps: number) => {
	const n = Math.max(1, Math.round((TRANS_MIX[tipo][1] * fps) / 30));
	const p = clamp01(frame / n);
	return tipo === 'mergulho' ? 1 - CURVAS.suave(p) : (1 - p) ** 3;
};
const ehMix = (t?: Trans): t is TransMix => t === 'chicote' || t === 'mergulho' || t === 'esticao';

// Transição de uma camada presa à câmera: o mesmo movimento da cena, sem o reflexo (numa camada transparente ele viraria
// um "fantasma" espelhado) e com o escurecimento como brightness (um véu preto cobriria o quadro todo).
type MovCamada = {mov?: Mov; filtro?: string; transform?: string; opacidade?: number};
const transCamadaSaida = (prox: CenaCamadas | undefined, fr: number, durQ: number, est: Estilo, fps: number, W: number, H: number): MovCamada => {
	const tp = prox?.transicao;
	if (ehMix(tp)) {
		const a = aSaidaMix(tp, fr, durQ, fps);
		return a > 0 ? {mov: movimento(tp, 'sai', a, sentidoDe(prox), prox!.alvo ?? [0.5, 0.5], W, H)} : {};
	}
	if (tp === 'lente') {
		// mesma conta da SaidaLente
		const n = Math.max(1, Math.round((est.trans.lente[0] * fps) / 30));
		const p = interpolate(fr, [durQ - n - 0.5, durQ], [0, 1], {...clamp, easing: CURVAS.saida});
		return p > 0 ? {filtro: `blur(${(p * LENTE_PX * (W / 1080)).toFixed(2)}px)`} : {};
	}
	return {};
};
const transCamadaEntrada = (c: CenaCamadas | undefined, fr: number, est: Estilo, fps: number, W: number, H: number): MovCamada => {
	const tt = c?.transicao;
	if (ehMix(tt)) {
		const a = aEntradaMix(tt, fr, fps);
		return a > 0.0005 ? {mov: movimento(tt, 'entra', a, sentidoDe(c), [0.5, 0.5], W, H)} : {};
	}
	// mesmas contas da Entrada (lente, blur e zoom)
	if (tt === 'lente') {
		const d = Math.max(1, Math.round((est.trans.lente[1] * fps) / 30));
		const p = interpolate(fr, [0, d], [0, 1], {...clamp, easing: CURVAS.entrada});
		return p < 1 ? {filtro: `blur(${((1 - p) * LENTE_PX * (W / 1080)).toFixed(2)}px)`, transform: `scale(${1.03 - 0.03 * p})`} : {};
	}
	if (tt === 'blur' || tt === 'zoom') {
		const d = cauda(tt, est, fps);
		const p = interpolate(fr, [0, d], [0, 1], {...clamp, easing: CURVAS.entrada});
		if (p >= 1) return {};
		return tt === 'blur' ? {opacidade: p, filtro: `blur(${((1 - p) * 24).toFixed(2)}px)`, transform: `scale(${1.04 - 0.04 * p})`} : {filtro: `blur(${((1 - p) * 16).toFixed(2)}px)`, transform: `scale(${1.22 - 0.22 * p})`};
	}
	return {};
};
// Estrutura sempre igual (só os estilos mudam), para a peça não remontar quando a transição começa ou acaba.
const WrapMovCamada: React.FC<{m: MovCamada; id: string; children: React.ReactNode}> = ({m, id, children}) => {
	const mv = m.mov;
	const svg = !!mv && mv.desvio[0] + mv.desvio[1] > 0.05;
	const filtro = [svg ? `url(#${id})` : '', mv?.filtroCss ?? '', mv && mv.escuro > 0.001 ? `brightness(${(1 - mv.escuro).toFixed(3)})` : '', m.filtro ?? ''].filter(Boolean).join(' ');
	return (
		<AbsoluteFill style={{filter: filtro || undefined, opacity: m.opacidade}}>
			{svg && <FiltroDirecional id={id} desvio={mv!.desvio} />}
			<AbsoluteFill style={{transform: mv?.transform ?? m.transform, transformOrigin: mv?.origem}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};

const sentidoDe = (c?: CenaCamadas): 1 | -1 => (c?.direcao === 'dir' ? 1 : -1);

// Como a cena entra (nas transições com cauda, a anterior continua por baixo).
const Entrada: React.FC<{tipo: Trans; est: Estilo; cena?: CenaCamadas; id?: string; children: React.ReactNode}> = ({tipo, est, cena, id, children}) => {
	const frame = useCurrentFrame();
	const {fps, width: W} = useVideoConfig();
	if (tipo === 'lente') {
		const d = Math.max(1, Math.round((est.trans.lente[1] * fps) / 30));
		const p = interpolate(frame, [0, d], [0, 1], {...clamp, easing: CURVAS.entrada});
		return p >= 1 ? <>{children}</> : <AbsoluteFill style={{filter: `blur(${(1 - p) * LENTE_PX * (W / 1080)}px)`, transform: `scale(${1.03 - 0.03 * p})`}}>{children}</AbsoluteFill>;
	}
	if (ehMix(tipo)) {
		return (
			<Movimento tipo={tipo} fase="entra" a={aEntradaMix(tipo, frame, fps)} sentido={sentidoDe(cena)} alvo={[0.5, 0.5]} id={id ?? 'trans-entra'}>
				{children}
			</Movimento>
		);
	}
	const d = cauda(tipo, est, fps);
	if (!d) return <>{children}</>;
	const p = interpolate(frame, [0, d], [0, 1], {...clamp, easing: CURVAS.entrada});
	if (tipo === 'blur') return <AbsoluteFill style={{opacity: p, filter: `blur(${(1 - p) * 24}px)`, transform: `scale(${1.04 - 0.04 * p})`}}>{children}</AbsoluteFill>;
	if (tipo === 'zoom') return <AbsoluteFill style={{filter: `blur(${(1 - p) * 16}px)`, transform: `scale(${1.22 - 0.22 * p})`}}>{children}</AbsoluteFill>;
	if (est.trans.flash) {
		// flash do estilo (MIX): pico de N q na opacidade flashPico, depois cai em curva quadrática até o fim da cauda
		const plato = Math.max(1, Math.round((est.trans.flash[0] * fps) / 30));
		const pd = clamp01((frame - plato + 1) / Math.max(1, d - plato + 1));
		return (
			<AbsoluteFill>
				{children}
				<AbsoluteFill style={{background: '#fff', opacity: (est.trans.flashPico ?? 1) * (frame < plato ? 1 : (1 - pd) * (1 - pd))}} />
			</AbsoluteFill>
		);
	}
	return (
		<AbsoluteFill>
			{children}
			<AbsoluteFill style={{background: '#fff', opacity: (1 - p) * (1 - p)}} />
		</AbsoluteFill>
	);
};

// Saída da cena quando a próxima entra com 'lente': desfoca nos últimos quadros antes do corte seco.
const SaidaLente: React.FC<{durQ: number; est: Estilo; children: React.ReactNode}> = ({durQ, est, children}) => {
	const frame = useCurrentFrame();
	const {fps, width: W} = useVideoConfig();
	const n = Math.max(1, Math.round((est.trans.lente[0] * fps) / 30));
	const p = interpolate(frame, [durQ - n - 0.5, durQ], [0, 1], {...clamp, easing: CURVAS.saida});
	return p <= 0 ? <>{children}</> : <AbsoluteFill style={{filter: `blur(${p * LENTE_PX * (W / 1080)}px)`}}>{children}</AbsoluteFill>;
};

// Saída da cena quando a próxima entra com chicote/mergulho/esticao (curvas em aSaidaMix).
const SaidaMix: React.FC<{tipo: TransMix; durQ: number; prox: CenaCamadas; id: string; children: React.ReactNode}> = ({tipo, durQ, prox, id, children}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (
		<Movimento tipo={tipo} fase="sai" a={aSaidaMix(tipo, frame, durQ, fps)} sentido={sentidoDe(prox)} alvo={prox.alvo ?? [0.5, 0.5]} id={id}>
			{children}
		</Movimento>
	);
};

// Pessoa sem fundo por cima das camadas "atrás", com o mesmo enquadramento da cena ativa.
// Nos primeiros quadros de uma cena com transição 'silhueta', vira silhueta chapada (vermelha, depois branca com brilho).
// arquivo terminando em "/" = sequência de imagens WebP com alfa (q0001.webp...), lida pelo navegador: é o padrão,
// porque o webm transparente via compositor (OffthreadVideo) às vezes falha com "No frame found at position".
// Golpe: o recorte acompanha o punch (mesma conta), mas não recebe o zoom-blur (a pessoa fica nítida sobre o fundo borrado).
// Transições do MIX (chicote, mergulho, esticão): o recorte sai/entra junto com a cena (sem isso a pessoa ficaria parada
// por cima da cena que corre). As outras transições não mexem no recorte (como sempre no CUT).
const Recortado: React.FC<{arquivo: string; fpsSeq?: number; ini: number; desde: number; cenas: CenaCamadas[]; props: CamadasProps; est: Estilo; filtro: string; id: string}> = ({arquivo, fpsSeq, ini, desde, cenas, props, est, filtro, id}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const t = ini + frame / fps;
	const c = cenas.find((x) => t >= x.ini && t < x.fim);
	const e = enquadrar(c, t, props, est, W, H, fps);
	const q = quadroSilhueta(c, t);
	const f = q < 0 ? (c ? filtroCena(c, filtro) : filtro) : q < SILHUETA_Q[0] ? 'url(#silhuetaVermelha)' : 'brightness(0) invert(1) drop-shadow(0 0 40px #fff6c8) drop-shadow(0 0 90px #ffe9a0)';
	// cena do quadro (pelo número do quadro, como as Sequences das cenas) para a saída/entrada por movimento
	const F = Math.round(ini * fps) + frame;
	const i = cenas.findIndex((x) => F >= Math.round(x.ini * fps) && F < Math.round(x.fim * fps));
	const ci = i >= 0 ? cenas[i] : undefined;
	const fr = ci ? F - Math.round(ci.ini * fps) : 0;
	const sai = ci && ehMix(cenas[i + 1]?.transicao) ? transCamadaSaida(cenas[i + 1], fr, quadrosCena(ci, est, fps), est, fps, W, H) : {};
	const entra = ci && i > 0 && ehMix(ci.transicao) ? transCamadaEntrada(ci, fr, est, fps, W, H) : {};
	const conteudo = (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<div style={e.quadro}>
				{arquivo.endsWith('/') ? (
					<Img src={staticFile(`${arquivo}q${String(Math.floor((desde + frame / fps) * (fpsSeq ?? fps) + 1e-6) + 1).padStart(4, '0')}.webp`)} style={{...e.midia, filter: f}} />
				) : (
					<OffthreadVideo src={staticFile(arquivo)} trimBefore={Math.round(desde * fps)} transparent muted style={{...e.midia, filter: f}} />
				)}
			</div>
			{q >= 0 && q < SILHUETA_Q[0] && c?.silhueta?.texto && (
				<div style={{position: 'absolute', left: e.focoPx[0], top: e.focoPx[1], transform: 'translate(-50%, -50%)', fontFamily: FONTES.impacto.family, fontWeight: 900, fontSize: 120 * (W / 1080), color: est.creme, textShadow: `0 0 30px ${est.creme}`}}>{c.silhueta.texto}</div>
			)}
		</AbsoluteFill>
	);
	return sai.mov || entra.mov ? (
		<WrapMovCamada m={entra} id={`${id}e`}>
			<WrapMovCamada m={sai} id={`${id}s`}>
				{conteudo}
			</WrapMovCamada>
		</WrapMovCamada>
	) : (
		conteudo
	);
};

// ---------- Composição ----------

export const MotorCamadas: React.FC<CamadasProps> = (props) => {
	const {fps} = useVideoConfig();
	const est = ESTILOS[props.modelo];
	const cor = {...est.cor, ...props.cor};
	const filtro = `contrast(${cor.contraste}) saturate(${cor.saturacao}) sepia(${cor.calor})`;
	const segs = useMemo(() => montarSegs(props, fps), [props.montagem, props.duracao, fps]);
	const cenas = useMemo(() => resolverCenas(props.cenas, est), [props.cenas, est]);
	const duracao = segs[segs.length - 1].fim;
	const camadas = props.camadas ?? [];
	const golpes = useMemo(() => cenas.flatMap((c) => c.golpes ?? []), [cenas]);

	// palavras no tempo da saída (as que caem fora da montagem somem)
	const palavras = useMemo(
		() =>
			(props._palavras ?? []).flatMap((w) => {
				const ini = paraSaida(w.ini, segs);
				return ini == null ? [] : [{...w, ini, fim: ini + (w.fim - w.ini)}];
			}),
		[props._palavras, segs],
	);
	const cinetica = props.modelo === 'cut-dinamico-instagram';
	const ocultos = useMemo<[number, number][]>(
		() => [
			...camadas.filter((c) => c.legenda === false).map((c) => [c.ini, typeof c.legendaAte === 'number' ? c.legendaAte : c.fim] as [number, number]),
			...cenas.filter((c) => c.semLegenda).map((c) => [c.ini, c.fim] as [number, number]),
		],
		[camadas, cenas],
	);
	const blocosCin = useMemo(() => (cinetica ? montarBlocosCineticos(palavras, props.destaques ?? [], cenas.map((c) => c.ini), ocultos) : []), [cinetica, palavras, props.destaques, cenas, ocultos]);
	const blocos = useMemo(() => (cinetica ? [] : montarBlocos(palavras, props.destaques ?? [])), [cinetica, palavras, props.destaques]);

	const sfx = useMemo(() => {
		const out: (Sfx & {dur?: number})[] = [...(props.sfx ?? [])];
		if (props.sfxAuto === false) return out;
		// ganho dos sons das peças: estilo com ganhoSfx (MIX) = vol × fator entre piso e teto; sem ele (CUT), a regra de sempre
		const gs = est.ganhoSfx;
		const ganho = (v: number) => (gs ? Math.min(gs.teto, Math.max(gs.piso ?? 0, v * gs.fator)) : v);
		let lentes = 0;
		cenas.forEach((c, i) => {
			if (!c.transicao || (i === 0 && c.transicao !== 'silhueta')) return;
			if (c.transicao === 'lente' && lentes++ % 3 !== 0) return;
			const s = SOM_TRANS[c.transicao];
			if (s) out.push({t: Math.max(0, c.ini + s[2]), som: s[0], vol: est.volTrans?.[c.transicao] ?? s[1]});
		});
		// golpes: whoosh com o pico no golpe + sub-impacto
		golpes.forEach((g) => g.som !== false && SOM_GOLPE.forEach(([som, vol, atraso]) => out.push({t: Math.max(0, g.t + atraso), som, vol})));
		// peças: som de entrada (volume x1,5: com voz e trilha por cima, os volumes originais sumiam) + sons dos eventos internos
		camadas.forEach((c) => {
			const peca = CAMADAS[c.tipo];
			if (c.sfx !== false) {
				if (typeof c.sfx === 'string') out.push({t: c.ini, som: c.sfx, vol: gs ? ganho(0.55) : 0.55});
				else if (peca?.sfx) out.push({t: c.ini, som: peca.sfx[0], vol: gs ? ganho(peca.sfx[1]) : Math.min(0.7, peca.sfx[1] * 1.5)});
			}
			if (c.sons !== false && peca?.sons) peca.sons(c, fps).forEach((s) => s.t >= 0 && s.t < c.fim - c.ini && out.push({t: c.ini + s.t, som: s.som, vol: ganho(s.vol)}));
		});
		// legenda cinética: clique suave nas palavras-chave (no máximo 1 a cada 1,5 s)
		if (cinetica && props.sfxTexto !== false) {
			let ultimo = -Infinity;
			blocosCin.forEach((b) =>
				b.palavras.forEach((w) => {
					if (w.papel !== 'destaque' || w.ini - ultimo < 1.5) return;
					ultimo = w.ini;
					out.push({t: Math.max(0, w.ini - 0.02), som: 'motionix/clicks/clicks_05_high-click', vol: 0.3});
				}),
			);
		}
		return out;
	}, [cenas, camadas, golpes, est, props.sfx, props.sfxAuto, props.sfxTexto, cinetica, blocosCin, fps]);

	// ducking: trilha mais baixa enquanto há fala
	const falando = useMemo(() => {
		const arr = new Float32Array(Math.ceil(duracao * fps) + 1);
		palavras.forEach((w) => {
			for (let f = Math.floor((w.ini - 0.15) * fps); f <= Math.ceil((w.fim + 0.3) * fps); f++) if (f >= 0 && f < arr.length) arr[f] = 1;
		});
		return arr;
	}, [palavras, duracao, fps]);

	// trilha única (objeto, comportamento de sempre) ou lista de trilhas (MIX: intro, corpo A, corpo B...)
	const musicaUnica = props.musica && !Array.isArray(props.musica) ? props.musica : null;
	const trilhas: FaixaMusica[] = Array.isArray(props.musica) ? props.musica : [];
	// volume de uma trilha da lista no quadro F da SAÍDA: mesmo ducking da trilha única, fades próprios e quedas que
	// também podem SUBIR a trilha (vol > 1)
	const volumeFaixa = (m: FaixaMusica, F: number, deQ: number, fimQ: number) => {
		const base = m.vol ?? 0.1;
		const livre = m.volSemFala ?? 0.28;
		const raio = Math.round((5 * fps) / 30);
		let s = 0;
		for (let k = -raio; k <= raio; k++) s += falando[Math.min(falando.length - 1, Math.max(0, F + k))] ?? 0;
		const ent = (m.entrada ?? 0.8) * fps;
		const sai = (m.fade ?? (m.fim != null ? 0.25 : 1.5)) * fps;
		const env = Math.min(ent > 0 ? clamp01((F - deQ) / ent) : 1, sai > 0 ? clamp01((fimQ - F) / sai) : 1);
		const fatores = (m.quedas ?? []).map((q) => {
			const r = fps * 0.4;
			return interpolate(F, [q.ini * fps - r, q.ini * fps, q.fim * fps, q.fim * fps + r], [1, q.vol, q.vol, 1], clamp);
		});
		const queda = Math.min(1, ...fatores) * Math.max(1, ...fatores);
		return Math.min(1, (livre + (base - livre) * (s / (2 * raio + 1))) * env * queda);
	};

	// cada recorte aparece só nas partes que entraram na montagem (o arquivo pode começar antes do corte)
	const recortes = (props.recortes ?? []).flatMap((r) =>
		segs.flatMap((s) => {
			if (s.bruto == null) return [];
			const a = Math.max(r.brutoIni, s.bruto);
			const b = Math.min(r.brutoFim, s.bruto + (s.fim - s.ini));
			return b - a > 1 / fps ? [{arquivo: r.arquivo, fpsSeq: r.fps, ini: s.ini + (a - s.bruto), fim: s.ini + (b - s.bruto), desde: a - r.brutoIni}] : [];
		}),
	);
	const camada = (c: (typeof camadas)[number], i: number) => {
		const peca = CAMADAS[c.tipo];
		if (!peca) return null;
		const de = Math.round(c.ini * fps);
		// MIX (quadrosExatos): termina no quadro do fim, sem vazar na cena seguinte; CUT: a conta de sempre
		const dur = est.quadrosExatos ? Math.max(1, Math.round(c.fim * fps) - de) : Math.max(1, Math.round((c.fim - c.ini) * fps));
		const comp = <peca.comp c={c} dur={dur} est={est} />;
		return (
			<Sequence key={`c${i}`} name={`camada ${c.tipo}`} from={de} durationInFrames={dur}>
				{c.camera ? (
					<CameraCamada ini={c.ini} cenas={cenas} props={props} est={est} id={`cam${i}`}>
						{comp}
					</CameraCamada>
				) : (
					comp
				)}
			</Sequence>
		);
	};
	const legenda = props.legenda ?? est.legenda;
	const cenaEm = (t: number) => cenas.find((c) => t >= c.ini && t < c.fim);
	// passe de áudio do render por partes: nada visual é montado (nem o vídeo da pessoa); os <Audio> abaixo são os mesmos
	const soAudio = props._soAudio === true;

	return (
		<AbsoluteFill style={{background: '#000'}}>
			{!soAudio && (
				<>
					<svg width={0} height={0} style={{position: 'absolute'}}>
						<filter id="silhuetaVermelha">
							<feFlood floodColor={COR_SILHUETA} />
							<feComposite in2="SourceAlpha" operator="in" />
						</filter>
					</svg>
					{cenas.map((c, i) => {
						const proxC = cenas[i + 1];
						const prox = proxC?.transicao;
						const durQ = quadrosCena(c, est, fps);
						if (durQ + cauda(prox, est, fps) <= 0) return null; // cena mais curta que 1 quadro: a Sequence recusaria (e derrubaria o render)
						const conteudo = c.layout === 'fala' ? <Pessoa cena={c} segs={segs} props={props} est={est} filtro={filtro} /> : c.layout === 'broll' ? <Broll cena={c} filtro={filtro} /> : <TelaCena cena={c} est={est} />;
						return (
							<Sequence key={i} name={`${i + 1}·${c.layout}${c.transicao ? `·${c.transicao}` : ''}`} from={Math.round(c.ini * fps)} durationInFrames={durQ + cauda(prox, est, fps)} premountFor={fps}>
								<Entrada tipo={i > 0 ? c.transicao ?? 'corte' : c.transicao === 'silhueta' ? 'silhueta' : 'corte'} est={est} cena={c} id={`trans${i}e`}>
									{prox === 'lente' ? (
										<SaidaLente durQ={durQ} est={est}>
											{conteudo}
										</SaidaLente>
									) : ehMix(prox) ? (
										<SaidaMix tipo={prox} durQ={durQ} prox={proxC} id={`trans${i}s`}>
											{conteudo}
										</SaidaMix>
									) : (
										conteudo
									)}
								</Entrada>
							</Sequence>
						);
					})}

					{camadas.map((c, i) => (c.plano === 'atras' ? camada(c, i) : null))}
					{recortes.map((r, i) => (
						<Sequence key={`r${i}`} name={`recorte ${i + 1}`} from={Math.round(r.ini * fps)} durationInFrames={Math.max(1, Math.round((r.fim - r.ini) * fps))}>
							<Recortado arquivo={r.arquivo} fpsSeq={r.fpsSeq} ini={r.ini} desde={r.desde} cenas={cenas} props={props} est={est} filtro={filtro} id={`rec${i}`} />
						</Sequence>
					))}
					{camadas.map((c, i) => (c.plano !== 'atras' ? camada(c, i) : null))}
					{golpes.length > 0 && <FlashGolpes golpes={golpes} />}

					<AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${props.vinheta ?? est.vinheta}) 100%)`, pointerEvents: 'none'}} />
					<Grao forca={props.grao ?? est.grao} />

					{legenda &&
						blocosCin.map((b, i) => (
							<Sequence key={`k${i}`} name={`texto ${i + 1}·${b.padrao}`} from={Math.round(b.ini * fps)} durationInFrames={Math.max(1, Math.round((b.fim - b.ini) * fps))}>
								<BlocoCineticoView b={b} est={est} y={cenaEm(b.ini)?.legendaY ?? est.legendaY} />
							</Sequence>
						))}
					{legenda &&
						blocos.map((b, i) => {
							if (cenaEm(b.ini)?.semLegenda) return null;
							const corte = cenas.find((x) => x.ini > b.ini && x.semLegenda)?.ini ?? Infinity;
							return (
								<Sequence key={`l${i}`} name={`legenda ${i + 1}`} from={Math.round(b.ini * fps)} durationInFrames={Math.max(1, Math.round((Math.min(b.fim, corte) - b.ini) * fps))}>
									<LegendaCamadas bloco={b} y={est.legendaY} />
								</Sequence>
							);
						})}
				</>
			)}

			{segs.map((g, i) => {
				if (g.bruto == null) return null;
				const n = Math.max(1, Math.round((g.fim - g.ini) * fps));
				// microfade (MIX): só nas emendas de verdade (trecho seguido no bruto não tem emenda)
				const mf = est.microfade ? {volume: microfade(n, fps, est.microfade, !colados(segs[i - 1], g), !colados(g, segs[i + 1]))} : {};
				return (
					<Sequence key={`v${i}`} name={`voz ${i + 1}`} from={Math.round(g.ini * fps)} durationInFrames={n}>
						<Audio src={staticFile(props.voz ?? props.bruto)} trimBefore={Math.round(g.bruto * fps)} {...mf} />
					</Sequence>
				);
			})}
			{musicaUnica && (
				<Audio
					src={staticFile(musicaUnica.arquivo)}
					trimBefore={Math.round((musicaUnica.ini ?? 0) * fps)}
					volume={(f) => {
						const m = musicaUnica;
						const base = m.vol ?? 0.1;
						const livre = m.volSemFala ?? 0.28;
						const raio = Math.round((5 * fps) / 30); // média móvel de ~0,37 s para o ducking não "bombear"
						let s = 0;
						for (let k = -raio; k <= raio; k++) s += falando[Math.min(falando.length - 1, Math.max(0, f + k))] ?? 0;
						const fim = (m.fim ?? duracao) * fps;
						const fade = Math.max(1, (m.fade ?? (m.fim != null ? 0.25 : 1.5)) * fps);
						const env = interpolate(f, [0, fps * 0.8, fim - fade, fim], [0, 1, 1, 0], clamp);
						const queda = (m.quedas ?? []).reduce((mn, q) => {
							const r = fps * 0.4;
							return Math.min(mn, interpolate(f, [q.ini * fps - r, q.ini * fps, q.fim * fps, q.fim * fps + r], [1, q.vol, q.vol, 1], clamp));
						}, 1);
						return (livre + (base - livre) * (s / (2 * raio + 1))) * env * queda;
					}}
				/>
			)}
			{trilhas.map((m, i) => {
				const deQ = Math.round((m.de ?? 0) * fps);
				const fimQ = Math.round((m.fim ?? duracao) * fps);
				return fimQ - deQ < 1 ? null : (
					<Sequence key={`m${i}`} name={`trilha ${i + 1}`} from={deQ} durationInFrames={fimQ - deQ}>
						<Audio src={staticFile(m.arquivo)} trimBefore={Math.round((m.ini ?? 0) * fps)} volume={(f) => volumeFaixa(m, deQ + f, deQ, fimQ)} />
					</Sequence>
				);
			})}
			{sfx.map((s, i) => (
				<Sequence key={`s${i}`} name={`sfx ${s.som}`} from={Math.round(s.t * fps)} durationInFrames={Math.round((s.dur ?? 8) * fps)}>
					<Audio src={staticFile(`05_audio/sfx/${s.som}.wav`)} volume={s.vol ?? 0.5} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
