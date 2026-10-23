// Texturas procedurais (papel escuro, fundo, borda rasgada), geradas 1 vez por aba do Chrome e guardadas em cache.
// Gerador próprio (mulberry32) em vez do random() do Remotion: são milhões de pixels e o resultado é o mesmo em todo render.

import {continueRender, delayRender} from 'remotion';

const cache = new Map<string, string>();

// A textura vira background-image (dataURL). O Remotion espera <Img>, mas NÃO espera fundo de CSS: sem isto, um quadro
// podia ser capturado antes da textura decodificar (papel sem grão/fibras naquele quadro; render não determinístico,
// medido em 2026-10-20). Segura o quadro até a imagem decodificar e mantém a referência viva (fica decodificada).
const vivas: HTMLImageElement[] = [];
const segurar = (url: string) => {
	if (typeof Image === 'undefined') return url;
	const h = delayRender('textura do papel');
	const img = new Image();
	const fim = () => continueRender(h);
	img.onload = () => (img.decode ? img.decode().then(fim, fim) : fim());
	img.onerror = fim;
	img.src = url;
	vivas.push(img);
	return url;
};

export const prng = (semente: number) => {
	let a = (semente * 2654435761) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const hexRgb = (hex: string) => {
	const n = parseInt(hex.replace('#', ''), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

type OpcoesPapel = {vincos?: boolean; colunas?: boolean; fibras?: number};

// Papel escuro: tom base + manchas + grão + fibras + (opcional) colunas de "texto fantasma" em barras e vincos em cruz.
// O texto fantasma é só barra (nunca letra): nada de manchete ou notícia inventada (ética do guia).
export const texturaPapel = (w: number, h: number, semente: number, cor = '#1C1A18', o: OpcoesPapel = {}) => {
	const chave = ['papel', w, h, semente, cor, o.vincos, o.colunas, o.fibras].join('|');
	const pronto = cache.get(chave);
	if (pronto) return pronto;
	const esc = 0.5; // gera na metade e estica: papel não precisa de nitidez de pixel
	const W = Math.max(8, Math.ceil(w * esc)), H = Math.max(8, Math.ceil(h * esc));
	const r = prng(semente);
	const cv = document.createElement('canvas');
	cv.width = W;
	cv.height = H;
	const ctx = cv.getContext('2d')!;
	ctx.fillStyle = cor;
	ctx.fillRect(0, 0, W, H);
	for (let i = 0; i < 12; i++) {
		const x = r() * W, y = r() * H, raio = (0.2 + r() * 0.5) * Math.max(W, H), a = 0.04 + r() * 0.05;
		const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
		g.addColorStop(0, r() > 0.5 ? `rgba(242,239,234,${a})` : `rgba(0,0,0,${a * 2.2})`);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, H);
	}
	const img = ctx.getImageData(0, 0, W, H);
	const d = img.data;
	for (let i = 0; i < d.length; i += 4) {
		const n = (r() - 0.5) * 20;
		d[i] += n;
		d[i + 1] += n;
		d[i + 2] += n;
	}
	ctx.putImageData(img, 0, 0);
	const fibras = Math.round((W * H) / (o.fibras ?? 700));
	ctx.lineCap = 'round';
	for (let i = 0; i < fibras; i++) {
		const x = r() * W, y = r() * H, ang = r() * Math.PI, len = 3 + r() * 10;
		ctx.strokeStyle = r() > 0.4 ? `rgba(242,239,234,${0.03 + r() * 0.05})` : `rgba(0,0,0,${0.08 + r() * 0.1})`;
		ctx.lineWidth = 0.6;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 3, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
		ctx.stroke();
	}
	if (o.colunas) {
		const cols = 3, marg = W * 0.08, gap = W * 0.035, larg = (W - marg * 2 - gap * (cols - 1)) / cols;
		for (let c = 0; c < cols; c++) {
			const x0 = marg + c * (larg + gap);
			for (let y = H * 0.1; y < H * 0.92; y += 8.5) {
				if (r() < 0.06) continue; // fim de parágrafo
				const lw = larg * (r() < 0.12 ? 0.35 + r() * 0.4 : 0.92 + r() * 0.08);
				ctx.fillStyle = `rgba(242,239,234,${0.06 + r() * 0.03})`;
				ctx.fillRect(x0, y, lw, 2.6);
			}
		}
	}
	if (o.vincos) {
		const vinco = (horizontal: boolean, pos: number) => {
			const g = horizontal ? ctx.createLinearGradient(0, pos - 5, 0, pos + 5) : ctx.createLinearGradient(pos - 5, 0, pos + 5, 0);
			g.addColorStop(0, 'rgba(0,0,0,0)');
			g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
			g.addColorStop(0.55, 'rgba(242,239,234,0.10)');
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = g;
			if (horizontal) ctx.fillRect(0, pos - 5, W, 10);
			else ctx.fillRect(pos - 5, 0, 10, H);
		};
		vinco(true, H * (0.45 + r() * 0.1));
		vinco(false, W * (0.45 + r() * 0.1));
	}
	const url = cv.toDataURL('image/jpeg', 0.9);
	cache.set(chave, segurar(url));
	return url;
};

// Ladrilho do fundo infinito (512 px, repetido): preto-fosco com grão e manchas largas.
export const ladrilhoFundo = (cor = '#0E0C10') => {
	const chave = `fundo|${cor}`;
	const pronto = cache.get(chave);
	if (pronto) return pronto;
	const S = 512, r = prng(77);
	const cv = document.createElement('canvas');
	cv.width = cv.height = S;
	const ctx = cv.getContext('2d')!;
	ctx.fillStyle = cor;
	ctx.fillRect(0, 0, S, S);
	const [R, G, B] = hexRgb(cor);
	const img = ctx.getImageData(0, 0, S, S);
	const d = img.data;
	for (let i = 0; i < d.length; i += 4) {
		const n = (r() - 0.5) * 12;
		d[i] = R + n;
		d[i + 1] = G + n;
		d[i + 2] = B + n;
	}
	ctx.putImageData(img, 0, 0);
	for (let i = 0; i < 260; i++) {
		ctx.fillStyle = `rgba(242,239,234,${0.03 + r() * 0.04})`;
		ctx.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
	}
	const url = cv.toDataURL('image/jpeg', 0.92);
	cache.set(chave, segurar(url));
	return url;
};

// Borda rasgada/de tesoura: polígono CSS em %, com dente pequeno e irregular.
export const bordaRasgada = (semente: number, amp = 0.9, pontos = 36) => {
	const chave = `borda|${semente}|${amp}|${pontos}`;
	const pronto = cache.get(chave);
	if (pronto) return pronto;
	const r = prng(semente + 999);
	const p: string[] = [];
	const j = () => (r() * amp).toFixed(2);
	for (let i = 0; i <= pontos; i++) p.push(`${((i / pontos) * 100).toFixed(2)}% ${j()}%`);
	for (let i = 1; i <= pontos; i++) p.push(`${(100 - +j()).toFixed(2)}% ${((i / pontos) * 100).toFixed(2)}%`);
	for (let i = pontos - 1; i >= 0; i--) p.push(`${((i / pontos) * 100).toFixed(2)}% ${(100 - +j()).toFixed(2)}%`);
	for (let i = pontos - 1; i >= 1; i--) p.push(`${j()}% ${((i / pontos) * 100).toFixed(2)}%`);
	const css = `polygon(${p.join(', ')})`;
	cache.set(chave, css);
	return css;
};
