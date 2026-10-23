// Peças do quadro contínuo: papel escuro, foto P&B com borda, recorte, texto em duas escalas, marca-texto, fita,
// traço à mão e poço de luz. Cada peça mora num ponto do mundo e anima a própria entrada no tempo dela.
import React from 'react';
import {Img, spring, staticFile} from 'remotion';
import {noise2D} from '@remotion/noise';
import {evolvePath} from '@remotion/paths';
import {CURVAS, MOLAS} from '../../kit/tempo';
import {FONTES} from '../../kit/fontes';
import {bordaRasgada, prng, texturaPapel} from './texturas';
import {ObjetoView} from './objetos';
import type {Elemento} from './tipos';

export const COR = {preto: '#0E0C10', carvao: '#1C1A18', papelao: '#4A3A2A', texto: '#F2EFEA', carmim: '#B90015', borda: '#E4DED2'};

const cl = (v: number) => Math.min(1, Math.max(0, v));
const DUR_PADRAO = {pousa: 0.4, sobe: 0.24, escala: 0.15, slam: 0.16, surge: 0.25, desliza: 0.3, voa: 0.42, nenhuma: 0};
const VOO: Record<string, [number, number]> = {esq: [-1, 0], dir: [1, 0], baixo: [0, 1], cima: [0, -1], ne: [0.8, -0.8], no: [-0.8, -0.8], se: [0.8, 0.8], so: [-0.8, 0.8]};
// "boiando": nada gráfico fica parado; deriva lenta e orgânica na posição final
const BOIA_PADRAO: Partial<Record<Elemento['tipo'], number>> = {recorte: 1, foto: 0.7, objeto: 0.8, texto: 0.3, traco: 0}; // fita não boia: segura a peça
export const boiar = (e: Elemento, t: number, entrou: number): {tx: number; ty: number; r: number; s: number} => {
	const A = (e.boia ?? BOIA_PADRAO[e.tipo] ?? 0) * (e.boiaId ? 1 : cl((t - entrou) / 0.5));
	if (A <= 0) return {tx: 0, ty: 0, r: 0, s: 1};
	const id = e.boiaId ?? e.id;
	return {tx: noise2D(`${id}x`, t * 0.33, 0) * 7 * A, ty: noise2D(`${id}y`, 0, t * 0.29) * 9 * A, r: noise2D(`${id}r`, t * 0.25, 1) * 1.1 * A, s: 1 + noise2D(`${id}s`, t * 0.2, 2) * 0.01 * A};
};
const SAIDA = 0.13; // s de blur + fade na saída (guia do TELA DIVIDIDA)

// Tempo da peça em "passos": 2 = 12 fps, 3 = 8 fps (papel e traço feitos à mão; a câmera segue em 24 fps).
// Perfil de render (prop _desligar): liga/desliga efeitos caros para medir o custo de cada um.
export const DESLIGADO = new Set<string>();

export const tempoPasso = (frame: number, fps: number, passo = 1) => (Math.floor(frame / passo) * passo) / fps;

type Anim = {opacity: number; tx: number; ty: number; s: number; r: number; blur: number};

const animEntrada = (e: Elemento, t: number, fps: number): Anim => {
	const tipo = e.entra?.tipo ?? 'surge';
	const dur = e.entra?.dur ?? DUR_PADRAO[tipo];
	const lt = t - e.ini;
	const a: Anim = {opacity: 1, tx: 0, ty: 0, s: 1, r: 0, blur: 0};
	if (tipo === 'pousa') {
		const m = spring({frame: lt * fps, fps, config: MOLAS.snappy, durationInFrames: Math.max(1, Math.round(dur * fps))});
		Object.assign(a, {opacity: cl(lt / 0.08), s: 1 + 0.18 * (1 - m), r: 7 * (1 - m), ty: -50 * (1 - m)});
	} else if (tipo === 'sobe') {
		const p = CURVAS.entrada(cl(lt / dur));
		Object.assign(a, {opacity: p, ty: 70 * (1 - p), blur: 10 * (1 - p)});
	} else if (tipo === 'escala') {
		const p = CURVAS.entrada(cl(lt / dur));
		Object.assign(a, {opacity: p, s: 0.9 + 0.1 * p, blur: 8 * (1 - p)});
	} else if (tipo === 'slam') {
		const p = CURVAS.entrada(cl(lt / dur));
		Object.assign(a, {opacity: cl(lt / 0.06), s: 1.55 - 0.55 * p, blur: 6 * (1 - p)});
	} else if (tipo === 'desliza') {
		const p = CURVAS.entrada(cl(lt / dur)); // atravessa da direita e trava (sem overshoot)
		Object.assign(a, {opacity: cl(lt / 0.05), tx: 900 * (1 - p), blur: 12 * (1 - p), r: 4 * (1 - p)});
	} else if (tipo === 'voa') {
		const [dx, dy] = VOO[e.entra?.de ?? 'baixo'];
		const p = CURVAS.entrada(cl(lt / dur)); // expo-out: quase todo o caminho nos primeiros 0,12 s, assenta macio
		const d = e.entra?.dist ?? 1400;
		const arco = Math.sin(Math.PI * (1 - p)) * d * 0.24 * (dx >= 0 ? 1 : -1); // trajetória em curva (arco lateral), não reta
		Object.assign(a, {opacity: cl(lt / 0.04), tx: dx * d * (1 - p) - dy * arco, ty: dy * d * (1 - p) + dx * arco, r: (dx >= 0 ? 1 : -1) * 24 * (1 - p), s: 1.12 - 0.12 * p, blur: 18 * Math.pow(1 - p, 1.5)});
	} else if (tipo === 'surge') {
		a.opacity = cl(lt / Math.max(0.01, dur));
	}
	const b = boiar(e, t, e.ini + dur);
	a.tx += b.tx;
	a.ty += b.ty;
	a.r += b.r;
	a.s *= b.s;
	if (e.fim != null) {
		const q = cl((e.fim - t) / SAIDA);
		a.opacity *= q;
		a.blur += 8 * (1 - q);
	}
	return a;
};

