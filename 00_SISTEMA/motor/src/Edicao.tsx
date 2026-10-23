import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio, Video} from '@remotion/media';
import type {CalculateMetadataFunction} from 'remotion';
import {PAIRS} from './fonts';
import {limparPalavra, montarBlocos, normalizar, type Bloco} from './legendas';
import type {Cena, Edicao, Grafico, Palavra, Sfx, Transicao} from './tipos';

export type EdicaoProps = Edicao & {_palavras?: Palavra[]};

// Instagram sai em 1080p e 24 fps (regra do usuário). As durações em quadros deste arquivo foram calibradas a 30 fps:
// as animações rodam num relógio virtual de 30 fps (useQuadro), então os tempos em segundos continuam idênticos.
const FPS = 24;
const FPS_ANIM = 30;
const useQuadro = () => (useCurrentFrame() * FPS_ANIM) / useVideoConfig().fps;
const W = 1080;
const H = 1920;
const TRANS: Record<Transicao, number> = {corte: 0, blur: 10, whip: 7, flash: 9, glitch: 6};
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const isVideo = (p?: string) => !!p && /\.(mp4|mov|webm|m4v)$/i.test(p);
const FONT_IDX = {A: 0, B: 1, C: 2, D: 3} as const;

export const calcularEdicao: CalculateMetadataFunction<EdicaoProps> = async ({props}) => {
	const palavras: Palavra[] = await fetch(staticFile(props.palavras)).then((r) => r.json());
	return {durationInFrames: Math.ceil(props.duracao * FPS), fps: FPS, width: W, height: H, props: {...props, _palavras: palavras}};
};

// ---------- Mídia ----------

// Preenche a caixa (caixa = w×h) como "cover". Com `aspecto` conhecido, o recorte vertical segue posY
// (o <Video> do @remotion/media não aceita objectPosition, então o enquadramento é calculado aqui).
const Midia: React.FC<{
	src: string;
	caixa: {w: number; h: number};
	ini?: number;
	movimento?: Cena['movimento'];
	dur: number;
	filtro: string;
	posY?: number;
	escalaBase?: number;
	aspecto?: number;
}> = ({src, caixa, ini = 0, movimento = 'in', dur, filtro, posY = 0.5, escalaBase = 1, aspecto}) => {
	const frame = useQuadro();
	const t = Math.min(1, frame / Math.max(1, dur));
	const amp = isVideo(src) ? 0.04 : 0.1; // fotos se movem mais que vídeos
	const s = escalaBase * (movimento === 'out' ? 1 + amp - amp * t : 1 + amp * t);
	const dx = movimento === 'esq' ? -3 * t : movimento === 'dir' ? 3 * t : 0;
	let geo: React.CSSProperties = {width: '100%', height: '100%'};
	if (aspecto) {
		const largo = caixa.w / caixa.h > aspecto;
		const w = largo ? caixa.w : caixa.h * aspecto;
		const h = largo ? caixa.w / aspecto : caixa.h;
		geo = {position: 'absolute', width: w, height: h, left: (caixa.w - w) / 2, top: -(h - caixa.h) * posY};
	}
	const style: React.CSSProperties = {...geo, transform: `scale(${s}) translateX(${dx}%)`, transformOrigin: `50% ${posY * 100}%`, filter: filtro};
	return isVideo(src) ? (
		<Video src={staticFile(src)} trimBefore={Math.round(ini * FPS)} muted objectFit={aspecto ? 'fill' : 'cover'} style={style} />
	) : (
		<Img src={staticFile(src)} style={{...style, objectFit: 'cover'}} />
	);
};

// ---------- Gráfico de barras (dados de estudos) ----------

