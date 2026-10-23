// Painel técnico (YOUTUBE - MIX EDIT, peça `painel-tecnico`): painel de traço fino com cantoneiras, micro-rótulos em
// caixa-alta e linhas DIGITADAS no tempo da fala. Uso: mecanismo ("EPIDEMIA DA HIPERPRODUTIVIDADE": trabalho · vida
// pessoal · família → descanso negligenciado) ou roteiro do vídeo ("NESTE VÍDEO" 01/02/03, beat 6 da intro). Feito para
// ficar sobre o rosto desfocado (cena `fala` com desfoque 20–24 + escurecer 0,4) ou sobre a tela grade. 1 por capítulo.
// Sequência: o traço do painel se desenha dos 2 lados a partir do canto (14 q, curva "desenho"), o preenchimento escuro
// sobe junto e as cantoneiras "L" assentam; o micro-rótulo e o contador "01 / 03" acendem; o título é digitado
// (letra nasce no acento e esfria para creme em 6 q; cursor no acento). Cada linha é digitada no seu `t` (~2 q por letra,
// no máximo 1 s por linha); o valor da linha (se tiver número) conta em 0,5 s com algarismos tabulares.
// Modo "mecanismo": no `t` do destino, um conector por linha se desenha até um nó (evolvePath, 12 q, com cabeça de brilho
// no acento), o tronco segue até a caixa do destino (8 q) e a caixa acende no acento com o texto em creme.
// Modo "roteiro": um trilho vertical à esquerda cresce até o item novo (10 q); o nó do item ativo fica no acento e os
// itens anteriores baixam para 60%.
// Ambiente: deriva de escala 1→1,012 e cursor piscando devagar no fim da última linha. Saída: 10 q, blur 0→10 e subida.
// Parâmetros:
//   modo ('mecanismo' | 'roteiro'; padrão 'mecanismo'),
//   titulo (texto do cabeçalho, digitado; no roteiro o padrão é "Neste vídeo"), tituloT (s em que começa a digitar, 0.15),
//   subtitulo (string ou {t, texto}: frase de apoio menor sob o título, também digitada),
//   rotulo (micro-rótulo do canto; padrão "MECANISMO" ou "ROTEIRO"), rotuloDir (canto direito; padrão contador "01 / 03"),
//   linhas: [{t (s desde o início da camada), texto, valor? (ex.: "+2 h", "68%": o número conta)}] ou strings,
//   destino (mecanismo: string ou {t, texto}; t = quando os conectores começam, a caixa chega ~0,5 s depois;
//     padrão: 0,5 s depois da última linha),
//   x, y (centro do painel, 0.5 e 0.54), largura (largura mínima em fração do quadro; o painel cresce com o conteúdo),
//   tamanho (corpo das linhas e dos valores em px de 1080, 60: valor de painel com maiúscula ≥ 44 px, correção 6),
//   tamanhoTitulo (66), tamanhoSub (44), caixaAlta (false: título em caixa-alta, ex.: "EPIDEMIA DA HIPERPRODUTIVIDADE"),
//   maxLargura (fração do quadro, 0.86: acima disso tudo encolhe junto), vidro (opacidade do preenchimento, 0.8),
//   cor (acento; padrão est.acento), porLetra (q a 30 fps por letra, 2), quente (true: letra nasce no acento),
//   fonte (rodapé "Fonte: …" de 26 px embaixo à esquerda: obrigatório quando os valores vêm de estudo), fonteT (s;
//   padrão: quando o 1º valor conta, ou 0,6 s; antecipado para ficar ≥ 3 s no ar).
// Sons (registro): sfxPainelTecnico na entrada; sonsPainelTecnico = 1 tecla por linha digitada, contagem dos valores,
// conectores esticando, clique na chegada do destino e clique alto no rodapé de fonte (se não cair a < 8 q de outro som).
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {Rodape, comSomFonte, tempoFonte} from './grafico-barras';

