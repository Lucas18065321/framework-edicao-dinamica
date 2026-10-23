// Objetos de papel desenhados em código para o quadro contínuo (PAPER VOX ANIMATION): cada um mora numa caixa w×h do mundo e
// anima pelos instantes `ev` (segundos, ancorados nas palavras pelo gerador). Nada aqui é imagem gerada: SVG e CSS.
// Paleta: carvão, tinta clara e o carmim como acento (as palavras-chave em degradê ficam no elementos.tsx).
import React from 'react';
import {Img, spring, staticFile} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {siInstagram, siYoutube} from 'simple-icons';
import {CURVAS, MOLAS} from '../../kit/tempo';
import {FONTES} from '../../kit/fontes';
import {prng} from './texturas';
import {CURVAS_LAB} from './camera';
import type {Elemento} from './tipos';

type Obj = Extract<Elemento, {tipo: 'objeto'}>;
type Props = {e: Obj; t: number; fps: number; frame: number};

const TINTA = '#F2EFEA', CARMIM = '#B90015', CARVAO = '#1C1A18', SOMBRA = '#2A2624';
const cl = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const prog = (t: number, t0: number | undefined, dur: number, curva = CURVAS.entrada) => (t0 == null ? 0 : curva(cl((t - t0) / dur)));
const passo = (t: number, fps: number, n: number) => Math.floor((t * fps) / n) * (n / fps); // tempo em passos (12 fps = 2)
const P = <T,>(e: Obj, k: string, d: T): T => ((e.p?.[k] as T) ?? d);

const caixa = (e: Obj, h: number): React.CSSProperties => ({position: 'absolute', left: e.x, top: e.y, width: e.w, height: h, transform: `translate(-50%, -50%) rotate(${e.rot ?? 0}deg)`});

// Perfil de cabeça (forma simples, sem rosto), voltado para a direita, 100×132.
const CABECA = 'M50 8 C73 8 87 25 87 46 C87 57 83 63 86 70 L93 81 L86 85 C86 93 81 99 72 99 L64 99 L64 109 C85 113 99 121 100 132 L0 132 C1 121 16 113 36 109 L36 99 C21 94 13 79 13 60 C13 30 28 8 50 8 Z';

const Silhuetas: React.FC<Props> = ({e, t}) => {
	const n = P(e, 'n', 7), ev = e.ev ?? {};
	const h = (e.w / n) * 1.32;
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${n * 100} 132`} overflow="visible">
			<defs><clipPath id={`cab-${e.id}`}><path d={CABECA} /></clipPath></defs>
			{Array.from({length: n}, (_, i) => {
				const lt = t - ((ev.entra ?? e.ini) + (i * 2) / 24);
				if (lt < 0) return null;
				const s = 0.8 + 0.2 * CURVAS.entrada(cl(lt / 0.15));
				const q = ev.tinta == null ? 0 : CURVAS.suave(cl((t - ev.tinta - i * 0.05) / 0.3));
				return (
					<g key={i} transform={`translate(${i * 100 + 50} 132) scale(${s}) translate(-50 -132)`} opacity={cl(lt / 0.1)}>
						<path d={CABECA} fill={SOMBRA} stroke="rgba(242,239,234,0.22)" strokeWidth={1.4} />
						<rect x={0} y={132 * (1 - q)} width={100} height={132 * q} fill="#060506" opacity={0.92} clipPath={`url(#cab-${e.id})`} />
					</g>
				);
			})}
		</svg>
	);
};

const Aspas: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? 360;
	const m = ev.entra == null || t < ev.entra ? 0 : spring({frame: (t - ev.entra) * fps, fps, config: MOLAS.snappy});
	const f = FONTES.serifa;
	const g = (lado: 'l' | 'r') => (
		<span style={{position: 'absolute', [lado === 'l' ? 'left' : 'right']: 0, top: 0, fontFamily: f.family, fontStyle: 'italic', fontSize: h, lineHeight: 1, color: TINTA, opacity: m > 0 ? 1 : 0, transform: `translateY(${-300 * (1 - m)}px) rotate(${(lado === 'l' ? -8 : 8) * (1 - m)}deg)`, textShadow: '0 8px 30px rgba(0,0,0,0.7)'}}>
			{lado === 'l' ? '“' : '”'}
		</span>
	);
	return <div style={caixa(e, h)}>{g('l')}{g('r')}</div>;
};