const estiloBase = (e: Elemento, a: Anim, h?: number): React.CSSProperties => ({
	position: 'absolute',
	left: e.x,
	top: e.y,
	width: e.w,
	height: h,
	transform: `translate(-50%, -50%) translate(${a.tx}px, ${a.ty}px) rotate(${(e.rot ?? 0) + a.r}deg) scale(${a.s})`,
	opacity: a.opacity,
	filter: a.blur > 0.3 ? `blur(${a.blur.toFixed(1)}px)` : undefined,
});

const Papel: React.FC<{e: Extract<Elemento, {tipo: 'papel'}>; a: Anim}> = ({e, a}) => {
	const h = e.h ?? e.w * 1.3;
	const sem = e.semente ?? 1;
	return (
		<div style={estiloBase(e, a, h)}>
			{!DESLIGADO.has('sombra') && <div style={{position: 'absolute', inset: '3%', boxShadow: '0 28px 60px rgba(0,0,0,0.75)'}} />}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					backgroundColor: e.cor ?? COR.carvao,
					backgroundImage: DESLIGADO.has('textura') ? undefined : `url(${texturaPapel(e.w, h, sem, e.cor ?? COR.carvao, {vincos: e.vincos, colunas: e.colunas})})`,
					backgroundSize: '100% 100%',
					clipPath: e.rasgado === false || DESLIGADO.has('borda') ? undefined : bordaRasgada(sem, 0.7),
					boxShadow: 'inset 0 2px 0 rgba(242,239,234,0.16)', // filete de luz de recorte na borda de cima
				}}
			/>
		</div>
	);
};