export const sfxPainelTecnico: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_03_ui-premium-open', 0.4];
const SOM_TECLA = 'motionix/ui-sound-effects/ui-sound-effects_21_v4-type-delete-2';
const SOM_DADO = 'motionix/data-collect/data-collect_04_data-collect';
const SOM_ESTICA = 'motionix/ui-sound-effects/ui-sound-effects_18_ui-stretch';
const SOM_CHEGA = 'motionix/clicks/clicks_01_cinematic-click';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fase = (t: number, ini: number, fim: number, curva: (x: number) => number = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const limpa = (s: string) => s.replace(/\s+/g, ' ').trim();

// tokens do MIX (guia: desenho 16 q, assento 14 q); locais para não mexer no tempo.ts do CUT aprovado
const DESENHO = Easing.bezier(0.25, 0.15, 0.5, 1);
const ASSENTO = Easing.bezier(0.22, 1, 0.36, 1);
const PAINEL = '#0A0B0F';
const TRACO = '#C9CFDA';
const CINZA = '#9C9CA8'; // padrão; o estilo pode trazer `cinza` (rótulos)
const REF = 100;

// ---------- tempos (compartilhados entre a peça e os sons) ----------

type Digitacao = {t0: number; per: number; n: number; fim: number};
type LinhaT = Digitacao & {texto: string; valor?: string; valorT?: number};
type Tempos = {
	modo: 'mecanismo' | 'roteiro';
	titulo?: Digitacao & {texto: string};
	sub?: Digitacao & {texto: string};
	linhas: LinhaT[];
	destino?: {texto: string; t: number; ramos: number[]; tronco: number; caixa: number};
};

const digita = (texto: string, t0: number, porLetra: number, maximo: number): Digitacao => {
	const n = Math.max(1, texto.length);
	const per = Math.min(porLetra / 30, maximo / n);
	return {t0, per, n, fim: t0 + per * n};
};
const temNumero = (s?: string) => !!s && /\d/.test(s);

export const temposPainel = (c: Camada): Tempos => {
	const modo = c.modo === 'roteiro' ? 'roteiro' : 'mecanismo';
	const porLetra = Math.max(0.5, num(c.porLetra, 2));
	const tituloLimpo = limpa(txt(c.titulo, modo === 'roteiro' ? 'Neste vídeo' : ''));
	const tituloTexto = c.caixaAlta === true ? tituloLimpo.toLocaleUpperCase('pt-BR') : tituloLimpo;
	const titulo = tituloTexto ? {texto: tituloTexto, ...digita(tituloTexto, Math.max(0, num(c.tituloT, 0.15)), Math.min(porLetra, 1.5), 1.3)} : undefined;
	const subBruto = c.subtitulo;
	const subTexto = limpa(typeof subBruto === 'string' ? subBruto : txt((subBruto as {texto?: unknown} | undefined)?.texto, ''));
	const subT = typeof subBruto === 'object' && subBruto ? num((subBruto as {t?: unknown}).t, titulo ? titulo.fim + 0.2 : 0.3) : titulo ? titulo.fim + 0.2 : 0.3;
	const sub = subTexto ? {texto: subTexto, ...digita(subTexto, subT, porLetra * 0.75, 1.2)} : undefined;
	const brutas = (Array.isArray(c.linhas) ? c.linhas : [])
		.map((l, i) => (typeof l === 'string' ? {t: 0.6 + i * 0.8, texto: l} : {t: num((l as {t?: unknown})?.t, 0.6 + i * 0.8), texto: txt((l as {texto?: unknown})?.texto, ''), valor: txt((l as {valor?: unknown})?.valor, '') || undefined}))
		.map((l) => ({...l, texto: limpa(l.texto)}))
		.filter((l) => l.texto);
	const linhas: LinhaT[] = [];
	brutas.forEach((l, i) => {
		const t0 = Math.max(l.t, 0.2, i > 0 ? linhas[i - 1].t0 + 0.15 : -Infinity);
		const d = digita(l.texto, t0, porLetra, 1.0);
		linhas.push({...d, texto: l.texto, valor: 'valor' in l ? l.valor : undefined, valorT: 'valor' in l && temNumero(l.valor) ? d.fim + 0.05 : undefined});
	});
	let destino: Tempos['destino'];
	if (modo === 'mecanismo' && c.destino) {
		const texto = limpa(typeof c.destino === 'string' ? c.destino : txt((c.destino as {texto?: unknown}).texto, ''));
		if (texto) {
			const ultimo = linhas.length ? linhas[linhas.length - 1].fim : 0.6;
			const t = typeof c.destino === 'object' ? num((c.destino as {t?: unknown}).t, ultimo + 0.5) : ultimo + 0.5;
			const ramos = linhas.map((_, i) => t + i * 0.1);
			const tronco = t + Math.max(0, linhas.length - 1) * 0.1 + 0.3;
			destino = {texto, t, ramos, tronco, caixa: tronco + 0.2};
		}
	}
	return {modo, titulo, sub, linhas, destino};
};

// instante (s) em que o rodapé de fonte entra: com o 1º valor que conta (ou 0,6 s), ≥ 3 s no ar
const fontePainel = (c: Camada, T: Tempos, durS: number) => tempoFonte(num(c.fonteT, T.linhas.find((l) => l.valorT != null)?.valorT ?? 0.6), durS);

export const sonsPainelTecnico = (c: Camada): Som[] => {
	const T = temposPainel(c);
	const out: Som[] = [];
	if (T.titulo) out.push({t: T.titulo.t0, som: SOM_TECLA, vol: 0.5});
	if (T.sub) out.push({t: T.sub.t0, som: SOM_TECLA, vol: 0.45});
	T.linhas.forEach((l) => {
		out.push({t: l.t0, som: SOM_TECLA, vol: 0.5});
		if (l.valorT != null) out.push({t: l.valorT, som: SOM_DADO, vol: 0.55});
	});
	if (T.destino) {
		out.push({t: T.destino.t, som: SOM_ESTICA, vol: 0.45});
		out.push({t: T.destino.caixa, som: SOM_CHEGA, vol: 0.6});
	}
	return comSomFonte(out, txt(c.fonte, '').trim() ? fontePainel(c, T, c.fim - c.ini) : null);
};

// ---------- texto digitado ----------

// valor com número contando ("68%" → 0%…68%; "+2,5 h" → +0,0 h…+2,5 h), algarismos tabulares
const valorContando = (valor: string, p: number) =>
	valor.replace(/\d+(?:[.,]\d+)*/, (m) => {
		const decimal = /,\d+$/.test(m) ? m.split(',')[1].length : 0;
		const alvo = parseFloat(m.replace(/\./g, '').replace(',', '.'));
		if (!Number.isFinite(alvo)) return m;
		return new Intl.NumberFormat('pt-BR', {minimumFractionDigits: decimal, maximumFractionDigits: decimal}).format(alvo * p);
	});

const RESFRIA = 6 / 30; // s para a letra ir do acento ao creme (com 2 q por letra, ~3 letras quentes)

const Digitado: React.FC<{texto: string; d: Digitacao; t: number; frio: string; quente: string | null; cursor: number; corCursor: string}> = ({texto, d, t, frio, quente, cursor, corCursor}) => {
	const k = t < d.t0 ? 0 : Math.min(texto.length, Math.floor((t - d.t0) / d.per) + 1);
	let corte = k;
	if (quente) for (let i = k - 1; i >= 0 && t - (d.t0 + i * d.per) < RESFRIA; i--) corte = i;
	const quentes: React.ReactNode[] = [];
	for (let i = corte; i < k; i++) {
		quentes.push(
			<span key={i} style={{color: interpolateColors(t - (d.t0 + i * d.per), [0, RESFRIA], [quente ?? frio, frio])}}>
				{texto[i]}
			</span>,
		);
	}
	return (
		<>
			<span>{texto.slice(0, corte)}</span>
			{quentes}
			{cursor > 0.01 && (
				<span style={{position: 'relative', display: 'inline-block', width: 0, height: 0}}>
					<span style={{position: 'absolute', left: '0.05em', bottom: '-0.1em', width: '0.07em', height: '0.86em', background: corCursor, opacity: cursor}} />
				</span>
			)}
			<span style={{opacity: 0}}>{texto.slice(k)}</span>
		</>
	);
};

// ---------- peça ----------

export const PainelTecnico: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const T = useMemo(() => temposPainel(c), [c]);
	const roteiro = T.modo === 'roteiro';
	const fBase = FONTES.base.family;
	const chave = [T.titulo?.texto, T.sub?.texto, ...T.linhas.map((l) => `${l.texto} ${l.valor ?? ''}`), T.destino?.texto, '0123456789'].filter(Boolean).join('\n');

	// mede só depois que as fontes carregaram (o measureText guarda em cache a 1ª medida). O render só é liberado
	// DEPOIS que o quadro já medido foi montado (efeito com `pronto`): liberar junto com o setState deixava a captura
	// sair antes do painel aparecer.
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender('painel-tecnico: fonte'));
	const [pronto, setPronto] = useState(false);
	const liberado = useRef(false);
	useEffect(() => {
		let vivo = true;
		const marca = () => {
			if (vivo) setPronto(true);
		};
		Promise.all([300, 500, 600, 800].map((p) => document.fonts.load(`${p} ${REF}px "${fBase}"`, chave)))
			.then(() => document.fonts.ready)
			.then(marca, marca);
		return () => {
			vivo = false;
		};
	}, [fBase, chave]);
	useEffect(() => {
		if (pronto && !liberado.current) {
			liberado.current = true;
			continueRender(espera);
		}
	}, [pronto, continueRender, espera]);

	const medida = (s: string, peso: number, track: string) => (pronto && s ? measureText({text: s, fontFamily: fBase, fontWeight: String(peso), fontSize: REF, letterSpacing: track}).width / REF : 0);
	const M = useMemo(
		() =>
			pronto
				? {
						titulo: medida(T.titulo?.texto ?? '', 800, '-0.02em'),
						sub: medida(T.sub?.texto ?? '', 500, '-0.01em'),
						linhas: T.linhas.map((l) => medida(l.texto, 600, '-0.015em')),
						valores: T.linhas.map((l) => medida(l.valor ?? '', 600, '0em') * 1.06),
						destino: medida(T.destino?.texto ?? '', 800, '-0.02em'),
						num: medida('00', roteiro ? 300 : 500, '0.04em') * 1.06,
					}
				: null,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pronto, T, roteiro],
	);
	if (!M) return null;

	// ---------- diagramação (px; k encolhe tudo junto quando passa de maxLargura) ----------
	const monta = (k: number) => {
		const s = num(c.tamanho, 60) * u * k;
		const st = num(c.tamanhoTitulo, 66) * u * k;
		const ss = num(c.tamanhoSub, 44) * u * k;
		const px = 64 * u * k;
		const micro = 22 * u * k;
		const topoMicro = 40 * u * k;
		let y = topoMicro + micro;
		const tituloTopo = y + 30 * u * k;
		if (T.titulo) y = tituloTopo + st * 1.08;
		const subTopo = y + 12 * u * k;
		if (T.sub) y = subTopo + ss * 1.25;
		const divisor = y + (T.titulo || T.sub ? 30 : 24) * u * k;
		const linhasTopo = divisor + 34 * u * k;
		const passo = s * 1.62;
		const altura = linhasTopo + Math.max(1, T.linhas.length) * passo + 30 * u * k;
		// colunas
		const numFs = roteiro ? s : 0.44 * s;
		const xTrilho = px + 10 * u * k;
		const xNum = roteiro ? px + 46 * u * k : px;
		const xTxt = xNum + M.num * numFs + (roteiro ? 30 : 26) * u * k;
		const larguraTxt = Math.max(0, ...M.linhas) * s;
		const temValor = T.linhas.some((l) => l.valor);
		const xValFim = xTxt + larguraTxt + (temValor ? 40 * u * k + Math.max(0, ...M.valores) * s : 0);
		const xCon = xValFim + 30 * u * k;
		const conW = T.destino ? 210 * u * k : 0;
		const caixaPadX = 30 * u * k;
		const caixaW = T.destino ? M.destino * s + 2 * caixaPadX : 0;
		const caixaH = s * 1.5;
		const fimLinha = T.destino ? xCon + conW + caixaW + px : xValFim + px;
		const largura = Math.max(fimLinha, M.titulo * st + 2 * px, M.sub * ss + 2 * px, num(c.largura, 0) * W, 560 * u * k);
		return {k, s, st, ss, px, micro, topoMicro, tituloTopo, subTopo, divisor, linhasTopo, passo, altura, numFs, xTrilho, xNum, xTxt, xValFim, xCon, conW, caixaPadX, caixaW, caixaH, largura};
	};
	const maxL = num(c.maxLargura, 0.86) * W;
	let L = monta(1);
	if (L.largura > maxL) L = monta(maxL / L.largura);
	const pw = L.largura;
	const ph = L.altura;
	const left = Math.min(Math.max(num(c.x, 0.5) * W - pw / 2, 0.05 * W), 0.95 * W - pw);
	const top = Math.min(Math.max(num(c.y, 0.54) * H - ph / 2, 0.05 * H), 0.95 * H - ph);
	const yLinha = (i: number) => L.linhasTopo + L.passo * (i + 0.5);
	const yMeio = L.linhasTopo + (L.passo * Math.max(1, T.linhas.length)) / 2;

	// ---------- tempo ----------
	const cor = txt(c.cor, est.acento);
	const creme = est.creme;
	const cinza = (est as {cinza?: string}).cinza ?? CINZA;
	const quente = bool(c.quente, true) ? cor : null;
	const vidro = Math.min(1, Math.max(0, num(c.vidro, 0.8)));
	const qSai = Math.max(1, Math.min(Math.round(fps * 0.34), Math.floor(dur * 0.3)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const deriva = 1 + 0.012 * interpolate(frame, [0, dur], [0, 1], clamp);
	const traco = fase(t, 0, 14 / 30, DESENHO);
	const preenche = fase(t, 0.03, 0.4);
	const canto = fase(t, 0, 14 / 30, ASSENTO);
	const microE = fase(t, 0.1, 0.4);
	const divisorE = fase(t, 0.18, 0.7, DESENHO);

	// cursor: no elemento que está digitando; depois pisca devagar no último digitado (some quando o destino chega)
	const digitaveis: {id: string; d: Digitacao}[] = [
		...(T.titulo ? [{id: 'titulo', d: T.titulo}] : []),
		...(T.sub ? [{id: 'sub', d: T.sub}] : []),
		...T.linhas.map((l, i) => ({id: `l${i}`, d: l as Digitacao})),
	];
	let ativo = '';
	let cursor = 0;
	for (const g of digitaveis) if (t >= g.d.t0) ativo = g.id;
	const g = digitaveis.find((x) => x.id === ativo);
	if (g) {
		const depois = t - g.d.fim;
		cursor = depois <= 0 ? 1 : 0.55 + 0.45 * Math.cos(Math.PI * 2 * (depois / 1.1));
		if (T.destino) cursor *= 1 - fase(t, T.destino.t, T.destino.t + 0.2, CURVAS.linear);
	}
	cursor *= 1 - ps;

	// contador do canto: linhas que já começaram
	const nIni = T.linhas.filter((l) => t >= l.t0).length;
	const pad2 = (n: number) => String(n).padStart(2, '0');
	const rotulo = txt(c.rotulo, roteiro ? 'Roteiro' : 'Mecanismo').toUpperCase();
	const rotuloDir = typeof c.rotuloDir === 'string' ? c.rotuloDir.toUpperCase() : T.linhas.length ? `${pad2(nIni)} / ${pad2(T.linhas.length)}` : '';

	// ---------- caminhos ----------
	const borda = Math.max(1.5, 1.5 * u);
	const cantoL = 18 * u;
	const ladoA = `M 0 0 H ${pw} V ${ph}`;
	const ladoB = `M 0 0 V ${ph} H ${pw}`;
	const evA = evolvePath(traco, ladoA);
	const evB = evolvePath(traco, ladoB);
	const cantos: [number, number, number, number][] = [
		[0, 0, 1, 1],
		[pw, 0, -1, 1],
		[0, ph, 1, -1],
		[pw, ph, -1, -1],
	];

	const fonte = (peso: number, tam: number, track: string): React.CSSProperties => ({fontFamily: fBase, fontWeight: peso, fontSize: tam, letterSpacing: track, whiteSpace: 'pre', lineHeight: 1});
	const sombra = `0 ${2 * u}px ${10 * u}px ${rgba('#000000', 0.35)}`;

	// mecanismo: ramos (linha → nó), tronco (nó → caixa)
	const xNo = L.xCon + L.conW * 0.62;
	const xCaixa = L.xCon + L.conW;
	const ramos = T.destino
		? T.linhas.map((_, i) => {
				const x0 = L.xCon;
				const y0 = yLinha(i);
				const dx = xNo - x0;
				return `M ${x0} ${y0} C ${x0 + dx * 0.55} ${y0} ${xNo - dx * 0.5} ${yMeio} ${xNo} ${yMeio}`;
			})
		: [];
	const tronco = `M ${xNo} ${yMeio} H ${xCaixa - 8 * u}`;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left,
					top,
					width: pw,
					height: ph,
					transform: `translateY(${-20 * u * ps}px) scale(${deriva})`,
					transformOrigin: '50% 50%',
					opacity: 1 - ps,
					filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined,
				}}
			>
				{/* preenchimento escuro (esconde a grade; sobre o rosto desfocado deixa a cor passar um pouco) */}
				<div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(creme, 0.035)} 0%, ${rgba(creme, 0)} 30%), ${rgba(PAINEL, vidro)}`, opacity: preenche, boxShadow: `0 ${30 * u}px ${80 * u}px ${rgba('#000000', 0.35 * preenche)}`}} />
				<svg width={pw} height={ph} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
					{/* traço do painel, dos dois lados a partir do canto superior esquerdo */}
					<path d={ladoA} fill="none" stroke={rgba(TRACO, 0.75)} strokeWidth={borda} strokeDasharray={evA.strokeDasharray} strokeDashoffset={evA.strokeDashoffset} />
					<path d={ladoB} fill="none" stroke={rgba(TRACO, 0.75)} strokeWidth={borda} strokeDasharray={evB.strokeDasharray} strokeDashoffset={evB.strokeDashoffset} />
					{/* cantoneiras "L" por fora, assentando de fora para dentro */}
					{cantos.map(([cx, cy, sx, sy], i) => {
						const off = (8 + 10 * (1 - canto)) * u;
						const x = cx - sx * off;
						const y = cy - sy * off;
						return <path key={i} d={`M ${x} ${y + sy * cantoL} V ${y} H ${x + sx * cantoL}`} fill="none" stroke={rgba(creme, 0.9)} strokeWidth={2.5 * u} opacity={canto} strokeLinecap="square" />;
					})}
					{/* divisor sob o cabeçalho, com marcas de régua a cada 96 px */}
					<line x1={L.px} x2={L.px + (pw - 2 * L.px) * divisorE} y1={L.divisor} y2={L.divisor} stroke={rgba(creme, 0.18)} strokeWidth={Math.max(1, u)} />
					{Array.from({length: Math.floor((pw - 2 * L.px) / (96 * u)) + 1}, (_, i) => {
						const x = L.px + i * 96 * u;
						return x <= L.px + (pw - 2 * L.px) * divisorE ? <line key={i} x1={x} x2={x} y1={L.divisor - 5 * u} y2={L.divisor + 5 * u} stroke={rgba(creme, 0.22)} strokeWidth={Math.max(1, u)} /> : null;
					})}

					{/* roteiro: trilho vertical crescendo até o item novo, nós (o ativo no acento) */}
					{roteiro &&
						T.linhas.map((l, i) => {
							const y = yLinha(i);
							const no = fase(t, l.t0 - 0.05, l.t0 + 0.2, ASSENTO);
							const ativoNo = i === nIni - 1;
							const apaga = i < nIni - 1 ? fase(t, T.linhas[i + 1].t0, T.linhas[i + 1].t0 + 0.27, CURVAS.suave) : 0;
							const seg = i > 0 ? `M ${L.xTrilho} ${yLinha(i - 1) + 12 * u} V ${y - 12 * u}` : null;
							const p = i > 0 ? fase(t, l.t0 - 0.2, l.t0 + 0.13, DESENHO) : 0;
							const ev = seg ? evolvePath(p, seg) : null;
							return (
								<g key={i}>
									{seg && ev && p > 0 && <path d={seg} fill="none" stroke={rgba(creme, 0.35)} strokeWidth={2 * u} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />}
									{no > 0 && (
										<>
											<circle cx={L.xTrilho} cy={y} r={9 * u * (0.6 + 0.4 * no)} fill={ativoNo ? cor : 'none'} stroke={ativoNo ? cor : rgba(creme, 0.6 - 0.2 * apaga)} strokeWidth={2 * u} opacity={no} />
											{ativoNo && <circle cx={L.xTrilho} cy={y} r={9 * u + 10 * u * no} fill="none" stroke={rgba(cor, 0.35 * (1 - fase(t, l.t0, l.t0 + 0.6)))} strokeWidth={2 * u} />}
										</>
									)}
								</g>
							);
						})}

					{/* mecanismo: conectores com cabeça de brilho, nó, tronco com seta e caixa do destino */}
					{T.destino &&
						ramos.map((d, i) => {
							const p = fase(t, T.destino!.ramos[i], T.destino!.ramos[i] + 0.4, DESENHO);
							if (p <= 0) return null;
							const ev = evolvePath(p, d);
							const len = getLength(d);
							const cab = p < 1 ? getPointAtLength(d, len * p) : null;
							// guia pontilhada do fim do texto (ou do valor) até o começo do conector
							const xFimTxt = T.linhas[i].valor ? L.xValFim : L.xTxt + M.linhas[i] * L.s;
							const guia = fase(t, T.destino!.ramos[i] - 0.1, T.destino!.ramos[i] + 0.15, DESENHO);
							return (
								<g key={i}>
									{L.xCon - xFimTxt > 30 * u && (
										<line x1={xFimTxt + 18 * u} x2={xFimTxt + 18 * u + (L.xCon - 8 * u - xFimTxt - 18 * u) * guia} y1={yLinha(i)} y2={yLinha(i)} stroke={rgba(creme, 0.28)} strokeWidth={2 * u} strokeDasharray={`${2 * u} ${8 * u}`} strokeLinecap="round" />
									)}
									<path d={d} fill="none" stroke={rgba(creme, 0.55)} strokeWidth={2 * u} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
									<circle cx={L.xCon} cy={yLinha(i)} r={4 * u} fill={rgba(creme, 0.8)} />
									{cab && (
										<>
											<circle cx={cab.x} cy={cab.y} r={11 * u} fill={rgba(cor, 0.35)} style={{filter: `blur(${4 * u}px)`}} />
											<circle cx={cab.x} cy={cab.y} r={4.5 * u} fill={creme} />
										</>
									)}
								</g>
							);
						})}
					{T.destino &&
						(() => {
							const D = T.destino;
							const no = fase(t, D.ramos[D.ramos.length - 1] + 0.32, D.ramos[D.ramos.length - 1] + 0.52, ASSENTO);
							const pt = fase(t, D.tronco, D.tronco + 8 / 30, DESENHO);
							const evT = evolvePath(pt, tronco);
							const cab = pt > 0 && pt < 1 ? getPointAtLength(tronco, getLength(tronco) * pt) : null;
							const seta = fase(t, D.tronco + 6 / 30, D.tronco + 10 / 30);
							const caixa = `M ${xCaixa} ${yMeio - L.caixaH / 2} H ${xCaixa + L.caixaW} V ${yMeio + L.caixaH / 2} H ${xCaixa} Z`;
							const pc = fase(t, D.caixa - 0.05, D.caixa + 0.3, DESENHO);
							const evC = evolvePath(pc, caixa);
							const enche = fase(t, D.caixa + 0.08, D.caixa + 0.3);
							const halo = fase(t, D.caixa + 0.1, D.caixa + 0.75, Easing.out(Easing.quad));
							const sx = xCaixa - 8 * u;
							return (
								<g>
									{no > 0 && <circle cx={xNo} cy={yMeio} r={6.5 * u * (0.5 + 0.5 * no)} fill={creme} opacity={no} />}
									{pt > 0 && <path d={tronco} fill="none" stroke={rgba(creme, 0.7)} strokeWidth={2.5 * u} strokeDasharray={evT.strokeDasharray} strokeDashoffset={evT.strokeDashoffset} />}
									{cab && <circle cx={cab.x} cy={cab.y} r={11 * u} fill={rgba(cor, 0.4)} style={{filter: `blur(${4 * u}px)`}} />}
									{seta > 0 && <path d={`M ${sx - 12 * u} ${yMeio - 9 * u} L ${sx} ${yMeio} L ${sx - 12 * u} ${yMeio + 9 * u}`} fill="none" stroke={rgba(creme, 0.8)} strokeWidth={2.5 * u} strokeLinecap="round" strokeLinejoin="round" opacity={seta} />}
									{halo > 0 && halo < 1 && (
										<rect x={xCaixa - 14 * u * halo} y={yMeio - L.caixaH / 2 - 14 * u * halo} width={L.caixaW + 28 * u * halo} height={L.caixaH + 28 * u * halo} rx={4 * u} fill="none" stroke={rgba(cor, 0.5 * (1 - halo))} strokeWidth={2 * u} />
									)}
									{pc > 0 && <path d={caixa} fill={rgba(cor, enche)} stroke={cor} strokeWidth={2 * u} strokeDasharray={enche > 0.99 ? undefined : evC.strokeDasharray} strokeDashoffset={enche > 0.99 ? undefined : evC.strokeDashoffset} />}
								</g>
							);
						})()}
				</svg>

				{/* micro-rótulos do cabeçalho */}
				<div style={{position: 'absolute', left: L.px, top: L.topoMicro, height: L.micro, display: 'flex', alignItems: 'center', gap: 12 * u * L.k, opacity: microE, ...fonte(600, L.micro, '0.16em'), color: cinza}}>
					<div style={{width: 8 * u * L.k, height: 8 * u * L.k, background: cor}} />
					{rotulo}
				</div>
				{rotuloDir && (
					<div style={{position: 'absolute', right: L.px, top: L.topoMicro, height: L.micro, display: 'flex', alignItems: 'center', opacity: microE, ...fonte(500, L.micro, '0.12em'), fontVariantNumeric: 'tabular-nums', color: cinza}}>
						{rotuloDir}
					</div>
				)}

				{T.titulo && (
					<div style={{position: 'absolute', left: L.px, top: L.tituloTopo, ...fonte(800, L.st, '-0.02em'), color: creme, textShadow: sombra}}>
						<Digitado texto={T.titulo.texto} d={T.titulo} t={t} frio={creme} quente={quente} cursor={ativo === 'titulo' ? cursor : 0} corCursor={cor} />
					</div>
				)}
				{T.sub && (
					<div style={{position: 'absolute', left: L.px, top: L.subTopo, ...fonte(500, L.ss, '-0.01em'), color: rgba(creme, 0.72)}}>
						<Digitado texto={T.sub.texto} d={T.sub} t={t} frio={rgba(creme, 0.72)} quente={quente} cursor={ativo === 'sub' ? cursor : 0} corCursor={cor} />
					</div>
				)}

				{T.linhas.map((l, i) => {
					if (t < l.t0) return null;
					const y = yLinha(i);
					const apaga = roteiro && i < nIni - 1 ? fase(t, T.linhas[i + 1].t0, T.linhas[i + 1].t0 + 0.27, CURVAS.suave) : 0;
					const numE = fase(t, l.t0 - 0.05, l.t0 + 0.25);
					const pv = l.valorT != null ? fase(t, l.valorT, l.valorT + 0.5) : 1;
					const valE = l.valor ? fase(t, l.valorT ?? l.fim, (l.valorT ?? l.fim) + 0.2) : 0;
					return (
						<React.Fragment key={i}>
							<div
								style={{
									position: 'absolute',
									left: L.xNum,
									top: y - L.numFs * 0.5,
									...fonte(roteiro ? 300 : 500, L.numFs, '0.04em'),
									fontVariantNumeric: 'tabular-nums',
									color: roteiro ? (i === nIni - 1 ? creme : rgba(creme, 0.45)) : cinza,
									opacity: numE * (1 - 0.4 * apaga),
									lineHeight: `${L.numFs}px`,
								}}
							>
								{pad2(i + 1)}
							</div>
							<div style={{position: 'absolute', left: L.xTxt, top: y - L.s * 0.55, ...fonte(600, L.s, '-0.015em'), lineHeight: `${L.s * 1.1}px`, color: rgba(creme, 0.94), opacity: 1 - 0.4 * apaga, textShadow: sombra}}>
								<Digitado texto={l.texto} d={l} t={t} frio={rgba(creme, 0.94)} quente={quente} cursor={ativo === `l${i}` ? cursor : 0} corCursor={cor} />
							</div>
							{l.valor && (
								<div
									style={{
										position: 'absolute',
										right: pw - L.xValFim,
										top: y - L.s * 0.55,
										...fonte(600, L.s, '0em'),
										lineHeight: `${L.s * 1.1}px`,
										fontVariantNumeric: 'tabular-nums',
										color: creme,
										opacity: valE * (1 - 0.4 * apaga),
										transform: `translateY(${(1 - valE) * 8 * u}px)`,
									}}
								>
									{valorContando(l.valor, pv)}
								</div>
							)}
						</React.Fragment>
					);
				})}

				{T.destino &&
					(() => {
						const D = T.destino;
						const e = fase(t, D.caixa + 0.1, D.caixa + 0.4);
						const assenta = fase(t, D.caixa + 0.1, D.caixa + 0.1 + 6 / 30, ASSENTO);
						return e > 0 ? (
							<div
								style={{
									position: 'absolute',
									left: xCaixa,
									top: yMeio - L.caixaH / 2,
									width: L.caixaW,
									height: L.caixaH,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									...fonte(800, L.s, '-0.02em'),
									color: creme,
									opacity: e,
									filter: e < 0.99 ? `blur(${(1 - e) * 6 * u}px)` : undefined,
									transform: `scale(${1.04 - 0.04 * assenta})`,
								}}
							>
								{D.texto}
							</div>
						) : null;
					})()}
			</div>
			{txt(c.fonte, '').trim() && (
				<div style={{position: 'absolute', inset: 0, opacity: 1 - ps, filter: ps > 0.01 ? `blur(${10 * u * ps}px)` : undefined}}>
					<Rodape est={est} fonte={txt(c.fonte, '')} fonteT={fontePainel(c, T, dur / fps)} />
				</div>
			)}
		</AbsoluteFill>
	);
};
