// Text Match Cut (MIX EDIT): a mesma palavra travada no mesmo ponto da tela enquanto o layout em volta troca rápido.
// Duas peças neste arquivo (guia: seção "Text Match Cut"; ética: só print REAL, intacto, conferido, com veículo e data
// visíveis no hold; o destaque é anotação nossa em multiply, as letras do print não mudam).
//
// `match-cut` (prints de manchete ou de artigo científico, PNG): por quadro, escala s = s_item · Z(t) e posição
// left = ancoraX·W − cx·s, top = ancoraY·H − cy·s, com (cx, cy) o ponto de referência da palavra (Z = push global
// 1,00→1,06 linear nos cartões rápidos). Padrão (`tinta: true`): a peça mede no próprio PNG o CORPO da palavra dentro
// da caixa (altura-x e linha de base; ver "refino pela TINTA" abaixo): a altura-x fica igual em todo cartão (`alturaX`,
// padrão 0,43 × altura = 52 px) e o meio dela na âncora (a linha de base não se mexe). Com `tinta: false`, a conta do
// guia: s_item = (altura·H/1080) / bh e o CENTRO da caixa na âncora (a tinta anda alguns px entre fontes).
// Cortes secos; todo corte fica a ≥ 4 q do anterior (`minQ`; item que entraria antes é ignorado com aviso no console; o
// hold sempre fica). O último cartão é o HOLD: q 0–4 parado; q 4–18 recuo ancorado (expo-out) até a `caixaManchete`
// (manchete + veículo + data) caber na área de 1728×880 px, com o resto da página escurecendo (foco na manchete; o
// rodapé lê por cima); a partir do q 10 o rodapé `fonte` (se `fonte` for dado). Fora do print: fundo #0D0E13 + o próprio
// print desfocado em 40 px a 30% + vinheta 0,35. Destaque: caixa no acento em multiply, raio 6 px, que nasce no 1º
// cartão (scaleX 0→1 em 4 q, da esquerda) e acompanha a largura de cada palavra (modo tinta: altura fixa de 2,2 ×
// altura-x centrada na âncora, folga lateral de 0,3 × altura-x; modo caixa: padding 0,15·h × 0,08·h, como no guia).
// A `caixa` de cada item é a do DOM (Range.getBoundingClientRect × devicePixelRatio, a função de captura do guia: vai da
// ascendente à descendente da fonte); serve também uma caixa desenhada à mão em volta da palavra (caminho C).
// Parâmetros:
//   itens ([{t?, arquivo, caixa: [bx, by, bw, bh], caixaManchete?: [x, y, w, h], tinta?}]: caixas em px da IMAGEM (a da
//     palavra-chave; a da manchete inteira com veículo e data, usada só no último item); t em s desde o início da camada
//     (o 1º item começa sempre no quadro 0; com t em uns, os sem t são ignorados); sem t, os tempos saem da `rampa`;
//     tinta: false num item = usa as médias sobre a caixa dele em vez de medir),
//   rampa (q de 30 fps por cartão rápido; padrão 8, 6, 5, 4, 4… = mínimo 4), minQ (4), altura (px em 1080 da caixa da
//     palavra na tela, 120), tinta (true: mede o corpo da palavra no PNG; false: trava a caixa do DOM, como no guia),
//     alturaX (px em 1080 da altura-x na tela no modo tinta; padrão 0,43 × altura = 51,6),
//     ancoraX, ancoraY (0.5, 0.463), push (0.06), area ([1728, 880] px de 1920×1080; com `fonte`,
//     [1728, 800] centrada em y 0,435 para a manchete não encostar no rodapé),
//   centroHold ([x, y] 0..1 do centro da área; padrão = âncora), destaque (true), destaqueOpacidade (0.5; com o carmim,
//     0,45–0,55 lê como marca-texto sem escurecer as letras), cor (do destaque, est.acento),
//   fundo (est.fundoEscuro ?? #0D0E13), escurecerFora (0.78: o quanto a página fora da caixaManchete escurece no hold;
//     0 = nada), fonte (texto do rodapé no hold, ex. "Veículo, 05/10/2026"; usa a peça `fonte` com corpo 40),
//   saida ('blur' padrão, 9 q | 'corte'), debug (true: caixa do DOM em verde tracejado, corpo medido da palavra em verde
//     cheio, caixa da manchete em ciano, âncora em magenta e os números da conta).
// Sons: obturador (camera-shutters_01, 0,45) em cada cartão rápido, começando 0,14 s antes do corte (o clique do
//   arquivo vem 0,14 s depois do início); riser que cresce até o hold e termina seco nele (riser_short, pico em 1,5 s,
//   se os cartões rápidos somarem ≥ 1,5 s; senão reverse_swell, pico em 0,85 s; mais curto: sem riser); clique
//   cinematográfico (0,65) no 1º quadro do hold. Sem som de entrada no registro (o 1º cartão já tem obturador).
//
// `match-cut-tipo` (alternativa sem manchetes, só com as fontes do kit; nunca simula jornal). Dois modos:
//   modo 'frases' (padrão): frases-tema com a `palavra` travada no centro e o resto mudando ("o FOCO acabou?",
//     "FOCO se treina?"), em 8–12 tratamentos (Inter Tight 300/500/600/800/900 e Instrument Serif itálica; creme no
//     escuro ou preto quente sobre o acento). A palavra fica no acento (no fundo acento, em creme) e a ALTURA DA
//     TINTA dela (maiúsculas ou minúsculas) é a mesma em toda fonte (medida no canvas), com o centro da tinta na âncora. Os spans antes/
//     depois se encaixam com measureText (@remotion/layout-utils); se não couberem ao lado, sobem/descem uma linha.
//     Parâmetros: palavra, frases ([{t?, texto: "o *foco* acabou?" | antes?, depois?, tratamento?}] ou strings; sem
//     asteriscos, a `palavra` é procurada no texto), rampa (q por cartão; 10, 8, 6, 5, 4…; mínimo `minQ` 4; o último
//     segura até o fim), altura (px da tinta da palavra, 90: maiúscula em "FOCO", altura-x em "foco"), ancoraX, ancoraY (0.5, 0.5), push (0.06),
//     tratamentos (lista própria: [{fonte: leve|base|semi|pesada|impacto|serifa, caixaAlta?, tracking?, fundo?: 'acento'}]),
//     fundo (est.fundoEscuro ?? #0D0E13; 'transparente' = deixa a cena aparecer), saida ('blur' padrão | 'corte').
//     Fundo acento alternando com o escuro conta como inversão: no máximo 3 por segundo (o excedente vira escuro, com aviso).
//   modo 'palavra' (tela de acento, quebra de modo): 1 palavra por tela, preto quente sobre o acento, Inter Tight 900
//     caixa-alta em `largura` (0.66) do quadro com maiúscula ≤ 360 px, trocando no ritmo da fala, com 1 q de fantasma
//     da anterior na troca; entra e sai com corte seco (1 inversão por troca, guia). Parâmetros: palavras ([{t, w}] ou
//     strings; sem t, 12 q cada), largura, alturaMax (360), ancoraX, ancoraY.
//   Sons: 'frases' = obturador (0,45, 0,14 s antes de cada corte) em cada cartão de ≥ 4 q; 'palavra' = sem som por
//   palavra (a fala marca o ritmo), só um whoosh na entrada.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import type {PecaProps} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS, clamp} from '../tempo';
import {FONTES} from '../fontes';
import {Fonte} from './escala-ph';
import {useFontesProntas} from './titulo-quente';
import {rgba} from './ponto-luz';

