// Legenda cinética do INSTAGRAM - EDIÇÃO CUT DINÂMICO: 100% da fala vira tipografia (guia v1, seções Tipografia e Legenda).
// Blocos de até 5 palavras que zeram em cada corte de cena; papéis voz (Inter Tight 500), destaque (900 no acento)
// e conector (Instrument Serif itálica); padrões linha / pilha / mae / larga em rodízio; cada palavra entra no instante
// em que é falada (layout estável: as palavras ocupam o lugar desde o início do bloco, invisíveis até a vez delas).
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import {normalizar, limparPalavra} from '../legendas';
import type {Palavra} from '../tipos';
import {FONTES, type Fonte} from '../kit/fontes';
import {CURVAS, clamp} from '../kit/tempo';
import type {Estilo} from './estilos';

type Papel = 'voz' | 'destaque' | 'conector';
type Padrao = 'linha' | 'pilha' | 'mae' | 'larga';
type PalavraC = Palavra & {papel: Papel};
export type BlocoCinetico = {ini: number; fim: number; morreNoCorte: boolean; palavras: PalavraC[]; padrao: Padrao; gancho: boolean; n: number};

const CONECTORES = new Set(['o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'pra', 'pro', 'para', 'com', 'que', 'e', 'um', 'uma', 'se', 'seu', 'sua', 'teu', 'tua', 'ao', 'ou']);
const MULETAS = new Set(['ah', 'ne', 'tipo', 'hum', 'eh']);
const GANCHO = 7; // s: blocos inclinados e mais rápidos no gancho

// Agrupa as palavras (tempo da saída) em blocos: quebra no corte de cena, em pontuação forte, em pausa ≥ 0,35 s ou com 5 palavras.
// destaques: "palavra" (toda ocorrência) ou "palavra@segundo" (só a ocorrência a até 0,6 s desse instante da saída)
export const montarBlocosCineticos = (palavras: Palavra[], destaques: string[], cortes: number[], ocultos: [number, number][]): BlocoCinetico[] => {
	const chaves = new Set(destaques.filter((d) => !d.includes('@')).map(normalizar));
	const pontuais = destaques.filter((d) => d.includes('@')).map((d) => ({k: normalizar(d.split('@')[0]), t: Number(d.split('@')[1])}));
	const ehDestaque = (w: Palavra, k: string) => chaves.has(k) || pontuais.some((p) => p.k === k && Math.abs(w.ini - p.t) <= 0.6);
	const corteApos = (t: number) => cortes.find((c) => c > t + 1e-3) ?? Infinity;
	const oculto = (w: Palavra) => ocultos.some(([a, b]) => (w.ini + w.fim) / 2 >= a && (w.ini + w.fim) / 2 < b);
	const blocos: BlocoCinetico[] = [];
	let atual: PalavraC[] = [];
	const fechar = (proxIni: number) => {
		if (!atual.length) return;
		const ini = atual[0].ini;
		const corte = corteApos(ini);
		const fim = Math.min(proxIni, atual[atual.length - 1].fim + 0.7, corte);
		let nDest = 0;
		const pal = atual.map((w) => (w.papel === 'destaque' && ++nDest > 2 ? {...w, papel: 'voz' as Papel} : w));
		blocos.push({ini, fim, morreNoCorte: fim >= corte - 1e-3, palavras: pal, padrao: 'linha', gancho: ini < GANCHO, n: blocos.length});
		atual = [];
	};
	palavras.forEach((w, i) => {
		const k = normalizar(w.w);
		// "tipo" só é muleta com vírgula ("tipo, assim"); em "algum tipo de problema" é palavra
		const muleta = MULETAS.has(k) && (k !== 'tipo' || /,\s*$/.test(w.w));
		if (!k || muleta || oculto(w)) {
			fechar(w.ini);
			return;
		}
		const ant = atual[atual.length - 1];
		if (ant && (w.ini >= corteApos(atual[0].ini) - 1e-3 || /[.!?]$/.test(ant.w) || w.ini - ant.fim >= 0.35 || atual.length >= 5 || (/[,;:]$/.test(ant.w) && atual.length >= 3))) fechar(w.ini);
		const papel: Papel = ehDestaque(w, k) || /\d/.test(w.w) ? 'destaque' : CONECTORES.has(k) ? 'conector' : 'voz';
		atual.push({...w, papel});
		if (i === palavras.length - 1) fechar(Infinity);
	});
	fechar(Infinity);
	// rodízio de padrões: nunca o mesmo em blocos seguidos; pilha em até ~40%
	let ant: Padrao = 'larga';
	let pilhas = 0;
	return blocos.map((b, i) => {
		const temDest = b.palavras.some((w) => w.papel === 'destaque');
		const n = b.palavras.length;
		const opcoes: Padrao[] = temDest ? (n <= 3 ? ['mae', 'larga', 'linha'] : ['pilha', 'mae', 'linha']) : n >= 3 ? ['pilha', 'linha'] : ['linha'];
		let p = opcoes.find((o) => o !== ant && !(o === 'pilha' && pilhas > 0.4 * (i + 1))) ?? 'linha';
		if (p === ant && p !== 'linha') p = 'linha';
		if (p === 'pilha') pilhas++;
		ant = p;
		return {...b, padrao: p};
	});
};

// ---------- Desenho de um bloco ----------

const SOMBRA = '0 4px 12px rgba(0,0,0,.55), 0 1px 3px rgba(0,0,0,.6)';

type Estilo1 = {f: Fonte; tam: number; cor: string; caixaAlta?: boolean; espaco?: string};

const largura = (texto: string, e: Estilo1) =>
	measureText({text: e.caixaAlta ? texto.toUpperCase() : texto, fontFamily: e.f.family, fontSize: e.tam, fontWeight: String(e.f.weight), letterSpacing: e.espaco ?? e.f.tracking}).width;

export const BlocoCineticoView: React.FC<{b: BlocoCinetico; est: Estilo; y: number}> = ({b, est, y}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = W / 1080;
	const S = (b.gancho ? 124 : 112) * u; // corpo da voz (guia: x-height 60–75 px)
	const papelEstilo = (p: Papel, padrao: Padrao): Estilo1 => {
		if (p === 'destaque') {
			const k = padrao === 'mae' ? 2.0 : padrao === 'larga' ? 1.45 : 1.35;
			return {f: FONTES.destaque, tam: S * k, cor: est.acento, caixaAlta: padrao === 'larga' || padrao === 'mae', espaco: padrao === 'larga' ? '0.01em' : undefined};
		}
		if (p === 'conector') return {f: FONTES.serifa, tam: S * (padrao === 'mae' ? 0.62 : 0.78), cor: est.creme};
		return {f: FONTES.base, tam: S * (padrao === 'mae' ? 0.7 : 1), cor: est.creme};
	};
	// linhas por padrão
	const ws = b.palavras;
	let linhas: PalavraC[][];
	if (b.padrao === 'mae') {
		linhas = [ws.filter((w) => w.papel !== 'destaque'), ws.filter((w) => w.papel === 'destaque')].filter((l) => l.length);
	} else if (b.padrao === 'pilha') {
		linhas = [];
		let l: PalavraC[] = [];
		ws.forEach((w) => {
			if (l.length && (w.papel === 'destaque' || l[l.length - 1].papel === 'destaque' || l.length >= 2)) linhas.push(l), (l = []);
			l.push(w);
		});
		if (l.length) linhas.push(l);
	} else if (b.padrao === 'larga') {
		linhas = [ws];
	} else {
		// linha: quebra gulosa em ~2–3 palavras por linha
		linhas = [];
		let l: PalavraC[] = [];
		let larg = 0;
		ws.forEach((w) => {
			const e = papelEstilo(w.papel, 'linha');
			const lw = largura(limparPalavra(w.w), e) + e.tam * 0.25;
			if (l.length && (larg + lw > W * 0.8 || l.length >= 3)) linhas.push(l), (l = []), (larg = 0);
			l.push(w);
			larg += lw;
		});
		if (l.length) linhas.push(l);
	}
	// encaixe: a linha mais larga cabe em 84% da largura
	const larguras = linhas.map((l) => l.reduce((s, w) => {
		const e = papelEstilo(w.papel, b.padrao);
		return s + largura(limparPalavra(w.w), e) + e.tam * 0.25;
	}, 0));
	const fator = Math.min(1, (W * 0.84) / Math.max(1, ...larguras));
	const inclinacao = b.gancho ? -8 : [-3, 0, -2, 2][b.n % 4];
	const recuo = (i: number) => (b.padrao === 'pilha' ? i * 0.06 * W : b.padrao === 'mae' && i > 0 ? 0.02 * W : 0);

	// saída: morre seco no corte; senão some em ~0,17 s
	const durQ = Math.round((b.fim - b.ini) * fps);
	const saida = b.morreNoCorte ? 0 : interpolate(frame, [durQ - Math.round(fps * 0.17), durQ], [0, 1], {...clamp, easing: CURVAS.saida});
	const anim = (w: PalavraC): React.CSSProperties => {
		const f0 = (w.ini - b.ini) * fps;
		const q = fps / 24;
		if (frame < f0 - 0.5) return {opacity: 0};
		if (w.papel === 'conector') {
			const p = interpolate(frame, [f0, f0 + 3 * q], [0, 1], {...clamp, easing: CURVAS.entrada});
			return {clipPath: `inset(-20% ${(1 - p) * 100}% -20% -5%)`};
		}
		if (w.papel === 'destaque') {
			const p = interpolate(frame, [f0, f0 + 3 * q], [0, 1], {...clamp, easing: CURVAS.entrada});
			const brilho = interpolate(frame, [f0, f0 + 8 * q], [1, 0], clamp);
			return {filter: `blur(${(1 - p) * 10}px)`, transform: `scale(${1.12 - 0.12 * p})`, textShadow: `${SOMBRA}, 0 0 ${28 * brilho}px rgba(255,90,60,${0.7 * brilho})`};
		}
		const p = interpolate(frame, [f0, f0 + 2 * q], [0, 1], {...clamp, easing: CURVAS.entrada});
		return {opacity: 0.6 + 0.4 * p, filter: `blur(${(1 - p) * 4}px)`};
	};
	return (
		<AbsoluteFill style={{opacity: 1 - saida, filter: saida ? `blur(${saida * 8}px)` : undefined}}>
			<div style={{position: 'absolute', left: W * 0.08, top: y * H, transform: `translateY(-50%) rotate(${inclinacao}deg)`, transformOrigin: 'left center', width: W * 0.88}}>
				{linhas.map((l, i) => (
					<div key={i} style={{marginLeft: recuo(i), whiteSpace: 'nowrap', lineHeight: b.padrao === 'pilha' ? 0.82 : 0.95, marginTop: i && b.padrao === 'mae' ? -S * 0.05 : 0}}>
						{l.map((w, k) => {
							const e = papelEstilo(w.papel, b.padrao);
							return (
								<span
									key={k}
									style={{
										display: 'inline-block',
										marginRight: `${0.24 * e.tam * fator}px`,
										fontFamily: e.f.family,
										fontWeight: e.f.weight,
										fontStyle: e.f.style,
										letterSpacing: e.espaco ?? e.f.tracking,
										fontSize: e.tam * fator,
										color: e.cor,
										textTransform: e.caixaAlta ? 'uppercase' : 'none',
										textShadow: SOMBRA,
										transformOrigin: 'left bottom',
										...anim(w),
									}}
								>
									{limparPalavra(w.w)}
								</span>
							);
						})}
					</div>
				))}
			</div>
		</AbsoluteFill>
	);
};
