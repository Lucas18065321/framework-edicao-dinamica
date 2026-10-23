// Régua de escala com faixa ideal (CUT DINÂMICO, peça `escala-ph`; o padrão é uma escala de pH) e rodapé de fonte do dado (peça `fonte`).
//
// EscalaPh: card escuro de vidro (widget clean) com a régua de 6,8 a 7,8; a faixa NORMAL (7,35–7,45) é uma pílula creme
// estreita (o ponto do vídeo: a faixa é minúscula); as pontas BAIXO e ALTO ficam em carmim; a agulha leva o valor
// em número grande (Inter Tight 900) que conta. Uso: "o ideal fica numa faixa estreita… abaixo… acima"; 4–10 s, 1× por vídeo,
// com a peça `fonte` embaixo.
// Sequência (s): 0–0,35 card entra (escala 0,96→1 + fade + blur); 0,08 a régua se desenha da esquerda; 0,26 a faixa normal
// salta; 0,3 a agulha corre de `de` até o 1º valor (~0,6 s) e o número conta; a cada momento a agulha vai ao novo valor
// com mola (leve overshoot; o número para no valor exato, sem passar); no quadro em que a agulha sai da faixa, a ponta do
// lado acende (carmim forte + pulso), a pílula do lado enche e número e agulha viram carmim; a pílula NORMAL acende com a
// agulha dentro. De uma ponta direto para a outra, o número continua carmim (sem piscar). Últimos 0,25 s: encolhe 3% + fade + blur.
// Parâmetros:
//   momentos ([{t, valor, rotulo?}]; t em s desde o início da camada; padrão [{t: 0, valor: 7.4}]. O 1º é o valor de
//     chegada da entrada. rotulo = etiqueta à direita do título enquanto o momento vale, ex.: "abaixo do ideal"),
//   x, y (0..1, centro do card; 0.5, 0.62), largura (fração do quadro, 0.84), titulo ("ESCALA DE pH"),
//   min, max (6.8, 7.8), normal ([7.35, 7.45]), marcas (números escritos sob a régua; padrão 6,8 7,0 7,2 7,35 7,45 7,6 7,8),
//   casas (decimais do número, 2), de (valor de onde a agulha parte na entrada; padrão = min),
//   rotuloBaixo, rotuloAlto, rotuloNormal (textos das pílulas da ponta baixa, da ponta alta e do meio: "BAIXO", "ALTO",
//     "NORMAL"),
//   seguro (true: card entre y 10% e 80% e fora da coluna de botões do Reels, x > 86% e y 55–90%; com 84% de largura
//     em y 0.62 ele encolhe para x 5–86%).
//
// Fonte: rodapé "Fonte: …" em Inter Tight 500, ~26 px, creme a 70%, alinhado à esquerda, com fio carmim; entra com fade
// + leve subida (0,4 s) e sai com fade (0,25 s). O bloco cresce para cima a partir de `y` (quebra em até 2–3 linhas).
// Parâmetros: texto ("Fonte:" entra sozinho se faltar), x (borda esquerda, 0.07), y (base do bloco, 0.8),
//   tamanho (px em 1080, 26), fio (true: traço carmim à esquerda), seguro (true: não passa de x 84%).
import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PecaProps} from '../../modelos/camadas';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxEscalaPh: [string, number] = ['motionix/data-collect/data-collect_04_data-collect', 0.3];
export const sfxFonte: [string, number] | undefined = undefined;

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// progresso 0..1 entre dois instantes (s), com curva
const fase = (t: number, ini: number, fim: number, curva = CURVAS.entrada) => interpolate(t, [ini, fim], [0, 1], {...clamp, easing: curva});
const limita = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
// número no padrão brasileiro: 7.35 → "7,35"
const virgula = (v: number, casas: number) => (Math.abs(v) < 0.5 * 10 ** -casas ? 0 : v).toFixed(casas).replace('.', ',');
const marcaTxt = (v: number) => virgula(v, Math.abs(v * 10 - Math.round(v * 10)) < 1e-6 ? 1 : 2);

const PRETO = '#0B0B0C';