export const sfxMatchCut: [string, number] = ['motionix/camera-shutters/camera-shutters_01_camera-shutter', 0.45];
export const sfxMatchCutTipo: [string, number] = sfxMatchCut;
// O camera-shutters_01 tem ~0,14 s de quase silêncio antes do 1º clique forte (medido: picos em 0,14 e 0,19 s). Sem
// compensar, o clique de cada cartão de 4 q cairia no cartão seguinte: o som começa 0,14 s antes do corte.
const ATAQUE_OBTURADOR = 0.14;
// Riser que CRESCE até o hold, escolhido pelo tempo disponível ([som, s do início ao pico]; ambos terminam secos no
// pico). O `risers_02_rjd-riser` do guia não serve: é um golpe com cauda (pico em 0,15 s, some até 0,9 s).
const RISERS: [string, number][] = [
	['riser_short', 1.5],
	['reverse_swell', 0.85],
];
const SOM_HOLD = 'motionix/clicks/clicks_01_cinematic-click';
const SOM_TELA_ACENTO = 'motionix/whooshes/whooshes_03_cinematic-fast-whoosh';

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const limite01 = (v: number) => Math.min(1, Math.max(0, v));

const avisados = new Set<string>();
const avisar = (m: string) => {
	if (avisados.has(m)) return;
	avisados.add(m);
	console.warn(m);
};

type Caixa = [number, number, number, number];
const caixa = (v: unknown): Caixa | null =>
	Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) && v[2] > 0 && v[3] > 0 ? (v as Caixa) : null;

// Divide a camada em cartões: tempos explícitos (t) ou rampa; o 1º começa no quadro 0; o último vai até o fim (hold).
// Todo corte fica a ≥ `minQ` q do anterior: um item que começaria antes disso é ignorado (o cartão anterior estica);
// se for o hold que chega cedo demais, saem os cartões rápidos antes dele (o hold, o print mais forte, sempre fica).
// ini/fim em quadros; n = posição do item na lista original.
const cartoes = <T extends {t: number}>(itens: T[], c: Camada, fps: number, dur: number, rampaPadrao: number[], peca: string) => {
	const k30 = fps / 30;
	const minQ = Math.max(2, num(c.minQ, 4));
	const minF = Math.round(minQ * k30);
	const usaT = itens.some((i) => Number.isFinite(i.t));
	const rampa = lista(c.rampa).filter((n): n is number => typeof n === 'number' && n > 0);
	const r = rampa.length ? rampa : rampaPadrao;
	let acum = 0;
	const numerados = itens.map((it, n) => ({it, n}));
	if (usaT) numerados.filter((x) => !Number.isFinite(x.it.t)).forEach((x) => avisar(`${peca}: item ${x.n + 1} sem "t" (os outros têm): ignorado`));
	const comIni = (usaT ? numerados.filter((x) => Number.isFinite(x.it.t)).sort((a, b) => a.it.t - b.it.t) : numerados).map((x, i) => {
		let ini: number;
		if (usaT) ini = i === 0 ? 0 : Math.round(x.it.t * fps);
		else {
			ini = Math.round(acum * k30);
			acum += Math.max(minQ, r[Math.min(i, r.length - 1)]);
		}
		return {...x, ini};
	});
	const validos = comIni.filter((x) => {
		if (x.ini >= dur) {
			avisar(`${peca}: item ${x.n + 1} começa depois do fim da camada: ignorado`);
			return false;
		}
		return true;
	});
	const out: {it: T; ini: number; fim: number; n: number}[] = [];
	validos.forEach((x, i) => {
		const hold = i === validos.length - 1;
		const ant = out[out.length - 1];
		if (ant && x.ini - ant.ini < minF) {
			if (!hold) {
				avisar(`${peca}: item ${x.n + 1} entraria ${((x.ini - ant.ini) / k30).toFixed(1)} q depois do anterior (< ${minQ} q): ignorado`);
				return;
			}
			while (out.length > 1 && x.ini - out[out.length - 1].ini < minF) {
				const fora = out.pop()!;
				avisar(`${peca}: item ${fora.n + 1} ignorado: o último (hold) entra ${((x.ini - fora.ini) / k30).toFixed(1)} q depois dele (< ${minQ} q)`);
			}
			if (x.ini - out[out.length - 1].ini < minF) avisar(`${peca}: o hold entra só ${((x.ini - out[out.length - 1].ini) / k30).toFixed(1)} q depois do 1º item`);
		}
		out.push({...x, fim: dur});
	});
	out.forEach((x, i) => {
		if (out[i + 1]) x.fim = out[i + 1].ini;
	});
	return out;
};

// ===================================== match-cut (prints) =====================================

