// Gráfico de barras (YOUTUBE - MIX EDIT, peça `grafico-barras`), copiado da lógica do GraficoBarras do Tela Dividida
// (src/Edicao.tsx, só lido) e refeito para 16:9 e molas Apple. Uso: comparar 2–4 valores verificáveis (1 por número,
// no máximo 1 por minuto), sobre a tela grade ou o rosto desfocado, sempre com rodapé de fonte. 150–270 q.
// Composição (guia, "Layouts e camadas"): frase de apoio no alto à esquerda e o gráfico na MESMA borda esquerda (a linha de
// base começa em `tituloX`); objeto no meio da altura; rodapé de fonte embaixo à esquerda (y 0,88, corpo 26 px).
// Sequência: a frase de apoio entra palavra por palavra (cascata Apple: blur 12→0, subida, 11 q), a linha de base se
// desenha (12 q) e as linhas-guia acendem; cada barra cresce no seu `t` com mola SEM overshoot (stiffness 158, damping 26,
// com trava: assenta em ~14 q), o número conta junto (Intl pt-BR, tabular) e brilha ao chegar (decai em 10 q); o rótulo
// sobe sob a barra. Em `destaqueEm`, um colchete se desenha do centro para as pontas sobre as barras escolhidas e o selo
// (ex.: "50×", "4,5×") assenta no acento. A barra `destaque` é a única no acento (cursor de atenção). O rodapé de fonte
// entra depois da última barra (fica ≥ 3 s no ar). Ambiente: deriva 1→1,03 (linear). Saída: 10 q, blur 0→10 e subida.
// Escala log (`escala: 'log'`, ex.: lux de 30 a 100.000): altura proporcional ao logaritmo, linhas-guia em cada potência
// de 10 e selo "ESCALA LOG" no rodapé, ao lado da fonte (escala log sem rótulo engana quem lê).
// Parâmetros:
//   barras: [{rotulo ("\n" quebra), valor, t? (s desde o início da camada; padrão 0,35 + 0,33·i; ≥ 8 q entre barras),
//     destaque? (true = acento), prefixo?, sufixo? (sobrepõem os gerais nesta barra, ex.: "até ", "~")}],
//   titulo (frase de apoio, Inter Tight 600; *palavra* = acento… use pouco), rotulo (micro-rótulo acima do título, ex.:
//     "FIG. 02 — LUZ"), fonte (rodapé "Fonte: …", corpo 26 px; obrigatório para dado de estudo), fonteT (s; padrão
//     0,5 s depois da última barra, antecipado para ficar ≥ 3 s no ar),
//   prefixo, sufixo (ex.: "+", " lux", "%"; palavras e unidades saem a 55% do corpo, sinais no corpo cheio),
//     casas (decimais; padrão: as do maior valor), max (topo da escala linear; padrão maior ÷ 0,89),
//   escala ('linear' | 'log'), seloEscala (texto do selo do log, "Escala log"; '' = sem), notaEscala ('' = sem; ex.:
//     "cada linha = 10×"),
//   destaqueEm (s; colchete + selo), selo (texto, "≈"), colchete ([i, j]; padrão primeira e última barra),
//   alinhar ('esquerda' | 'centro'), x (esquerda: início da linha de base, padrão = tituloX; centro: centro do gráfico,
//     0.5), base (y da linha de base, 0.68; sobe sozinha se os rótulos de 2 linhas encostariam no rodapé),
//   alturaMax (px, 330; encolhe sozinha para número, colchete e selo não subirem até o título), larguraBarra (px, 170),
//   passo (px entre centros de barras; 380), tamanhoNumero (88; encolhe para o número caber no passo),
//   tamanhoRotulo (60: rótulo é texto essencial, corpo ≥ 60), grade (true: linhas-guia), tituloX (0.1),
//   tituloY (linha de base do título, 0.22), deriva (0.03).
// Sons (registro): sfxGraficoBarras na entrada (contagem); sonsGraficoBarras = pop por barra + clique no selo + clique
// alto no rodapé de fonte (se não cair a < 8 q de outro som da peça).
//
// Também exporta o que o grafico-linha e o contador usam: FraseApoio, Rodape (fonte + selos "esquemático"/"escala log"
// numa linha só, no lugar da peça `fonte`, com o mesmo desenho dela), tempoFonte e comSomFonte.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import type {Estilo} from '../../modelos/estilos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxGraficoBarras: [string, number] = ['motionix/data-collect/data-collect_04_data-collect', 0.5];
const SOM_BARRA = 'motionix/pop/pop_05_smooth-pop';
const SOM_SELO = 'motionix/clicks/clicks_01_cinematic-click';
export const SOM_FONTE = 'motionix/clicks/clicks_05_high-click';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fase = (t: number, ini: number, fim: number, curva: (x: number) => number = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const DESENHO = Easing.bezier(0.25, 0.15, 0.5, 1);
const ASSENTO = Easing.bezier(0.22, 1, 0.36, 1);
// mola "smooth" da Apple, um pouco mais amortecida e com trava: nenhum overshoot visível
const MOLA = {stiffness: 158, damping: 26, mass: 1, overshootClamping: true};
const CINZA = '#9C9CA8';
const PRETO = '#0B0B0C';

// ---------- rodapé de fonte (comum às peças de dados) ----------

// Quando o rodapé entra: o pedido, antecipado para ficar ≥ 3 s no ar (correção 6 da crítica). durS ≤ 0 = sem limite.
export const tempoFonte = (desejado: number, durS: number) => (durS > 0 ? Math.min(desejado, Math.max(0.3, durS - 3.3)) : desejado);
// Clique alto do rodapé (tabela de SFX do guia), só se não cair a menos de 8 q de outro som da mesma peça.
export const comSomFonte = (sons: Som[], t: number | null): Som[] => (t == null || sons.some((s) => Math.abs(s.t - t) < 8 / 30) ? sons : [...sons, {t, som: SOM_FONTE, vol: 0.5}]);

export type SeloRodape = {texto: string; nota?: string; tracejado?: boolean};
// Linha do rodapé (base em y 0,88, à esquerda em x 0,075, sem passar de x 0,84 por causa da marca d'água do canal):
// [selo] [fio | Fonte: …]. O trecho da fonte tem o desenho da peça `fonte` (Inter Tight 500, creme a 70%, fio no
// acento, fade + subida em 0,4 s); sobre a tela de acento (`sobreAcento`) o fio vira creme e o texto sobe para 94%.
// O selo é uma pílula em caixa-alta (tracejada = "não é dado", como o "ESQUEMÁTICO"), com nota opcional ao lado.
// Corpo 26 px, o mesmo da peça `fonte`: é informação de apoio, não pode competir com o gráfico. A 40 px a citação
// quebrava em 3 linhas e subia por cima dos rótulos das barras (usuário, 06/10/2026). Linha longa encolhe até 20 px
// para caber numa linha só (estimativa por caractere, sem medir a fonte no navegador).
export const Rodape: React.FC<{est: Estilo; fonte?: string; fonteT?: number; selo?: SeloRodape | null; seloT?: number; x?: number; y?: number; tamanho?: number; sobreAcento?: boolean}> = ({est, fonte = '', fonteT = 0.6, selo = null, seloT = 0.25, x = 0.075, y = 0.88, tamanho = 26, sobreAcento = false}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const creme = est.creme;
	const bruto = fonte.replace(/\s+/g, ' ').trim();
	const m = bruto.match(/^fonte\s*:\s*/i);
	const corpo = m ? bruto.slice(m[0].length) : bruto;
	// largura aproximada da linha num corpo f (Inter Tight 500 ≈ 0,52 em por caractere; caixa-alta espaçada ≈ 0,8 em)
	const linha = (f: number) => {
		const s = selo && selo.texto ? selo.texto.length * f * 0.8 + 40 * u + (selo.nota ? 16 * u + selo.nota.length * f * 0.52 : 0) : 0;
		const fo = corpo ? 18 * u + (corpo.length + 7) * f * 0.52 : 0;
		return s + (s && fo ? 28 * u : 0) + fo;
	};
	const cabe = 0.84 * W - x * W;
	const fs = Math.max(20 * u, Math.min(tamanho * u, (tamanho * u * cabe) / Math.max(1, linha(tamanho * u))));
	// a linha só quebra entre citações ("A, 2019; B, 2022") ou antes de " · " (desenho, n…), nunca no meio de uma
	const blocos = corpo.split(/(;\s+|\s+·\s+)/).reduce<string[]>((acc, p, i) => {
		if (i % 2) {
			if (p.trim() === ';') acc[acc.length - 1] += ';';
			else acc.push('·');
		} else if (p) {
			if (acc.length && acc[acc.length - 1] === '·') acc[acc.length - 1] = `· ${p}`;
			else acc.push(p);
		}
		return acc;
	}, []);
	const eF = corpo ? fase(t, fonteT, fonteT + 0.4) : 0;
	const eS = selo && selo.texto ? fase(t, seloT, seloT + 0.35) : 0;
	if (eF <= 0.001 && eS <= 0.001) return null;
	const escuro = sobreAcento ? est.acentoProfundo : PRETO;
	const sombra = `0 ${u}px ${2 * u}px ${rgba(escuro, 0.55)}, 0 ${2 * u}px ${10 * u}px ${rgba(escuro, 0.45)}`;
	const familia = FONTES.base.family;
	return (
		<div style={{position: 'absolute', left: x * W, top: y * H, transform: 'translateY(-100%)', maxWidth: 0.84 * W - x * W, display: 'flex', alignItems: 'center', gap: 28 * u}}>
			{selo && selo.texto && (
				<div style={{display: 'flex', alignItems: 'center', gap: 16 * u, flexShrink: 0, opacity: eS, transform: `translateY(${(1 - eS) * 10 * u}px)`, filter: eS < 0.99 ? `blur(${(1 - eS) * 4 * u}px)` : undefined}}>
					<div style={{padding: `${9 * u}px ${18 * u}px ${8 * u}px`, border: `${2 * u}px ${selo.tracejado ? 'dashed' : 'solid'} ${rgba(creme, 0.55)}`, borderRadius: 999, fontFamily: familia, fontWeight: 600, fontSize: fs, letterSpacing: '0.12em', lineHeight: 1, color: rgba(creme, 0.9), background: rgba('#0A0B0F', 0.4), whiteSpace: 'pre'}}>
						{selo.texto.toUpperCase()}
					</div>
					{selo.nota && <div style={{fontFamily: familia, fontWeight: 500, fontSize: fs, lineHeight: 1, color: rgba(creme, 0.7), textShadow: sombra, whiteSpace: 'pre'}}>{selo.nota}</div>}
				</div>
			)}
			{corpo && (
				<div style={{display: 'flex', alignItems: 'stretch', gap: 14 * u, minWidth: 0, opacity: eF, transform: `translateY(${(1 - eF) * 14 * u}px)`, filter: eF < 0.99 ? `blur(${(1 - eF) * 4 * u}px)` : undefined}}>
					<div style={{width: 4 * u, flexShrink: 0, borderRadius: 1.5 * u, background: sobreAcento ? creme : est.acento, margin: `${0.16 * fs}px 0`, transform: `scaleY(${fase(t, fonteT + 0.08, fonteT + 0.45)})`, transformOrigin: '50% 100%', boxShadow: `0 ${u}px ${4 * u}px ${rgba(escuro, 0.4)}`}} />
					<div style={{fontFamily: familia, fontWeight: 500, fontSize: fs, lineHeight: 1.3, letterSpacing: '0.005em', color: rgba(creme, sobreAcento ? 0.94 : 0.7), textShadow: sombra, textWrap: 'pretty'}}>
						{blocos.map((b, k) => (
							<React.Fragment key={k}>
								{k > 0 && ' '}
								<span style={{display: 'inline-block'}}>
									{k === 0 && <span style={{color: rgba(creme, sobreAcento ? 1 : 0.88)}}>Fonte: </span>}
									{/* palavra com hífen ("duplo-cego") não quebra no hífen */}
									{b.split(/(\S+-\S+)/).map((p, i) => (i % 2 ? <span key={i} style={{whiteSpace: 'nowrap'}}>{p}</span> : p))}
								</span>
							</React.Fragment>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
// altura da linha do rodapé (para os gráficos não descerem até ela)
export const ALTURA_RODAPE = 64;

// ---------- frase de apoio ----------

// Frase de apoio no alto à esquerda (cascata Apple; *palavra* ganha fundo no acento). O grafico-linha usa a mesma.
export const FraseApoio: React.FC<{texto: string; rotulo: string; x: number; y: number; tam: number; est: Estilo; ini?: number}> = ({texto, rotulo, x, y, tam, est, ini = 0}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps - ini;
	const partes = texto.split(/(\*[^*]+\*)/).filter(Boolean);
	let n = 0;
	const microE = fase(t, 0, 0.3);
	return (
		<>
			{rotulo && (
				<div style={{position: 'absolute', left: x, top: y - tam * 1.62, fontFamily: FONTES.base.family, fontWeight: 600, fontSize: 22 * u, letterSpacing: '0.16em', color: (est as {cinza?: string}).cinza ?? CINZA, opacity: microE, whiteSpace: 'pre', display: 'flex', alignItems: 'center', gap: 12 * u}}>
					<div style={{width: 8 * u, height: 8 * u, background: est.acento}} />
					{rotulo.toUpperCase()}
				</div>
			)}
			<div style={{position: 'absolute', left: x, top: y, transform: 'translateY(-100%)', fontFamily: FONTES.base.family, fontWeight: 600, fontSize: tam, letterSpacing: '-0.02em', lineHeight: 1.05, color: rgba(est.creme, 0.92), whiteSpace: 'pre', textShadow: `0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.35)}`}}>
				{partes.map((p, i) => {
					const destaque = p.startsWith('*');
					return (
						<span key={i}>
							{p
								.replace(/\*/g, '')
								.split(/(\s+)/)
								.map((w, k) => {
									if (/^\s+$/.test(w)) return w;
									const a = 0.05 + (n++ * 3) / 30;
									const e = fase(t, a, a + 11 / 30);
									return (
										<span key={k} style={{display: 'inline-block', opacity: e, filter: e < 0.99 ? `blur(${(1 - e) * 12}px)` : undefined, transform: `translateY(${(1 - e) * 0.35}em) scale(${0.92 + 0.08 * e})`, ...(destaque ? {color: est.creme, background: est.acento, padding: '0 0.12em', margin: '0 -0.04em', borderRadius: 4 * u} : {})}}>
											{w}
										</span>
									);
								})}
						</span>
					);
				})}
			</div>
		</>
	);
};

// ---------- barras ----------

type Barra = {rotulo: string; valor: number; t: number; destaque: boolean; prefixo?: string; sufixo?: string};
export const lerBarras = (c: Camada): Barra[] => {
	const lista = (Array.isArray(c.barras) ? c.barras : []).filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null && typeof (b as {valor?: unknown}).valor === 'number' && Number.isFinite((b as {valor: number}).valor));
	const out: Barra[] = [];
	lista.forEach((b, i) => {
		const t = Math.max(num(b.t, 0.35 + 0.33 * i), 0.1, i > 0 ? out[i - 1].t + 8 / 30 : -Infinity); // ≥ 8 q entre barras (sons separados)
		out.push({rotulo: txt(b.rotulo, ''), valor: b.valor as number, t, destaque: bool(b.destaque, false), prefixo: typeof b.prefixo === 'string' ? b.prefixo : undefined, sufixo: typeof b.sufixo === 'string' ? b.sufixo : undefined});
	});
	return out;
};

// instante (s) em que o rodapé de fonte entra
export const fonteBarras = (c: Camada, durS: number) => {
	const barras = lerBarras(c);
	const ultima = barras.length ? barras[barras.length - 1].t : 0.35;
	return tempoFonte(num(c.fonteT, ultima + 0.5), durS);
};

export const sonsGraficoBarras = (c: Camada): Som[] => {
	const sons: Som[] = [...lerBarras(c).map((b) => ({t: b.t, som: SOM_BARRA, vol: 0.55})), ...(typeof c.destaqueEm === 'number' ? [{t: c.destaqueEm, som: SOM_SELO, vol: 0.65}] : [])];
	return comSomFonte(sons, txt(c.fonte, '').trim() ? fonteBarras(c, c.fim - c.ini) : null);
};

const decimais = (v: number) => {
	const s = String(v);
	return s.includes('.') ? Math.min(3, s.split('.')[1].length) : 0;
};

// prefixo/sufixo: sinais ("+", "−", "~", "≈") no corpo cheio; palavras e unidades a 55%
const pequeno = (s: string) => /[\p{L}%]/u.test(s);
// largura aproximada (em "em" do número) de prefixo + número + sufixo na Inter Tight 900 tabular (para encolher o corpo)
const larguraEm = (prefixo: string, numero: string, sufixo: string) => {
	const ch = (s: string) => [...s].reduce((a, k) => a + (/\d/.test(k) ? 0.66 : /[.,]/.test(k) ? 0.3 : k === ' ' ? 0.26 : /[+\-−~≈±]/.test(k) ? 0.62 : 0.6), 0);
	return (pequeno(prefixo) ? 0.55 : 1) * ch(prefixo) + ch(numero) + (pequeno(sufixo) ? 0.55 : 1) * ch(sufixo) + 0.04;
};
// linhas que um rótulo ocupa (estimativa: Inter Tight 600 em caixa baixa ≈ 0,45 em por letra; 0,5 dá folga)
const linhasRotulo = (r: string, fs: number, largura: number) => r.split('\n').reduce((a, s) => a + Math.max(1, Math.ceil((s.trim().length * 0.5 * fs) / Math.max(1, largura))), 0);

export const GraficoBarras: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const barras = lerBarras(c);
	if (!barras.length) return null;

	const creme = est.creme;
	const acento = est.acento;
	const prof = est.acentoProfundo;
	const n = barras.length;
	const passo = num(c.passo, 380) * u;
	const lb = num(c.larguraBarra, 170) * u;
	const folga = 80 * u; // a linha de base passa um pouco das barras
	const larguraTotal = (n - 1) * passo + lb + 2 * folga;
	const tituloX = num(c.tituloX, 0.1);
	const x0 = c.alinhar === 'centro' ? num(c.x, 0.5) * W - larguraTotal / 2 : num(c.x, tituloX) * W; // início da linha de base
	const cx = x0 + larguraTotal / 2;
	const xBarra = (i: number) => x0 + folga + lb / 2 + i * passo;

	// escala: linear (0 até max) ou log (potências de 10)
	const valores = barras.map((b) => b.valor);
	const maior = Math.max(...valores);
	const log = c.escala === 'log';
	const positivos = valores.filter((v) => v > 0);
	const lo = log ? 10 ** (Math.floor(Math.log10(positivos.length ? Math.min(...positivos) : 1)) - 1) : 0;
	const hiLog = log ? Math.log10(lo) + (Math.log10(Math.max(maior, lo * 10)) - Math.log10(lo)) / 0.89 : 0;
	const max = num(c.max, maior / 0.89) || 1;
	const frac = (v: number) => (log ? Math.max(0, (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (hiLog - Math.log10(lo))) : Math.max(0, v / max));

	// textos dos números (formato final) e corpo que cabe no passo
	const casas = num(c.casas, Math.max(...valores.map(decimais)));
	const fmt = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas});
	const prefixoDe = (b: Barra) => b.prefixo ?? txt(c.prefixo, '');
	const sufixoDe = (b: Barra) => b.sufixo ?? txt(c.sufixo, '');
	const emMax = Math.max(...barras.map((b) => larguraEm(prefixoDe(b), fmt.format(b.valor), sufixoDe(b))));
	const fsNum = Math.min(num(c.tamanhoNumero, 88) * u, (passo - 24 * u) / emMax);

	// vertical: rótulos de 2 linhas não podem encostar no rodapé; números, colchete e selo não sobem até o título
	const fonte = txt(c.fonte, '').trim();
	const seloEscala = log ? txt(c.seloEscala, 'Escala log').trim() : '';
	const temRodape = !!fonte || !!seloEscala;
	const fsRot = num(c.tamanhoRotulo, 60) * u;
	const nLinhas = Math.max(1, ...barras.map((b) => (b.rotulo ? linhasRotulo(b.rotulo, fsRot, passo - 20 * u) : 0)));
	const chao = 0.88 * H - (temRodape ? ALTURA_RODAPE * u + 22 * u : 0);
	const base = Math.min(num(c.base, 0.68) * H, chao - 26 * u - nLinhas * fsRot * 1.12);
	const titulo = txt(c.titulo, '');
	const temSelo = typeof c.destaqueEm === 'number';
	const teto = (titulo ? num(c.tituloY, 0.22) * H + 36 * u : 0.08 * H) + (temSelo ? 44 * u + 46 * u + 8 * u : 0);
	const fracMax = Math.max(...valores.map(frac));
	const alturaMax = Math.min(num(c.alturaMax, 330) * u, Math.max(80 * u, (base - 18 * u - fsNum - teto) / (fracMax || 1)));

	const qSai = Math.max(1, Math.min(Math.round(fps * 0.34), Math.floor(dur * 0.3)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const deriva = 1 + num(c.deriva, 0.03) * interpolate(frame, [0, dur], [0, 1], clamp);
	const linhaBase = fase(t, 0.1, 0.1 + 12 / 30, DESENHO);

	// progresso de cada barra (mola sem overshoot) e altura em px
	const m = barras.map((b) => (t < b.t ? 0 : spring({frame: (t - b.t) * fps, fps, config: MOLA})));
	const alturas = barras.map((b, i) => Math.max(m[i] > 0 ? 4 * u : 0, frac(b.valor) * alturaMax * m[i]));
	const topoNumero = (i: number) => base - alturas[i] - 18 * u - fsNum; // topo do número da barra i

	// linhas-guia: 25/50/75% (linear) ou cada potência de 10 acima da base (log)
	const guias = log
		? Array.from({length: Math.max(0, Math.floor(hiLog) - Math.round(Math.log10(lo)))}, (_, k) => frac(lo * 10 ** (k + 1))).filter((f) => f > 0 && f <= 1.001)
		: [0.25, 0.5, 0.75];

	// colchete + selo
	const dEm = typeof c.destaqueEm === 'number' ? c.destaqueEm : null;
	const col = Array.isArray(c.colchete) && c.colchete.length === 2 ? (c.colchete as unknown[]).map((v, k) => Math.min(n - 1, Math.max(0, Math.round(num(v, k ? n - 1 : 0))))) : [0, n - 1];
	const [ci, cj] = [Math.min(col[0], col[1]), Math.max(col[0], col[1])];
	const finais = barras.map((b) => base - Math.max(4 * u, frac(b.valor) * alturaMax) - 18 * u - fsNum);
	const yCol = Math.min(...finais.slice(ci, cj + 1)) - 44 * u;
	const xc = (xBarra(ci) + xBarra(cj)) / 2;
	const pCol = dEm != null ? fase(t, dEm, dEm + 10 / 30, DESENHO) : 0;
	const pSelo = dEm != null ? fase(t, dEm + 2 / 30, dEm + 10 / 30, ASSENTO) : 0;
	const selo = txt(c.selo, '≈');
	const colA = `M ${xc} ${yCol} H ${xBarra(ci)} V ${finais[ci] - 14 * u}`;
	const colB = `M ${xc} ${yCol} H ${xBarra(cj)} V ${finais[cj] - 14 * u}`;
	const evA = evolvePath(pCol, colA);
	const evB = evolvePath(pCol, colB);
	const fsSelo = 46 * u;

	return (
		<AbsoluteFill style={{pointerEvents: 'none', opacity: 1 - ps, filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined, transform: `translateY(${-20 * u * ps}px)`}}>
			{titulo && <FraseApoio texto={titulo} rotulo={txt(c.rotulo, '')} x={tituloX * W} y={num(c.tituloY, 0.22) * H} tam={64 * u} est={est} />}
			<AbsoluteFill style={{transform: `scale(${deriva})`, transformOrigin: `${cx}px ${base}px`}}>
				<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					{/* linhas-guia e linha de base */}
					{bool(c.grade, true) &&
						guias.map((f, k) => {
							const g = fase(t, 0.2 + k * 0.06, 0.6 + k * 0.06, DESENHO);
							const y = base - f * alturaMax;
							return <line key={k} x1={x0} x2={x0 + larguraTotal * g} y1={y} y2={y} stroke={rgba(creme, log ? 0.1 : 0.08)} strokeWidth={1.5 * u} strokeDasharray={`${6 * u} ${8 * u}`} />;
						})}
					<line x1={x0} x2={x0 + larguraTotal * linhaBase} y1={base} y2={base} stroke={rgba(creme, 0.45)} strokeWidth={2 * u} strokeLinecap="round" />
					{/* colchete do centro para as pontas */}
					{pCol > 0 && (
						<>
							<path d={colA} fill="none" stroke={rgba(creme, 0.75)} strokeWidth={3 * u} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={evA.strokeDasharray} strokeDashoffset={evA.strokeDashoffset} />
							<path d={colB} fill="none" stroke={rgba(creme, 0.75)} strokeWidth={3 * u} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={evB.strokeDasharray} strokeDashoffset={evB.strokeDashoffset} />
						</>
					)}
				</svg>

				{barras.map((b, i) => {
					const mi = m[i];
					if (mi <= 0) return null;
					const tl = t - b.t;
					const brilho = interpolate(tl, [0.3, 0.42, 0.75], [0, 1, 0], clamp);
					const rotE = fase(t, b.t + 0.1, b.t + 0.1 + 11 / 30);
					const numE = Math.min(1, mi * 1.6);
					const fundo = b.destaque ? `linear-gradient(180deg, ${acento} 0%, ${prof} 140%)` : `linear-gradient(180deg, ${creme} 0%, ${rgba(creme, 0.82)} 100%)`;
					const pre = prefixoDe(b);
					const suf = sufixoDe(b);
					return (
						<React.Fragment key={i}>
							<div
								style={{
									position: 'absolute',
									left: xBarra(i) - lb / 2,
									top: base - alturas[i],
									width: lb,
									height: alturas[i],
									borderRadius: `${Math.min(14 * u, alturas[i] / 2)}px ${Math.min(14 * u, alturas[i] / 2)}px ${3 * u}px ${3 * u}px`,
									background: fundo,
									boxShadow: `0 ${20 * u}px ${60 * u}px ${rgba('#000000', 0.4)}${b.destaque ? `, 0 0 ${50 * u * brilho}px ${rgba(acento, 0.45 * brilho)}` : ''}`,
								}}
							/>
							<div
								style={{
									position: 'absolute',
									left: xBarra(i) - passo / 2,
									width: passo,
									top: topoNumero(i),
									height: fsNum,
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'baseline',
									fontFamily: FONTES.impacto.family,
									fontWeight: 900,
									fontSize: fsNum,
									lineHeight: `${fsNum}px`,
									letterSpacing: '-0.02em',
									fontVariantNumeric: 'tabular-nums',
									whiteSpace: 'pre',
									color: creme,
									opacity: numE,
									filter: numE < 0.99 ? `blur(${(1 - numE) * 8 * u}px)` : undefined,
									textShadow: `0 0 ${30 * u * brilho}px ${rgba(creme, 0.55 * brilho)}, 0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.35)}`,
								}}
							>
								{pre && <span style={pequeno(pre) ? {fontSize: '0.55em', fontWeight: 800, letterSpacing: '0em'} : undefined}>{pre}</span>}
								<span>{fmt.format(b.valor * mi)}</span>
								{suf && <span style={pequeno(suf) ? {fontSize: '0.55em', fontWeight: 800, letterSpacing: '0em', marginLeft: suf.startsWith(' ') ? 0 : '0.04em'} : undefined}>{suf}</span>}
							</div>
							{b.rotulo && (
								<div
									style={{
										position: 'absolute',
										left: xBarra(i) - passo / 2 + 10 * u,
										width: passo - 20 * u,
										top: base + 26 * u,
										textAlign: 'center',
										fontFamily: FONTES.base.family,
										fontWeight: 600,
										fontSize: fsRot,
										lineHeight: 1.12,
										letterSpacing: '-0.015em',
										whiteSpace: 'pre-line',
										color: b.destaque ? creme : rgba(creme, 0.82),
										opacity: rotE,
										transform: `translateY(${(1 - rotE) * 16 * u}px)`,
										filter: rotE < 0.99 ? `blur(${(1 - rotE) * 6 * u}px)` : undefined,
										textShadow: `0 ${4 * u}px ${14 * u}px ${rgba('#000000', 0.35)}`,
									}}
								>
									{b.rotulo}
								</div>
							)}
						</React.Fragment>
					);
				})}

				{pSelo > 0 && (
					<div
						style={{
							position: 'absolute',
							left: xc,
							top: yCol,
							minWidth: fsSelo * 2,
							height: fsSelo * 2,
							padding: `0 ${fsSelo * 0.45}px`,
							boxSizing: 'border-box',
							borderRadius: 999,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: acento,
							color: creme,
							fontFamily: FONTES.base.family,
							fontWeight: 800,
							fontSize: fsSelo,
							letterSpacing: '-0.02em',
							fontVariantNumeric: 'tabular-nums',
							whiteSpace: 'pre',
							transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * pSelo})`,
							opacity: Math.min(1, pSelo * 1.4),
							boxShadow: `0 ${10 * u}px ${30 * u}px ${rgba('#000000', 0.45)}, 0 0 ${40 * u * (1 - pSelo * 0.6)}px ${rgba(acento, 0.4)}`,
						}}
					>
						{selo}
					</div>
				)}
			</AbsoluteFill>
			{temRodape && <Rodape est={est} fonte={fonte} fonteT={fonteBarras(c, dur / fps)} selo={seloEscala ? {texto: seloEscala, nota: txt(c.notaEscala, '').trim() || undefined} : null} seloT={0.25} />}
		</AbsoluteFill>
	);
};