const Foto: React.FC<{e: Extract<Elemento, {tipo: 'foto'}>; a: Anim; t: number}> = ({e, a, t}) => {
	const h = e.h ?? e.w * 1.25;
	const borda = e.borda ?? 14;
	const [z0, z1] = e.zoomInterno ?? [1, 1.06];
	const vida = e.fim != null ? e.fim - e.ini : 8;
	const z = z0 + (z1 - z0) * CURVAS.suave(cl((t - e.ini) / vida));
	return (
		<div style={estiloBase(e, a, h)}>
			{!DESLIGADO.has('sombra') && <div style={{position: 'absolute', inset: '2%', boxShadow: '0 30px 70px rgba(0,0,0,0.8)'}} />}
			<div style={{position: 'absolute', inset: 0, background: COR.borda, clipPath: DESLIGADO.has('borda') ? undefined : bordaRasgada(e.semente ?? 3, 0.45, 28), padding: borda, boxSizing: 'border-box'}}>
				<div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#111'}}>
					<Img src={staticFile(e.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
					{e.halftone !== false && !DESLIGADO.has('halftone') && (
						<div style={{position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.55) 1.1px, transparent 1.7px)', backgroundSize: '6px 6px', mixBlendMode: 'multiply', opacity: 0.55}} />
					)}
				</div>
			</div>
		</div>
	);
};

const Recorte: React.FC<{e: Extract<Elemento, {tipo: 'recorte'}>; a: Anim}> = ({e, a}) => (
	<div style={estiloBase(e, a, e.h)}>
		<Img src={staticFile(e.src)} style={{width: '100%', height: e.h ? '100%' : 'auto', objectFit: 'contain'}} />
	</div>
);

const TAM = {apoio: 64, chave: 200, capitulo: 560};
// Degradês da identidade, aplicados no próprio nó do texto (background-clip não pega filho com transform). Regra do
// formato (prévia 2 do piloto): variar entre salmão→vermelho, salmão→laranja e vermelho→laranja, não uma cor só.
const DEGRADES = {
	'salmao-vermelho': 'linear-gradient(100deg, #F08C70 0%, #D9483A 52%, #B90015 100%)',
	'salmao-laranja': 'linear-gradient(100deg, #F4A285 0%, #EC8257 45%, #E26934 100%)',
	'vermelho-laranja': 'linear-gradient(100deg, #C21A1F 0%, #D95721 55%, #E9782F 100%)',
} as const;
const NOMES_DEGRADE = Object.keys(DEGRADES) as (keyof typeof DEGRADES)[];
const degrade = (nome: keyof typeof DEGRADES): React.CSSProperties => ({backgroundImage: DEGRADES[nome], WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingRight: '0.06em'});
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

const Texto: React.FC<{e: Extract<Elemento, {tipo: 'texto'}>; frame: number; fps: number}> = ({e, frame, fps}) => {
	const t = tempoPasso(frame, fps, e.passo ?? 1);
	const f = e.escala === 'apoio' ? FONTES.base : FONTES.serifa;
	const tam = e.tamanho ?? TAM[e.escala];
	const saida = e.fim != null ? cl((e.fim - t) / SAIDA) : 1;
	const bo = boiar(e, frame / fps, e.ini + 0.3);
	const marca = e.cor === 'marca'; // palavra num dos degradês da identidade
	const DEGRADE = degrade(e.degrade ?? NOMES_DEGRADE[hash(e.id) % NOMES_DEGRADE.length]);
	const rc = e.recua ? 1 - (1 - e.recua.para) * CURVAS.expo(cl((t - e.recua.t) / (e.recua.dur ?? 0.6))) : 1;
	const tremor = e.torto ? prng(Math.floor(frame / 3) + 77) : null;
	return (
		<div
			style={{
				position: 'absolute',
				left: e.x,
				top: e.y,
				width: e.w,
				transform: `translate(-50%, -50%) translate(${bo.tx * 0.5}px, ${bo.ty * 0.5}px) rotate(${(e.rot ?? 0) + bo.r * 0.5}deg) scale(${rc})`,
				fontFamily: f.family,
				fontStyle: f.style,
				fontWeight: e.escala === 'apoio' ? 600 : f.weight,
				letterSpacing: e.escala === 'apoio' ? '-0.01em' : '-0.02em',
				lineHeight: e.escala === 'apoio' ? 1.1 : 0.95,
				fontSize: tam,
				color: marca ? COR.texto : e.cor ?? COR.texto,
				textAlign: e.alinhar ?? 'left',
				textShadow: marca ? undefined : '0 4px 24px rgba(0,0,0,0.65)',
				opacity: saida,
				filter: [saida < 1 ? `blur(${(8 * (1 - saida)).toFixed(1)}px)` : '', marca ? 'drop-shadow(0 6px 18px rgba(0,0,0,0.7))' : ''].join(' ').trim() || undefined,
			}}
		>
			{e.palavras.map((p, i) => {
				const lt = t - p.t;
				const q = CURVAS.entrada(cl(lt / (e.entra?.dur ?? (e.escala === 'apoio' ? 0.15 : 0.2))));
				const slam = e.entra?.tipo === 'slam';
				const s = slam ? 1.45 - 0.45 * q : 0.9 + 0.1 * q;
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							marginRight: i < e.palavras.length - 1 ? '0.24em' : 0,
							...(marca && !e.torto ? DEGRADE : {}),
							opacity: lt < 0 ? 0 : slam ? cl(lt / 0.05) : q,
							transform: `scale(${s})`,
							filter: lt >= 0 && q < 0.97 ? `blur(${(8 * (1 - q)).toFixed(1)}px)` : undefined,
						}}
					>
						{e.torto && tremor
							? [...p.w].map((ch, j) => {
									const r = prng(i * 31 + j + 5);
									const cai = CURVAS.entrada(cl((lt - j * 0.03) / 0.25));
									return (
										<span key={j} style={{...(marca ? DEGRADE : {}), display: 'inline-block', transform: `translateY(${-90 * (1 - cai) + (tremor() - 0.5) * 6}px) rotate(${(r() - 0.5) * 26 + (tremor() - 0.5) * 6}deg)`}}>
											{ch}
										</span>
									);
								})
							: p.w}
					</span>
				);
			})}
		</div>
	);
};