const Carimbo: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? 220;
	if (ev.bate == null || t < ev.bate) return null;
	const q = CURVAS.entrada(cl((t - ev.bate) / 0.12));
	const f = Math.floor((t - ev.bate) * fps);
	const sx = f < 3 ? (f % 2 ? 6 : -6) : 0;
	return (
		<div style={{...caixa(e, h), transform: `translate(-50%, -50%) translate(${sx}px, 0) rotate(${e.rot ?? -8}deg) scale(${1 + 0.8 * (1 - q)})`, opacity: cl((t - ev.bate) / 0.04) * 0.93}}>
			<div style={{width: '100%', height: '100%', boxSizing: 'border-box', border: `12px solid ${CARMIM}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTES.impacto.family, fontWeight: 900, fontSize: P(e, 'tamanho', 150), letterSpacing: '0.1em', color: CARMIM, textTransform: 'uppercase'}}>
				{P(e, 'texto', '')}
			</div>
		</div>
	);
};

const Riscos: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? 200, n = P(e, 'n', 4);
	const tq = passo(t, fps, 3);
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`} overflow="visible">
			{Array.from({length: n}, (_, i) => {
				const p = prog(tq, (ev.desenha ?? e.ini) + i * 0.05, 0.25, CURVAS.risco);
				const y = (h * (i + 0.5)) / n, x1 = e.w * (0.15 + 0.2 * (i % 2)), x0 = e.w;
				return <line key={i} x1={x0} y1={y} x2={lerp(x0, x1, p)} y2={y + (i - n / 2) * 3} stroke="rgba(242,239,234,0.6)" strokeWidth={6} strokeLinecap="round" />;
			})}
		</svg>
	);
};

const Persiana: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w;
	const p = prog(t, ev.passa, 1.4, CURVAS.suave);
	if (ev.passa == null || t < ev.passa) return null;
	return (
		<div style={{...caixa(e, h), overflow: 'hidden', mixBlendMode: 'multiply'}}>
			<div style={{position: 'absolute', top: '-20%', bottom: '-20%', width: '220%', left: `${lerp(-120, 0, p)}%`, background: 'repeating-linear-gradient(110deg, rgba(0,0,0,0.6) 0 46px, rgba(0,0,0,0) 46px 96px)', opacity: Math.sin(Math.PI * p) * 0.9}} />
		</div>
	);
};

const Bateria: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 0.48;
	const tq = passo(t, fps, 2);
	const k = ev.esvazia == null || tq < ev.esvazia ? 4 : Math.max(1, 4 - Math.floor(4 * cl((tq - ev.esvazia) / 1.0)));
	const pisca = ev.pisca != null && t > ev.pisca && t < ev.pisca + 0.75 && Math.floor((t - ev.pisca) * 8) % 2 === 1;
	const bw = (e.w - 110) / 4;
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`}>
			<rect x={8} y={8} width={e.w - 60} height={h - 16} rx={26} fill="rgba(0,0,0,0.35)" stroke={TINTA} strokeWidth={8} />
			<rect x={e.w - 46} y={h * 0.32} width={30} height={h * 0.36} rx={8} fill={TINTA} />
			{Array.from({length: 4}, (_, i) => (i < k && !(pisca && i === 0) ? <rect key={i} x={30 + i * (bw + 8)} y={30} width={bw - 8} height={h - 60} rx={10} fill={k === 1 ? CARMIM : 'rgba(242,239,234,0.85)'} /> : null))}
		</svg>
	);
};

const Celular: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 2.05;
	const ch = 300, n = 8;
	const off = ev.rola == null || t < ev.rola ? 0 : ((t - ev.rola) * 620) % (ch * n);
	const r = prng(9);
	const cards = Array.from({length: n * 2}, (_, i) => ({w: 0.5 + r() * 0.4, img: r() > 0.35}));
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`}>
			<defs><clipPath id={`tela-${e.id}`}><rect x={24} y={24} width={e.w - 48} height={h - 48} rx={46} /></clipPath></defs>
			<rect x={0} y={0} width={e.w} height={h} rx={70} fill="#0d0c0e" stroke="#3a3634" strokeWidth={5} />
			<rect x={24} y={24} width={e.w - 48} height={h - 48} rx={46} fill="#141215" />
			<g clipPath={`url(#tela-${e.id})`}>
				{cards.map((c, i) => {
					const y = 60 + i * ch - off;
					return (
						<g key={i} transform={`translate(48 ${y})`}>
							<rect width={e.w - 96} height={ch - 30} rx={22} fill="#1f1c1c" />
							{c.img && <rect x={18} y={18} width={e.w - 132} height={ch * 0.5} rx={14} fill="#2c2826" />}
							<rect x={18} y={c.img ? ch * 0.5 + 34 : 30} width={(e.w - 132) * c.w} height={16} rx={8} fill="rgba(242,239,234,0.18)" />
							<rect x={18} y={c.img ? ch * 0.5 + 62 : 58} width={(e.w - 132) * c.w * 0.6} height={16} rx={8} fill="rgba(242,239,234,0.12)" />
						</g>
					);
				})}
			</g>
			<rect x={e.w / 2 - 60} y={40} width={120} height={22} rx={11} fill="#0d0c0e" />
		</svg>
	);
};

