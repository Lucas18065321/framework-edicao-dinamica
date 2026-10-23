// Tokens de movimento dos formatos novos (curvas e durações). Calibrar na fase 2 contra a ref384.
import {Easing} from 'remotion';
import type {Curva} from '../tipos';

export const CURVAS: Record<Curva, (t: number) => number> = {
	suave: Easing.bezier(0.65, 0, 0.35, 1), // in-out: câmera, zoom contínuo
	entrada: Easing.bezier(0.16, 1, 0.3, 1), // expo-out: chega rápido e assenta (entradas)
	saida: Easing.bezier(0.7, 0, 0.84, 0), // expo-in: acelera para sair
	linear: (t) => t,
	expo: Easing.bezier(0.87, 0, 0.13, 1), // in-out forte: whip/push de câmera
	// tokens novos do MIX EDIT (só adições; as 5 curvas acima são as do CUT aprovado)
	desenho: Easing.bezier(0.25, 0.15, 0.5, 1), // arco, moldura dobrando a esquina, gráfico desenhando
	risco: Easing.bezier(0.37, 0, 0.63, 1), // tachado, X, caneta
	assento: Easing.bezier(0.22, 1, 0.36, 1), // quint-out: câmera assentando depois de movimento grande
};

// Durações em segundos (escala "Apple": 100/150/250/350 ms).
export const DUR = {micro: 0.1, rapido: 0.15, base: 0.25, lento: 0.35, saida: 0.3};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------- MIX EDIT (só adições: DUR e as curvas do CUT acima não mudam) ----------
// Tokens do guia ("Movimento contínuo"), em QUADROS A 30 FPS (q). Converta para o fps da composição com q30().
// micro 2 · rapido 4 · base 8 · lento 12 (push/card) · desenho 16 · risco 8 · assento 14 · saida 10 (9–12) · chicote 3 · ambiente ≥ 90
export const TOKENS = {micro: 2, rapido: 4, base: 8, lento: 12, desenho: 16, risco: 8, assento: 14, saida: 10, chicote: 3, ambiente: 90} as const;
export const q30 = (q: number, fps: number) => (q * fps) / 30;

// Molas da Apple (mass 1). A mola padrão do Remotion (damping 10) está proibida no MIX: passa do ponto.
// smooth = padrão (≈ 0,5 s) · snappy = pop de ícone · bouncy = só 3D · pequena = elementos pequenos (≈ 0,35 s)
export const MOLAS = {
	smooth: {mass: 1, stiffness: 158, damping: 25},
	snappy: {mass: 1, stiffness: 158, damping: 21},
	bouncy: {mass: 1, stiffness: 158, damping: 18},
	pequena: {mass: 1, stiffness: 322, damping: 36},
} as const;
