// Câmera virtual do quadro contínuo: chaves interpoladas (zoom em escala log), deriva "viva" e velocidade na tela.
import {Easing} from 'remotion';
import {noise2D} from '@remotion/noise';
import {CURVAS} from '../../kit/tempo';
import type {ChaveCamera, CurvaLab, Plano} from './tipos';

export const CURVAS_LAB: Record<CurvaLab, (t: number) => number> = {
	suave: CURVAS.suave,
	entrada: CURVAS.entrada,
	saida: CURVAS.saida,
	linear: CURVAS.linear,
	expo: CURVAS.expo,
	assento: CURVAS.assento,
	snap: Easing.bezier(0.3, 1.45, 0.45, 1), // chega com overshoot curto e assenta (punch-in)
	chicote: Easing.bezier(0.9, 0, 0.1, 1), // whip: quase parado, atravessa, quase parado
};

export const PARALLAX: Record<Plano, number> = {fundo: 0.55, meio: 1, frente: 1.35};

export type EstadoCamera = {x: number; y: number; zoom: number; rot: number};

export const cameraEm = (chaves: ChaveCamera[], t: number): EstadoCamera => {
	if (!chaves.length) return {x: 0, y: 0, zoom: 1, rot: 0};
	if (t <= chaves[0].t) return {x: chaves[0].x, y: chaves[0].y, zoom: chaves[0].zoom, rot: chaves[0].rot ?? 0};
	for (let i = 1; i < chaves.length; i++) {
		const a = chaves[i - 1], b = chaves[i];
		if (t <= b.t) {
			const p = CURVAS_LAB[b.curva ?? 'suave'](Math.min(1, Math.max(0, (t - a.t) / Math.max(1e-6, b.t - a.t))));
			const lz = Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * p;
			const recuo = b.arco ? 1 - b.arco * Math.sin(Math.PI * Math.min(1, Math.max(0, p))) : 1;
			return {x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, zoom: Math.exp(lz) * recuo, rot: (a.rot ?? 0) + ((b.rot ?? 0) - (a.rot ?? 0)) * p};
		}
	}
	const u = chaves[chaves.length - 1];
	return {x: u.x, y: u.y, zoom: u.zoom, rot: u.rot ?? 0};
};

// Câmera viva: deriva lenta de poucos px e fração de grau (ref-01, ref-05), também com a câmera parada (o "respirar").
export const cameraViva = (chaves: ChaveCamera[], t: number, amp: number): EstadoCamera => {
	const c = cameraEm(chaves, t);
	if (!amp) return c;
	return {
		x: c.x + (noise2D('cx', t * 0.35, 0) * amp) / c.zoom,
		y: c.y + (noise2D('cy', 0, t * 0.3) * amp) / c.zoom,
		zoom: c.zoom * (1 + noise2D('cz', t * 0.2, 7) * 0.006),
		rot: c.rot + noise2D('cr', t * 0.25, 3) * 0.25,
	};
};

// Velocidade na tela (px por quadro) entre t-dt e t: translação × zoom + variação de zoom medida na borda.
export const velocidadeTela = (chaves: ChaveCamera[], t: number, dt: number, W: number, H: number) => {
	const a = cameraEm(chaves, t - dt), b = cameraEm(chaves, t);
	const z = (a.zoom + b.zoom) / 2;
	const trans = Math.hypot(b.x - a.x, b.y - a.y) * z;
	const borda = Math.abs(Math.log(b.zoom / a.zoom)) * (Math.hypot(W, H) / 2);
	const giro = (Math.abs(b.rot - a.rot) * Math.PI / 180) * (Math.hypot(W, H) / 2);
	return trans + borda + giro;
};

// Transform CSS de um plano: centro da tela → rotação → zoom (com parallax) → mundo.
export const transformPlano = (c: EstadoCamera, k: number, W: number, H: number) =>
	`translate(${W / 2}px, ${H / 2}px) rotate(${c.rot * k}deg) scale(${Math.pow(c.zoom, k)}) translate(${-c.x * k}px, ${-c.y * k}px)`;