type Momento = {t: number; valor: number; rotulo?: string};
const lerMomentos = (v: unknown): Momento[] => {
	const lista = (Array.isArray(v) ? v : [])
		.filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null && typeof (m as Record<string, unknown>).valor === 'number')
		.map((m) => ({t: num(m.t, 0), valor: m.valor as number, rotulo: typeof m.rotulo === 'string' && m.rotulo.trim() ? m.rotulo.trim() : undefined}))
		.sort((a, b) => a.t - b.t);
	return lista.length ? lista : [{t: 0, valor: 7.4}];
};

const MOLA_AGULHA = {damping: 15, stiffness: 140, mass: 0.9}; // ~6% de overshoot: a agulha passa um fio e assenta
const MOLA_VARREDURA = {damping: 19, stiffness: 120, mass: 1}; // ~0,6 s, sem overshoot visível
const T_VARRE = 0.3; // s: a agulha nasce e corre até o 1º valor

// Seta pequena das pílulas das pontas (aponta para fora da régua)
const Seta: React.FC<{lado: -1 | 1; tam: number; cor: string; traco: number}> = ({lado, tam, cor, traco}) => (
	<svg width={tam * 0.6} height={tam} viewBox="0 0 6 10" style={{display: 'block', overflow: 'visible', transform: lado < 0 ? undefined : 'scaleX(-1)'}}>
		<polyline points="5,1 1,5 5,9" fill="none" stroke={cor} strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

export const EscalaPh: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;

	// ---------- escala ----------
	const momentos = lerMomentos(c.momentos);
	const min = num(c.min, 6.8);
	const max = Math.max(min + 0.01, num(c.max, 7.8));
	const faixa = Array.isArray(c.normal) && typeof c.normal[0] === 'number' && typeof c.normal[1] === 'number' ? [c.normal[0], c.normal[1]] : [7.35, 7.45];
	const nIni = Math.min(faixa[0], faixa[1]);
	const nFim = Math.max(faixa[0], faixa[1]);
	const casas = Math.round(limita(num(c.casas, 2), 0, 3));
	const de = num(c.de, min);
	const marcas = (Array.isArray(c.marcas) ? c.marcas.filter((m): m is number => typeof m === 'number') : [6.8, 7.0, 7.2, nIni, nFim, 7.6, 7.8]).filter((m) => m >= min - 1e-6 && m <= max + 1e-6);

	// ---------- medidas (px de 1080 × u) ----------
	const P = 48 * u; // margem interna
	const hCard = 470 * u;
	const R = 40 * u;
	let wCard = limita(num(c.largura, 0.84), 0.5, 0.96) * W;
	let cx = num(c.x, 0.5) * W;
	let cy = num(c.y, 0.62) * H;
	if (bool(c.seguro, true)) {
		cy = limita(cy, 0.1 * H + hCard / 2, 0.8 * H - hCard / 2);
		const naColuna = cy + hCard / 2 > 0.55 * H && cy - hCard / 2 < 0.9 * H;
		const esq = 0.05 * W;
		const dir = naColuna ? 0.86 * W : 0.95 * W;
		wCard = Math.min(wCard, dir - esq);
		cx = limita(cx, esq + wCard / 2, dir - wCard / 2);
	}
	const wReg = wCard - 2 * P;
	const xDe = (v: number) => P + ((limita(v, min, max) - min) / (max - min)) * wReg; // x dentro do card

	// linhas do card (topo de cada elemento)
	const yTitulo = 42 * u;
	const fsNum = 146 * u;
	const yNum = 78 * u; // caixa do número (line-height 1): algarismos de +0,136 a +0,864 em; vírgula até ~+1 em
	const yTri = 238 * u;
	const hTri = 18 * u;
	const hTrilho = 20 * u;
	const yTrilho = 266 * u;
	const hFaixa = 38 * u;
	const yMarcas = 304 * u;
	const yRotulos = 326 * u;
	const yPilulas = 378 * u;
	const hPilula = 46 * u;

	// ---------- tempo ----------
	const ent = fase(t, 0, 0.35);
	const qSai = Math.max(1, Math.min(Math.round(fps * 0.25), Math.floor(dur * 0.4)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: CURVAS.saida});
	const esc = (0.96 + 0.04 * ent) * (1 - 0.03 * ps);
	const op = ent * (1 - ps);
	const desfoque = (1 - ent) * 12 * u + ps * 10 * u;

	// valor: soma das molas de cada momento + varredura de entrada (de → 1º valor)
	const mola = (ini: number, config: typeof MOLA_AGULHA) => {
		const f = frame - Math.round(ini * fps);
		return f <= 0 ? 0 : spring({frame: f, fps, config});
	};
	let vMom = momentos[0].valor;
	for (let i = 1; i < momentos.length; i++) vMom += (momentos[i].valor - momentos[i - 1].valor) * mola(momentos[i].t, MOLA_AGULHA);
	const varre = mola(T_VARRE, MOLA_VARREDURA);
	const v = vMom + (de - momentos[0].valor) * (1 - varre);
	// o número não passa do alvo: a agulha tem o overshoot da mola, o número para no valor exato
	let k = 0;
	momentos.forEach((m, i) => {
		if (i > 0 && frame >= Math.round(m.t * fps)) k = i;
	});
	const vDe = k === 0 ? de : momentos[k - 1].valor;
	const vNum = limita(v, Math.min(vDe, momentos[k].valor), Math.max(vDe, momentos[k].valor));

	// pontas acesas: ligam no quadro em que a agulha cruza o limite da faixa e desligam quando ela volta
	const lado = (x: number) => (x < nIni - 1e-9 ? -1 : x > nFim + 1e-9 ? 1 : 0);
	// fim da varredura de entrada: 1º quadro em que a agulha fica a menos de 40% da largura da faixa do 1º valor
	let qChega = 0;
	const falta = Math.abs(de - momentos[0].valor);
	while (qChega < 3 * fps && falta * (1 - spring({frame: qChega, fps, config: MOLA_VARREDURA})) > 0.4 * (nFim - nIni)) qChega++;
	const tChegada = T_VARRE + qChega / fps;
	// instante (s) em que a agulha, indo do momento i−1 ao i, passa a satisfazer (ou deixa de satisfazer) o teste
	const cruza = (i: number, alvo: boolean, teste: (valor: number) => boolean) => {
		const a = momentos[i - 1].valor;
		const b = momentos[i].valor;
		let f = 0;
		while (f < 2 * fps && teste(a + (b - a) * spring({frame: f, fps, config: MOLA_AGULHA})) !== alvo) f++;
		return (Math.round(momentos[i].t * fps) + f) / fps;
	};
	const acende = (teste: (valor: number) => boolean) => {
		let a = 0;
		let tLiga = -1;
		momentos.forEach((m, i) => {
			const antes = i > 0 && teste(momentos[i - 1].valor) ? 1 : 0;
			const agora = teste(m.valor) ? 1 : 0;
			if (agora === antes) return;
			const t0 = i === 0 ? tChegada : cruza(i, agora === 1, teste) - 0.03;
			a += (agora - antes) * fase(t, t0, t0 + (agora ? 0.2 : 0.14));
			if (agora && t >= t0) tLiga = t0;
		});
		const nivel = limita(a, 0, 1);
		const dt = t - tLiga;
		const pulso = tLiga < 0 ? 0 : 0.5 - 0.5 * Math.cos((2 * Math.PI * dt) / 0.9); // leve pulso contínuo
		const bump = tLiga < 0 ? 0 : Math.sin(Math.PI * limita(dt / 0.36, 0, 1)); // pílula cresce e volta ao acender
		return {nivel, pulso, bump};
	};
	const acid = acende((x) => lado(x) < 0);
	const alca = acende((x) => lado(x) > 0);
	// número, agulha e pílula NORMAL: de uma ponta direto para a outra, continuam em alarme (sem piscar no meio)
	const alarme = acende((x) => lado(x) !== 0).nivel;
	const normalAceso = (1 - alarme) * fase(t, tChegada - 0.04, tChegada + 0.18);

	// ---------- agulha e número ----------
	const xm = xDe(v);
	const vAg = fase(t, T_VARRE - 0.06, T_VARRE + 0.16);
	const corAgulha = interpolateColors(alarme, [0, 1], [est.creme, est.acento]);
	const texto = virgula(vNum, casas);
	const digitos = texto.replace(/\D/g, '').length;
	const meiaLarg = (fsNum * (0.6 * digitos + 0.27 - 0.04 * (texto.length - 1))) / 2; // estimativa (algarismos tabulares)
	const xn = limita(xm, P + meiaLarg - 8 * u, wCard - P - meiaLarg + 8 * u);

	// ---------- elementos que entram em cascata ----------
	const eTit = fase(t, 0.05, 0.4);
	const eTrilho = fase(t, 0.08, 0.55);
	const eRot = fase(t, 0.2, 0.55);
	const ePil = fase(t, 0.32, 0.7);
	const fFaixa = frame - Math.round(0.26 * fps);
	const eFaixa = fFaixa <= 0 ? 0 : spring({frame: fFaixa, fps, config: {damping: 11, stiffness: 190, mass: 0.7}});

	// ---------- rótulo do momento (à direita do título) ----------
	const chips = momentos
		.map((m, i) => {
			if (!m.rotulo) return null;
			const ini = i === 0 ? tChegada - 0.2 : m.t + 0.1;
			const prox = momentos[i + 1];
			const e = fase(t, ini, ini + 0.3) * (prox ? 1 - fase(t, prox.t, prox.t + 0.15, Easing.in(Easing.quad)) : 1);
			return e > 0.001 ? {texto: m.rotulo, e, fora: lado(m.valor) !== 0} : null;
		})
		.filter((x): x is {texto: string; e: number; fora: boolean} => x !== null);

	const caixa: React.CSSProperties = {
		position: 'absolute',
		left: cx - wCard / 2,
		top: cy - hCard / 2,
		width: wCard,
		height: hCard,
		transform: `scale(${esc})`,
		transformOrigin: '50% 50%',
	};
	const sombraTexto = `0 ${2 * u}px ${8 * u}px ${rgba(PRETO, 0.45)}`;

	// pontas da régua (carmim; mais forte longe da faixa normal)
	const gap = 4 * u;
	const xN0 = xDe(nIni) - P;
	const xN1 = xDe(nFim) - P;
	const ponta = (s: -1 | 1) => {
		const a = s < 0 ? acid : alca;
		const brilho = a.nivel * (0.65 + 0.35 * a.pulso);
		const left = s < 0 ? 0 : xN1 + gap;
		const width = s < 0 ? xN0 - gap : wReg - xN1 - gap;
		const grad = `linear-gradient(${s < 0 ? 90 : 270}deg, ${est.acento} 0%, ${rgba(est.acento, 0.75)} 55%, ${est.acentoProfundo} 100%)`;
		return (
			<div
				style={{
					position: 'absolute',
					left,
					top: 0,
					width: Math.max(0, width),
					height: hTrilho,
					borderRadius: s < 0 ? `${hTrilho / 2}px ${3 * u}px ${3 * u}px ${hTrilho / 2}px` : `${3 * u}px ${hTrilho / 2}px ${hTrilho / 2}px ${3 * u}px`,
					background: grad,
					opacity: 0.5 + 0.5 * a.nivel,
					boxShadow: brilho > 0.01 ? `0 0 ${(12 + 18 * a.pulso) * u * a.nivel}px ${rgba(est.acento, 0.8 * brilho)}` : undefined,
					filter: brilho > 0.01 ? `brightness(${1 + 0.25 * brilho})` : undefined,
				}}
			/>
		);
	};

	// marcas a cada 0,05 (maiores a cada 0,1)
	const passo = 0.05;
	const nMarcas = Math.round((max - min) / passo);
	const tracos = Array.from({length: nMarcas + 1}, (_, i) => {
		const mv = min + i * passo;
		const maior = Math.abs(mv * 10 - Math.round(mv * 10)) < 1e-6;
		const dentro = mv >= nIni - 1e-6 && mv <= nFim + 1e-6;
		const e = fase(t, 0.14 + i * 0.012, 0.42 + i * 0.012);
		return (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: xDe(mv) - u,
					top: yMarcas,
					width: 2 * u,
					height: (maior ? 13 : 7) * u * e,
					borderRadius: u,
					background: rgba(est.creme, dentro ? 0.8 : maior ? 0.34 : 0.2),
				}}
			/>
		);
	});

	const pilula = (s: -1 | 0 | 1, rotulo: string) => {
		const a = s === 0 ? {nivel: normalAceso, pulso: 0, bump: 0} : s < 0 ? acid : alca;
		const cor = s === 0 ? est.creme : est.acento;
		const corTxt = s === 0 ? interpolateColors(a.nivel, [0, 1], [rgba(est.creme, 0.5), PRETO]) : interpolateColors(a.nivel, [0, 1], [rgba(est.creme, 0.72), est.creme]);
		const fundo = s === 0 ? interpolateColors(a.nivel, [0, 1], [rgba(est.creme, 0), est.creme]) : interpolateColors(a.nivel, [0, 1], [rgba(est.acento, 0.14), est.acento]);
		const borda = s === 0 ? rgba(est.creme, 0.22 + 0.78 * a.nivel) : rgba(est.acento, 0.7 + 0.3 * a.nivel);
		const brilho = a.nivel * (0.6 + 0.4 * a.pulso);
		const ancora = s < 0 ? P : s > 0 ? wCard - P : (xDe(nIni) + xDe(nFim)) / 2;
		const desloc = s < 0 ? '0%' : s > 0 ? '-100%' : '-50%';
		return (
			<div
				style={{
					position: 'absolute',
					left: ancora,
					top: yPilulas,
					height: hPilula,
					padding: `0 ${18 * u}px`,
					display: 'flex',
					alignItems: 'center',
					gap: 10 * u,
					flexDirection: s > 0 ? 'row-reverse' : 'row',
					borderRadius: hPilula / 2,
					background: fundo,
					border: `${1.5 * u}px solid ${borda}`,
					boxShadow: brilho > 0.01 ? `0 0 ${(14 + 16 * a.pulso) * u}px ${rgba(cor, (s === 0 ? 0.25 : 0.6) * brilho)}` : undefined,
					color: corTxt,
					fontFamily: FONTES.pesada.family,
					fontWeight: FONTES.pesada.weight,
					fontSize: 22 * u,
					letterSpacing: '0.12em',
					whiteSpace: 'pre',
					opacity: ePil,
					transform: `translateX(${desloc}) translateY(${(1 - ePil) * 10 * u}px) scale(${1 + 0.08 * a.bump})`,
					transformOrigin: s < 0 ? '0% 50%' : s > 0 ? '100% 50%' : '50% 50%',
				}}
			>
				{s !== 0 && <Seta lado={s} tam={15 * u} cor={corTxt} traco={1.7} />}
				<span style={{marginRight: '-0.12em'}}>{rotulo}</span>
			</div>
		);
	};

	if (op <= 0.001 && frame > 0) return null;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* vidro: sem filtro nem opacidade no pai (cortariam o backdrop-filter) */}
			<div style={caixa}>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						borderRadius: R,
						background: `linear-gradient(180deg, ${rgba('#1A1918', 0.7)} 0%, ${rgba(PRETO, 0.78)} 100%)`,
						backdropFilter: `blur(${30 * u}px) saturate(1.25)`,
						border: `${1.5 * u}px solid ${rgba(est.creme, 0.13)}`,
						boxShadow: `inset 0 ${1.5 * u}px 0 ${rgba(est.creme, 0.1)}, 0 ${30 * u}px ${70 * u}px ${rgba(PRETO, 0.45)}`,
						opacity: op,
					}}
				/>
			</div>

			<div style={{...caixa, opacity: op, filter: desfoque > 0.05 ? `blur(${desfoque}px)` : undefined}}>
				{/* título com gota */}
				<div
					style={{
						position: 'absolute',
						left: P,
						top: yTitulo,
						height: 36 * u,
						display: 'flex',
						alignItems: 'center',
						gap: 12 * u,
						opacity: eTit,
						transform: `translateY(${(1 - eTit) * 10 * u}px)`,
					}}
				>
					<svg width={25 * u} height={32 * u} viewBox="0 0 22 28" style={{display: 'block'}}>
						<path d="M11 1.5 C11 1.5 2 12 2 18 A9 9 0 0 0 20 18 C20 12 11 1.5 11 1.5 Z" fill={est.acento} />
						<path d="M6.6 18.4 A4.6 4.6 0 0 0 10.4 23" fill="none" stroke={rgba(est.creme, 0.55)} strokeWidth={1.8} strokeLinecap="round" />
					</svg>
					<span
						style={{
							fontFamily: FONTES.pesada.family,
							fontWeight: FONTES.pesada.weight,
							fontSize: 28 * u,
							letterSpacing: '0.12em',
							color: rgba(est.creme, 0.75),
							whiteSpace: 'pre',
						}}
					>
						{txt(c.titulo, 'ESCALA DE pH')}
					</span>
				</div>

				{/* rótulo do momento */}
				{chips.map((ch, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							right: P,
							top: yTitulo - 3 * u,
							height: 42 * u,
							padding: `0 ${16 * u}px`,
							display: 'flex',
							alignItems: 'center',
							gap: 10 * u,
							borderRadius: 21 * u,
							background: rgba(ch.fora ? est.acento : est.creme, ch.fora ? 0.9 : 0.1),
							border: `${1.5 * u}px solid ${rgba(ch.fora ? est.acento : est.creme, ch.fora ? 1 : 0.25)}`,
							color: est.creme,
							fontFamily: FONTES.base.family,
							fontWeight: FONTES.base.weight,
							fontSize: 24 * u,
							whiteSpace: 'pre',
							opacity: ch.e,
							transform: `translateY(${(1 - ch.e) * 10 * u}px)`,
						}}
					>
						<div style={{width: 8 * u, height: 8 * u, borderRadius: 4 * u, background: est.creme}} />
						{ch.texto}
					</div>
				))}

				{/* número que conta, preso à agulha */}
				<div
					style={{
						position: 'absolute',
						left: xn,
						top: yNum,
						height: fsNum,
						transform: `translateX(-50%) translateY(${(1 - vAg) * -12 * u}px)`,
						opacity: vAg,
						fontFamily: FONTES.impacto.family,
						fontWeight: FONTES.impacto.weight,
						fontSize: fsNum,
						lineHeight: `${fsNum}px`,
						letterSpacing: FONTES.impacto.tracking,
						fontVariantNumeric: 'tabular-nums',
						color: interpolateColors(alarme, [0, 1], [est.creme, est.acento]),
						textShadow: `0 ${4 * u}px ${14 * u}px ${rgba(PRETO, 0.5)}${alarme > 0.01 ? `, 0 0 ${24 * u}px ${rgba(est.acento, 0.35 * alarme)}` : ''}`,
						whiteSpace: 'pre',
					}}
				>
					{texto}
				</div>

				{/* trilho: pontas carmim + faixa normal creme */}
				<div
					style={{
						position: 'absolute',
						left: P,
						top: yTrilho,
						width: wReg,
						height: hTrilho,
						clipPath: eTrilho < 0.999 ? `inset(-${20 * u}px ${(1 - eTrilho) * 100}% -${20 * u}px -${20 * u}px)` : undefined,
					}}
				>
					{ponta(-1)}
					{ponta(1)}
					<div style={{position: 'absolute', left: xN0, top: 0, width: xN1 - xN0, height: hTrilho, background: rgba(est.creme, 0.1)}} />
				</div>
				<div
					style={{
						position: 'absolute',
						left: P + xN0,
						top: yTrilho + hTrilho / 2 - hFaixa / 2,
						width: xN1 - xN0,
						height: hFaixa,
						borderRadius: 8 * u,
						background: est.creme,
						boxShadow: `0 0 ${(10 + 14 * normalAceso) * u}px ${rgba(est.creme, 0.18 + 0.27 * normalAceso)}`,
						transform: `scale(${0.6 + 0.4 * eFaixa}, ${eFaixa})`,
						opacity: Math.min(1, eFaixa * 2),
					}}
				/>

				{/* agulha: triângulo + fio atravessando o trilho */}
				{vAg > 0.001 && (
					<>
						<svg
							width={26 * u}
							height={hTri}
							viewBox="0 0 26 16"
							style={{position: 'absolute', left: xm - 13 * u, top: yTri, overflow: 'visible', opacity: vAg, transform: `translateY(${(1 - vAg) * -10 * u}px)`, filter: `drop-shadow(0 ${2 * u}px ${4 * u}px ${rgba(PRETO, 0.5)})`}}
						>
							<path d="M1.5 0.5 H24.5 Q26 0.5 25 1.8 L14.2 15 Q13 16.3 11.8 15 L1 1.8 Q0 0.5 1.5 0.5 Z" fill={corAgulha} />
						</svg>
						<div
							style={{
								position: 'absolute',
								left: xm - 1.5 * u,
								top: yTri + hTri - 2 * u,
								width: 3 * u,
								height: (yTrilho + hTrilho / 2 + hFaixa / 2 + 6 * u - (yTri + hTri - 2 * u)) * vAg,
								borderRadius: 1.5 * u,
								background: corAgulha,
								boxShadow: `0 0 0 ${1.5 * u}px ${rgba(PRETO, 0.6)}`,
								opacity: vAg,
							}}
						/>
					</>
				)}

				{/* marcas e números da régua */}
				{tracos}
				{marcas.map((m, i) => {
					const chave = Math.abs(m - nIni) < 1e-6 || Math.abs(m - nFim) < 1e-6;
					const f = chave ? FONTES.pesada : FONTES.base;
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: xDe(m) + (Math.abs(m - nIni) < 1e-6 ? -4 * u : Math.abs(m - nFim) < 1e-6 ? 4 * u : 0),
								top: yRotulos,
								transform: `translateX(-50%) translateY(${(1 - eRot) * 6 * u}px)`,
								opacity: eRot,
								fontFamily: f.family,
								fontWeight: f.weight,
								fontSize: (chave ? 27 : 25) * u,
								lineHeight: 1,
								letterSpacing: '0.01em',
								fontVariantNumeric: 'tabular-nums',
								color: rgba(est.creme, chave ? 0.95 : 0.5),
								whiteSpace: 'pre',
								textShadow: sombraTexto,
							}}
						>
							{marcaTxt(m)}
						</div>
					);
				})}

				{/* pílulas: BAIXO · NORMAL · ALTO */}
				{pilula(-1, txt(c.rotuloBaixo, 'BAIXO'))}
				{pilula(0, txt(c.rotuloNormal, 'NORMAL'))}
				{pilula(1, txt(c.rotuloAlto, 'ALTO'))}
			</div>
		</AbsoluteFill>
	);
};