const Relogio: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, R = e.w / 2;
	const dt = ev.gira == null || t < ev.gira ? 0 : t - ev.gira;
	const ang = 2600 * 0.8 * (1 - Math.exp(-dt / 0.8)) + 40;
	return (
		<svg style={caixa(e, e.w)} viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}>
			<circle r={R - 6} fill="#151316" stroke={TINTA} strokeWidth={7} />
			{Array.from({length: 12}, (_, i) => <line key={i} x1={0} y1={-R + 22} x2={0} y2={-R + (i % 3 ? 36 : 50)} stroke={TINTA} strokeWidth={i % 3 ? 3 : 6} transform={`rotate(${i * 30})`} />)}
			<line x1={0} y1={0} x2={0} y2={-R * 0.72} stroke={TINTA} strokeWidth={8} strokeLinecap="round" transform={`rotate(${ang})`} />
			<line x1={0} y1={0} x2={0} y2={-R * 0.45} stroke={TINTA} strokeWidth={12} strokeLinecap="round" transform={`rotate(${ang / 12 + 120})`} />
			<circle r={12} fill={CARMIM} />
		</svg>
	);
};

const X = ({x, y, s, p1, p2}: {x: number; y: number; s: number; p1: number; p2: number}) => (
	<g stroke={TINTA} strokeWidth={5} strokeLinecap="round" opacity={0.85}>
		{p1 > 0 && <line x1={x + s * 0.2} y1={y + s * 0.2} x2={x + s * (0.2 + 0.6 * p1)} y2={y + s * (0.2 + 0.6 * p1)} />}
		{p2 > 0 && <line x1={x + s * 0.8} y1={y + s * 0.2} x2={x + s * (0.8 - 0.6 * p2)} y2={y + s * (0.2 + 0.6 * p2)} />}
	</g>
);

const Calendario: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 0.9;
	const cols = 7, rows = 5, cw = e.w / cols, rh = (h - 70) / rows, s = Math.min(cw, rh) * 0.86;
	const tq = passo(t, fps, 2);
	const scroll = ev.repete == null || t < ev.repete ? 0 : (t - ev.repete) * 420;
	const grade = (dy: number, todas: boolean, k: number) => (
		<g key={k} transform={`translate(0 ${dy})`}>
			<rect x={0} y={0} width={e.w} height={52} rx={8} fill="rgba(242,239,234,0.12)" />
			{Array.from({length: cols * rows}, (_, i) => {
				const ap = todas ? 1 : prog(t, (ev.monta ?? e.ini) + i / 24, 0.12);
				const mk = todas ? 1 : 0;
				const tm = ev.marca == null ? Infinity : ev.marca + (i * 2) / 24;
				const p1 = mk || cl((tq - tm) / (2 / 24) + 0.5), p2 = mk || cl((tq - tm - 2 / 24) / (2 / 24) + 0.5);
				const x = (i % cols) * cw + (cw - s) / 2, y = 70 + Math.floor(i / cols) * rh + (rh - s) / 2;
				return ap > 0 ? (
					<g key={i} opacity={ap}>
						<rect x={x} y={y} width={s} height={s} rx={8} fill="rgba(0,0,0,0.25)" stroke="rgba(242,239,234,0.28)" strokeWidth={2} />
						<X x={x} y={y} s={s} p1={tq >= tm ? p1 : 0} p2={tq >= tm ? p2 : 0} />
					</g>
				) : null;
			})}
		</g>
	);
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`}>
			<defs><clipPath id={`cal-${e.id}`}><rect x={-10} y={-10} width={e.w + 20} height={h + 20} /></clipPath></defs>
			<g clipPath={`url(#cal-${e.id})`}>
				{grade(-(scroll % (h + 40)), ev.repete != null && t >= ev.repete, 0)}
				{ev.repete != null && t >= ev.repete && [1, 2].map((k) => grade(k * (h + 40) - (scroll % (h + 40)), true, k))}
			</g>
		</svg>
	);
};

