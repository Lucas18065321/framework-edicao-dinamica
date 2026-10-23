// Contador (YOUTUBE - MIX EDIT, peça `contador`): número isolado contando, com algarismos tabulares (não tremem) e
// formato brasileiro (Intl.NumberFormat pt-BR), sufixo menor (ex.: "%"), assento 1,04→1 e rótulo embaixo.
// Uso: o número central de um pico ("90%" dos meus alunos · enquete no perfil) numa tela de acento
// (`fundo: 'acento'`, quebra de modo) ou sobre escuro/grade/rosto desfocado; dado de estudo com `fonte` (ex.: "+23
// min/dia" · Autor et al., Revista, ano). 60–120 q (com fonte, ≥ 3,5 s para o rodapé ficar 3 s no ar).
// Sequência: o número aparece (blur 10→0 em 6 q) já na escala 1,04 e conta em `contagem` s (expo-out: chega rápido
// e pousa devagar); ao pousar, assenta 1,04→1 em 6 q, o brilho decai em 10 q e o sublinhado se desenha em 8 q (curva
// "risco"); o rótulo entra em cascata Apple e a nota (Instrument Serif itálica) logo depois; o rodapé de fonte entra
// 0,35 s depois do pouso (antecipado para ficar ≥ 3 s no ar).
// Modo "slot" (caça-níquel): cada algarismo rola num tambor e para em sequência, da esquerda para a direita (7 q entre eles).
// Cor: sobre o carmim, creme dá 6,1:1 e o preto quente #1C0A06 só 2,8:1 → padrão creme em todo fundo. No carmim, o
// rodapé de fonte troca o fio para creme e sobe o texto para 94% (a 70% ficaria em 3,4:1).
// A tela de acento cheia entra e sai em corte seco (WCAG: 1 inversão por troca); só o número e o texto animam.
// Parâmetros:
//   valor (número final), de (0), casas (decimais; padrão as do valor), prefixo ("", ex.: "+", "R$ "), sufixo ("", ex.: "%",
//     " kg", " min/dia"; desenhado a 55% do corpo: símbolo alinhado ao topo, unidade com espaço na linha de base),
//   sufixoCheio (false: sufixo no mesmo corpo do número),
//   rotulo (frase embaixo; " · " separa a nota: "dos meus alunos · enquete no perfil"), nota,
//   fonte (rodapé "Fonte: …", corpo 26 px, à esquerda em y 0,88), fonteT (s; padrão pouso + 0,35),
//   x, y (centro do número, 0.5 e 0.44), tamanho (corpo do número em px de 1080, 260), tamanhoRotulo (60),
//   fundo ('nenhum' | 'acento' | 'escuro'; padrão 'nenhum' = a cena por baixo), cor (cor do número; padrão creme),
//   t (s em que a contagem começa, 0.12), contagem (s, 1.2), modo ('conta' | 'slot'), sublinhado (true),
//   brilho (true: glow creme enquanto conta).
// Sons (registro): sfxContador (contagem) na entrada; sonsContador = clique no pouso do número + clique alto no rodapé
// de fonte (se não cair a < 8 q do pouso).
import React, {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {Rodape, comSomFonte, tempoFonte} from './grafico-barras';

export const sfxContador: [string, number] = ['motionix/data-collect/data-collect_04_data-collect', 0.5];
const SOM_POUSO = 'motionix/clicks/clicks_01_cinematic-click';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fase = (t: number, ini: number, fim: number, curva: (x: number) => number = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const RISCO = Easing.bezier(0.37, 0, 0.63, 1);
const ASSENTO = Easing.bezier(0.22, 1, 0.36, 1);
const PASSO_SLOT = 7 / 30; // s entre algarismos que param no modo slot
const MASCARA = 'linear-gradient(transparent, #000 22%, #000 78%, transparent)';

const decimais = (v: number) => {
	const s = String(v);
	return s.includes('.') ? Math.min(3, s.split('.')[1].length) : 0;
};

// instante (s desde o início da camada) em que o número pousa
export const pousoContador = (c: Camada) => {
	const t0 = Math.max(0, num(c.t, 0.12));
	if (c.modo === 'slot') {
		const casas = num(c.casas, decimais(num(c.valor, 0)));
		const digitos = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas}).format(Math.abs(num(c.valor, 0))).replace(/\D/g, '').length;
		return t0 + 0.25 + digitos * PASSO_SLOT;
	}
	return t0 + Math.max(0.3, num(c.contagem, 1.2)) * 0.82; // na expo-out, o último algarismo para em ~80% do tempo
};