const Marca: React.FC<{e: Extract<Elemento, {tipo: 'marca'}>; t: number}> = ({e, t}) => {
	const p = CURVAS.desenho(cl((t - e.ini) / (e.dur ?? 0.28)));
	const saida = e.fim != null ? cl((e.fim - t) / SAIDA) : 1;
	return (
		<div
			style={{
				position: 'absolute',
				left: e.x,
				top: e.y,
				width: e.w,
				height: e.h ?? 110,
				transform: `translate(-50%, -50%) rotate(${e.rot ?? 0}deg)`,
				opacity: saida,
			}}
		>
			<div style={{width: '100%', height: '100%', background: e.cor ?? COR.carmim, transformOrigin: '0 50%', transform: `scaleX(${p})`, clipPath: bordaRasgada(17, 4, 20)}} />
		</div>
	);
};

const Fita: React.FC<{e: Extract<Elemento, {tipo: 'fita'}>; a: Anim}> = ({e, a}) => (
	<div style={estiloBase(e, a, e.h ?? 54)}>
		<div
			style={{
				width: '100%',
				height: '100%',
				background: 'linear-gradient(180deg, rgba(228,218,198,0.55), rgba(214,204,184,0.42))',
				clipPath: 'polygon(0 6%, 4% 0, 96% 3%, 100% 10%, 97% 50%, 100% 92%, 95% 100%, 3% 96%, 0 88%, 3% 50%)',
				boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)',
			}}
		/>
	</div>
);

const Traco: React.FC<{e: Extract<Elemento, {tipo: 'traco'}>; frame: number; fps: number}> = ({e, frame, fps}) => {
	const passo = e.passo ?? 3;
	const t = tempoPasso(frame, fps, passo);
	const p = CURVAS.risco(cl((t - e.ini) / (e.dur ?? 0.4)));
	const ev = evolvePath(p, e.d);
	const r = prng(Math.floor(frame / passo) + 5);
	const h = e.h ?? (e.w * e.vb[1]) / e.vb[0];
	const b = boiar(e, frame / fps, e.ini);
	return (
		<svg viewBox={`0 0 ${e.vb[0]} ${e.vb[1]}`} style={{position: 'absolute', left: e.x, top: e.y, width: e.w, height: h, overflow: 'visible', transform: `translate(-50%, -50%) translate(${(r() - 0.5) * 3 + b.tx}px, ${(r() - 0.5) * 3 + b.ty}px) rotate(${(e.rot ?? 0) + b.r}deg) scale(${b.s})`}}>
			<path d={e.d} fill="none" stroke={e.cor ?? COR.texto} strokeWidth={e.espessura ?? 6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
		</svg>
	);
};

const Luz: React.FC<{e: Extract<Elemento, {tipo: 'luz'}>; a: Anim}> = ({e, a}) => (
	<div style={{...estiloBase(e, a, e.h ?? e.w), filter: undefined, background: `radial-gradient(closest-side, rgba(242,239,234,${e.forca ?? 0.1}), rgba(242,239,234,0))`, mixBlendMode: 'screen'}} />
);

export const ElementoView: React.FC<{e: Elemento; frame: number; fps: number}> = ({e, frame, fps}) => {
	const t = tempoPasso(frame, fps, e.passo ?? 1);
	if (e.tipo === 'texto') return <Texto e={e} frame={frame} fps={fps} />;
	if (e.tipo === 'objeto') {
		// objetos também voam e boiam: envoltório no ponto do objeto (os objetos se posicionam sozinhos no plano)
		const a = e.entra ? animEntrada(e, frame / fps, fps) : {...boiar(e, frame / fps, e.ini), opacity: 1, blur: 0};
		return (
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: `${e.x}px ${e.y}px`, transform: `translate(${a.tx}px, ${a.ty}px) rotate(${a.r}deg) scale(${a.s})`, opacity: a.opacity, filter: a.blur > 0.3 ? `blur(${a.blur.toFixed(1)}px)` : undefined}}>
				<ObjetoView e={e} t={frame / fps} fps={fps} frame={frame} />
			</div>
		);
	}
	if (e.tipo === 'traco') return <Traco e={e} frame={frame} fps={fps} />;
	if (e.tipo === 'marca') return <Marca e={e} t={t} />;
	const a = animEntrada(e, t, fps);
	if (e.tipo === 'luz' && DESLIGADO.has('luz')) return null;
	if (e.tipo === 'papel') return <Papel e={e} a={a} />;
	if (e.tipo === 'foto') return <Foto e={e} a={a} t={frame / fps} />;
	if (e.tipo === 'recorte') return <Recorte e={e} a={a} />;
	if (e.tipo === 'fita') return <Fita e={e} a={a} />;
	return <Luz e={e} a={a} />;
};

// Primeiro instante em que a peça aparece (o texto nasce na 1ª palavra).
export const nasce = (e: Elemento) => (e.tipo === 'texto' ? Math.min(e.ini, ...e.palavras.map((p) => p.t)) : e.ini);