// Lista em papel: linhas sem texto (só barras) e 1 linha com rótulo da fala. "cresce": linhas novas entram ACIMA do
// rótulo e o empurram para fora da caixa. "marca": faixa carmim se desenha no rótulo.
const Lista: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, n0 = P(e, 'n', 8), lh = P(e, 'altura', 84), rot = P(e, 'rotulo', ''), iR = P(e, 'idx', 5);
	const h = e.h ?? n0 * lh;
	const extra = ev.cresce == null ? 0 : 14 * prog(t, ev.cresce, 1.0, CURVAS.suave);
	const r = prng(21);
	const larg = Array.from({length: 120}, () => 0.35 + r() * 0.55);
	const tq = passo(t, fps, 2);
	const linha = (key: string, y: number, i: number, especial: boolean, check: number, op = 1) => (
		<g key={key} transform={`translate(0 ${y})`} opacity={op}>
			<rect x={0} y={lh * 0.22} width={lh * 0.5} height={lh * 0.5} rx={6} fill="none" stroke="rgba(242,239,234,0.55)" strokeWidth={3} />
			{check > 0 && <path d={`M ${lh * 0.1} ${lh * 0.48} L ${lh * 0.24} ${lh * 0.62} L ${lh * 0.48} ${lh * 0.3}`} fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" strokeDasharray={60} strokeDashoffset={60 * (1 - check)} />}
			{especial && ev.marca != null && <rect x={lh * 0.7} y={lh * 0.12} width={(e.w - lh * 0.6) * prog(t, ev.marca, 0.3, CURVAS.desenho)} height={lh * 0.72} fill={CARMIM} opacity={0.92} />}
			{!especial && <rect x={lh * 0.8} y={lh * 0.4} width={(e.w - lh) * larg[i % 120]} height={lh * 0.16} rx={lh * 0.08} fill="rgba(242,239,234,0.18)" />}
		</g>
	);
	const linhas: React.ReactNode[] = [];
	let k = 0;
	for (let i = 0; i < n0; i++) {
		if (i === iR) {
			const ne = Math.ceil(extra);
			for (let j = 0; j < ne; j++) linhas.push(linha(`x${j}`, (iR + j) * lh, 200 + j, false, 1, cl(extra - j)));
			linhas.push(linha('r', (iR + extra) * lh, i, true, 0));
			continue;
		}
		const tc = ev.checks == null ? Infinity : ev.checks + (k++ * 2) / 24;
		linhas.push(linha(`l${i}`, (i > iR ? i + extra : i) * lh, i, false, cl((tq - tc) / (2 / 24))));
	}
	// rótulo em HTML, não em <text> do SVG: medido em 2026-10-19, o Chrome passou a desenhar o <text> 2,4× maior depois
	// de muitos quadros com troca de escala (só no render longo; quadro isolado e trecho curto saíam certos)
	const yR = (iR + extra) * lh;
	return (
		<div style={{...caixa(e, h), overflow: 'hidden'}}>
			<svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox={`0 0 ${e.w} ${h}`}>{linhas}</svg>
			{yR < h && <div style={{position: 'absolute', left: lh * 0.8, top: yR, height: lh, display: 'flex', alignItems: 'center', fontFamily: FONTES.base.family, fontWeight: 600, fontSize: lh * 0.5, lineHeight: 1, color: TINTA, whiteSpace: 'nowrap'}}>{rot}</div>}
		</div>
	);
};

const Manometro: React.FC<Props> = ({e, t}) => {
	const h = e.h ?? e.w * 0.72, R = e.w * 0.42, cx = e.w / 2, cy = h * 0.72;
	const niveis = P<[number, number][]>(e, 'niveis', []);
	let v = 0;
	for (const [tk, alvo] of niveis) {
		if (t < tk) break;
		const ult = alvo >= 0.99;
		v = lerp(v, alvo, (ult ? CURVAS_LAB.snap : CURVAS.entrada)(cl((t - tk) / (ult ? 0.25 : 0.45))));
	}
	if (v > 0.9) v += Math.sin(t * 46) * 0.006;
	const ang = (f: number) => Math.PI * (1 + f);
	const pt = (f: number, r: number) => [cx + Math.cos(ang(f)) * r, cy + Math.sin(ang(f)) * r];
	const arco = (f0: number, f1: number, r: number) => { const [x0, y0] = pt(f0, r), [x1, y1] = pt(f1, r); return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`; };
	const [nx, ny] = pt(v, R * 0.86);
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`}>
			<path d={arco(0, 1, R + 26)} fill="none" stroke="rgba(242,239,234,0.12)" strokeWidth={60} />
			<path d={arco(0, 0.8, R)} fill="none" stroke="rgba(242,239,234,0.5)" strokeWidth={12} />
			<path d={arco(0.8, 1, R)} fill="none" stroke={CARMIM} strokeWidth={16} />
			{Array.from({length: 11}, (_, i) => { const [a, b] = pt(i / 10, R - 18), [c, d] = pt(i / 10, R - (i % 5 ? 44 : 64)); return <line key={i} x1={a} y1={b} x2={c} y2={d} stroke={i >= 8 ? CARMIM : TINTA} strokeWidth={i % 5 ? 4 : 8} />; })}
			<line x1={cx} y1={cy} x2={nx} y2={ny} stroke={v > 0.8 ? CARMIM : TINTA} strokeWidth={12} strokeLinecap="round" />
			<circle cx={cx} cy={cy} r={30} fill={CARVAO} stroke={TINTA} strokeWidth={6} />
		</svg>
	);
};