// instante (s) em que o rodapé de fonte entra
const fonteContador = (c: Camada, durS: number) => tempoFonte(num(c.fonteT, pousoContador(c) + 0.35), durS);

export const sonsContador = (c: Camada): Som[] => comSomFonte([{t: pousoContador(c), som: SOM_POUSO, vol: 0.6}], txt(c.fonte, '').trim() ? fonteContador(c, c.fim - c.ini) : null);

// tambor de um algarismo (modo slot): rola 2 voltas e para no dígito em `para` (s), com borrão vertical proporcional à
// velocidade (3 níveis de filtro SVG; parado = nítido)
const ROLA = Easing.bezier(0.2, 0.6, 0.25, 1);
const Tambor: React.FC<{d: number; t: number; ini: number; para: number; filtro: string}> = ({d, t, ini, para, filtro}) => {
	const posEm = (x: number) => d + 20 * (1 - fase(x, ini, para, ROLA)); // índice na fita 0..29 (3 voltas de 0–9)
	const pos = posEm(t);
	const p = fase(t, ini, para, ROLA);
	const v = Math.abs(pos - posEm(t - 1 / 30)); // algarismos por quadro de 30 fps
	const nivel = v < 0.25 ? 0 : v < 0.9 ? 1 : v < 2 ? 2 : 3;
	return (
		<span style={{position: 'relative', display: 'inline-block', overflow: 'hidden', height: '1em', verticalAlign: 'top', maskImage: p < 1 ? MASCARA : undefined, WebkitMaskImage: p < 1 ? MASCARA : undefined}}>
			<span style={{visibility: 'hidden'}}>{d}</span>
			<span style={{position: 'absolute', left: 0, top: 0, display: 'flex', flexDirection: 'column', transform: `translateY(${-pos}em)`, filter: nivel ? `url(#${filtro}-${nivel})` : undefined}}>
				{Array.from({length: 30}, (_, k) => (
					<span key={k} style={{height: '1em', lineHeight: '1em'}}>
						{k % 10}
					</span>
				))}
			</span>
		</span>
	);
};

