// Flash de fotos (MIX EDIT, peça `flash-foto`; beat 3 da intro e re-ganchos com 2–3 fotos). Fotos em tela cheia por
// 6–10 q cada, por cima do rosto: entram com flash branco (q0 a 70%, q1 a 60%, cauda de 1 q a 14%; nunca 100%), aberração
// cromática de ~12 px caindo a 0 em 4 q (saída quadrática) e Ken Burns de 1,00 a 1,05 ancorado no `foco`; saem com 2 q de
// desfoque leve (8 px + 1,6% de escala, sem corte seco). Entre as fotos a camada fica vazia (o rosto da cena aparece).
// Regras do guia (WCAG 2.3.1 + respiro do rosto): no máximo 3 flashes em qualquer janela de 1 s e ≥ 12 q de rosto entre
// uma foto e a próxima. Foto que quebra a regra (ou que não cabe inteira na camada) é IGNORADA (sem imagem e sem som) e
// o motivo sai no console.
// Fotos: banco, Flow ou domínio público; nunca "melhorar" foto do Google. Afirmação da pergunta só com fonte conferida.
// Parâmetros:
//   fotos ([{t, arquivo, foco?, q?}]: t em s desde o início da camada; arquivo relativo à pasta do projeto;
//     foco = [x, y] da foto (0..1) que fica no centro do recorte e do Ken Burns, padrão [0.5, 0.5];
//     q = quadros de 30 fps desta foto, padrão `quadros`),
//   quadros (q por foto, 8; limitado a 6–10), flash (opacidade do branco, 0.7; teto 0.8), aberracao (px em 1080, 12; 0 = sem),
//   efeito: 'webgl' (padrão: chromaticAberration do @remotion/effects no <Img>; precisa de --gl=angle) | 'css'
//     (3 cópias R/G/B somadas em mix-blend screen; não depende de WebGL), kenBurns (0.05), rostoMin (q, 12),
//   maxPorSegundo (3).
// Sons: 1 obturador por foto aceita (camera-shutters_02, 0,55: piso do guia para SFX durante a fala). Sem som de
// entrada no registro (a 1ª foto pode não estar no início da camada).
import React, {useEffect, useId, useMemo, useState} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {chromaticAberration} from '@remotion/effects/chromatic-aberration';
import type {PecaProps} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {clamp} from '../tempo';

export const sfxFlashFoto: [string, number] = ['motionix/camera-shutters/camera-shutters_02_little-bit-hard-cammera-shutter', 0.55];

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const limite = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const avisados = new Set<string>();
const avisar = (m: string) => {
	if (avisados.has(m)) return;
	avisados.add(m);
	console.warn(m);
};

export type FotoFlash = {arquivo: string; foco: [number, number]; ini: number; fim: number; n: number}; // ini/fim em quadros da camada

// Aplica as regras (≤ maxPorSegundo flashes por janela de 1 s, ≥ rostoMin q entre fotos) e devolve só as fotos aceitas.
export const fotosValidas = (c: Camada, fps: number): FotoFlash[] => {
	const k30 = fps / 30;
	const qPadrao = limite(num(c.quadros, 8), 6, 10);
	const rostoMin = Math.round(num(c.rostoMin, 12) * k30);
	const maxPS = Math.max(1, num(c.maxPorSegundo, 3));
	const brutas = (Array.isArray(c.fotos) ? c.fotos : [])
		.map((f, n) => {
			const o = (f ?? {}) as {t?: unknown; arquivo?: unknown; foco?: unknown; q?: unknown};
			const foco = Array.isArray(o.foco) && o.foco.length === 2 ? ([num(o.foco[0], 0.5), num(o.foco[1], 0.5)] as [number, number]) : ([0.5, 0.5] as [number, number]);
			return {t: num(o.t, NaN), arquivo: txt(o.arquivo, ''), foco, q: limite(num(o.q, qPadrao), 6, 10), n};
		})
		.filter((f) => {
			if (!f.arquivo || !Number.isFinite(f.t)) avisar(`flash-foto: foto ${f.n + 1} sem "t" ou "arquivo": ignorada`);
			return f.arquivo && Number.isFinite(f.t);
		})
		.sort((a, b) => a.t - b.t);
	const ok: FotoFlash[] = [];
	const durCamada = Math.round((num(c.fim, Infinity) - num(c.ini, 0)) * fps);
	for (const f of brutas) {
		const ini = Math.round(f.t * fps);
		const fim = ini + Math.max(1, Math.round(f.q * k30));
		if (ini < 0 || fim > durCamada) {
			avisar(`flash-foto: foto ${f.n + 1} (${f.arquivo}, t=${f.t}s) ignorada: sai da camada (precisa de ${f.q} q a partir de t)`);
			continue;
		}
		const ant = ok[ok.length - 1];
		if (ant && ini - ant.fim < rostoMin) {
			const gap = (ini - ant.fim) / k30;
			avisar(`flash-foto: foto ${f.n + 1} (${f.arquivo}, t=${f.t}s) ignorada: ${gap < 0 ? 'começa antes de a foto anterior acabar' : `só ${gap.toFixed(1)} q de rosto depois da anterior`} (mínimo ${num(c.rostoMin, 12)} q de rosto)`);
			continue;
		}
		const naJanela = ok.filter((o) => o.ini > ini - fps).length;
		if (naJanela >= maxPS) {
			avisar(`flash-foto: foto ${f.n + 1} (${f.arquivo}, t=${f.t}s) ignorada: passaria de ${maxPS} flashes em 1 s (WCAG 2.3.1)`);
			continue;
		}
		ok.push({arquivo: f.arquivo, foco: f.foco, ini, fim, n: f.n});
	}
	return ok;
};