export const Fonte: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const bruto = txt(c.texto, '').replace(/\s+/g, ' ').trim();
	if (!bruto) return null;
	const m = bruto.match(/^fonte\s*:\s*/i);
	const corpo = m ? bruto.slice(m[0].length) : bruto;

	const x = num(c.x, 0.07) * W;
	const base = num(c.y, 0.8) * H;
	const fs = num(c.tamanho, 26) * u;
	const larg = (bool(c.seguro, true) ? 0.84 : 0.95) * W - x;
	const fio = bool(c.fio, true);

	const e = fase(t, 0, 0.4);
	const qSai = Math.max(1, Math.min(Math.round(fps * 0.25), Math.floor(dur * 0.4)));
	const ps = interpolate(frame, [dur - 1 - qSai, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const op = e * (1 - ps);
	if (op <= 0.001 && frame > 0) return null;
	const desfoque = (1 - e) * 4 * u + ps * 3 * u;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: x,
					top: base,
					maxWidth: larg,
					display: 'flex',
					alignItems: 'stretch',
					gap: 14 * u,
					transform: `translateY(-100%) translateY(${(1 - e) * 14 * u}px)`,
					opacity: op,
					filter: desfoque > 0.05 ? `blur(${desfoque}px)` : undefined,
				}}
			>
				{fio && (
					<div
						style={{
							width: 4 * u,
							flexShrink: 0,
							borderRadius: 1.5 * u,
							background: est.acento,
							margin: `${0.16 * fs}px 0`,
							transform: `scaleY(${fase(t, 0.08, 0.45)})`,
							transformOrigin: '50% 100%',
							boxShadow: `0 ${u}px ${4 * u}px ${rgba(PRETO, 0.4)}`,
						}}
					/>
				)}
				<div
					style={{
						fontFamily: FONTES.base.family,
						fontWeight: FONTES.base.weight,
						fontSize: fs,
						lineHeight: 1.3,
						letterSpacing: '0.005em',
						color: rgba(est.creme, 0.7),
						textShadow: `0 ${u}px ${2 * u}px ${rgba(PRETO, 0.55)}, 0 ${2 * u}px ${10 * u}px ${rgba(PRETO, 0.45)}`,
						textWrap: 'pretty',
					}}
				>
					<span style={{color: rgba(est.creme, 0.88)}}>Fonte: </span>
					{/* palavra com hífen ("custo-benefício") não quebra no hífen */}
					{corpo.split(/(\S+-\S+)/).map((p, i) => (i % 2 ? <span key={i} style={{whiteSpace: 'nowrap'}}>{p}</span> : p))}
				</div>
			</div>
		</AbsoluteFill>
	);
};