export const Contador: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const valor = num(c.valor, 0);
	const de = num(c.de, 0);
	const casas = num(c.casas, decimais(valor));
	const fmt = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas});
	const prefixo = txt(c.prefixo, '');
	const sufixo = txt(c.sufixo, '');
	const sufixoCheio = bool(c.sufixoCheio, false);
	const fundo = txt(c.fundo, 'nenhum');
	const fonte = txt(c.fonte, '').trim();
	const creme = est.creme;
	const acento = est.acento;
	const cor = txt(c.cor, creme);
	const fs = num(c.tamanho, 260) * u;
	const fsRot = num(c.tamanhoRotulo, 60) * u;
	const t0 = Math.max(0, num(c.t, 0.12));
	const contagem = Math.max(0.3, num(c.contagem, 1.2));
	const slot = c.modo === 'slot';
	const pouso = pousoContador(c);
	const idFiltro = `ct${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

	// rótulo e nota (" · " no rótulo separa a nota)
	const bruto = txt(c.rotulo, '');
	const [rotulo, notaDoRotulo] = bruto.includes(' · ') ? [bruto.slice(0, bruto.indexOf(' · ')), bruto.slice(bruto.indexOf(' · ') + 3)] : [bruto, ''];
	const nota = txt(c.nota, notaDoRotulo).trim();

	const qSai = Math.max(1, Math.min(Math.round(fps * 0.34), Math.floor(dur * 0.3)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const aparece = fase(t, t0 - 0.05, t0 + 6 / 30);
	const assento = fase(t, pouso, pouso + 6 / 30, ASSENTO);
	const escala = 1.04 - 0.04 * assento;
	const brilho = bool(c.brilho, true) ? interpolate(t, [t0, t0 + 0.2, pouso, pouso + 10 / 30], [0, 1, 1, 0], clamp) : 0;
	const sub = bool(c.sublinhado, true) ? fase(t, pouso + 0.03, pouso + 0.03 + 8 / 30, RISCO) : 0;
	const deriva = 1 + 0.015 * interpolate(frame, [0, dur], [0, 1], clamp);

	// número atual
	const pc = fase(t, t0, t0 + contagem, Easing.bezier(0.16, 1, 0.3, 1));
	const atual = de + (valor - de) * pc;
	const final = fmt.format(valor);
	let corpo: React.ReactNode;
	if (slot) {
		let k = 0;
		corpo = final.split('').map((ch, i) => {
			if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
			const para = t0 + 0.25 + ++k * PASSO_SLOT;
			return <Tambor key={i} d={Number(ch)} t={t} ini={t0} para={para} filtro={idFiltro} />;
		});
	} else {
		corpo = fmt.format(atual);
	}

	const corSub = fundo === 'acento' ? creme : acento;
	const sombra = fundo === 'acento' ? `0 ${6 * u}px ${30 * u}px ${rgba(est.acentoProfundo, 0.45)}` : `0 ${6 * u}px ${24 * u}px ${rgba('#000000', 0.4)}`;
	const glow = `0 0 ${40 * u * brilho}px ${rgba(creme, 0.35 * brilho)}`;
	const cx = num(c.x, 0.5) * W;
	const cy = num(c.y, 0.44) * H;

	// cascata Apple do rótulo (palavra por palavra, 3 q entre palavras)
	const palavras = rotulo.trim() ? rotulo.trim().split(/\s+/) : [];
	const rotIni = pouso - 0.15;
	const notaE = fase(t, rotIni + 0.12 + palavras.length * 0.1, rotIni + 0.12 + palavras.length * 0.1 + 0.4);

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{slot && (
				<svg width={0} height={0} style={{position: 'absolute'}}>
					<defs>
						{[0.02, 0.05, 0.09].map((k, i) => (
							<filter key={i} id={`${idFiltro}-${i + 1}`} x="-10%" y="-20%" width="120%" height="140%">
								<feGaussianBlur stdDeviation={`0 ${k * fs}`} />
							</filter>
						))}
					</defs>
				</svg>
			)}
			{fundo === 'acento' && <AbsoluteFill style={{background: `radial-gradient(ellipse 90% 85% at 50% 45%, ${acento} 0%, ${acento} 50%, ${rgba(est.acentoProfundo, 0.55)} 150%)`}} />}
			{fundo === 'escuro' && <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, #15161C 0%, ${(est as {fundoEscuro?: string}).fundoEscuro ?? '#0D0E13'} 55%, #07080B 100%)`}} />}
			<AbsoluteFill style={{opacity: 1 - ps, filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined, transform: `translateY(${-20 * u * ps}px) scale(${deriva})`, transformOrigin: `${cx}px ${cy}px`}}>
				<div
					style={{
						position: 'absolute',
						left: cx,
						top: cy,
						transform: `translate(-50%, -50%) scale(${escala})`,
						display: 'flex',
						alignItems: sufixo.startsWith(' ') ? 'baseline' : 'flex-start',
						fontFamily: FONTES.impacto.family,
						fontWeight: 900,
						fontSize: fs,
						lineHeight: 1,
						letterSpacing: '-0.02em',
						fontVariantNumeric: 'tabular-nums',
						whiteSpace: 'pre',
						color: cor,
						opacity: aparece,
						filter: aparece < 0.99 ? `blur(${(1 - aparece) * 10 * u}px)` : undefined,
						textShadow: `${glow}, ${sombra}`,
					}}
				>
					<span style={{position: 'relative', display: 'inline-block'}}>
						{slot ? (
							<>
								{prefixo}
								{corpo}
							</>
						) : (
							// a largura é a do número final (algarismos tabulares): os dígitos entram pela direita e o sufixo
							// não anda enquanto conta
							<span style={{position: 'relative', display: 'inline-block'}}>
								<span style={{visibility: 'hidden'}}>
									{prefixo}
									{final}
								</span>
								<span style={{position: 'absolute', right: 0, top: 0}}>
									{prefixo}
									{corpo}
								</span>
							</span>
						)}
						{sufixoCheio && sufixo}
						{/* sublinhado desenhando da esquerda (curva "risco", 8 q) */}
						<span style={{position: 'absolute', left: '0.04em', right: '0.04em', bottom: '-0.06em', height: Math.max(4, 0.03 * fs), borderRadius: 99, background: corSub, transform: `scaleX(${sub})`, transformOrigin: '0 50%', opacity: sub > 0 ? 1 : 0}} />
					</span>
					{!sufixoCheio && sufixo && <span style={{fontSize: '0.55em', fontWeight: 800, letterSpacing: '-0.01em', marginLeft: sufixo.startsWith(' ') ? 0 : '0.03em', marginTop: sufixo.startsWith(' ') ? 0 : '0.06em'}}>{sufixo}</span>}
				</div>

				{(palavras.length > 0 || nota) && (
					<div style={{position: 'absolute', left: cx, top: cy + fs * 0.62 + 34 * u, transform: 'translateX(-50%)', width: 0.72 * W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * u, textAlign: 'center'}}>
						{palavras.length > 0 && (
							<div style={{fontFamily: FONTES.base.family, fontWeight: 600, fontSize: fsRot, lineHeight: 1.12, letterSpacing: '-0.015em', textWrap: 'balance', color: fundo === 'acento' ? creme : rgba(creme, 0.92), textShadow: fundo === 'acento' ? undefined : `0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.35)}`}}>
								{palavras.map((w, k) => {
									const a = rotIni + k * 0.1;
									const e = fase(t, a, a + 11 / 30);
									return (
										<span key={k} style={{display: 'inline-block', marginRight: '0.25em', opacity: e, filter: e < 0.99 ? `blur(${(1 - e) * 12 * u}px)` : undefined, transform: `translateY(${(1 - e) * 0.35}em) scale(${0.92 + 0.08 * e})`}}>
											{w}
										</span>
									);
								})}
							</div>
						)}
						{nota && (
							// qualificador essencial ("enquete no perfil", não estudo): serifa itálica no corpo do rótulo (a Instrument
							// Serif tem olho pequeno; abaixo disso some no celular)
							<div style={{fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: fsRot, lineHeight: 1.1, color: rgba(creme, fundo === 'acento' ? 0.92 : 0.78), opacity: notaE, transform: `translateY(${(1 - notaE) * 10 * u}px)`, textShadow: fundo === 'acento' ? undefined : `0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.35)}`}}>
								{nota}
							</div>
						)}
					</div>
				)}
			</AbsoluteFill>
			{fonte && (
				<AbsoluteFill style={{opacity: 1 - ps, filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined}}>
					<Rodape est={est} fonte={fonte} fonteT={fonteContador(c, dur / fps)} sobreAcento={fundo === 'acento'} />
				</AbsoluteFill>
			)}
		</AbsoluteFill>
	);
};
