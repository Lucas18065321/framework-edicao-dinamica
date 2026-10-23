// Ponto de luz (MIX EDIT, peça `ponto-luz`): o fio condutor da intro e do fim do vídeo (ref384 0–1,75 s e 94–98 s).
// Núcleo creme de 6–8 px + halo no acento de 60–120 px, pulsando de 0,9 a 1,1 em 30 q. A fase do pulso segue o relógio
// da SAÍDA (quadro round(ini·fps) + quadro da camada), então duas camadas seguidas (ponto-luz → titulo-quente) pulsam
// juntas, sem salto. O rastro (viagem e cometa) é um traço contínuo em SVG que afina e some da cabeça para a cauda.
// Acende em ~8 q (núcleo em 4 q, halo abrindo em 10 q, um brilho a mais que assenta em 14 q). Pode nascer em `origem`
// (ex.: uma lâmpada do cenário, [0.2, 0.21], continuidade com um mergulho na lâmpada) e viajar em arco até (x, y),
// chegando rápido e assentando devagar, com rastro de cometa só enquanto anda. Sai em colapso (incha 2 q e some num
// ponto em 6 q), como cometa (dispara no `rumo` com rastro, expo-in, 10 q), apagando (9 q) ou no corte da camada.
// Uso: sobre `tela` `escuro` (#0D0E13). Para o título nascer do ponto, a camada `titulo-quente` começa no quadro em que
// esta acaba (aqui `saida: 'corte'`), com o mesmo x, y: o título desenha o próprio ponto e o estica em linha.
// Parâmetros:
//   x, y (0..1, posição final; 0.5, 0.47), origem ([x, y] onde nasce; padrão = x, y), viajarEm (s, 0.35), viagem (s, 0.6),
//   arco (curvatura do caminho, fração da distância; 0.12; negativo = curva para o outro lado),
//   nucleo (px em 1080, 7), halo (diâmetro em px, 100), cor (halo; est.acento), corNucleo (est.creme), brilho (0..1.5, 1),
//   pulso (true), acende (true; false = já entra aceso, para continuar outra camada),
//   cantoneiras (false; "L" de visor), margemCantos (fração da largura, 0.03), bracoCantos (px, 40),
//   saida: 'colapso' (padrão) | 'cometa' | 'apagar' | 'corte', saidaEm (s desde o início da camada; padrão: termina no fim),
//   rumo (graus do cometa: 0 = direita, 90 = baixo, -90 = cima; 0), alcance (fração da largura que o cometa anda; 0.8).
// Sons: entrada `shimmer` (sintetizado; guia: 0,3); whoosh lento na viagem (pico no meio dela) e whoosh rápido no cometa
// (pico no fim do disparo); desligar com "sons": false / "sfx": false quando a trilha tiver de ficar sozinha.
import React, {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PecaProps} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';