type ItemMC = {t: number; arquivo: string; caixa: Caixa; manchete: Caixa | null; tinta: boolean};
const RAMPA_PRINTS = [8, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

const itensMatchCut = (c: Camada): ItemMC[] => {
	const vistos = new Set<string>();
	const tintaCamada = bool(c.tinta, true);
	return lista(c.itens).flatMap((v, n) => {
		const o = (v ?? {}) as Record<string, unknown>;
		const arquivo = txt(o.arquivo, '');
		const cx = caixa(o.caixa);
		if (!arquivo || !cx) {
			avisar(`match-cut: item ${n + 1} sem "arquivo" ou "caixa" válida: ignorado`);
			return [];
		}
		if (vistos.has(arquivo)) avisar(`match-cut: print repetido (${arquivo}); o guia pede nunca repetir`);
		vistos.add(arquivo);
		return [{t: num(o.t, NaN), arquivo, caixa: cx, manchete: caixa(o.caixaManchete), tinta: bool(o.tinta, tintaCamada)}];
	});
};

// ---------- refino pela TINTA (corpo da palavra) ----------
// A caixa do DOM (Range × devicePixelRatio) vai da ascendente à descendente da FONTE, não da palavra. Medido em 9 fontes
// (as 9 páginas de teste do entrada-intro.tsx, mesma palavra de 5 letras): a tinta da palavra ocupa 73–86% da altura da caixa e fica 7–12% abaixo do centro dela;
// travando a caixa, a palavra mudaria ±8% de tamanho e pularia até ~6 px entre cortes. O que o olho trava numa palavra é
// o CORPO das letras (da linha de base à altura-x), então a peça lê os pixels do print DENTRO da caixa e mede:
//   fundo = cor mais comum na caixa; cobertura de cada pixel = distância ao fundo / distância da tinta (o antialiasing
//   vira fração); faixa com tinta contígua à linha mais cheia (o que vem de outra linha, separado por fundo, fica fora);
//   corpo = linhas com ≥ 50% da tinta de uma linha típica (p75), com bordas interpoladas (sem ascendentes/descendentes);
//   largura = da 1ª à última coluna com tinta, bordas subpixel.
// Na tela: a altura-x de toda palavra fica igual (`alturaX`) e a LINHA DE BASE fica travada (o meio da altura-x na
// âncora). Palavra só em maiúsculas (corpo = toda a tinta e ≥ 50% da caixa) ganha a maiúscula equivalente (1,42 × altura-x).
// Medido nas 9 fontes: altura-x = 36–48% da caixa (média 43%) e linha de base a 79–84% dela (média 81%); sem fundo liso,
// sem contraste ou com medida estranha, o item usa essas médias sobre a caixa do DOM (aviso no console).
type Refino = {x: number; w: number; base: number; corpo: number; caixaAlta: boolean};
const cacheTinta = new Map<string, Refino | null>();
const chaveTinta = (arquivo: string, cx: Caixa) => `${arquivo}|${cx.join(',')}`;
const X_CAIXA = 0.43; // altura-x / altura da caixa do DOM (média medida)
const BASE_CAIXA = 0.81; // linha de base, em fração da caixa a partir do topo (média medida)
const MAIUSCULA_X = 1.42; // maiúscula / altura-x (típico de grotesca e serifada)

export const medirTinta = (img: CanvasImageSource & {naturalWidth: number; naturalHeight: number}, cx: Caixa): Refino | null => {
	const [bx, by, bw, bh] = cx;
	const x0 = Math.max(0, Math.floor(bx));
	const y0 = Math.max(0, Math.floor(by));
	const x1 = Math.min(img.naturalWidth, Math.ceil(bx + bw));
	const y1 = Math.min(img.naturalHeight, Math.ceil(by + bh));
	const w = x1 - x0;
	const h = y1 - y0;
	if (w < 6 || h < 6) return null;
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext('2d', {willReadFrequently: true});
	if (!ctx) return null;
	ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
	const d = ctx.getImageData(0, 0, w, h).data;
	const n = w * h;
	// fundo: a cor mais comum (histograma de 4 bits por canal) e a média dos pixels dela
	const hist = new Map<number, number>();
	for (let p = 0; p < n; p++) {
		const k = ((d[p * 4] >> 4) << 8) | ((d[p * 4 + 1] >> 4) << 4) | (d[p * 4 + 2] >> 4);
		hist.set(k, (hist.get(k) ?? 0) + 1);
	}
	let kf = -1;
	let nf = 0;
	hist.forEach((v, k) => {
		if (v > nf) [kf, nf] = [k, v];
	});
	if (nf < 0.35 * n) return null; // fundo não é liso (foto, degradê)
	let fr = 0;
	let fg = 0;
	let fb = 0;
	for (let p = 0; p < n; p++) {
		if ((((d[p * 4] >> 4) << 8) | ((d[p * 4 + 1] >> 4) << 4) | (d[p * 4 + 2] >> 4)) !== kf) continue;
		fr += d[p * 4];
		fg += d[p * 4 + 1];
		fb += d[p * 4 + 2];
	}
	[fr, fg, fb] = [fr / nf, fg / nf, fb / nf];
	const dist = new Float32Array(n);
	const todas: number[] = [];
	for (let p = 0; p < n; p++) {
		dist[p] = Math.hypot(d[p * 4] - fr, d[p * 4 + 1] - fg, d[p * 4 + 2] - fb);
		if (dist[p] > 40) todas.push(dist[p]);
	}
	if (todas.length < 0.03 * n) return null; // quase sem tinta
	todas.sort((a, b) => a - b);
	const tintaD = todas[Math.floor(todas.length * 0.9)]; // cor "cheia" da tinta (percentil 90, ignora poucos pixels fora)
	if (tintaD < 60) return null; // sem contraste
	const cov = (p: number) => Math.min(1, Math.max(0, (dist[p] - 0.06 * tintaD) / (0.88 * tintaD)));
	const lin = new Float32Array(h);
	const somaLin = new Float32Array(h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const v = cov(y * w + x);
			somaLin[y] += v;
			if (v > lin[y]) lin[y] = v;
		}
	// faixa vertical contígua à linha mais cheia (o corpo das letras)
	let yPico = 0;
	for (let y = 1; y < h; y++) if (somaLin[y] > somaLin[yPico]) yPico = y;
	let ya = yPico;
	let yb = yPico;
	while (ya > 0 && lin[ya - 1] > 0.08) ya--;
	while (yb < h - 1 && lin[yb + 1] > 0.08) yb++;
	const col = new Float32Array(w);
	for (let y = ya; y <= yb; y++)
		for (let x = 0; x < w; x++) {
			const v = cov(y * w + x);
			if (v > col[x]) col[x] = v;
		}
	// borda subpixel: 1ª posição "cheia" (≥ 0,9) menos a soma das coberturas parciais antes dela
	const borda = (v: Float32Array, a: number, b: number): [number, number] | null => {
		let i = a;
		while (i <= b && v[i] < 0.9) i++;
		let j = b;
		while (j >= a && v[j] < 0.9) j--;
		if (i > j) return null;
		let lo = i;
		for (let k = a; k < i; k++) lo -= v[k];
		let hi = j + 1;
		for (let k = j + 1; k <= b; k++) hi += v[k];
		return [lo, hi];
	};
	let xa = 0;
	let xb = w - 1;
	while (xa < w && col[xa] <= 0.08) xa++;
	while (xb >= 0 && col[xb] <= 0.08) xb--;
	const V = borda(lin, ya, yb);
	const Hh = borda(col, xa, xb);
	if (!V || !Hh) return null;
	// corpo: linhas com soma ≥ 50% do p75 das somas da faixa, contíguas à linha mais cheia; borda onde a soma cruza o limite
	const somas = Array.from(somaLin.slice(ya, yb + 1)).sort((a, b) => a - b);
	const limite = 0.5 * somas[Math.floor(somas.length * 0.75)];
	let ca = yPico;
	let cb = yPico;
	while (ca > ya && somaLin[ca - 1] >= limite) ca--;
	while (cb < yb && somaLin[cb + 1] >= limite) cb++;
	const cruza = (fora: number, dentro: number) => (somaLin[dentro] === somaLin[fora] ? 0.5 : (limite - somaLin[fora]) / (somaLin[dentro] - somaLin[fora]));
	const topo = ca > ya ? ca - 0.5 + cruza(ca - 1, ca) : V[0];
	const base = cb < yb ? cb + 1.5 - cruza(cb + 1, cb) : V[1];
	const corpo = base - topo;
	const tintaAlt = V[1] - V[0];
	const largura = Hh[1] - Hh[0];
	// sanidade: corpo entre 25% e 75% da caixa, palavra ocupando boa parte da largura da caixa
	if (corpo < 0.25 * bh || corpo > 0.75 * bh || largura < 0.5 * bw || largura > 1.1 * bw) return null;
	const caixaAlta = corpo > 0.9 * tintaAlt && corpo >= 0.5 * bh;
	return {x: x0 + Hh[0], w: largura, base: y0 + base, corpo, caixaAlta};
};

// Uma medida por arquivo + caixa por aba do navegador: cache + promessa compartilhada (várias instâncias da peça, como
// nas folhas com <Freeze>, esperam a mesma medida) e UMA imagem por vez (um print de 3840×2160 decodificado ocupa ~33 MB).
const medindo = new Map<string, Promise<void>>();
let filaMedidas: Promise<void> = Promise.resolve();
const medirArquivo = (it: ItemMC): Promise<void> => {
	const chave = chaveTinta(it.arquivo, it.caixa);
	const ja = medindo.get(chave);
	if (ja) return ja;
	const p = (filaMedidas = filaMedidas.then(
		() =>
			new Promise<void>((ok) => {
				const img = new Image();
				// (não limpar img.src depois: src vazio dispara onerror, que apagaria a medida)
				img.onload = () => {
					img.onload = img.onerror = null;
					let r: Refino | null = null;
					try {
						r = medirTinta(img, it.caixa);
					} catch (e) {
						avisar(`match-cut: ${it.arquivo}: erro ao medir a tinta (${(e as Error)?.message ?? e})`);
						r = null;
					}
					if (!r) avisar(`match-cut: ${it.arquivo}: não achei a palavra dentro da caixa (fundo não liso, sem contraste ou caixa errada): uso as médias sobre a caixa do DOM`);
					cacheTinta.set(chave, r);
					ok();
				};
				img.onerror = () => {
					img.onload = img.onerror = null;
					avisar(`match-cut: não carregou ${it.arquivo} para medir a tinta`);
					if (!cacheTinta.has(chave)) cacheTinta.set(chave, null);
					ok();
				};
				img.src = staticFile(it.arquivo);
			}),
	));
	medindo.set(chave, p);
	return p;
};

// Mede o corpo da palavra dos itens (uma vez, em cache) e segura o render até terminar. O render só é liberado DEPOIS
// do commit do React com a medida (efeito), para o quadro não ser fotografado ainda com a geometria provisória.
const useTintas = (itens: ItemMC[], ativo: boolean) => {
	const {delayRender, continueRender} = useDelayRender();
	const pendentes = ativo ? itens.filter((it) => it.tinta && !cacheTinta.has(chaveTinta(it.arquivo, it.caixa))) : [];
	const [espera] = useState(() => (pendentes.length ? delayRender(`match-cut: medindo a tinta de ${pendentes.length} palavra(s)`) : null));
	const [medido, setMedido] = useState(espera === null);
	const liberado = useRef(false);
	const libera = useCallback(() => {
		if (espera === null || liberado.current) return;
		liberado.current = true;
		continueRender(espera);
	}, [espera, continueRender]);
	useEffect(() => {
		if (espera === null) return;
		let vivo = true;
		Promise.all(pendentes.map(medirArquivo)).then(() => (vivo ? setMedido(true) : libera()));
		return () => {
			vivo = false;
			libera();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [espera]);
	useEffect(() => {
		if (medido) libera();
	}, [medido, libera]);
	return (it: ItemMC): Refino | null => (ativo && it.tinta ? (cacheTinta.get(chaveTinta(it.arquivo, it.caixa)) ?? null) : null);
};

// Geometria de cada item, em px da IMAGEM: ponto de referência (cx, cy) que vai para a âncora, escala-base (sem o push)
// e a caixa do destaque. Modo caixa (tinta: false na camada): o do guia (centro da caixa do DOM, altura `altura`).
// Modo tinta: meio da altura-x na âncora, altura-x = `alturaX` na tela (maiúsculas: a maiúscula equivalente).
type Geo = {cx: number; cy: number; s: number; destaque: Caixa; medido: boolean};
const geometria = (it: ItemMC, ref: Refino | null, c: Camada, H: number): Geo => {
	const altura = (num(c.altura, 120) * H) / 1080;
	const [bx, by, bw, bh] = it.caixa;
	if (!bool(c.tinta, true)) {
		const padH = 0.15 * bh;
		const padV = 0.08 * bh;
		return {cx: bx + bw / 2, cy: by + bh / 2, s: altura / bh, destaque: [bx - padH, by - padV, bw + 2 * padH, bh + 2 * padV], medido: false};
	}
	const alvoX = (num(c.alturaX, X_CAIXA * num(c.altura, 120)) * H) / 1080; // altura-x na tela
	const r = ref ?? {x: bx, w: bw, base: by + BASE_CAIXA * bh, corpo: X_CAIXA * bh, caixaAlta: false};
	const s = (alvoX * (r.caixaAlta ? MAIUSCULA_X : 1)) / r.corpo;
	const xh = alvoX / s; // altura-x equivalente em px da imagem
	const cy = r.base - xh / 2;
	return {cx: r.x + r.w / 2, cy, s, destaque: [r.x - 0.3 * xh, cy - 1.1 * xh, r.w + 0.6 * xh, 2.2 * xh], medido: Boolean(ref)};
};

export const cartoesMatchCut = (c: Camada, fps: number, dur: number) => {
	const cs = cartoes(itensMatchCut(c), c, fps, dur, RAMPA_PRINTS, 'match-cut');
	const hold = cs[cs.length - 1];
	if (hold && cs.length > 1) {
		if (hold.fim - hold.ini < Math.round(18 * (fps / 30))) avisar(`match-cut: hold com menos de 18 q (o recuo até a manchete precisa de 18 q; guia: 30 q)`);
		if (!hold.it.manchete) avisar(`match-cut: o último item (hold) não tem "caixaManchete": o hold não recua até mostrar veículo e data (regra de ética do guia)`);
	}
	return cs;
};

export const sonsMatchCut = (c: Camada, fps: number) => {
	const dur = Math.round((c.fim - c.ini) * fps);
	const cs = cartoesMatchCut(c, fps, dur);
	if (!cs.length) return [];
	const hold = cs[cs.length - 1];
	const out = cs.slice(0, -1).map((x) => ({t: Math.max(0, x.ini / fps - ATAQUE_OBTURADOR), som: sfxMatchCut[0], vol: sfxMatchCut[1]}));
	if (cs.length > 1) {
		const th = hold.ini / fps;
		const riser = RISERS.find(([, pico]) => th >= pico);
		if (riser) out.push({t: th - riser[1], som: riser[0], vol: 0.45});
		out.push({t: th, som: SOM_HOLD, vol: 0.65});
	} else out.push({t: 0, som: sfxMatchCut[0], vol: sfxMatchCut[1]});
	return out;
};

// Transformação do print em cada quadro (exportada para conferência em teste). refinoDe = medida do corpo da palavra
// (useTintas); sem ela, o modo tinta usa as médias sobre a caixa do DOM.
export const contaMatchCut = (c: Camada, fps: number, W: number, H: number, dur: number, frame: number, refinoDe?: (it: ItemMC) => Refino | null) => {
	const k30 = fps / 30;
	const cs = cartoesMatchCut(c, fps, dur);
	if (!cs.length) return null;
	const hold = cs[cs.length - 1];
	const atual = [...cs].reverse().find((x) => frame >= x.ini) ?? cs[0];
	const geo = geometria(atual.it, refinoDe ? refinoDe(atual.it) : null, c, H);
	if (geo.s > 1.3) avisar(`match-cut: ${atual.it.arquivo} entra ampliado ${geo.s.toFixed(2)}× (a palavra está pequena no print; o guia pede ≤ 1,3×: capture com mais zoom)`);
	const A: [number, number] = [num(c.ancoraX, 0.5) * W, num(c.ancoraY, 0.463) * H];
	const Z = 1 + num(c.push, 0.06) * limite01(frame / Math.max(1, hold.ini));
	const s0 = geo.s * Z;
	const {cx, cy} = geo;
	let s = s0;
	let P = A;
	let e = 0;
	if (atual === hold && atual.it.manchete && cs.length > 1) {
		e = CURVAS.entrada(limite01(((frame - hold.ini) / k30 - 4) / 14));
		const [mx, my, mw, mh] = atual.it.manchete;
		// com rodapé de fonte (y 0,84–0,88) a área desce só até y ~0,81
		const comFonte = txt(c.fonte, '') !== '';
		const area = lista(c.area);
		const aw = (num(area[0], 1728) * W) / 1920;
		const ah = (num(area[1], comFonte ? 800 : 880) * H) / 1080;
		const centro = lista(c.centroHold);
		const ccx = num(centro[0], A[0] / W) * W;
		const ccy = num(centro[1], comFonte ? 0.435 : A[1] / H) * H;
		const rl = Math.max(0, ccx - aw / 2);
		const rt = Math.max(0, ccy - ah / 2);
		const rr = Math.min(W, ccx + aw / 2);
		const rb = Math.min(H, ccy + ah / 2);
		const s1 = Math.min(s0, (rr - rl) / mw, (rb - rt) / mh);
		// palavra na âncora; a manchete desliza o mínimo para caber na área
		const L = A[0] - (cx - mx) * s1;
		const T = A[1] - (cy - my) * s1;
		const ajuste = (a: number, tam: number, lo: number, hi: number) => (tam >= hi - lo - 0.5 ? lo + (hi - lo - tam) / 2 - a : a < lo ? lo - a : a + tam > hi ? hi - (a + tam) : 0);
		const P1: [number, number] = [A[0] + ajuste(L, mw * s1, rl, rr), A[1] + ajuste(T, mh * s1, rt, rb)];
		s = s0 * Math.pow(s1 / s0, e);
		P = [A[0] + (P1[0] - A[0]) * e, A[1] + (P1[1] - A[1]) * e];
	}
	return {cs, atual, hold, s, left: P[0] - cx * s, top: P[1] - cy * s, A, e, geo};
};

export const MatchCut: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k30 = fps / 30;
	const itens = useMemo(() => itensMatchCut(c), [c]);
	const refinoDe = useTintas(itens, bool(c.tinta, true));
	const r = contaMatchCut(c, fps, W, H, dur, frame, refinoDe);
	if (!r) return null;
	const {atual, hold, s, left, top, A, e, geo} = r;
	const [bx, by, bw, bh] = atual.it.caixa;
	const ref = refinoDe(atual.it);
	const src = staticFile(atual.it.arquivo);
	const fundo = txt(c.fundo, est.fundoEscuro ?? '#0D0E13');
	const fundoHex = /^#[0-9a-f]{3,8}$/i.test(fundo) ? fundo : '#0D0E13';
	// foco na manchete durante o recuo do hold: o resto da página escurece (o rodapé `fonte` cai sobre a página, que
	// costuma ser branca, e o creme não leria). A caixa da manchete (veículo + manchete + data) fica intacta.
	const escFora = atual === hold && atual.it.manchete ? num(c.escurecerFora, 0.78) * e : 0;
	const man = atual.it.manchete;
	const folga = 0.2 * bh;
	const corDestaque = txt(c.cor, est.acento);
	const eDest = interpolate(frame / k30, [0, 4], [0, 1], {...clamp, easing: CURVAS.entrada});
	const [dx, dy, dw, dh] = geo.destaque;
	const debug = bool(c.debug, false);
	const saiBlur = txt(c.saida, 'blur') !== 'corte' ? interpolate(frame / k30, [dur / k30 - 9, dur / k30], [0, 1], {...clamp, easing: CURVAS.saida}) : 0;
	const qFonte = hold.ini + Math.round(10 * k30);
	const textoFonte = txt(c.fonte, '');
	const linhaDebug = 2 / s;

	return (
		<AbsoluteFill style={{background: fundo, overflow: 'hidden', opacity: 1 - saiBlur, filter: saiBlur > 0 ? `blur(${10 * saiBlur * u}px)` : undefined}}>
			{/* fora do print: o próprio print desfocado */}
			<Img src={src} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${40 * u}px)`, opacity: 0.3, transform: 'scale(1.12)'}} />
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${left}px, ${top}px) scale(${s})`}}>
				<Img src={src} style={{display: 'block', maxWidth: 'none', boxShadow: `0 ${30 / s}px ${80 / s}px rgba(0,0,0,0.5)`}} />
				{bool(c.destaque, true) && (
					<div
						style={{
							position: 'absolute',
							left: dx,
							top: dy,
							width: dw,
							height: dh,
							borderRadius: (6 * u) / s,
							background: corDestaque,
							opacity: num(c.destaqueOpacidade, 0.5),
							mixBlendMode: 'multiply',
							transform: `scaleX(${eDest})`,
							transformOrigin: '0 50%',
						}}
					/>
				)}
				{man && escFora > 0.004 && (
					<div
						style={{
							position: 'absolute',
							left: man[0] - folga,
							top: man[1] - folga,
							width: man[2] + 2 * folga,
							height: man[3] + 2 * folga,
							borderRadius: (10 * u) / s,
							boxShadow: `0 0 ${(36 * u) / s}px ${(2 * Math.max(W, H)) / s}px ${rgba(fundoHex, escFora)}`,
						}}
					/>
				)}
				{debug && (
					<>
						{/* caixa do DOM (tracejada) e corpo medido da palavra (cheio: altura-x sobre a linha de base) */}
						<div style={{position: 'absolute', left: bx, top: by, width: bw, height: bh, outline: `${linhaDebug}px dashed #39ff14`}} />
						{ref && <div style={{position: 'absolute', left: ref.x, top: ref.base - ref.corpo, width: ref.w, height: ref.corpo, outline: `${linhaDebug}px solid #39ff14`}} />}
						{man && <div style={{position: 'absolute', left: man[0], top: man[1], width: man[2], height: man[3], outline: `${linhaDebug}px dashed #00e5ff`}} />}
					</>
				)}
			</div>
			{/* vinheta 0,35 */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)'}} />
			{debug && (
				<>
					<div style={{position: 'absolute', left: A[0] - 40 * u, top: A[1] - u, width: 80 * u, height: 2 * u, background: '#ff00ff'}} />
					<div style={{position: 'absolute', left: A[0] - u, top: A[1] - 40 * u, width: 2 * u, height: 80 * u, background: '#ff00ff'}} />
					<div style={{position: 'absolute', left: 24 * u, top: 20 * u, font: `600 ${22 * u}px monospace`, color: '#39ff14', textShadow: '0 0 4px #000'}}>
						{`item ${atual.n + 1} · q${Math.round((frame - atual.ini) / k30)} · ${bool(c.tinta, true) ? (geo.medido ? `tinta medida${ref?.caixaAlta ? ' (MAIÚSC.)' : ''}` : 'tinta: médias da caixa') : 'caixa do DOM'} · s=${s.toFixed(4)} · ref=(${(left + geo.cx * s).toFixed(2)}, ${(top + geo.cy * s).toFixed(2)})${ref ? ` · base y=${(top + ref.base * s).toFixed(2)} · alt-x=${(ref.corpo * s).toFixed(2)}` : ` · h=${(bh * s).toFixed(2)}`}`}
					</div>
				</>
			)}
			{textoFonte && frame >= qFonte && (
				<Sequence from={qFonte} durationInFrames={Math.max(1, dur - qFonte)} layout="none">
					<Fonte c={{ini: 0, fim: 0, tipo: 'fonte', texto: textoFonte, x: 0.075, y: 0.88, tamanho: 40, seguro: false}} dur={Math.max(1, dur - qFonte)} est={est} />
				</Sequence>
			)}
		</AbsoluteFill>
	);
};