const Spot: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w;
	const op = prog(t, ev.acende, 0.3) * (1 - prog(t, ev.apaga, 0.3));
	if (op <= 0) return null;
	return <div style={{...caixa(e, h), background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 16%, rgba(5,4,6,0.92) 46%)', opacity: op}} />;
};

const Espelho: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 1.4;
	const b = 12 * (1 - prog(t, ev.foco, 0.4));
	return (
		<div style={{...caixa(e, h), boxSizing: 'border-box', border: '14px solid #3a3532', borderRadius: 18, background: 'linear-gradient(160deg, #2a2a2e 0%, #121114 60%, #1c1b20 100%)', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.8)'}}>
			<Img src={staticFile(P(e, 'src', ''))} style={{position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain', transform: 'scaleX(-1)', filter: `blur(${b.toFixed(1)}px) brightness(0.8)`, opacity: 0.85}} />
			<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(242,239,234,0.10) 0%, rgba(242,239,234,0) 35%)'}} />
		</div>
	);
};

const CORACAO = 'M100 172 C 40 122 0 92 0 52 C 0 22 25 2 52 2 C 75 2 92 16 100 32 C 108 16 125 2 148 2 C 175 2 200 22 200 52 C 200 92 160 122 100 172 Z';
const Coracao: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.w * 0.88;
	const r = prng(13);
	const zig = Array.from({length: 12}, (_, i) => [100 + (r() - 0.5) * 18, (i / 11) * 176]);
	const esq = `0,0 ${zig.map(([x, y]) => `${x},${y}`).join(' ')} 0,180`;
	const dir = `200,0 ${zig.map(([x, y]) => `${x},${y}`).join(' ')} 200,180`;
	const q = prog(t, ev.rasga, 0.3), c = prog(t, ev.cai, 0.8, CURVAS.saida);
	const metade = (lado: number, pts: string) => (
		<g transform={`translate(${lado * (40 * q + 60 * c)} ${1300 * c}) rotate(${lado * (10 * q + 35 * c)} 100 90)`}>
			<clipPath id={`cr-${e.id}-${lado}`}><polygon points={pts} /></clipPath>
			<g clipPath={`url(#cr-${e.id}-${lado})`}>
				<path d={CORACAO} fill={CARMIM} stroke="#6a0010" strokeWidth={3} />
				<path d={CORACAO} fill="url(#brilho)" opacity={0.35} />
			</g>
		</g>
	);
	return (
		<svg style={caixa(e, h)} viewBox="0 0 200 180" overflow="visible">
			<defs><radialGradient id="brilho" cx="35%" cy="25%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity={0.5} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></radialGradient></defs>
			{metade(-1, esq)}
			{metade(1, dir)}
		</svg>
	);
};

const Folhas: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 1.1, n = 6;
	const tq = passo(t, fps, 2);
	return (
		<div style={caixa(e, h)}>
			{Array.from({length: n}, (_, i) => {
				const k = n - 1 - i; // de baixo para cima
				const tv = ev.vira == null ? Infinity : ev.vira + (i * 3) / 24;
				const f = cl((tq - tv) / (3 / 24));
				if (f >= 1) return null;
				return (
					<div key={i} style={{position: 'absolute', inset: 0, transform: `translate(${k * 3}px, ${k * 3}px) scaleY(${1 - f})`, transformOrigin: '50% 0', background: '#24201d', border: '2px solid rgba(242,239,234,0.18)', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: n - i}}>
						<div style={{height: '14%', background: 'rgba(185,0,21,0.55)', borderRadius: '6px 6px 0 0'}} />
						<div style={{position: 'absolute', inset: '20% 6% 6% 6%', backgroundImage: 'linear-gradient(rgba(242,239,234,0.10) 2px, transparent 2px), linear-gradient(90deg, rgba(242,239,234,0.10) 2px, transparent 2px)', backgroundSize: '14.28% 20%'}} />
					</div>
				);
			})}
		</div>
	);
};