// Gráfico: câmera em push-in, título sobe com blur, linha de base se desenha, barras crescem com mola
// (leve overshoot), números contam com brilho e, em `destaqueEm` s, um colchete com selo (ex.: "≈") liga as barras.
const GraficoBarras: React.FC<{g: Grafico; fonte: Edicao['fonte']; dur: number}> = ({g, fonte, dur}) => {
	const frame = useQuadro();
	const fps = FPS_ANIM;
	const p = PAIRS[FONT_IDX[fonte]];
	const claro = g.fundo === 'claro';
	const cor = claro ? '#111' : '#fff';
	const max = Math.max(...g.barras.map((b) => b.valor)) * 1.12;
	const alturaMax = 760;
	const larguraBarra = 220;
	const gap = 120;
	const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
	const entra = (a: number, d = 12) => interpolate(frame, [a, a + d], [0, 1], {...clamp, easing: ease});
	const camera = 1.0 + 0.06 * interpolate(frame, [0, dur], [0, 1], clamp);
	const base = entra(4, 14); // linha de base
	const largura = g.barras.length * larguraBarra + (g.barras.length - 1) * gap;
	const alturas = g.barras.map((b, i) => {
		const m = spring({frame: frame - (10 + i * 7), fps, config: {damping: 11, stiffness: 90, mass: 0.9}});
		return {m, h: (b.valor / max) * alturaMax * m};
	});
	const sel = g.destaqueEm != null ? spring({frame: frame - Math.round(g.destaqueEm * fps), fps, config: {damping: 13, stiffness: 120}}) : 0;
	const topoMax = Math.max(...alturas.map((a) => a.h));
	return (
		<AbsoluteFill style={{background: claro ? 'radial-gradient(ellipse at 50% 55%, #fbf9f5 0%, #e9e3d9 100%)' : 'radial-gradient(ellipse at 50% 60%, #1b1712 0%, #060606 70%)', color: cor, alignItems: 'center', overflow: 'hidden'}}>
			<AbsoluteFill style={{alignItems: 'center', paddingTop: 210, transform: `scale(${camera})`}}>
				{g.titulo && (
					<div style={{opacity: entra(0) * 0.85, filter: `blur(${(1 - entra(0)) * 10}px)`, transform: `translateY(${(1 - entra(0)) * 30}px)`, fontFamily: p.base.family, fontWeight: 500, fontSize: 54, letterSpacing: '0.04em', textTransform: 'uppercase'}}>
						{g.titulo}
					</div>
				)}
				<div style={{position: 'relative', width: largura, height: alturaMax + 380, marginTop: 30}}>
					{/* colchete + selo ligando os topos das barras (logo acima dos números) */}
					{g.destaqueEm != null && (
						<div style={{position: 'absolute', left: larguraBarra / 2, width: largura - larguraBarra, bottom: 140 + topoMax + 182, height: 46, opacity: Math.min(1, sel), transform: `translateY(${(1 - Math.min(1, sel)) * 24}px)`}}>
							<div style={{position: 'absolute', inset: 0, borderTop: `4px solid ${cor}`, borderLeft: `4px solid ${cor}`, borderRight: `4px solid ${cor}`, borderRadius: '16px 16px 0 0', opacity: 0.75, clipPath: `inset(0 ${(1 - Math.min(1, sel)) * 50}% 0 ${(1 - Math.min(1, sel)) * 50}%)`}} />
							<div style={{position: 'absolute', left: '50%', top: -44, transform: `translateX(-50%) scale(${0.5 + 0.5 * sel})`, minWidth: 88, height: 88, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: claro ? '#111' : '#fff', color: claro ? '#fff' : '#111', fontFamily: p.keyword.family, fontStyle: p.keyword.style, fontSize: 70, lineHeight: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.4)'}}>
								{g.selo ?? '≈'}
							</div>
						</div>
					)}
					<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap, alignItems: 'flex-end'}}>
						{g.barras.map((b, i) => {
							const {m, h} = alturas[i];
							const v = Math.round(b.valor * Math.min(1, m));
							const brilho = interpolate(m, [0.85, 1, 1.05], [0, 1, 0.4], clamp);
							return (
								<div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: larguraBarra}}>
									<div style={{fontFamily: p.keyword.family, fontStyle: p.keyword.style, fontWeight: p.keyword.weight, fontSize: 150, lineHeight: 1, marginBottom: 22, opacity: Math.min(1, m * 1.5), filter: `blur(${(1 - Math.min(1, m)) * 10}px)`, textShadow: `0 0 ${30 * brilho}px rgba(255,214,150,${0.8 * brilho})`}}>
										{v}
										{g.sufixo ?? ''}
									</div>
									<div style={{width: larguraBarra, height: Math.max(0, h), borderRadius: '30px 30px 8px 8px', background: claro ? 'linear-gradient(180deg,#2b2b2b,#111)' : 'linear-gradient(180deg,#fff7ea 0%,#e6d6bd 55%,#b89f7a 100%)', boxShadow: `0 24px 70px rgba(0,0,0,0.45), 0 0 ${40 * brilho}px rgba(255,214,150,${0.35 * brilho})`}} />
									<div style={{fontFamily: p.base.family, fontWeight: 500, fontSize: 42, marginTop: 30, height: 110, textAlign: 'center', lineHeight: 1.15, whiteSpace: 'pre-line', opacity: entra(16 + i * 7), transform: `translateY(${(1 - entra(16 + i * 7)) * 16}px)`}}>
										{b.rotulo}
									</div>
								</div>
							);
						})}
					</div>
					{/* linha de base desenhando da esquerda para a direita */}
					<div style={{position: 'absolute', bottom: 140, left: -40, height: 3, width: (largura + 80) * base, background: cor, opacity: 0.35, borderRadius: 2}} />
				</div>
			</AbsoluteFill>
			{g.nota && <div style={{position: 'absolute', bottom: 110, fontFamily: p.base.family, fontWeight: 300, fontSize: 30, opacity: 0.55 * entra(24)}}>{g.nota}</div>}
		</AbsoluteFill>
	);
};