// ===================================== match-cut-tipo =====================================

type FonteTipo = 'leve' | 'base' | 'semi' | 'pesada' | 'impacto' | 'serifa';
type Tratamento = {fonte: FonteTipo; caixaAlta?: boolean; tracking?: string; fundo?: 'acento' | 'escuro'};
const PESOS: Record<FonteTipo, {peso: number; estilo: 'normal' | 'italic'; tracking: string}> = {
	leve: {peso: 300, estilo: 'normal', tracking: '0.01em'},
	base: {peso: 500, estilo: 'normal', tracking: '-0.01em'},
	semi: {peso: 600, estilo: 'normal', tracking: '-0.02em'},
	pesada: {peso: 800, estilo: 'normal', tracking: '-0.02em'},
	impacto: {peso: 900, estilo: 'normal', tracking: '-0.02em'},
	serifa: {peso: 400, estilo: 'italic', tracking: '-0.01em'},
};
const familia = (f: FonteTipo) => (f === 'serifa' ? FONTES.serifa.family : FONTES.base.family);
const TRATAMENTOS: Tratamento[] = [
	{fonte: 'impacto', caixaAlta: true},
	{fonte: 'leve'},
	{fonte: 'serifa'},
	{fonte: 'pesada', fundo: 'acento'},
	{fonte: 'base', caixaAlta: true, tracking: '0.06em'},
	{fonte: 'impacto'},
	{fonte: 'leve', caixaAlta: true, tracking: '0.04em'},
	{fonte: 'semi'},
	{fonte: 'serifa', fundo: 'acento'},
	{fonte: 'pesada', caixaAlta: true},
];
const RAMPA_TIPO = [10, 8, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4];

