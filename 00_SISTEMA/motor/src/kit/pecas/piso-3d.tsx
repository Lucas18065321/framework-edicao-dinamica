// Piso 3D (MIX EDIT, peça `piso-3d`): a "câmera 3D inclinada em CSS" (correção 8 do guia; ref384 21–31 s), o pico
// barato das quebras de modo. Sobre uma cena 'tela', a grade da tela técnica começa PLANA, idêntica à tela grade do
// motor (fundo técnico, passo 96 px, linhas centradas em (960, 540), luz de topo e vinheta da tela), e a câmera inclina
// até virar um piso em perspectiva que some na névoa; títulos e cards LEVANTAM do chão (deitados → de pé, mola snappy)
// cada um no seu tempo, sobre um traço no acento que se desenha antes; a câmera desliza devagar (avanço, lateral e
// giro), e na saída os itens deitam, o piso volta a ficar plano e a câmera volta ao lugar da grade da tela (o último
// quadro casa com a tela grade seguinte). Sem WebGL: itens em CSS 3D e a grade do piso projetada em JS com a MESMA
// câmera e desenhada em SVG no plano da tela (a camada CSS 3D gigante do piso custava ~0,5 s por quadro a meia resolução).
// Custo (medido em 05/10): +15–70 ms por quadro sobre a tela grade (0,09–0,14 s por quadro no total, em 1080p ou meia).
// Reflexo dos itens no piso: -webkit-box-reflect (o piso é só linhas, então o reflexo aparece por baixo).
// Uso: 1 quebra de modo por capítulo no máximo (5–7 por vídeo), 3–6 s; até 3 itens, ≤ 12 palavras no total.
// Se a cena 'tela' tiver câmera virtual (zoom/pan/deriva), ponha "camera": true na camada para herdar o mesmo enquadramento.
// Parâmetros:
//   itens: [{t (s desde o início da camada; padrão: 0,55 s + 0,3 s por item), texto (*palavra* = acento),
//     tipo ('titulo' padrão | 'card'), rotulo (caixa-alta pequena acima), nota (Instrument Serif itálica abaixo),
//     x (px de 1080 ao lado do centro, no piso; padrão: título no centro, cards espalhados a 560 px), z (px de
//     profundidade no piso, 0 = na linha do centro; positivo = mais longe), tamanho (corpo do texto em px: 150 no
//     título, 80 no card; com z 380 o card encolhe ~23%), caixaAlta (true no título), largura (card, px; 520)}],
//   inclinacao (graus da câmera no repouso, 62; 0 = vista de cima = tela grade), centroY (0..1: altura da linha onde
//     ficam os itens com z 0, 0.64), perspectiva (px, 1100),
//   avanco ([início, fim] em px: a câmera anda para a frente no piso, [0, 220]), lateral ([início, fim] px, [0, 0]),
//   giro ([início, fim] graus em volta do eixo vertical do piso, [0, 6]), deFrente (0..1, 0.5: quanto os itens de pé
//     se viram para a câmera; 0 (= false) = perpendiculares ao piso, com a perspectiva entortando os cards fora do centro
//     como itálico; 1 (= true) = sempre de frente, sem distorção), entrada ('inclinar' padrão: nasce plano | 'blur'),
//   saida ('achatar' padrão: itens deitam, o piso volta plano e a grade volta ao lugar | 'avancar': a câmera mergulha
//     para a frente | 'blur'),
//   fundo ('grade' padrão (= true): repete a tela grade do motor, para casar com uma cena 'tela' grade | 'escuro': repete
//     a tela escura, e as linhas do piso nascem com a inclinação | 'nenhum' (= false): só o piso, sobre a cena, com as
//     linhas nascendo com a inclinação),
//   fade (quadros a 30 fps de fade da camada inteira na entrada 'inclinar' e na saída 'achatar', 4: invisível sobre a
//     tela igual; suaviza sobre outra cena), neblina (0..1, 0.5: quanto do fundo do piso some),
//   trilho (false: traço no acento no piso, desenhando da câmera até o item mais longe), reflexo (true),
//   passo, corGrade, espessura (padrão: os da grade do estilo; sem ela, 96 px, #222634 e 1,5 px).
// Sons (volumes exportados; o MIX aplica ganhoSfx ×1,25 com piso 0,55): entrada = sfxPiso3d (whoosh suave da câmera);
// sonsPiso3d = pop suave em cada item que levanta (≥ 8 q entre sons) e whoosh com o pico no meio da saída.
import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, MOLAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxPiso3d: [string, number] = ['motionix/whooshes/whooshes_15_slow-and-smooth-whoosh', 0.45]; // MIX: 0,56 no ar