const Perfis: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 0.45;
	const op = prog(t, ev.surge, 0.4), b = 14 * (1 - op);
	const s = h / 132;
	const x0 = 93 * s, y0 = 81 * s, x1 = e.w - 93 * s;
	const vib = ev.vibra == null || t < ev.vibra ? 0 : Math.sin((t - ev.vibra) * 40) * 26 * Math.exp(-(t - ev.vibra) / 0.35);
	const d = `M ${x0} ${y0} Q ${e.w / 2} ${y0 + 70 + vib} ${x1} ${y0}`;
	const pf = prog(t, ev.fio, 0.5, CURVAS.desenho);
	const ep = pf > 0 ? evolvePath(pf, d) : null;
	const pp = ev.pulso == null ? -1 : cl((t - ev.pulso) / 0.7);
	const pos = pp >= 0 && pp < 1 ? getPointAtLength(d, getLength(d) * pp) : null;
	return (
		<svg style={{...caixa(e, h), filter: b > 0.3 ? `blur(${b.toFixed(1)}px)` : undefined, opacity: op}} viewBox={`0 0 ${e.w} ${h}`} overflow="visible">
			<defs>
				<linearGradient id={`pg-${e.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CARMIM} /><stop offset="1" stopColor="#4a3c33" /></linearGradient>
			</defs>
			<path d={CABECA} transform={`scale(${s})`} fill={`url(#pg-${e.id})`} />
			<path d={CABECA} transform={`translate(${e.w} 0) scale(${-s} ${s})`} fill={`url(#pg-${e.id})`} />
			{ep && <path d={d} fill="none" stroke={CARMIM} strokeWidth={7} strokeLinecap="round" strokeDasharray={ep.strokeDasharray} strokeDashoffset={ep.strokeDashoffset} />}
			{pos && <circle cx={pos.x} cy={pos.y} r={16} fill={TINTA} opacity={0.9} />}
		</svg>
	);
};

const Balanca: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 0.8;
	const cai = ev.desce == null || t < ev.desce ? 0 : spring({frame: (t - ev.desce) * fps, fps, config: MOLAS.snappy});
	let a = 0;
	if (ev.oscila != null && t > ev.oscila) a += 9 * Math.sin((t - ev.oscila) * 2 * Math.PI * 1.4) * Math.exp(-(t - ev.oscila) / 0.9);
	if (ev.afunda != null) a += 14 * prog(t, ev.afunda, 0.35);
	if (ev.volta != null && t > ev.volta) a -= 14 * spring({frame: (t - ev.volta) * fps, fps, config: MOLAS.smooth});
	const px = e.w / 2, py = h * 0.22, L = e.w * 0.4, rad = (a * Math.PI) / 180;
	const ponta = (lado: number) => [px + lado * L * Math.cos(rad), py + lado * L * Math.sin(rad)];
	const prato = (lado: number) => {
		const [x, y] = ponta(lado);
		const yd = y + h * 0.42;
		return (
			<g key={lado}>
				<line x1={x} y1={y} x2={x - 70} y2={yd} stroke="rgba(242,239,234,0.6)" strokeWidth={3} />
				<line x1={x} y1={y} x2={x + 70} y2={yd} stroke="rgba(242,239,234,0.6)" strokeWidth={3} />
				<path d={`M ${x - 95} ${yd} Q ${x} ${yd + 70} ${x + 95} ${yd} Z`} fill={SOMBRA} stroke={TINTA} strokeWidth={4} />
			</g>
		);
	};
	return (
		<svg style={{...caixa(e, h), transform: `translate(-50%, -50%) translateY(${-h * 1.2 * (1 - cai)}px)`}} viewBox={`0 0 ${e.w} ${h}`} overflow="visible">
			<line x1={px} y1={py} x2={px} y2={h * 0.95} stroke={TINTA} strokeWidth={10} />
			<path d={`M ${px - 150} ${h * 0.97} L ${px + 150} ${h * 0.97} L ${px + 90} ${h * 0.9} L ${px - 90} ${h * 0.9} Z`} fill={SOMBRA} stroke={TINTA} strokeWidth={4} />
			<line x1={ponta(-1)[0]} y1={ponta(-1)[1]} x2={ponta(1)[0]} y2={ponta(1)[1]} stroke={TINTA} strokeWidth={12} strokeLinecap="round" />
			<circle cx={px} cy={py} r={18} fill={CARMIM} />
			{prato(-1)}
			{prato(1)}
		</svg>
	);
};