// ---------- Cenas ----------

const CenaVisual: React.FC<{cena: Cena; idx: number; props: EdicaoProps; filtro: string}> = ({cena: cenaOrig, idx, props, filtro}) => {
	const frame = useQuadro();
	const dur = Math.round((cenaOrig.fim - cenaOrig.ini) * FPS_ANIM);
	// stop-motion: escolhe a imagem da sequência pelo quadro atual (o último quadro segura até o fim)
	let cena = cenaOrig;
	if (cenaOrig.sequencia?.length) {
		const seq = cenaOrig.sequencia;
		const passo = (cenaOrig.quadroDur ?? (cenaOrig.fim - cenaOrig.ini) / seq.length) * FPS_ANIM;
		cena = {...cenaOrig, broll: seq[Math.min(seq.length - 1, Math.floor(frame / passo))], movimento: cenaOrig.movimento ?? 'in'};
	}
	if (cena.layout === 'grafico' && cena.grafico) return <GraficoBarras g={cena.grafico} fonte={props.fonte} dur={dur} />;
	const rosto = (caixa: {w: number; h: number}, posY: number, escala = 1) => (
		<Midia src={props.bruto} caixa={caixa} aspecto={props.aspectoBruto ?? 9 / 16} ini={cena.ini} dur={dur} filtro={filtro} posY={posY} escalaBase={escala} movimento="in" />
	);
	const metade = {w: W, h: H / 2};

	if (cena.layout === 'split') {
		return (
			<AbsoluteFill style={{background: '#000'}}>
				<div style={{position: 'absolute', top: 0, width: W, height: H / 2, overflow: 'hidden'}}>
					{cena.broll ? <Midia src={cena.broll} caixa={metade} ini={cena.brollIni} movimento={cena.movimento} dur={dur} filtro={filtro} /> : null}
				</div>
				<div style={{position: 'absolute', top: H / 2, width: W, height: H / 2, overflow: 'hidden'}}>{rosto(metade, props.rostoY ?? 0.3)}</div>
			</AbsoluteFill>
		);
	}
	if (cena.layout === 'card') {
		const caixa = {w: W - 72, h: H - 72};
		return (
			<AbsoluteFill style={{background: '#050505', padding: 36}}>
				<div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)'}}>
					{cena.broll ? <Midia src={cena.broll} caixa={caixa} ini={cena.brollIni} movimento={cena.movimento} dur={dur} filtro={filtro} /> : null}
				</div>
			</AbsoluteFill>
		);
	}
	if (cena.layout === 'texto') {
		return <CardTexto cena={cena} fonte={props.fonte} dur={dur} />;
	}
	// fala: rosto em tela cheia; punch alterna 1.0 / 1.12 se não especificado
	return <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>{rosto({w: W, h: H}, props.rostoY ?? 0.3, cena.punch ?? (idx % 2 ? 1.12 : 1))}</AbsoluteFill>;
};