type Item = {t: number; texto: string; tipo: 'titulo' | 'card'; rotulo: string; nota: string; x: number; z: number; tamanho: number; largura: number; caixaAlta: boolean};

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const par = (v: unknown, padrao: [number, number]): [number, number] => (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number') ? [v[0], v[1]] : padrao);
const mod = (v: number, m: number) => ((v % m) + m) % m;
// resto até o múltiplo de m mais próximo (−m/2..m/2): quanto falta para a grade voltar ao lugar
const resto = (v: number, m: number) => {
	const r = mod(v, m);
	return r > m / 2 ? r - m : r;
};
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const lerItens = (v: unknown): Item[] => {
	const arr = Array.isArray(v) ? v : [];
	// x padrão: títulos no centro; cards espalhados entre si a 560 px
	const ehCard = (it: unknown) => typeof it === 'object' && it !== null && (it as {tipo?: unknown}).tipo === 'card';
	const cards = arr.filter(ehCard).length;
	let k = 0;
	return arr
		.map((it, i): Item => {
			const o = (typeof it === 'string' ? {texto: it} : it ?? {}) as Record<string, unknown>;
			const tipo = o.tipo === 'card' ? 'card' : 'titulo';
			return {
				t: num(o.t, 0.55 + 0.3 * i),
				texto: txt(o.texto, ''),
				tipo,
				rotulo: txt(o.rotulo, ''),
				nota: txt(o.nota, ''),
				x: num(o.x, tipo === 'card' ? (k++ - (cards - 1) / 2) * 560 : 0),
				z: num(o.z, 0),
				tamanho: num(o.tamanho, tipo === 'card' ? 80 : 150),
				caixaAlta: bool(o.caixaAlta, tipo === 'titulo'),
				largura: num(o.largura, 520),
			};
		})
		.filter((it) => it.texto || it.rotulo);
};

// sons: pop suave em cada item que levanta (pula os que caem a < 8 q do anterior) + whoosh na saída, com o pico de
// energia (0,69 s do arquivo, medido com astats) no meio do movimento de saída
const PICO_SAIDA = 0.69;
export const sonsPiso3d = (c: Camada, fps: number): Som[] => {
	const dur = c.fim - c.ini;
	const out: Som[] = [];
	let ultimo = 0.0; // o whoosh de entrada está em 0
	lerItens(c.itens)
		.map((it) => it.t)
		.sort((a, b) => a - b)
		.forEach((t) => {
			if (t - ultimo < 8 / 30) return;
			ultimo = t;
			out.push({t: t + 0.08, som: 'motionix/pop/pop_05_smooth-pop', vol: 0.55});
		});
	const saida = txt(c.saida, 'achatar');
	const meio = saida === 'achatar' ? 10 : saida === 'avancar' ? 6 : 4.5; // quadros a 30 fps do fim até o meio da saída
	out.push({t: Math.max(0.5, dur - meio / 30 - PICO_SAIDA), som: 'motionix/whooshes/whooshes_14_simple-whoosh', vol: 0.45});
	return out.filter((s) => s.t < dur - 1 / fps);
};

const REF = 100;

export const Piso3d: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const q = (frame * 30) / fps; // quadros a 30 fps
	const itens = lerItens(c.itens);
	const pesada = FONTES.impacto;

	// mede os títulos depois que a Inter Tight 900 carregou (largura do traço de base)
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('piso-3d: fonte'));
	const [pronto, setPronto] = useState(false);
	const liberado = useRef(false);
	const chave = itens.map((it) => it.texto).join('|');
	const idBase = 'piso' + useId().replace(/[^a-zA-Z0-9_-]/g, ''); // ids dos gradientes do SVG (únicos por camada)
	useEffect(() => {
		let vivo = true;
		const libera = () => {
			if (vivo) setPronto(true);
			if (!liberado.current) {
				liberado.current = true;
				continueRender(espera);
			}
		};
		document.fonts
			.load(`${pesada.weight} ${REF}px "${pesada.family}"`, chave.toUpperCase() || 'A')
			.then(() => document.fonts.ready)
			.then(libera, libera);
		return () => {
			vivo = false;
		};
	}, [continueRender, espera, pesada.family, pesada.weight, chave]);
	const largTitulos = useMemo(
		() => (pronto ? itens.map((it) => (it.tipo === 'titulo' ? measureText({text: it.caixaAlta ? it.texto.replace(/\*/g, '').toLocaleUpperCase('pt-BR') : it.texto.replace(/\*/g, ''), fontFamily: pesada.family, fontWeight: String(pesada.weight), fontSize: REF, letterSpacing: '-0.02em'}).width / REF : 0)) : []),
		[pronto, chave, pesada.family, pesada.weight],
	);
	if (!pronto) return null;

	// ---------- estilo (campos novos do MIX com padrão, para estilos que não os têm) ----------
	const grade = est.grade;
	const passo = num(c.passo, grade?.passo ?? 96) * u;
	const corGrade = txt(c.corGrade, grade?.cor ?? '#222634');
	const esp = num(c.espessura, grade?.espessura ?? 1.5) * u;
	const fundoEscuro = est.fundoEscuro ?? '#0D0E13';
	const luzTopo = grade ? grade.luz ?? 0 : 0.05; // como a Tela do motor (sem luz quando a grade do estilo não a define)
	const cinza = est.cinza ?? '#9C9CA8';
	const modoFundo = c.fundo === false || c.fundo === 'nenhum' ? 'nenhum' : c.fundo === 'escuro' ? 'escuro' : 'grade';

	// ---------- câmera ----------
	const inclin = Math.max(1, Math.min(85, num(c.inclinacao, 62)));
	const P = num(c.perspectiva, 1100) * u;
	const cy = num(c.centroY, 0.64) * H;
	const entrada = txt(c.entrada, 'inclinar');
	const saida = txt(c.saida, 'achatar');
	const qEnt = 18;
	const qSai = saida === 'achatar' ? 14 : saida === 'avancar' ? 12 : 9;
	const durQ = (dur * 30) / fps;
	const fade = Math.max(0, num(c.fade, 4));
	const pe = entrada === 'inclinar' ? CURVAS.assento(interpolate(q, [0, qEnt], [0, 1], clamp)) : 1;
	const ps = interpolate(q, [durQ - 1 - qSai, durQ - 1], [0, 1], {...clamp, easing: CURVAS.saida});
	const pc = CURVAS.suave(interpolate(frame, [0, dur], [0, 1], clamp)); // deriva contínua da câmera
	const [av0, av1] = par(c.avanco, [0, 220]);
	const [la0, la1] = par(c.lateral, [0, 0]);
	const [gi0, gi1] = par(c.giro, [0, 6]);
	let theta = inclin * pe;
	let avanco = (av0 + (av1 - av0) * pc) * u;
	const lateral = (la0 + (la1 - la0) * pc) * u;
	let giro = gi0 + (gi1 - gi0) * pc;
	let opac = entrada === 'blur' ? CURVAS.entrada(interpolate(q, [0, 10], [0, 1], clamp)) : fade > 0 ? interpolate(q, [0, fade], [0, 1], clamp) : 1;
	let blur = entrada === 'blur' ? 12 * u * (1 - opac) : 0;
	// correção das linhas: no fim do 'achatar' a grade volta exatamente ao lugar da tela grade (giro 0, múltiplo do passo)
	let ajY = 0;
	let ajX = 0;
	if (saida === 'achatar') {
		const pa = CURVAS.suave(interpolate(q, [durQ - 1 - qSai, durQ - 1], [0, 1], clamp));
		theta *= 1 - pa;
		giro *= 1 - pa;
		ajY = -resto(avanco, passo) * pa;
		ajX = resto(lateral, passo) * pa;
		if (fade > 0) opac *= interpolate(q, [durQ - 1 - fade, durQ - 1], [1, 0], clamp);
	} else if (saida === 'avancar') {
		avanco += 1300 * u * ps;
		opac *= 1 - interpolate(ps, [0.5, 1], [0, 1], clamp);
	} else if (saida === 'blur') {
		opac *= 1 - ps;
		blur += 10 * u * ps;
	}
	const k = Math.max(0, Math.min(1, theta / inclin)); // 0 = plano (tela grade), 1 = inclinado
	// com avanço, lateral e giro em 0 as linhas passam pelo centro do quadro, como na tela grade do motor
	const offY = mod(H / 2 - cy, passo) + avanco + ajY;
	const offX = -lateral + ajX;

	// ---------- piso: grade projetada em JS e desenhada em SVG no plano da tela ----------
	// A mesma conta do CSS 3D dos itens (rotateZ(giro) no plano do piso → rotateX(θ) → perspectiva P com origem no eixo
	// da câmera), sem a camada 3D gigante com máscara, que custava ~0,5 s por quadro (meia resolução) só para existir.
	// Cada linha é um quadrilátero (afina com a distância, como no 3D de verdade) com a névoa num gradiente ao longo dela.
	const neblina = Math.max(0, Math.min(1, num(c.neblina, 0.5)));
	const alcance = 1 / Math.max(0.12, k); // plano (k → 0): a névoa cresce até sair do quadro
	const RX0 = 2184 * u; // semi-eixos da névoa inclinada (elipse no piso, centrada no eixo da câmera)
	const RY0 = 3400 * (1.05 - 0.6 * neblina) * u;
	const RX = RX0 * alcance;
	const RY = RY0 * alcance;
	const nucleo = (40 - 20 * neblina) / 100;
	const nevoa = (fx: number, fy: number) => {
		const d = Math.hypot(fx / RX, fy / RY);
		return d <= nucleo ? 1 : Math.max(0, 1 - (d - nucleo) / (1 - nucleo));
	};
	const st = Math.sin((theta * Math.PI) / 180);
	const ct = Math.cos((theta * Math.PI) / 180);
	const sg = Math.sin((giro * Math.PI) / 180);
	const cg = Math.cos((giro * Math.PI) / 180);
	const proj = (fx: number, fy: number): [number, number] => {
		const x1 = fx * cg - fy * sg;
		const y1 = fx * sg + fy * cg;
		const w = P / (P - y1 * st);
		return [W / 2 + x1 * w, cy + y1 * ct * w];
	};
	// limites no piso: longe e largo até a névoa apagar (no máx. 2× o raio inclinado; plano, o quadro todo); perto até a
	// borda de baixo do quadro na inclinação máxima (+ margem do giro); nada além de 85% da distância até a câmera
	const baixo = H - cy;
	const rI = (inclin * Math.PI) / 180;
	const XMAX = Math.max(W / 2 + 2 * passo, Math.min(RX, 2 * RX0));
	const YLONGE = Math.max(cy + 2 * passo, Math.min(RY, 2 * RY0));
	const PERTO = Math.max(baixo, (baixo * P) / Math.max(1, Math.cos(rI) * P + baixo * Math.sin(rI))) * 1.12 + 40 * u + (W / 2) * Math.abs(sg);
	const LIM = st > 1e-4 ? (0.85 * P) / st : Infinity; // y1 máximo (antes do rotateX) para ficar na frente da câmera
	const opLinhas = modoFundo === 'grade' ? 1 : k;
	// plano e sem giro (1º e último quadro): a grade sai com o MESMO fundo CSS da tela grade do motor (pixels idênticos);
	// inclinado, com o SVG projetado
	const plano = theta < 0.01 && Math.abs(giro) < 0.01;
	const linha = (dir: string) => `linear-gradient(${dir}, ${corGrade} ${esp}px, transparent ${esp}px)`;
	type Faixa = {pontos: string; grad: {x1: number; y1: number; x2: number; y2: number; stops: [number, number][]} | null};
	const faixas: Faixa[] = [];
	// uma linha da grade de A a B (coordenadas do piso), com meia espessura ao longo da normal (nx, ny)
	const faixa = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
		const N = 10;
		const amostras = Array.from({length: N + 1}, (_, i) => {
			const t = i / N;
			const fx = ax + (bx - ax) * t;
			const fy = ay + (by - ay) * t;
			return {s: proj(fx, fy), a: nevoa(fx, fy) * opLinhas};
		});
		if (amostras.every((m) => m.a < 0.004)) return;
		const h = esp / 2;
		const cantos = [proj(ax - nx * h, ay - ny * h), proj(bx - nx * h, by - ny * h), proj(bx + nx * h, by + ny * h), proj(ax + nx * h, ay + ny * h)];
		const xs = cantos.map((p) => p[0]);
		const ys = cantos.map((p) => p[1]);
		if (Math.max(...xs) < -2 || Math.min(...xs) > W + 2 || Math.max(...ys) < -2 || Math.min(...ys) > H + 2) return;
		const pontos = cantos.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
		if (amostras.every((m) => m.a > 0.996)) return void faixas.push({pontos, grad: null});
		const [s0, sN] = [amostras[0].s, amostras[N].s];
		const L = Math.hypot(sN[0] - s0[0], sN[1] - s0[1]) || 1;
		faixas.push({pontos, grad: {x1: s0[0], y1: s0[1], x2: sN[0], y2: sN[1], stops: amostras.map((m) => [Math.min(1, Math.hypot(m.s[0] - s0[0], m.s[1] - s0[1]) / L), m.a])}});
	};
	// linhas no piso: x ≡ offX e y ≡ offY (mod passo), como as da tela grade quando a câmera está parada
	for (let fx = offX - Math.ceil((XMAX + offX) / passo) * passo; !plano && fx <= XMAX; fx += passo) {
		const fyFim = Math.min(PERTO, cg > 1e-6 ? (LIM - fx * sg) / cg : PERTO);
		if (fyFim > -YLONGE) faixa(fx, -YLONGE, fx, fyFim, 1, 0);
	}
	for (let fy = offY - Math.ceil((YLONGE + offY) / passo) * passo; !plano && fy <= PERTO; fy += passo) {
		let x0 = -XMAX;
		let x1 = XMAX;
		if (Math.abs(sg) > 1e-6) {
			const lim = (LIM - fy * cg) / sg;
			if (sg > 0) x1 = Math.min(x1, lim);
			else x0 = Math.max(x0, lim);
		} else if (fy * cg > LIM) continue;
		if (x1 > x0) faixa(x0, fy, x1, fy, 0, 1);
	}
	const camera = `rotateX(${theta}deg) rotateZ(${giro}deg)`;
	// itens: CSS 3D com a MESMA câmera (inclina com rotateX e gira com rotateZ em volta do eixo; o mundo anda por baixo)
	const contexto = (filhos: React.ReactNode) => (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden', perspective: P, perspectiveOrigin: `50% ${cy}px`}}>
			<div style={{position: 'absolute', left: W / 2, top: cy, width: 0, height: 0, transformStyle: 'preserve-3d', transform: camera}}>{filhos}</div>
		</div>
	);

	// ---------- itens ----------
	const fs = (px: number) => px * u;
	const molaItem = (f: number) => spring({frame: f, fps, config: MOLAS.snappy});
	const deFrente = typeof c.deFrente === 'number' ? Math.max(0, Math.min(1, c.deFrente)) : c.deFrente === true ? 1 : c.deFrente === false ? 0 : 0.5;
	const reflexo = bool(c.reflexo, true);
	const corTexto = est.creme;
	const partes = (s: string) =>
		s
			.split(/(\*[^*]+\*)/)
			.filter(Boolean)
			.map((p, j) => (
				<span key={j} style={p.startsWith('*') ? {color: est.acento} : undefined}>
					{p.replace(/\*/g, '')}
				</span>
			));
	// saída 'achatar': os itens deitam em cascata antes de o piso voltar plano
	const deita = (i: number) => (saida === 'achatar' ? CURVAS.saida(interpolate(q, [durQ - 1 - qSai - 6 + i * 2, durQ - 1 - qSai + 6 + i * 2], [0, 1], clamp)) : 0);
	const zMax = Math.max(0, ...itens.map((it) => it.z));
	const trilho = bool(c.trilho, false);
	const pTrilho = CURVAS.desenho(interpolate(q, [qEnt - 4, qEnt + 12], [0, 1], clamp)) * (saida === 'achatar' ? 1 - deita(0) : 1);

	return (
		<AbsoluteFill style={{pointerEvents: 'none', opacity: opac, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
			{modoFundo === 'grade' && <AbsoluteFill style={{background: fundoEscuro}} />}
			{modoFundo === 'escuro' && <AbsoluteFill style={{background: est.fundoEscuro ? `radial-gradient(ellipse at center, #171922 0%, ${fundoEscuro} 70%, #08090C 100%)` : 'radial-gradient(ellipse at center, #161616 0%, #050505 100%)'}} />}
			{/* brilho suave no piso em volta dos itens (só inclinado) */}
			{k > 0.01 && <AbsoluteFill style={{opacity: k, background: `radial-gradient(ellipse ${900 * u}px ${700 * u * ct}px at 50% ${cy}px, ${rgba(est.creme, 0.05)}, transparent 70%)`}} />}
			{/* piso: só as linhas (o reflexo dos itens aparece por baixo); a grade anda com o mundo */}
			{plano && opLinhas > 0.004 && (
				<AbsoluteFill style={{opacity: opLinhas, backgroundImage: `${linha('180deg')}, ${linha('90deg')}`, backgroundSize: `${passo}px ${passo}px`, backgroundPosition: `${mod(W / 2 + offX, passo) - esp / 2}px ${mod(cy + offY, passo) - esp / 2}px`}} />
			)}
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0}}>
				<defs>
					{faixas.map((f, i) =>
						f.grad ? (
							<linearGradient key={i} id={`${idBase}g${i}`} gradientUnits="userSpaceOnUse" x1={f.grad.x1} y1={f.grad.y1} x2={f.grad.x2} y2={f.grad.y2}>
								{f.grad.stops.map(([o, a], j) => (
									<stop key={j} offset={o} stopColor={corGrade} stopOpacity={a} />
								))}
							</linearGradient>
						) : null,
					)}
				</defs>
				{faixas.map((f, i) => (
					<polygon key={i} points={f.pontos} fill={f.grad ? `url(#${idBase}g${i})` : corGrade} fillOpacity={f.grad ? undefined : opLinhas} />
				))}
			</svg>
			{/* luz de topo e vinheta da tela grade do motor, na mesma ordem (por cima das linhas) */}
			{modoFundo === 'grade' && luzTopo > 0 && <AbsoluteFill style={{background: `radial-gradient(60% 50% at 50% -10%, rgba(255,255,255,${luzTopo}) 0%, transparent 100%)`}} />}
			{modoFundo === 'grade' && <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, #00000080 100%)'}} />}
			{contexto(
				<div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translate3d(${-lateral}px, ${avanco}px, 0)`}}>
					{trilho && pTrilho > 0.001 && (
						<div
							style={{
								position: 'absolute',
								left: -1.5 * u,
								top: PERTO - (PERTO + (zMax + 40) * u) * pTrilho,
								width: 3 * u,
								height: (PERTO + (zMax + 40) * u) * pTrilho,
								background: `linear-gradient(0deg, transparent, ${est.acento} 30%, ${est.acento})`,
								boxShadow: `0 0 ${10 * u}px ${rgba(est.acento, 0.7)}`,
							}}
						/>
					)}
					{itens.map((it, i) => {
						const m = molaItem(frame - Math.round(it.t * fps));
						if (frame < it.t * fps - (8 * fps) / 30) return null;
						const d = deita(i);
						const levanta = Math.max(0, m * (1 - d));
						const ang = -(deFrente * theta + (1 - deFrente) * 90) * levanta;
						const opItem = interpolate(frame - it.t * fps, [-(6 * fps) / 30, 0, (4 * fps) / 30], [0, 0.6, 1], clamp) * (1 - interpolate(d, [0.6, 1], [0, 1], clamp));
						const largBase = it.tipo === 'card' ? it.largura * u : Math.max(0.2, largTitulos[i] ?? 0) * fs(it.tamanho);
						// traço de base no acento: desenha do centro para fora pouco antes do item levantar
						const pBase = CURVAS.desenho(interpolate(frame - it.t * fps, [-(8 * fps) / 30, (4 * fps) / 30], [0, 1], clamp)) * (1 - d);
						return (
							<React.Fragment key={i}>
								{pBase > 0.001 && <div style={{position: 'absolute', left: it.x * u - (largBase * 1.06 * pBase) / 2, top: -it.z * u - 1.5 * u, width: largBase * 1.06 * pBase, height: 3 * u, background: est.acento, boxShadow: `0 0 ${12 * u}px ${rgba(est.acento, 0.6)}`, opacity: 0.9}} />}
								<div style={{position: 'absolute', left: it.x * u, top: -it.z * u, width: 0, height: 0, transformOrigin: '0 0', transform: `rotateX(${ang}deg)`, opacity: opItem}}>
									<div
										style={{
											position: 'absolute',
											left: 0,
											bottom: 0,
											transform: 'translateX(-50%)',
											width: it.tipo === 'card' ? it.largura * u : 'max-content',
											boxSizing: 'border-box',
											padding: it.tipo === 'card' ? `${34 * u}px ${42 * u}px ${38 * u}px` : `0 0 ${10 * u}px`,
											borderRadius: it.tipo === 'card' ? 30 * u : 0,
											background: it.tipo === 'card' ? '#141416' : undefined,
											border: it.tipo === 'card' ? `${1.5 * u}px solid rgba(201,207,218,0.22)` : undefined,
											boxShadow: it.tipo === 'card' ? `inset 0 ${1 * u}px 0 rgba(255,255,255,0.08)` : undefined,
											textAlign: it.tipo === 'card' ? 'left' : 'center',
											WebkitBoxReflect: reflexo ? `below ${4 * u}px linear-gradient(transparent 50%, rgba(255,255,255,0.22))` : undefined,
										}}
									>
										{it.rotulo && (
											<div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: fs(24), letterSpacing: '0.16em', textTransform: 'uppercase', color: cinza, marginBottom: fs(it.tipo === 'card' ? 14 : 10)}}>{it.rotulo}</div>
										)}
										{it.texto && (
											<div
												style={{
													fontFamily: pesada.family,
													fontWeight: it.tipo === 'card' ? 800 : 900,
													fontSize: fs(it.tamanho),
													lineHeight: it.tipo === 'card' ? 1.05 : 0.9,
													letterSpacing: '-0.02em',
													textTransform: it.caixaAlta ? 'uppercase' : undefined,
													color: corTexto,
													whiteSpace: it.tipo === 'titulo' ? 'pre' : undefined,
													textShadow: it.tipo === 'titulo' ? `0 0 ${30 * u}px ${rgba(est.creme, 0.18)}` : undefined,
													fontVariantNumeric: 'tabular-nums',
												}}
											>
												{partes(it.texto)}
											</div>
										)}
										{it.nota && <div style={{fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontSize: fs(48), color: rgba(est.creme, 0.72), marginTop: fs(10)}}>{it.nota}</div>}
									</div>
								</div>
							</React.Fragment>
						);
					})}
				</div>,
			)}
		</AbsoluteFill>
	);
};