const Agenda: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 1.1;
	const cols = 5, rows = 6, gx = 12, cw = (e.w - gx * (cols + 1)) / cols, rh = (h - 120 - gx * (rows + 1)) / rows;
	const tq = passo(t, fps, 2);
	const blocos = [];
	for (let i = 0; i < cols * rows; i++) {
		const t0 = ev.cai == null ? Infinity : ev.cai + (i * 2.5) / 24;
		if (tq < t0) continue;
		const p = CURVAS.entrada(cl((tq - t0) / 0.2));
		const x = gx + (i % cols) * (cw + gx), y = 120 + gx + Math.floor(i / cols) * (rh + gx);
		blocos.push(<rect key={i} x={x} y={lerp(-rh, y, p)} width={cw} height={rh} rx={10} fill="#3a3532" stroke="rgba(242,239,234,0.2)" strokeWidth={2} />);
	}
	let sy = -200, sx = e.w / 2 - cw, op = 0, rot = 0;
	if (ev.tenta != null && t >= ev.tenta) {
		const d = t - ev.tenta;
		op = 1;
		sy = d < 0.25 ? lerp(-200, 40, CURVAS.saida(d / 0.25)) : 40 - 60 * Math.sin(Math.min(1, (d - 0.25) / 0.3) * Math.PI) * Math.exp(-(d - 0.25));
	}
	if (ev.empurra != null && t >= ev.empurra) {
		const q = prog(t, ev.empurra, 0.5, CURVAS.saida);
		sx += e.w * q;
		rot = 14 * q;
		op = 1 - q;
	}
	const grade = (
		<svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}} viewBox={`0 0 ${e.w} ${h}`}>
			<rect x={0} y={110} width={e.w} height={h - 110} rx={16} fill="rgba(0,0,0,0.35)" stroke="rgba(242,239,234,0.35)" strokeWidth={3} />
			{Array.from({length: cols}, (_, c) => <rect key={c} x={gx + c * (cw + gx)} y={70} width={cw} height={26} rx={6} fill="rgba(242,239,234,0.18)" />)}
			{blocos}
		</svg>
	);
	return (
		<div style={caixa(e, h)}>
			{grade}
			{op > 0 && (
				<div style={{position: 'absolute', left: sx, top: sy, width: cw * 2, height: rh, borderRadius: 12, background: CARMIM, opacity: op, transform: `rotate(${rot}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTES.base.family, fontWeight: 700, fontSize: rh * 0.48, lineHeight: 1, color: TINTA}}>
					{P(e, 'rotulo', '')}
				</div>
			)}
		</div>
	);
};

const engrenagem = (r: number, n: number) => {
	const pts: string[] = [];
	const ri = r * 0.82, dt = (Math.PI * 2) / n;
	for (let i = 0; i < n; i++) {
		const a = i * dt;
		for (const [f, rr] of [[0, ri], [0.12, r], [0.42, r], [0.54, ri]] as [number, number][]) pts.push(`${(Math.cos(a + f * dt) * rr).toFixed(1)},${(Math.sin(a + f * dt) * rr).toFixed(1)}`);
	}
	return `M ${pts.join(' L ')} Z`;
};
const Engrenagens: React.FC<Props> = ({e, t}) => {
	const h = e.h ?? e.w;
	const gs = P<{x: number; y: number; r: number; n: number; dir: number; ini: number; para?: number}[]>(e, 'gears', []);
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`} overflow="visible">
			{gs.map((g, i) => {
				if (t < g.ini) return null;
				const tf = g.para != null ? Math.min(t, g.para) : t;
				const ang = g.dir * (5200 / g.r) * (tf - g.ini);
				const s = 0.7 + 0.3 * CURVAS.entrada(cl((t - g.ini) / 0.25));
				return (
					<g key={i} transform={`translate(${g.x} ${g.y}) scale(${s}) rotate(${ang})`}>
						<path d={engrenagem(g.r, g.n)} fill={SOMBRA} stroke="rgba(242,239,234,0.35)" strokeWidth={3} />
						<circle r={g.r * 0.28} fill={CARVAO} stroke="rgba(242,239,234,0.35)" strokeWidth={3} />
						<circle r={g.r * 0.1} fill={i === 0 ? CARMIM : TINTA} />
					</g>
				);
			})}
		</svg>
	);
};

const Espiral: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w;
	const voltas = P(e, 'voltas', 4.5), R = e.w * 0.46;
	const pts: string[] = [];
	for (let i = 0; i <= 420; i++) {
		const f = i / 420, th = f * voltas * Math.PI * 2, r = R * (1 - f) + 6;
		pts.push(`${(e.w / 2 + Math.cos(th) * r).toFixed(1)} ${(h / 2 + Math.sin(th) * r).toFixed(1)}`);
	}
	const d = `M ${pts.join(' L ')}`;
	const t0 = ev.desenha ?? e.ini, t1 = ev.fecha ?? t0 + 3;
	const p = CURVAS.desenho(cl((t - t0) / (t1 - t0)));
	const ep = evolvePath(Math.max(0.0001, p), d);
	const acel = ev.acelera != null && t > ev.acelera ? t - ev.acelera : 0; // depois de "pode": a espiral gira mais rápido
	const giro = Math.max(0, t - t0) * 18 + acel * acel * 40;
	return (
		<svg style={{...caixa(e, h), transform: `translate(-50%, -50%) rotate(${(e.rot ?? 0) + giro}deg)`}} viewBox={`0 0 ${e.w} ${h}`}>
			<path d={d} fill="none" stroke={CARMIM} strokeWidth={14} strokeLinecap="round" strokeDasharray={ep.strokeDasharray} strokeDashoffset={ep.strokeDashoffset} />
			{p > 0.98 && <circle cx={e.w / 2} cy={h / 2} r={22 + 8 * Math.sin(t * 10)} fill={TINTA} opacity={0.9} />}
		</svg>
	);
};

// Caminho à mão por cima do mural: desenhado de ev.desenha a ev.fim (progresso linear: o gerador põe a câmera na ponta).
const Caminho: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w;
	const d = P(e, 'd', '');
	const tq = passo(t, fps, 2);
	const p = cl((tq - (ev.desenha ?? e.ini)) / ((ev.fim ?? e.ini + 5) - (ev.desenha ?? e.ini)));
	if (p <= 0) return null;
	const ep = evolvePath(p, d);
	const acende = prog(t, ev.acende, 0.5);
	return (
		<svg style={caixa(e, h)} viewBox={`0 0 ${e.w} ${h}`} overflow="visible">
			<path d={d} fill="none" stroke={TINTA} strokeOpacity={0.55 + 0.45 * acende} strokeWidth={P(e, 'espessura', 14) * (1 + 1.2 * acende)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ep.strokeDasharray} strokeDashoffset={ep.strokeDashoffset} />
		</svg>
	);
};