// Card de texto: cada palavra entra com blur + subida + escala, em cascata; o bloco "respira" (zoom lento)
// e sai com blur/escala nos últimos ~0,4 s. Opcional: objetos orbitando o texto (cena.orbita).
const CardTexto: React.FC<{cena: Cena; fonte: Edicao['fonte']; dur: number}> = ({cena, fonte, dur}) => {
	const frame = useQuadro();
	const fps = FPS_ANIM;
	const p = PAIRS[FONT_IDX[fonte]];
	const claro = cena.fundo === 'claro';
	const partes = (cena.texto ?? '').split(/(\*[^*]+\*)/).filter(Boolean);
	const saidaIni = dur - Math.round(fps * 0.45);
	const saida = interpolate(frame, [saidaIni, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
	let n = 0; // índice global de palavra, para a cascata
	const atrasoBase = cena.orbita ? 4 : 2;
	return (
		<AbsoluteFill style={{background: claro ? 'radial-gradient(ellipse at center, #fbf9f5 0%, #ece7df 100%)' : 'radial-gradient(ellipse at center, #151515 0%, #050505 100%)', justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden'}}>
			{cena.orbita && <Orbita orbita={cena.orbita} dur={dur} saida={saida} claro={claro} />}
			<div
				style={{
					color: claro ? '#111' : '#fff',
					padding: 90,
					transform: `scale(${(1 + 0.05 * (frame / Math.max(1, dur))) * (1 + 0.08 * saida)})`,
					filter: `blur(${saida * 18}px)`,
					opacity: 1 - saida,
				}}
			>
				{partes.map((parte, i) => {
					const destaque = parte.startsWith('*');
					const palavras = parte.replace(/\*/g, '').trim().split(/\s+/);
					return (
						<div
							key={i}
							style={{
								fontFamily: destaque ? p.keyword.family : p.base.family,
								fontWeight: destaque ? p.keyword.weight : p.base.weight,
								fontStyle: destaque ? p.keyword.style : 'normal',
								letterSpacing: destaque ? p.keyword.tracking : p.base.tracking,
								fontSize: destaque ? p.keyword.size * 1.25 : 54,
								lineHeight: destaque ? 1 : 1.3,
							}}
						>
							{palavras.map((w, k) => {
								const a = atrasoBase + n++ * 3;
								const e = interpolate(frame, [a, a + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
								return (
									<span key={k} style={{display: 'inline-block', marginRight: k < palavras.length - 1 ? '0.25em' : 0, opacity: e, filter: `blur(${(1 - e) * 14}px)`, transform: `translateY(${(1 - e) * 34}px) scale(${0.9 + 0.1 * e})`}}>
										{w}
									</span>
								);
							})}
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

// Objetos (PNG com transparência) surgindo um a um com "pop" e girando numa elipse em volta do texto;
// na saída voam para fora com blur.
const Orbita: React.FC<{orbita: NonNullable<Cena['orbita']>; dur: number; saida: number; claro: boolean}> = ({orbita, dur, saida, claro}) => {
	const frame = useQuadro();
	const fps = FPS_ANIM;
	const n = orbita.imagens.length;
	const [rx, ry] = orbita.raio ?? [380, 560];
	const tam = orbita.tamanho ?? 230;
	const voltas = orbita.voltas ?? 0.3;
	const intervalo = orbita.intervalo ?? 0.32; // s entre um objeto e o próximo
	return (
		<AbsoluteFill>
			{orbita.imagens.map((src, i) => {
				const ini = Math.round((0.15 + i * intervalo) * fps);
				const pop = spring({frame: frame - ini, fps, config: {damping: 12, stiffness: 140, mass: 0.6}});
				const ang = -Math.PI / 2 + (i / n) * Math.PI * 2 + (frame / Math.max(1, dur)) * voltas * Math.PI * 2;
				const fuga = 1 + saida * 0.9; // raio cresce na saída
				const x = W / 2 + Math.cos(ang) * rx * fuga;
				const y = H / 2 + Math.sin(ang) * ry * fuga + Math.sin(frame / 9 + i) * 10; // leve flutuação
				const s = pop * (1 - saida * 0.35);
				const rot = (1 - pop) * -25 + Math.sin(frame / 14 + i * 2) * 6;
				return (
					<Img
						key={i}
						src={staticFile(src)}
						style={{
							position: 'absolute',
							left: x - tam / 2,
							top: y - tam / 2,
							width: tam,
							height: tam,
							objectFit: 'contain',
							transform: `scale(${s}) rotate(${rot}deg)`,
							opacity: Math.min(1, pop * 1.4) * (1 - saida),
							filter: `blur(${(1 - Math.min(1, pop)) * 8 + saida * 14}px) drop-shadow(0 18px 24px rgba(0,0,0,${claro ? 0.22 : 0.5}))`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

// Animação de entrada de cada cena (a cena anterior continua por baixo durante a transição).
const Entrada: React.FC<{tipo: Transicao; children: React.ReactNode}> = ({tipo, children}) => {
	const frame = useQuadro();
	const d = TRANS[tipo];
	if (!d) return <>{children}</>;
	const p = interpolate(frame, [0, d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
	if (tipo === 'blur') {
		return <AbsoluteFill style={{opacity: p, filter: `blur(${(1 - p) * 26}px)`, transform: `scale(${1.05 - 0.05 * p})`}}>{children}</AbsoluteFill>;
	}
	if (tipo === 'whip') {
		return <AbsoluteFill style={{opacity: Math.min(1, p * 2.5), filter: `blur(${(1 - p) * 34}px)`, transform: `translateY(${(1 - p) * -30}%)`}}>{children}</AbsoluteFill>;
	}
	if (tipo === 'glitch') {
		const off = (random(`g${frame}`) - 0.5) * 60 * (1 - p);
		return (
			<AbsoluteFill style={{transform: `translateX(${off}px)`, filter: `saturate(${1 + (1 - p) * 2}) contrast(${1 + (1 - p)})`}}>
				{children}
				<AbsoluteFill style={{background: `repeating-linear-gradient(0deg, rgba(255,255,255,${0.12 * (1 - p)}) 0 2px, transparent 2px 7px)`}} />
			</AbsoluteFill>
		);
	}
	// flash: entra sob um branco suave que se dissolve
	return (
		<AbsoluteFill>
			{children}
			<AbsoluteFill style={{background: '#fff', opacity: (1 - p) * 0.9}} />
		</AbsoluteFill>
	);
};

// ---------- Legendas ----------

const Legenda: React.FC<{bloco: Bloco; y: number; fonte: Edicao['fonte']}> = ({bloco, y, fonte}) => {
	const frame = useQuadro();
	const fps = FPS_ANIM;
	const p = PAIRS[FONT_IDX[fonte]];
	const t0 = bloco.ini;
	const saida = interpolate(frame, [(bloco.fim - t0) * fps - 4, (bloco.fim - t0) * fps], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const normais = bloco.palavras.filter((w) => !w.destaque);
	const chave = bloco.palavras.find((w) => w.destaque);
	const anim = (w: Palavra) => {
		const f = (w.ini - t0) * fps;
		const e = interpolate(frame, [f - 1, f + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
		return {opacity: e, filter: `blur(${(1 - e) * 8}px)`, transform: `translateY(${(1 - e) * 10}px)`, display: 'inline-block'} as React.CSSProperties;
	};
	const sombra = '0 3px 24px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)';
	return (
		<AbsoluteFill style={{opacity: saida}}>
			<div style={{position: 'absolute', top: y, left: 60, right: 60, transform: 'translateY(-50%)', textAlign: 'center', color: '#fff', textShadow: sombra}}>
				{normais.length > 0 && (
					<div style={{fontFamily: p.base.family, fontWeight: chave ? p.base.weight : 500, letterSpacing: p.base.tracking, fontSize: chave ? 46 : 58, lineHeight: 1.15}}>
						{normais.map((w, i) => (
							<span key={i} style={{...anim(w), marginRight: '0.28em'}}>
								{limparPalavra(w.w)}
							</span>
						))}
					</div>
				)}
				{chave && (
					<div
						style={{
							...anim(chave),
							display: 'block',
							fontFamily: p.keyword.family,
							fontWeight: p.keyword.weight,
							fontStyle: p.keyword.style,
							letterSpacing: p.keyword.tracking,
							fontSize: p.keyword.size,
							lineHeight: 0.95,
							marginTop: 4,
						}}
					>
						{limparPalavra(chave.w)}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};

// ---------- Acabamento ----------

const Grao: React.FC<{forca: number}> = ({forca}) => {
	const frame = useCurrentFrame();
	const tile = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = c.height = 256;
		const ctx = c.getContext('2d')!;
		const img = ctx.createImageData(256, 256);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = Math.floor(random(`grain${i}`) * 255);
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
		ctx.putImageData(img, 0, 0);
		return c.toDataURL();
	}, []);
	const x = Math.floor(random(`gx${frame}`) * 256);
	const y = Math.floor(random(`gy${frame}`) * 256);
	return <AbsoluteFill style={{backgroundImage: `url(${tile})`, backgroundPosition: `${x}px ${y}px`, opacity: forca, mixBlendMode: 'overlay', pointerEvents: 'none'}} />;
};

// ---------- Composição ----------

export const EdicaoComp: React.FC<EdicaoProps> = (props) => {
	const {fps} = useVideoConfig();
	const palavras = props._palavras ?? [];
	const blocos = useMemo(() => montarBlocos(palavras, props.destaques ?? []), [palavras, props.destaques]);
	const cor = props.cor ?? {};
	const filtro = `contrast(${cor.contraste ?? 1.08}) saturate(${cor.saturacao ?? 0.95}) sepia(${cor.calor ?? 0.06})`;
	const cenas = props.cenas;

	// Efeitos sonoros automáticos: transições e palavras-chave.
	const sfx: Sfx[] = useMemo(() => {
		const out: Sfx[] = [...(props.sfx ?? [])];
		if (props.sfxAuto === false) return out;
		const som: Partial<Record<Transicao, [string, number, number]>> = {
			blur: ['whoosh_soft', 0.45, -0.22],
			whip: ['whoosh_fast', 0.5, -0.12],
			flash: ['shimmer', 0.35, -0.05],
			glitch: ['glitch', 0.3, -0.02],
		};
		cenas.forEach((c, i) => {
			const s = i > 0 && c.transicao ? som[c.transicao] : undefined;
			if (s) out.push({t: Math.max(0, c.ini + s[2]), som: s[0], vol: s[1]});
		});
		const chaves = new Set((props.destaques ?? []).map(normalizar));
		palavras.filter((w) => chaves.has(normalizar(w.w))).forEach((w) => out.push({t: Math.max(0, w.ini - 0.03), som: 'pop_soft', vol: 0.28}));
		return out;
	}, [cenas, palavras, props.sfx, props.sfxAuto, props.destaques]);

	// Ducking da música: mais baixa enquanto há fala.
	const falando = useMemo(() => {
		const arr = new Float32Array(Math.ceil(props.duracao * fps) + 1);
		palavras.forEach((w) => {
			for (let f = Math.floor((w.ini - 0.15) * fps); f <= Math.ceil((w.fim + 0.3) * fps); f++) if (f >= 0 && f < arr.length) arr[f] = 1;
		});
		return arr;
	}, [palavras, props.duracao, fps]);

	const cenaEm = (t: number) => cenas.find((c) => t >= c.ini && t < c.fim);
	const posLegenda = (c?: Cena) => (!c ? 1340 : c.layout === 'split' ? H / 2 : c.layout === 'card' ? 1530 : c.layout === 'grafico' ? 1640 : 1340);

	return (
		<AbsoluteFill style={{background: '#000'}}>
			{cenas.map((c, i) => {
				const prox = cenas[i + 1];
				const cauda = prox?.transicao ? Math.round((TRANS[prox.transicao] * fps) / FPS_ANIM) : 0;
				const from = Math.round(c.ini * fps);
				return (
					<Sequence key={i} name={`${i + 1}·${c.layout}`} from={from} durationInFrames={Math.round((c.fim - c.ini) * fps) + cauda} premountFor={fps}>
						<Entrada tipo={i > 0 ? c.transicao ?? 'corte' : 'corte'}>
							<CenaVisual cena={c} idx={i} props={props} filtro={filtro} />
						</Entrada>
					</Sequence>
				);
			})}

			{/* vinheta + grão unificam câmera e B-roll */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)', pointerEvents: 'none'}} />
			<Grao forca={props.grao ?? 0.07} />

			{blocos.map((b, i) => {
				const c = cenaEm(b.ini);
				if (c?.semLegenda || c?.layout === 'texto') return null;
				// a legenda nunca invade uma cena seguinte sem legenda (cards de texto etc.)
				const corte = cenas.find((x) => x.ini > b.ini && (x.layout === 'texto' || x.semLegenda))?.ini ?? Infinity;
				const fim = Math.min(b.fim, corte);
				return (
					<Sequence key={`l${i}`} name={`legenda ${i + 1}`} from={Math.round(b.ini * fps)} durationInFrames={Math.max(1, Math.round((fim - b.ini) * fps))}>
						<Legenda bloco={b} y={posLegenda(c)} fonte={props.fonte} />
					</Sequence>
				);
			})}

			<Audio src={staticFile(props.voz ?? props.bruto)} />
			{props.musica && (
				<Audio
					src={staticFile(props.musica.arquivo)}
					trimBefore={Math.round((props.musica.ini ?? 0) * fps)}
					volume={(f) => {
						const base = props.musica!.vol ?? 0.1;
						const livre = props.musica!.volSemFala ?? 0.28;
						// média móvel de ~0,37 s (11 quadros a 30 fps) para o ducking não "bombear"
						const raio = Math.round((5 * fps) / FPS_ANIM);
						let s = 0;
						for (let k = -raio; k <= raio; k++) s += falando[Math.min(falando.length - 1, Math.max(0, f + k))] ?? 0;
						const fade = interpolate(f, [0, fps * 0.8, props.duracao * fps - fps * 1.5, props.duracao * fps], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
						// quedas com rampas de 0,4 s
						const queda = (props.musica!.quedas ?? []).reduce((m, q) => {
							const r = fps * 0.4;
							const k = interpolate(f, [q.ini * fps - r, q.ini * fps, q.fim * fps, q.fim * fps + r], [1, q.vol, q.vol, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
							return Math.min(m, k);
						}, 1);
						return (livre + (base - livre) * (s / (2 * raio + 1))) * fade * queda;
					}}
				/>
			)}
			{sfx.map((s, i) => (
				<Sequence key={`s${i}`} name={`sfx ${s.som}`} from={Math.round(s.t * fps)} durationInFrames={Math.round(2.5 * fps)}>
					<Audio src={staticFile(`05_audio/sfx/${s.som}.wav`)} volume={s.vol ?? 0.5} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