export const sfxPontoLuz: [string, number] = ['shimmer', 0.3]; // x1,5 no motor = 0,45
const SOM_VIAGEM = 'motionix/whooshes/whooshes_15_slow-and-smooth-whoosh';
const SOM_COMETA = 'motionix/whooshes/whooshes_16_smooth-and-fast-whoosh';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const par = (v: unknown): [number, number] | null => (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number') ? [v[0], v[1]] : null);

export const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// "desenho" do guia (0.25, 0.15, 0.5, 1): sai sem tranco e assenta longo (viagem do ponto, linha desenhando)
export const CURVA_DESENHO = Easing.bezier(0.25, 0.15, 0.5, 1);
// durações das saídas em q de 30 fps
const Q_SAIDA = {colapso: 8, cometa: 10, apagar: 9, corte: 0} as const;
type Saida = keyof typeof Q_SAIDA;

// Pulso de 0,9 a 1,1 em 30 q, na fase do relógio da saída (s)
export const pulsoEm = (tSaida: number) => 1 + 0.1 * Math.sin(2 * Math.PI * tSaida);

// O ponto em si (também usado pelo titulo-quente no nascimento e no colapso). x, y em px do quadro.
export const PontoNucleo: React.FC<{
	x: number;
	y: number;
	nucleo: number;
	halo: number;
	cor: string;
	corNucleo: string;
	escalaNucleo?: number;
	escalaHalo?: number;
	opacidade?: number;
	brilho?: number;
}> = ({x, y, nucleo, halo, cor, corNucleo, escalaNucleo = 1, escalaHalo = 1, opacidade = 1, brilho = 1}) => {
	if (opacidade <= 0.001 || (escalaNucleo <= 0.001 && escalaHalo <= 0.001)) return null;
	const b = Math.min(1.5, Math.max(0, brilho));
	const hh = halo * escalaHalo;
	const hi = halo * 0.36 * escalaHalo;
	const nn = nucleo * escalaNucleo;
	return (
		<>
			{/* halo no acento */}
			<div
				style={{
					position: 'absolute',
					left: x - hh / 2,
					top: y - hh / 2,
					width: hh,
					height: hh,
					borderRadius: '50%',
					opacity: opacidade * Math.min(1, b),
					background: `radial-gradient(circle, ${rgba(cor, 0.95)} 0%, ${rgba(cor, 0.6)} 14%, ${rgba(cor, 0.26)} 36%, ${rgba(cor, 0.08)} 58%, ${rgba(cor, 0)} 72%)`,
				}}
			/>
			{/* brilho quente interno (faz o carmim ler como luz, não como mancha) */}
			<div
				style={{
					position: 'absolute',
					left: x - hi / 2,
					top: y - hi / 2,
					width: hi,
					height: hi,
					borderRadius: '50%',
					opacity: opacidade * Math.min(1, 0.75 * b),
					background: `radial-gradient(circle, ${rgba(corNucleo, 0.9)} 0%, ${rgba(corNucleo, 0.3)} 32%, ${rgba(corNucleo, 0)} 70%)`,
				}}
			/>
			{/* núcleo */}
			<div
				style={{
					position: 'absolute',
					left: x - nn / 2,
					top: y - nn / 2,
					width: nn,
					height: nn,
					borderRadius: '50%',
					opacity: opacidade,
					background: corNucleo,
					boxShadow: `0 0 ${nucleo * 1.2}px ${rgba(corNucleo, 0.9)}, 0 0 ${nucleo * 3.2}px ${rgba(cor, 0.85 * Math.min(1, b))}`,
				}}
			/>
		</>
	);
};

// Linha do tempo da peça (também usada pelos sons)
const tempos = (c: Camada, fps: number, dur: number) => {
	const saida = (['colapso', 'cometa', 'apagar', 'corte'].includes(txt(c.saida, '')) ? c.saida : 'colapso') as Saida;
	const qSaida = Math.round((Q_SAIDA[saida] * fps) / 30);
	const saidaQ = saida === 'corte' ? Infinity : typeof c.saidaEm === 'number' ? Math.round(c.saidaEm * fps) : Math.max(0, dur - qSaida);
	return {saida, qSaida, saidaQ, viajarEm: num(c.viajarEm, 0.35), viagem: Math.max(0.1, num(c.viagem, 0.6))};
};

// Picos medidos (RMS em janelas de 50 ms): whooshes_15 em 0,75 s; whooshes_16 em 0,65 s. Os sons começam antes do
// movimento para o pico cair no meio da viagem e no fim do disparo do cometa (velocidade máxima, expo-in).
const PICO_VIAGEM = 0.75;
const PICO_COMETA = 0.65;
export const sonsPontoLuz = (c: Camada, fps: number) => {
	const dur = Math.round((c.fim - c.ini) * fps);
	const {saida, saidaQ, viajarEm, viagem} = tempos(c, fps, dur);
	const out: {t: number; som: string; vol: number}[] = [];
	if (par(c.origem)) out.push({t: Math.max(0, viajarEm + 0.5 * viagem - PICO_VIAGEM), som: SOM_VIAGEM, vol: 0.45});
	if (saida === 'cometa' && Number.isFinite(saidaQ)) out.push({t: Math.max(0, saidaQ / fps + Q_SAIDA.cometa / 30 - PICO_COMETA), som: SOM_COMETA, vol: 0.5});
	return out;
};

export const PontoLuz: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k30 = fps / 30; // quadros reais por q de 30 fps
	const qq = frame / k30;

	const X = num(c.x, 0.5) * W;
	const Y = num(c.y, 0.47) * H;
	const origem = par(c.origem);
	const O = origem ? [origem[0] * W, origem[1] * H] : [X, Y];
	const arco = num(c.arco, 0.12);
	const nucleo = num(c.nucleo, 7) * u;
	const halo = num(c.halo, 100) * u;
	const cor = txt(c.cor, est.acento);
	const corNucleo = txt(c.corNucleo, est.creme);
	const brilhoBase = num(c.brilho, 1);
	const {saida, saidaQ, viajarEm, viagem} = tempos(c, fps, dur);
	const rumo = (num(c.rumo, 0) * Math.PI) / 180;
	const alcance = num(c.alcance, 0.8) * W;
	const qCometa = (Q_SAIDA.cometa * fps) / 30;

	// caminho: arco (bézier quadrática) da origem até (x, y); depois, na saída em cometa, reta no rumo dado
	const dx = X - O[0];
	const dy = Y - O[1];
	const dist = Math.hypot(dx, dy);
	const ctrl = [(O[0] + X) / 2 - (dy / (dist || 1)) * dist * arco, (O[1] + Y) / 2 + (dx / (dist || 1)) * dist * arco];
	const posEm = (f: number): [number, number] => {
		const s = f / fps;
		const p = CURVA_DESENHO(Math.min(1, Math.max(0, (s - viajarEm) / viagem)));
		const a = (1 - p) * (1 - p);
		const b = 2 * (1 - p) * p;
		const d = p * p;
		let px = a * O[0] + b * ctrl[0] + d * X;
		let py = a * O[1] + b * ctrl[1] + d * Y;
		if (saida === 'cometa' && f > saidaQ) {
			const e = CURVAS.saida(Math.min(1, (f - saidaQ) / qCometa));
			px += Math.cos(rumo) * alcance * e;
			py += Math.sin(rumo) * alcance * e;
		}
		return [px, py];
	};
	const [px, py] = posEm(frame);

	// acender
	const acende = bool(c.acende, true);
	const eNuc = acende ? interpolate(qq, [0, 4], [0, 1], {...clamp, easing: CURVAS.entrada}) : 1;
	const eHalo = acende ? interpolate(qq, [0, 10], [0.35, 1], {...clamp, easing: CURVAS.entrada}) : 1;
	const opHalo = acende ? interpolate(qq, [0, 4], [0, 1], clamp) : 1;
	const flare = acende ? interpolate(qq, [2, 14], [0.35, 0], {...clamp, easing: CURVAS.entrada}) : 0;

	// saída
	const sq = (frame - saidaQ) / k30; // q desde o início da saída
	let escN = eNuc;
	let escH = eHalo;
	let op = opHalo;
	if (saida === 'colapso' && sq >= 0) {
		const inchar = interpolate(sq, [0, 2], [0, 1], {...clamp, easing: CURVAS.entrada});
		const sumir = interpolate(sq, [2, 8], [0, 1], {...clamp, easing: CURVAS.saida});
		escN *= (1 + 0.15 * inchar) * (1 - sumir);
		escH *= (1 + 0.25 * inchar) * (1 - sumir);
	} else if (saida === 'apagar' && sq >= 0) {
		const e = interpolate(sq, [0, 9], [0, 1], {...clamp, easing: CURVAS.saida});
		op *= 1 - e;
		escH *= 1 - 0.3 * e;
	} else if (saida === 'cometa' && sq >= 0) {
		op *= interpolate(sq, [6, 10], [1, 0], clamp);
		escH *= 1 - 0.35 * interpolate(sq, [0, 10], [0, 1], clamp);
	}
	// relógio da saída exato (a camada começa no quadro round(ini·fps)): duas camadas seguidas pulsam na mesma fase
	const pulso = bool(c.pulso, true) ? pulsoEm((Math.round(num(c.ini, 0) * fps) + frame) / fps) : 1;

	// rastro de cometa: o caminho dos últimos `RASTRO_Q` q (a posição é função do tempo, então é determinístico),
	// desenhado CONTÍNUO em SVG: um traço largo e desfocado no acento + um traço fino creme, os dois sumindo da cabeça
	// para a cauda num gradiente. Parado, o rastro tem comprimento ~0 e some sozinho.
	const RASTRO_Q = 5;
	const amostras: [number, number][] = [];
	for (let k = 0; k <= RASTRO_Q * 4; k++) amostras.push(posEm(frame - k * 0.25 * k30));
	let compr = 0;
	for (let k = 1; k < amostras.length; k++) compr += Math.hypot(amostras[k][0] - amostras[k - 1][0], amostras[k][1] - amostras[k - 1][1]);
	const cauda = amostras[amostras.length - 1];
	const opRastro = op * Math.min(1, compr / (halo * 0.6));
	const idSvg = useId().replace(/[^a-zA-Z0-9]/g, '');
	const rastro =
		opRastro > 0.01 ? (
			<svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<defs>
					<linearGradient id={`${idSvg}g`} gradientUnits="userSpaceOnUse" x1={px} y1={py} x2={cauda[0]} y2={cauda[1]}>
						<stop offset="0" stopColor={cor} stopOpacity={0.75} />
						<stop offset="0.45" stopColor={cor} stopOpacity={0.28} />
						<stop offset="1" stopColor={cor} stopOpacity={0} />
					</linearGradient>
					<linearGradient id={`${idSvg}n`} gradientUnits="userSpaceOnUse" x1={px} y1={py} x2={cauda[0]} y2={cauda[1]}>
						<stop offset="0" stopColor={corNucleo} stopOpacity={0.95} />
						<stop offset="0.35" stopColor={corNucleo} stopOpacity={0.35} />
						<stop offset="0.8" stopColor={corNucleo} stopOpacity={0} />
					</linearGradient>
					<filter id={`${idSvg}b`} x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation={halo * 0.06} />
					</filter>
				</defs>
				<g opacity={opRastro} fill="none" strokeLinecap="round" strokeLinejoin="round">
					<path d={`M${amostras.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')}`} stroke={`url(#${idSvg}g)`} strokeWidth={halo * 0.2 * escH} filter={`url(#${idSvg}b)`} />
					<path d={`M${amostras.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')}`} stroke={`url(#${idSvg}n)`} strokeWidth={nucleo * 0.7 * escN} />
				</g>
			</svg>
		) : null;

	// cantoneiras de visor
	const cantos = bool(c.cantoneiras, false);
	const m = num(c.margemCantos, 0.03) * W;
	const braco = num(c.bracoCantos, 40) * u;
	const eCant = interpolate(qq, [3, 15], [0, 1], {...clamp, easing: CURVAS.entrada});
	const opCant = eCant * (saida === 'corte' ? interpolate(frame, [dur - 6 * k30, dur], [1, 0], clamp) : interpolate(sq, [0, 8], [1, 0], clamp));
	const recuo = (1 - eCant) * 14 * u;
	const esp = 2 * u;
	const L = (left: number, top: number, sx: number, sy: number, i: number) => (
		<div key={i} style={{position: 'absolute', left, top, width: braco, height: braco, transform: `scale(${sx}, ${sy})`, transformOrigin: '0 0', opacity: opCant}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: braco, height: esp, background: rgba(est.creme, 0.6)}} />
			<div style={{position: 'absolute', left: 0, top: 0, width: esp, height: braco, background: rgba(est.creme, 0.6)}} />
		</div>
	);

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{cantos && opCant > 0.005 && [L(m + recuo, m + recuo, 1, 1, 0), L(W - m - recuo, m + recuo, -1, 1, 1), L(m + recuo, H - m - recuo, 1, -1, 2), L(W - m - recuo, H - m - recuo, -1, -1, 3)]}
			{rastro}
			<PontoNucleo x={px} y={py} nucleo={nucleo} halo={halo} cor={cor} corNucleo={corNucleo} escalaNucleo={escN * (0.95 + 0.05 * pulso)} escalaHalo={escH * pulso * (1 + flare)} opacidade={op} brilho={brilhoBase * (1 + flare)} />
		</AbsoluteFill>
	);
};