// Métricas da fonte por em, medidas no canvas (maiúscula, ascendente e descendente da caixa de linha)
type Metricas = {cap: number; asc: number; desc: number};
const cacheMetricas = new Map<string, Metricas>();
const metricas = (fam: string, peso: number, estilo: string): Metricas => {
	const chave = `${estilo} ${peso} ${fam}`;
	const salvo = cacheMetricas.get(chave);
	if (salvo) return salvo;
	const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
	if (!ctx) return {cap: 0.727, asc: 0.969, desc: 0.242};
	ctx.font = `${estilo} ${peso} 200px "${fam}"`;
	const m = ctx.measureText('HIE');
	const r = {cap: m.actualBoundingBoxAscent / 200, asc: m.fontBoundingBoxAscent / 200, desc: m.fontBoundingBoxDescent / 200};
	if (r.cap > 0.3 && r.asc > 0.3) cacheMetricas.set(chave, r);
	return r.cap > 0.3 ? r : {cap: 0.727, asc: 0.969, desc: 0.242};
};
// extensão da tinta de um texto, por em: acima (topo) e abaixo (base) da linha de base, e à esquerda (esq) e à direita
// (dir) da origem do texto, com o tracking aplicado (como o DOM desenha). O centro da tinta, (esq + dir) / 2, é o que
// fica na âncora: centrar pela caixa de avanço deixaria a palavra andar alguns px entre tratamentos (espaçamento depois
// da última letra, caimento da itálica).
const tintaDoTexto = (fam: string, peso: number, estilo: string, texto: string, tracking = '0em') => {
	const padrao = {topo: 0.727, base: 0, esq: 0, dir: 0.6 * texto.length};
	const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
	if (!ctx || !texto) return padrao;
	ctx.font = `${estilo} ${peso} 200px "${fam}"`;
	const ls = parseFloat(tracking);
	if (Number.isFinite(ls) && 'letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = `${tracking.endsWith('em') ? ls * 200 : ls}px`;
	const m = ctx.measureText(texto);
	const r = {topo: m.actualBoundingBoxAscent / 200, base: m.actualBoundingBoxDescent / 200, esq: -m.actualBoundingBoxLeft / 200, dir: m.actualBoundingBoxRight / 200};
	return r.topo + r.base > 0.2 && r.dir > r.esq ? r : padrao;
};
// topo da caixa (line-height 1) para a linha de base cair em `base`
const topoPara = (base: number, fs: number, m: Metricas) => base - ((1 - (m.asc + m.desc)) / 2 + m.asc) * fs;

type Frase = {t: number; antes: string; palavra: string; depois: string; trat: number | null};
const frasesTipo = (c: Camada): Frase[] => {
	const palavra = txt(c.palavra, '').trim();
	return lista(c.frases).flatMap((v, n) => {
		const o = (typeof v === 'string' ? {texto: v} : (v ?? {})) as Record<string, unknown>;
		const trat = typeof o.tratamento === 'number' ? o.tratamento : null;
		const t = num(o.t, NaN);
		if (typeof o.antes === 'string' || typeof o.depois === 'string') return [{t, antes: txt(o.antes, '').trim(), palavra: txt(o.palavra, palavra), depois: txt(o.depois, '').trim(), trat}];
		const texto = txt(o.texto, '').replace(/\s+/g, ' ').trim();
		const m = texto.match(/^(.*?)\*([^*]+)\*(.*)$/);
		if (m) return [{t, antes: m[1].trim(), palavra: m[2].trim(), depois: m[3].trim(), trat}];
		const i = palavra ? texto.toLocaleLowerCase('pt-BR').indexOf(palavra.toLocaleLowerCase('pt-BR')) : -1;
		if (i < 0) {
			avisar(`match-cut-tipo: frase ${n + 1} ("${texto}") sem *palavra* nem "${palavra}": ignorada`);
			return [];
		}
		return [{t, antes: texto.slice(0, i).trim(), palavra: texto.slice(i, i + palavra.length), depois: texto.slice(i + palavra.length).trim(), trat}];
	});
};

const tratamentosDe = (c: Camada): Tratamento[] => {
	const proprios = lista(c.tratamentos).flatMap((v) => {
		const o = (v ?? {}) as Record<string, unknown>;
		const f = txt(o.fonte, '') as FonteTipo;
		return f in PESOS ? [{fonte: f, caixaAlta: bool(o.caixaAlta, false), tracking: typeof o.tracking === 'string' ? o.tracking : undefined, fundo: o.fundo === 'acento' ? 'acento' : undefined} as Tratamento] : [];
	});
	return proprios.length ? proprios : TRATAMENTOS;
};

// cartões das frases com o tratamento de cada um; limita as inversões escuro↔acento a 3 por segundo
const cartoesTipo = (c: Camada, fps: number, dur: number) => {
	const trats = tratamentosDe(c);
	const cs = cartoes(frasesTipo(c), c, fps, dur, RAMPA_TIPO, 'match-cut-tipo').map((x, i) => {
		const k = x.it.trat ?? i;
		return {...x, trat: trats[((k % trats.length) + trats.length) % trats.length]};
	});
	const inversoes: number[] = [];
	let antes: 'acento' | 'escuro' = 'escuro';
	cs.forEach((x, i) => {
		const quer = x.trat.fundo === 'acento' ? 'acento' : 'escuro';
		if (quer === antes || i === 0) {
			antes = quer;
			return;
		}
		const recentes = inversoes.filter((f) => f > x.ini - fps).length;
		// entrar no acento gera 2 inversões (entra e sai); só aceita se couberem as duas
		if (quer === 'acento' && recentes + 2 > 3) {
			avisar(`match-cut-tipo: cartão ${i + 1} no fundo acento passaria de 3 inversões por segundo: vai no escuro`);
			x.trat = {...x.trat, fundo: 'escuro'};
			return;
		}
		inversoes.push(x.ini);
		antes = quer;
	});
	return cs;
};

type ItemPalavra = {t: number; w: string};
const palavrasTela = (c: Camada): ItemPalavra[] =>
	lista(c.palavras).flatMap((v) => {
		const o = (typeof v === 'string' ? {w: v} : (v ?? {})) as Record<string, unknown>;
		const w = txt(o.w, '').trim();
		return w ? [{t: num(o.t, NaN), w}] : [];
	});

export const sonsMatchCutTipo = (c: Camada, fps: number) => {
	const dur = Math.round((c.fim - c.ini) * fps);
	if (txt(c.modo, 'frases') === 'palavra') return [{t: 0, som: SOM_TELA_ACENTO, vol: 0.5}];
	const minF = Math.round(Math.max(2, num(c.minQ, 4)) * (fps / 30));
	return cartoesTipo(c, fps, dur)
		.filter((x) => x.fim - x.ini >= minF)
		.map((x) => ({t: Math.max(0, x.ini / fps - ATAQUE_OBTURADOR), som: sfxMatchCutTipo[0], vol: sfxMatchCutTipo[1]}));
};

export const MatchCutTipo: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k30 = fps / 30;
	const modo = txt(c.modo, 'frases') === 'palavra' ? 'palavra' : 'frases';
	const tinta = est.tinta ?? '#1C0A06';
	const fundoEscuro = txt(c.fundo, est.fundoEscuro ?? '#0D0E13');
	const pronto = useFontesProntas((Object.keys(PESOS) as FonteTipo[]).map((f) => `${PESOS[f].estilo} ${PESOS[f].peso} 100px "${familia(f)}"`));
	const A: [number, number] = [num(c.ancoraX, 0.5) * W, num(c.ancoraY, 0.5) * H];

	// ---------- modo palavra (tela de acento) ----------
	const palavras = useMemo(() => (modo === 'palavra' ? cartoes(palavrasTela(c), c, fps, dur, [12], 'match-cut-tipo') : []), [modo, c, fps, dur]);
	// ---------- modo frases ----------
	const cs = useMemo(() => (modo === 'frases' ? cartoesTipo(c, fps, dur) : []), [modo, c, fps, dur]);
	const layouts = useMemo(() => {
		if (!pronto || modo !== 'frases') return [];
		const alturaPx = num(c.altura, 90) * u;
		const margem = 0.06 * W;
		return cs.map((x) => {
			const p = PESOS[x.trat.fonte];
			const fam = familia(x.trat.fonte);
			const tracking = x.trat.tracking ?? p.tracking;
			const caixaAlta = Boolean(x.trat.caixaAlta);
			const tx = (s: string) => (caixaAlta ? s.toLocaleUpperCase('pt-BR') : s);
			const m = metricas(fam, p.peso, p.estilo);
			// a TINTA da palavra (maiúsculas ou minúsculas, como estiver escrita) tem sempre a mesma altura e o centro dela
			// (vertical e horizontal) fica na âncora
			const tinta = tintaDoTexto(fam, p.peso, p.estilo, tx(x.it.palavra), tracking);
			const fs = alturaPx / (tinta.topo + tinta.base);
			const mede = (s: string, f: number) => (s ? measureText({text: s, fontFamily: fam, fontSize: f, fontWeight: String(p.peso), letterSpacing: tracking, additionalStyles: {fontStyle: p.estilo}}).width : 0);
			const ww = mede(tx(x.it.palavra), fs);
			const espaco = 0.27 * fs;
			const base = A[1] + ((tinta.topo - tinta.base) / 2) * fs;
			const esqPalavra = A[0] - ((tinta.esq + tinta.dir) / 2) * fs; // borda esquerda da caixa de avanço da palavra
			const dirPalavra = esqPalavra + ww;
			type Pedaco = {texto: string; fs: number; top: number; x: number; ancora: 'inicio' | 'fim' | 'centro'};
			// pedaços antes/depois da palavra: a pontuação colada nela (", mais foco", "foco?", "(foco") fica SEMPRE na linha
			// da palavra, sem espaço; o resto vai ao lado se couber, senão numa linha própria (acima/abaixo, centrada)
			const parte = (s: string, onde: 'antes' | 'depois'): Pedaco[] => {
				const out: Pedaco[] = [];
				let resto = s.trim();
				if (!resto) return out;
				let borda = onde === 'antes' ? esqPalavra : dirPalavra;
				const pont = onde === 'depois' ? resto.match(/^[,.;:!?…)\]”"']+/) : resto.match(/[(\[“"'¿¡]+$/);
				if (pont) {
					const gp = 0.04 * fs;
					const wp = mede(tx(pont[0]), fs);
					out.push({texto: tx(pont[0]), fs, top: topoPara(base, fs, m), x: onde === 'depois' ? borda + gp : borda - gp, ancora: onde === 'depois' ? 'inicio' : 'fim'});
					borda = onde === 'depois' ? borda + gp + wp : borda - gp - wp;
					resto = (onde === 'depois' ? resto.slice(pont[0].length) : resto.slice(0, resto.length - pont[0].length)).trim();
					if (!resto) return out;
				}
				const w = mede(tx(resto), fs);
				const lado = (onde === 'depois' ? W - borda : borda) - espaco - margem;
				if (w <= lado) {
					out.push({texto: tx(resto), fs, top: topoPara(base, fs, m), x: onde === 'antes' ? borda - espaco : borda + espaco, ancora: onde === 'antes' ? 'fim' : 'inicio'});
					return out;
				}
				// não cabe ao lado: linha própria acima (antes) ou abaixo (depois), centrada na âncora
				const f2 = fs * Math.min(1, (W - 2 * margem) / Math.max(1, w));
				const b2 = onde === 'antes' ? base - tinta.topo * fs - 0.2 * fs - 0.24 * f2 : base + Math.max(tinta.base, 0.05) * fs + 0.24 * fs + m.cap * f2;
				out.push({texto: tx(resto), fs: f2, top: topoPara(b2, f2, m), x: A[0], ancora: 'centro'});
				return out;
			};
			return {
				fam,
				peso: p.peso,
				estilo: p.estilo,
				tracking,
				acento: x.trat.fundo === 'acento',
				palavra: {texto: tx(x.it.palavra), fs, top: topoPara(base, fs, m), left: esqPalavra},
				antes: parte(x.it.antes, 'antes'),
				depois: parte(x.it.depois, 'depois'),
			};
		});
	}, [pronto, modo, cs, c.altura, u, W, A[0], A[1]]);

	const saiBlur = txt(c.saida, modo === 'palavra' ? 'corte' : 'blur') !== 'corte' ? interpolate(frame / k30, [dur / k30 - 9, dur / k30], [0, 1], {...clamp, easing: CURVAS.saida}) : 0;
	const push = 1 + num(c.push, modo === 'palavra' ? 0.04 : 0.06) * Math.min(1, frame / Math.max(1, dur));

	if (modo === 'palavra') {
		const i = palavras.findIndex((x) => frame >= x.ini && frame < x.fim);
		if (i < 0 || !pronto) return <AbsoluteFill style={{background: est.acento}} />;
		const fam = FONTES.base.family;
		const m = metricas(fam, 900, 'normal');
		const capMax = num(c.alturaMax, 360) * u;
		const desenha = (w: string, op: number, key: string) => {
			const t = w.toLocaleUpperCase('pt-BR');
			const w100 = measureText({text: t, fontFamily: fam, fontSize: 100, fontWeight: '900', letterSpacing: '-0.02em'}).width;
			const fs = Math.min(capMax / m.cap, (num(c.largura, 0.66) * W * 100) / Math.max(1, w100));
			const base = A[1] + (m.cap * fs) / 2;
			return (
				<div key={key} style={{position: 'absolute', left: A[0], top: topoPara(base, fs, m), transform: 'translateX(-50%)', whiteSpace: 'pre', fontFamily: fam, fontWeight: 900, fontSize: fs, lineHeight: 1, letterSpacing: '-0.02em', color: tinta, opacity: op}}>
					{t}
				</div>
			);
		};
		const atual = palavras[i];
		const fantasma = i > 0 && frame - atual.ini < Math.max(1, Math.round(k30)) ? palavras[i - 1].it.w : null;
		return (
			<AbsoluteFill style={{background: est.acento, overflow: 'hidden'}}>
				<AbsoluteFill style={{transformOrigin: `${A[0]}px ${A[1]}px`, transform: `scale(${push})`}}>
					{fantasma && desenha(fantasma, 0.3, 'f')}
					{desenha(atual.it.w, 1, 'p')}
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	const i = cs.findIndex((x) => frame >= x.ini && frame < x.fim);
	const L = layouts[i];
	const fundo = L?.acento ? est.acento : fundoEscuro === 'transparente' ? 'transparent' : fundoEscuro;
	if (!L) return <AbsoluteFill style={{background: fundo}} />;
	const corTexto = L.acento ? tinta : est.creme;
	const corPalavra = L.acento ? est.creme : est.acento;
	const g = (num(c.altura, 90) * u) / 150;
	const estilo = (fs: number): React.CSSProperties => ({position: 'absolute', whiteSpace: 'pre', fontFamily: L.fam, fontWeight: L.peso, fontStyle: L.estilo, fontSize: fs, lineHeight: 1, letterSpacing: L.tracking});
	const lado = (p: (typeof L.antes)[number], k: string) => (
		<div key={k} style={{...estilo(p.fs), left: p.x, top: p.top, color: corTexto, transform: p.ancora === 'fim' ? 'translateX(-100%)' : p.ancora === 'centro' ? 'translateX(-50%)' : undefined}}>
			{p.texto}
		</div>
	);
	return (
		<AbsoluteFill style={{background: fundo, overflow: 'hidden', opacity: 1 - saiBlur, filter: saiBlur > 0 ? `blur(${10 * saiBlur * u}px)` : undefined}}>
			<AbsoluteFill style={{transformOrigin: `${A[0]}px ${A[1]}px`, transform: `scale(${push})`}}>
				{L.antes.map((p, k) => lado(p, `a${k}`))}
				<div
					style={{
						...estilo(L.palavra.fs),
						left: L.palavra.left,
						top: L.palavra.top,
						color: corPalavra,
						textShadow: L.acento ? undefined : `0 0 ${18 * g}px ${rgba(est.acento, 0.55)}, 0 0 ${48 * g}px ${rgba(est.acento, 0.25)}`,
					}}
				>
					{L.palavra.texto}
				</div>
				{L.depois.map((p, k) => lado(p, `d${k}`))}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