const Fichas: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 0.6;
	const q = prog(t, ev.separa, 0.45);
	const cw = e.w * 0.36;
	const ficha = (lado: number) => (
		<div style={{position: 'absolute', top: 0, left: e.w / 2 - cw / 2 + lado * (cw * 0.25 + e.w * 0.2 * q), width: cw, height: h, background: '#2a2522', border: '2px solid rgba(242,239,234,0.2)', borderRadius: 10, transform: `rotate(${lado * (2 + 4 * q)}deg)`, boxShadow: '0 20px 50px rgba(0,0,0,0.7)'}}>
			<div style={{position: 'absolute', inset: '18% 12% auto 12%', height: 12, background: 'rgba(242,239,234,0.14)', borderRadius: 6}} />
			<div style={{position: 'absolute', inset: '30% 12% auto 12%', height: 12, width: '50%', background: 'rgba(242,239,234,0.10)', borderRadius: 6}} />
		</div>
	);
	return <div style={caixa(e, h)}>{ficha(-1)}{ficha(1)}</div>;
};

const Icones: React.FC<Props> = ({e, t}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w * 0.4;
	const ic = [siInstagram, siYoutube];
	return (
		<div style={{...caixa(e, h), display: 'flex', justifyContent: 'center', gap: h * 0.5}}>
			{ic.map((s, i) => {
				const q = prog(t, (ev.entra ?? e.ini) + i * 0.12, 0.3);
				return (
					<svg key={i} viewBox="0 0 24 24" style={{width: h, height: h, opacity: q, transform: `scale(${0.6 + 0.4 * q})`}}>
						<path d={s.path} fill={TINTA} />
					</svg>
				);
			})}
		</div>
	);
};

// Flash carmim de 2 quadros (máx. 2 no vídeo, pelo guia): retângulo grande no mundo, por cima da estação.
const Flash: React.FC<Props> = ({e, t, fps}) => {
	const ev = e.ev ?? {}, h = e.h ?? e.w;
	if (ev.em == null) return null;
	const f = Math.floor((t - ev.em) * fps);
	if (f < 0 || f > 2) return null;
	return <div style={{...caixa(e, h), background: CARMIM, opacity: f === 2 ? 0.35 : 0.8, mixBlendMode: 'screen'}} />;
};

const MAPA: Record<string, React.FC<Props>> = {
	flash: Flash,
	silhuetas: Silhuetas, aspas: Aspas, carimbo: Carimbo, riscos: Riscos, persiana: Persiana, bateria: Bateria, celular: Celular,
	relogio: Relogio, calendario: Calendario, lista: Lista, manometro: Manometro, spot: Spot, espelho: Espelho, coracao: Coracao,
	folhas: Folhas, perfis: Perfis, balanca: Balanca, agenda: Agenda, engrenagens: Engrenagens, espiral: Espiral, caminho: Caminho,
	fichas: Fichas, icones: Icones,
};

export const ObjetoView: React.FC<Props> = (props) => {
	const C = MAPA[props.e.nome];
	return C ? <C {...props} /> : null;
};