export const sonsFlashFoto = (c: Camada, fps: number) => fotosValidas(c, fps).map((f) => ({t: f.ini / fps, som: sfxFlashFoto[0], vol: sfxFlashFoto[1]}));

// Foto com aberração cromática por CSS: 3 cópias (só R, só G, só B) deslocadas e somadas em screen sobre preto.
// Com deslocamento 0 a soma é a própria foto.
const FotoRGB: React.FC<{src: string; desloc: number; objectPosition: string}> = ({src, desloc, objectPosition}) => {
	const id = useId().replace(/[^a-zA-Z0-9]/g, '');
	const canais: [string, string, number][] = [
		['r', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', -desloc],
		['g', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 0],
		['b', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', desloc],
	];
	return (
		<AbsoluteFill style={{background: '#000', isolation: 'isolate'}}>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<defs>
					{canais.map(([k, m]) => (
						<filter key={k} id={`${id}${k}`} colorInterpolationFilters="sRGB">
							<feColorMatrix type="matrix" values={m} />
						</filter>
					))}
				</defs>
			</svg>
			{canais.map(([k, , dx]) => (
				<Img
					key={k}
					src={src}
					style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition, filter: `url(#${id}${k})`, transform: `translateX(${dx}px)`, mixBlendMode: 'screen'}}
				/>
			))}
		</AbsoluteFill>
	);
};

// Foto com a aberração do @remotion/effects. O shader desloca os canais em px da TEXTURA (tamanho natural da foto),
// não da tela: com object-fit cover a foto é ampliada, então o deslocamento é dividido pela escala do cover para dar
// `desloc` px na tela. O tamanho natural é lido uma vez por arquivo (delayRender até carregar).
const tamanhos = new Map<string, [number, number]>();
const FotoWebGL: React.FC<{src: string; desloc: number; objectPosition: string; W: number; H: number}> = ({src, desloc, objectPosition, W, H}) => {
	const {delayRender, continueRender, cancelRender} = useDelayRender();
	const [tam, setTam] = useState<[number, number] | null>(() => tamanhos.get(src) ?? null);
	const [espera] = useState(() => (tamanhos.has(src) ? null : delayRender(`flash-foto: tamanho de ${src}`)));
	useEffect(() => {
		if (espera === null) return;
		const img = new Image();
		img.onload = () => {
			const t: [number, number] = [img.naturalWidth, img.naturalHeight];
			tamanhos.set(src, t);
			setTam(t);
			continueRender(espera);
		};
		img.onerror = () => cancelRender(new Error(`flash-foto: não carregou ${src}`));
		img.src = src;
	}, [src, espera, continueRender, cancelRender]);
	const cover = tam ? Math.max(W / tam[0], H / tam[1]) : 1;
	const amount = desloc / cover;
	return (
		<Img
			src={src}
			effects={[chromaticAberration({amount, angle: 0, disabled: amount < 0.15})]}
			style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition}}
		/>
	);
};

export const FlashFoto: React.FC<PecaProps> = ({c}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k30 = fps / 30;
	const fotos = useMemo(() => fotosValidas(c, fps), [c, fps]);
	const f = fotos.find((o) => frame >= o.ini && frame < o.fim);
	if (!f) return null;

	const q = (frame - f.ini) / k30; // q desde a entrada da foto
	const qDur = (f.fim - f.ini) / k30;
	const src = staticFile(f.arquivo);
	const objectPosition = `${f.foco[0] * 100}% ${f.foco[1] * 100}%`;
	const kb = 1 + num(c.kenBurns, 0.05) * Math.min(1, q / Math.max(1, qDur - 1));
	// aberração: ~12 px → 0 em 4 q com saída quadrática (12 · 6,75 · 3 · 0,75 px). A expo-out zerava já no q 1, ainda
	// debaixo do flash, e o efeito não aparecia.
	const ab = num(c.aberracao, 12) * u * (1 - interpolate(q, [0, 4], [0, 1], {...clamp, easing: Easing.out(Easing.quad)}));
	// flash: 2 q dentro de 60–80% (q0 = flash, q1 = 0,86 × flash: 70% e 60% no padrão) + cauda de 1 q a 0,2 × flash
	const flash = Math.min(0.8, num(c.flash, 0.7)) * (q < 1 ? 1 : q < 2 ? 0.86 : q < 3 ? 0.2 : 0);
	// saída em 2 q (os 2 últimos quadros da foto a 37% e 100%): desfoque até 8 px + 1,6% de escala + leve fade, para a
	// foto não sair seca antes do rosto (com a curva de saída antiga, o último quadro ficava em ~13%)
	const sai = interpolate(q, [qDur - 1 - 1.6, qDur - 1], [0, 1], clamp);
	const css = txt(c.efeito, 'webgl') === 'css';

	return (
		<AbsoluteFill style={{background: '#000', pointerEvents: 'none', opacity: 1 - 0.12 * sai}}>
			<AbsoluteFill
				style={{
					transform: `scale(${kb * (1 + 0.016 * sai)})`,
					transformOrigin: objectPosition,
					filter: sai > 0 ? `blur(${8 * sai * u}px)` : undefined,
				}}
			>
				{css ? (
					<FotoRGB src={src} desloc={ab} objectPosition={objectPosition} />
				) : (
					<FotoWebGL key={`${f.n}`} src={src} desloc={ab} objectPosition={objectPosition} W={W} H={H} />
				)}
			</AbsoluteFill>
			{flash > 0 && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}
		</AbsoluteFill>
	);
};
