// Card de vidro "Apple" (YOUTUBE - MIX EDIT, peça `card-vidro`): lista curta, número, credencial ou definição rápida
// ao lado do rosto (área livre da parede direita) ou sobre imagem rica (rosto desfocado, B-roll).
// Materiais:
//   'escuro' (padrão; sobre a parede do cenário com o rosto nítido): rgba(13,14,19,.62) + blur 24 px, para o creme ler;
//   'claro' (sobre imagem rica: rosto desfocado com escurecer ≥ 0,4, B-roll escuro): branco .06–.14 (média ≈ .09) +
//   blur 24 px + saturate 150%, borda branca 18%, sombra do texto mais forte;
//   'solido' (sobre fundo liso, tela grade/escura, onde o vidro some): #141416.
// Sequência (q = quadro a 30 fps): o card entra em 16 q (sobe 40 px, escala 0,96→1, blur 12→0, fade; o vidro
// "materializa" pelo raio do desfoque e pela tinta) e os filhos entram em cascata de 4 q (fade + 18 px + blur 8→0 em
// 12 q). O ícone (bloco no acento) entra com mola snappy e se desenha em 16 q; o número conta em 36 q (expo-out,
// pt-BR) um pouco maior (1,04) e assenta em 1 quando pousa (6 q); itens sobem por máscara de linha em 15 q e o card
// cresce para baixo para recebê-los (abre o espaço 5 q antes; a âncora vale para o tamanho FINAL, então o topo não se
// move e nada espera em espaço vazio). No tempo da fala, o item anterior baixa para 78%. A nota entra depois do
// último item. Reflexo diagonal atravessa o card 1× em 18 q logo depois da entrada. Deriva leve (escala +1,2% até a
// saída). Saída: blur 0→12 + escala 0,96 + fade em 8 q (ease-in).
// Parâmetros:
//   material ('escuro' | 'claro' | 'solido'), vidro (opacidade da tinta do vidro escuro, 0.62),
//   x (0.8: centro do card, fração da largura; padrão = meio da área livre x 0,66–0,95),
//   y (0.32: fração da altura; padrão = meio da área livre y 0,06–0,58), ancora ('centro' | 'topo' | 'base': o que o y
//   marca; o y não é limitado às margens: card alto com 4+ itens → ancora 'topo' com y 0.08),
//   largura (px em 1080: 520 na parede; 560–720 sobre imagem ou com o enquadramento B2), padding (44), raio (32),
//   icone (nome Lucide em qualquer grafia: 'moon', 'brain', 'stethoscope', 'badge-check', 'BadgeCheck'; nomes antigos
//   como 'check-circle' também valem; nome inexistente = card sem ícone + aviso no console), iconeEstilo ('bloco' =
//   quadrado no acento com o ícone creme, padrão | 'linha' = só o traço creme), tamanhoIcone (72 no bloco, 64 na linha),
//   rotulo (sobrelinha em caixa-alta pequena, textura), numero (número = conta de `de` até ele; texto = entra pronto),
//   de (0), casas (decimais; padrão = as do número), prefixo, sufixo (ex. '%', 'h'), tamanhoNumero (128),
//   titulo (Inter Tight 800; *trecho* = Instrument Serif itálica), tamanhoTitulo (56),
//   texto (Inter Tight 500, creme 86%; *trecho* = 800), tamanhoTexto (40: informação essencial ≥ 40; vale para itens),
//   itens (strings em cascata, ou [{t (s desde o início da camada), texto}] no tempo da fala), marcador ('ponto' |
//   'numero'), nota (rodapé), tamanhoNota (26 = textura; ressalva que PRECISA ser lida: ≥ 40, ou a peça `fonte`),
//   cascata (4 q entre filhos), reflexo (true | false | s do início), deriva (0.012), cor (acento; padrão est.acento),
//   corTexto (est.creme).
// Sons: entrada sfxCardVidro (UI premium open); sonsCardVidro = contagem do número (data collect, junto da entrada) +
// pop suave em cada item com `t` (≥ 8 q do som anterior).
//
// Este arquivo também exporta o que as outras peças "Apple" do MIX usam (apresentacao, capitulo, dicionario,
// encerramento-youtube): Vidro, IconeLucide, BlocoIcone, iconeExiste, useFontesProntas, entradaCard, filhoEntra e helpers.
import React, {useEffect, useRef, useState} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import * as Lucide from 'lucide-react';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Estilo} from '../../modelos/estilos';
import type {Camada} from '../../tipos';
import {CURVAS, MOLAS as MOLAS_KIT, clamp} from '../tempo';
import {FONTES} from '../fontes';

export const sfxCardVidro: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_03_ui-premium-open', 0.55];
const SOM_NUMERO = 'motionix/data-collect/data-collect_04_data-collect';
const SOM_ITEM = 'motionix/pop/pop_05_smooth-pop';

// ---------- helpers compartilhados ----------
export const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
export const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
export const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao);
export const rgba = (hex: string, a: number) => {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
};
// progresso 0..1 entre dois quadros, com curva
export const prog = (frame: number, a: number, b: number, curva: (t: number) => number = CURVAS.entrada) => interpolate(frame, [a, Math.max(a + 0.001, b)], [0, 1], {...clamp, easing: curva});
export const SAIDA_APPLE = Easing.in(Easing.quad); // saída em 8 q que se vê nos quadros todos (o expo-in só apareceria nos 2 últimos)
export const DESENHO = CURVAS.desenho; // token `desenho` do guia (arco, linha, ícone se desenhando)
// molas Apple de kit/tempo.ts (mass 1); a padrão do Remotion é proibida no MIX. snappy = pop de ícone (passa 1–2% do ponto, só em ícone)
export const MOLAS = {smooth: MOLAS_KIT.smooth, snappy: MOLAS_KIT.snappy};
export const mola = (frame: number, fps: number, a: number, config: {mass: number; stiffness: number; damping: number}) => (frame < a ? 0 : spring({frame: frame - a, fps, config}));

// cores do MIX (campos novos do estilo podem ainda não existir: fallback)
export const coresMix = (est: Estilo) => {
	const e = est as unknown as Record<string, unknown>;
	const cor = (v: unknown, padrao: string) => (typeof v === 'string' && v.startsWith('#') ? v : padrao);
	const grade = (e.grade ?? {}) as {passo?: unknown; cor?: unknown; espessura?: unknown; luz?: unknown};
	return {
		acento: est.acento,
		profundo: est.acentoProfundo,
		creme: est.creme,
		fundo: cor(e.fundoEscuro, cor(e.fundo, '#0D0E13')),
		tinta: cor(e.tinta, '#1C0A06'),
		gelo: cor(e.gelo, '#AFC8DA'),
		cinza: cor(e.cinza, '#9C9CA8'),
		grade: {passo: num(grade.passo, 96), cor: cor(grade.cor, '#222634'), espessura: num(grade.espessura, 1.5), luz: num(grade.luz, 0.05)},
	};
};

// texto com *trecho* marcado
export const partesMarcadas = (s: string) =>
	s
		.split(/(\*[^*]+\*)/)
		.filter(Boolean)
		.map((p) => ({texto: p.replace(/\*/g, ''), marcado: p.startsWith('*') && p.endsWith('*')}));

// ---------- fontes prontas antes de medir (o measureText guarda em cache a 1ª medida) ----------
// O quadro só é liberado DEPOIS que o React aplicou o estado `pronto` (efeito pós-commit): assim a captura nunca pega
// o quadro vazio de antes da medida. Se a fonte falhar, libera do mesmo jeito (com a fonte reserva).
export const useFontesProntas = (specs: string[], rotulo: string) => {
	const {delayRender, continueRender} = useDelayRender();
	const [espera] = useState(() => delayRender(rotulo));
	const [pronto, setPronto] = useState(false);
	const liberado = useRef(false);
	const chave = specs.join('|');
	useEffect(() => {
		let vivo = true;
		const marca = () => {
			if (vivo) setPronto(true);
		};
		Promise.all(chave.split('|').map((s) => document.fonts.load(s)))
			.then(() => document.fonts.ready)
			.then(marca, marca);
		return () => {
			vivo = false;
		};
	}, [chave]);
	useEffect(() => {
		if (pronto && !liberado.current) {
			liberado.current = true;
			continueRender(espera);
		}
	}, [pronto, continueRender, espera]);
	// desmontou antes das fontes (ex.: Sequence curta no Studio): não deixa o render preso no delayRender
	useEffect(
		() => () => {
			if (!liberado.current) {
				liberado.current = true;
				continueRender(espera);
			}
		},
		[continueRender, espera],
	);
	return pronto;
};

// ---------- vidro ----------
export type Material = 'escuro' | 'claro' | 'solido';
export const lerMaterial = (v: unknown): Material => (v === 'claro' || v === 'solido' ? v : 'escuro');

// superfície do card com materialização `a` (0..1): sem opacidade no elemento (mostraria o fundo nítido e o desfocado
// juntos); o vidro aparece pelo raio do desfoque e pela tinta.
export const superficie = (m: Material, a: number, u: number, creme: string, tinta = 0.62): React.CSSProperties => {
	const b = Math.max(1, u);
	if (m === 'solido')
		return {
			background: `linear-gradient(180deg, ${rgba(creme, 0.04 * a)} 0%, ${rgba(creme, 0)} 40%), ${rgba('#141416', a)}`,
			border: `${b}px solid ${rgba(creme, 0.08 * a)}`,
			boxShadow: `inset 0 ${b}px 0 ${rgba(creme, 0.07 * a)}, 0 ${24 * u}px ${70 * u}px rgba(0,0,0,${0.45 * a})`,
		};
	if (m === 'claro')
		// branco médio ≈ 0,09 e saturate 150%: o vidro claro clareia o fundo, então fica no limite de baixo do guia
		// (.08–.12; 140–180%) para o creme manter ≥ 4,5:1 sobre o rosto desfocado com escurecer 0,4
		return {
			background: `linear-gradient(160deg, rgba(255,255,255,${0.14 * a}) 0%, rgba(255,255,255,${0.06 * a}) 55%, rgba(255,255,255,${0.09 * a}) 100%)`,
			backdropFilter: `blur(${24 * u * a}px) saturate(${100 + 50 * a}%)`,
			WebkitBackdropFilter: `blur(${24 * u * a}px) saturate(${100 + 50 * a}%)`,
			border: `${b}px solid rgba(255,255,255,${0.18 * a})`,
			boxShadow: `inset 0 ${b}px 0 rgba(255,255,255,${0.3 * a}), 0 ${20 * u}px ${60 * u}px rgba(0,0,0,${0.35 * a})`,
		};
	return {
		background: `linear-gradient(180deg, ${rgba(creme, 0.06 * a)} 0%, ${rgba(creme, 0)} 42%), rgba(13,14,19,${tinta * a})`,
		backdropFilter: `blur(${24 * u * a}px) saturate(${100 + 40 * a}%)`,
		WebkitBackdropFilter: `blur(${24 * u * a}px) saturate(${100 + 40 * a}%)`,
		border: `${b}px solid ${rgba(creme, 0.13 * a)}`,
		boxShadow: `inset 0 ${b}px 0 ${rgba(creme, 0.09 * a)}, 0 ${30 * u}px ${80 * u}px rgba(0,0,0,${0.36 * a}), 0 ${8 * u}px ${24 * u}px rgba(0,0,0,${0.2 * a})`,
	};
};

// Sombra do texto creme sobre o vidro (no claro, mais forte: o vidro clareia o fundo).
export const sombraTexto = (m: Material, u: number) => (m === 'claro' ? `0 ${2 * u}px ${12 * u}px rgba(0,0,0,0.42)` : `0 ${2 * u}px ${10 * u}px rgba(0,0,0,0.28)`);

// Reflexo diagonal: faixa de luz a 115° que atravessa o card 1× (p 0→1), com brilho máximo no meio do caminho.
const Reflexo: React.FC<{p: number; raio: number; forca: number}> = ({p, raio, forca}) => {
	if (p <= 0 || p >= 1) return null;
	const c = -25 + 150 * p; // centro da faixa (%) ao longo da linha do gradiente
	const a = forca * Math.sin(Math.PI * p);
	const st = (d: number, al: number) => `rgba(255,255,255,${al}) ${c + d}%`;
	return (
		<div style={{position: 'absolute', inset: 0, borderRadius: raio, overflow: 'hidden', pointerEvents: 'none'}}>
			<div style={{position: 'absolute', inset: 0, background: `linear-gradient(115deg, rgba(255,255,255,0) ${c - 22}%, ${st(-9, a * 0.35)}, ${st(-2, a)}, ${st(0, a * 1.15)}, ${st(2, a)}, ${st(9, a * 0.35)}, rgba(255,255,255,0) ${c + 22}%)`}} />
		</div>
	);
};

export type VidroProps = {
	material: Material;
	tinta?: number;
	caixa: React.CSSProperties; // posição, tamanho e transform do card (sem filter/opacity: quebrariam o backdrop-filter)
	raio: number;
	aparece: number; // 0..1: materialização do vidro
	conteudo: number; // 0..1: opacidade do conteúdo
	blur: number; // px de desfoque do conteúdo
	reflexo?: number; // 0..1: progresso do reflexo (fora disso, escondido)
	padding: number | string;
	u: number;
	creme: string;
	// Card que cresce (itens que chegam depois): `fantasma` = o conteúdo no estado final, invisível, que dá o tamanho
	// final à `caixa` (e portanto a posição pela âncora); o card visível fica preso no topo dela e cresce para baixo,
	// com o transform de `cartao`. Sem `fantasma`, a `caixa` é o próprio card.
	fantasma?: React.ReactNode;
	cartao?: React.CSSProperties;
	children?: React.ReactNode;
};

// Vidro + conteúdo. O vidro fica FORA do grupo com filtro (filter/opacity num pai cortariam o backdrop-filter).
export const Vidro: React.FC<VidroProps> = ({material, tinta, caixa, raio, aparece, conteudo, blur, reflexo = 0, padding, u, creme, fantasma, cartao, children}) => {
	const corpo = (
		<>
			{aparece > 0.001 && <div style={{position: 'absolute', inset: 0, borderRadius: raio, boxSizing: 'border-box', ...superficie(material, aparece, u, creme, tinta)}} />}
			<div style={{position: 'relative', padding, boxSizing: 'border-box', opacity: conteudo, filter: blur > 0.05 ? `blur(${blur}px)` : undefined}}>{children}</div>
			<Reflexo p={reflexo} raio={raio} forca={material === 'claro' ? 0.16 : material === 'solido' ? 0.07 : 0.1} />
		</>
	);
	if (fantasma === undefined) return <div style={{position: 'absolute', boxSizing: 'border-box', ...caixa, ...cartao}}>{corpo}</div>;
	return (
		<div style={{position: 'absolute', boxSizing: 'border-box', ...caixa}}>
			<div aria-hidden style={{visibility: 'hidden', padding, boxSizing: 'border-box'}}>
				{fantasma}
			</div>
			<div style={{position: 'absolute', left: 0, top: 0, width: '100%', boxSizing: 'border-box', ...cartao}}>{corpo}</div>
		</div>
	);
};

// Linha que abre (altura 0 → natural) sem medir: grid com a faixa em `abre`fr (0fr..1fr) e o filho com overflow
// escondido. Serve para o card crescer quando um item chega.
// folga = px livres nas laterais (o brilho de um marcador não é cortado pelo overflow).
export const Abre: React.FC<{abre: number; espaco?: number; folga?: number; children: React.ReactNode}> = ({abre, espaco = 0, folga = 0, children}) => (
	<div style={{display: 'grid', gridTemplateRows: `${Math.max(0, Math.min(1, abre))}fr`, marginTop: espaco * Math.max(0, Math.min(1, abre))}}>
		<div style={{minHeight: 0, overflow: 'hidden', padding: `0 ${folga}px`, margin: `0 ${-folga}px`}}>{children}</div>
	</div>
);

// Entrada e saída do card (quadros do formato). q = duração da entrada em quadros de 30 fps; atraso idem.
export const entradaCard = (frame: number, fps: number, dur: number, o: {u: number; q?: number; sobe?: number; atraso?: number; saidaQ?: number; saidaAtraso?: number; deriva?: number}) => {
	const k = fps / 30;
	const a = (o.atraso ?? 0) * k;
	const e = prog(frame, a, a + (o.q ?? 16) * k);
	const qs = Math.max(1, Math.min((o.saidaQ ?? 8) * k, dur * 0.4));
	const fimS = dur - 1 - (o.saidaAtraso ?? 0) * k;
	const s = interpolate(frame, [fimS - qs, fimS], [0, 1], {...clamp, easing: SAIDA_APPLE});
	const deriva = 1 + (o.deriva ?? 0.012) * interpolate(frame, [a, Math.max(a + 1, dur)], [0, 1], clamp); // camada curtíssima: sem faixa invertida
	return {
		e,
		s,
		escala: (0.96 + 0.04 * e) * (1 - 0.04 * s) * deriva,
		dy: (1 - e) * (o.sobe ?? 40) * o.u,
		blur: (1 - e) * 12 * o.u + s * 12 * o.u,
		vis: e * (1 - s),
	};
};

// Filho de card em cascata: fade + sobe 18 px + blur 8→0 em 12 q (a = quadro de início).
export const filhoEntra = (frame: number, a: number, fps: number, u: number, sobe = 18): React.CSSProperties => {
	const e = prog(frame, a, a + (12 * fps) / 30);
	return {opacity: e, transform: `translateY(${(1 - e) * sobe * u}px)`, filter: e < 0.995 ? `blur(${(1 - e) * 8 * u}px)` : undefined};
};

// ---------- ícones Lucide desenhados ----------
// Nome em qualquer grafia: 'badge-check', 'badge_check', 'badge check', 'BadgeCheck', 'badgeCheck', 'BadgeCheckIcon'.
// Vale também o nome antigo (apelido) de ícone renomeado ('check-circle', 'alert-triangle', 'bar-chart'...): a busca
// é feita em TODOS os exports do lucide-react, onde os apelidos continuam. Ícone inexistente: aviso no console e a
// peça fica sem ícone (nunca um bloco vazio). Lista: https://lucide.dev/icons
type NoLucide = [string, Record<string, string | number>][];
type CompLucide = {render?: (p: object, r: null) => {props?: {icon?: {node?: unknown}; iconNode?: unknown}} | null};
const TODOS = Lucide as unknown as Record<string, CompLucide | undefined>;
const CANONICOS = Lucide.icons as unknown as Record<string, CompLucide | undefined>;
const cacheNos = new Map<string, NoLucide | null>();
const pascalLucide = (nome: string) =>
	nome
		.trim()
		.replace(/^Lucide(?=[A-Z])/, '')
		.replace(/(?<=[a-z0-9])Icon$/, '')
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((p) => p[0].toUpperCase() + p.slice(1))
		.join('');
const ehNoLucide = (v: unknown): v is NoLucide => Array.isArray(v) && v.length > 0 && v.every((n) => Array.isArray(n) && typeof n[0] === 'string' && !!n[1] && typeof n[1] === 'object');
// geometria do ícone (lida do componente do lucide-react: forwardRef → elemento <Icon icon={{node}}/>; v0.x: iconNode)
export const nosLucide = (nome: string): NoLucide | null => {
	if (cacheNos.has(nome)) return cacheNos.get(nome) ?? null;
	const pascal = pascalLucide(nome);
	let nos: NoLucide | null = null;
	// exports que não são ícones (o render do `Icon` chama hooks): nem tenta
	const naoIcone = ['Icon', 'LucideProvider', 'createLucideIcon', 'icons', 'useLucideContext'].includes(pascal);
	for (const comp of naoIcone ? [] : [CANONICOS[pascal], TODOS[pascal]]) {
		if (!comp || typeof comp.render !== 'function') continue;
		try {
			const props = comp.render({}, null)?.props;
			const cand = props?.icon?.node ?? props?.iconNode;
			if (ehNoLucide(cand)) {
				nos = cand;
				break;
			}
		} catch {
			// não é um ícone (ex.: 'icon', 'lucide-provider')
		}
	}
	if (!nos && nome.trim()) console.warn(`[kit] ícone Lucide "${nome}" não encontrado (lista em https://lucide.dev/icons): a peça fica sem ícone.`);
	cacheNos.set(nome, nos);
	return nos;
};
export const iconeExiste = (nome: string) => nome.trim() !== '' && nosLucide(nome) !== null;

// desenho 0..1: as partes se desenham em sequência, com sobreposição (traço 1,5 no viewBox de 24, como no guia)
export const IconeLucide: React.FC<{nome: string; tamanho: number; cor: string; traco?: number; desenho?: number; style?: React.CSSProperties}> = ({nome, tamanho, cor, traco = 1.5, desenho = 1, style}) => {
	const nos = nosLucide(nome);
	if (!nos) return null;
	const n = nos.length;
	const span = 1 / (1 + (n - 1) * 0.3);
	return (
		<svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke={cor} strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round" style={{overflow: 'visible', color: cor, display: 'block', ...style}}>
			{nos.map(([tag, attrs], i) => {
				const {key: _k, ...resto} = attrs;
				const p = Math.min(1, Math.max(0, (desenho - i * 0.3 * span) / span));
				return React.createElement(tag, {key: i, ...resto, pathLength: 1, strokeDasharray: `${p} 2`, opacity: p > 0.002 ? 1 : 0});
			})}
		</svg>
	);
};

// Ícone num bloco arredondado no acento (o acento como "cursor"; o creme lê em qualquer fundo). Sem ícone válido, nada.
export const BlocoIcone: React.FC<{nome: string; tamanho: number; acento: string; profundo: string; creme: string; pop: number; desenho: number; u: number}> = ({nome, tamanho, acento, profundo, creme, pop, desenho, u}) => {
	if (!iconeExiste(nome)) return null;
	return (
		<div
			style={{
				width: tamanho,
				height: tamanho,
				flex: 'none',
				borderRadius: tamanho * 0.28,
				background: `linear-gradient(150deg, ${acento} 0%, ${profundo} 100%)`,
				boxShadow: `inset 0 ${Math.max(1, u)}px 0 rgba(255,255,255,0.22), 0 ${8 * u}px ${22 * u}px ${rgba(profundo, 0.5)}`,
				display: 'grid',
				placeItems: 'center',
				transform: `scale(${0.6 + 0.4 * pop})`,
				opacity: Math.min(1, pop * 1.4),
			}}
		>
			<IconeLucide nome={nome} tamanho={tamanho * 0.56} cor={creme} traco={1.75} desenho={desenho} />
		</div>
	);
};

// ---------- card-vidro ----------
type Item = {t?: number; texto: string};
const lerItens = (v: unknown): Item[] =>
	Array.isArray(v)
		? v
				.map((it): Item => (typeof it === 'string' ? {texto: it} : {t: typeof it?.t === 'number' ? it.t : undefined, texto: txt(it?.texto, '')}))
				.map((it) => ({...it, texto: it.texto.replace(/\s+/g, ' ').trim()}))
				.filter((it) => it.texto)
		: [];

// Quando cada filho entra (quadros de 30 fps desde o início da camada). Usado pela peça e pelos sons.
// A nota entra sempre depois do último item (com itens no tempo da fala, nada empurra a nota para baixo).
const planoCard = (c: Camada) => {
	const cascata = num(c.cascata, 4);
	let ordem = 0;
	const proximo = () => 4 + ordem++ * cascata;
	const temCab = iconeExiste(txt(c.icone, '')) || txt(c.rotulo, '') !== '';
	const cab = temCab ? proximo() : undefined;
	const numero = c.numero !== undefined && c.numero !== '' ? proximo() : undefined;
	const titulo = txt(c.titulo, '') ? proximo() : undefined;
	const texto = txt(c.texto, '') ? proximo() : undefined;
	const itens = lerItens(c.itens).map((it) => (it.t !== undefined ? Math.max(4, it.t * 30) : proximo()));
	const nota = txt(c.nota, '') ? Math.max(proximo(), ...itens.map((a) => a + cascata)) : undefined;
	return {cab, numero, titulo, texto, itens, nota};
};

// Sons dos eventos: a contagem do número (par do som de entrada, pode vir junto dele) e cada item com `t`
// (≥ 8 q do som anterior; item mais perto que isso entra sem som).
export const sonsCardVidro = (c: Camada): Som[] => {
	const p = planoCard(c);
	const out: Som[] = [];
	let ultimo = 0; // o som de entrada toca em 0
	if (typeof c.numero === 'number' && p.numero !== undefined) {
		out.push({t: p.numero / 30, som: SOM_NUMERO, vol: 0.6});
		ultimo = p.numero;
	}
	lerItens(c.itens).forEach((it, i) => {
		if (it.t === undefined || p.itens[i] - ultimo < 8) return;
		out.push({t: p.itens[i] / 30, som: SOM_ITEM, vol: 0.5});
		ultimo = p.itens[i];
	});
	return out;
};

const casasDe = (n: number) => {
	const s = String(n);
	return s.includes('.') ? s.split('.')[1].length : 0;
};

export const CardVidro: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k = fps / 30;
	const cor = coresMix(est);
	const acento = txt(c.cor, cor.acento);
	const creme = txt(c.corTexto, cor.creme);
	const material = lerMaterial(c.material);
	const largura = num(c.largura, 520) * u;
	const pad = num(c.padding, 44) * u;
	const raio = num(c.raio, 32) * u;
	const plano = planoCard(c);
	const q = (n: number) => n * k; // quadros de 30 fps → quadros do formato

	const anim = entradaCard(frame, fps, dur, {u, deriva: num(c.deriva, 0.012)});
	const reflexoEm = c.reflexo === false ? -1 : typeof c.reflexo === 'number' ? c.reflexo * fps : q(8);
	const reflexo = reflexoEm < 0 ? 0 : prog(frame, reflexoEm, reflexoEm + q(18), CURVAS.suave);

	// posição: x = centro (dentro das margens de 5%), y conforme a âncora
	const cx = Math.min(Math.max(num(c.x, 0.8) * W, 0.05 * W + largura / 2), 0.95 * W - largura / 2);
	const ancora = txt(c.ancora, 'centro');
	const ty = ancora === 'topo' ? 0 : ancora === 'base' ? -100 : -50;
	const sombra = sombraTexto(material, u);
	const fb = FONTES.base;
	const fp = FONTES.pesada;
	const fs = FONTES.serifa;

	const ordem: (keyof typeof plano)[] = ['cab', 'numero', 'titulo', 'texto', 'itens', 'nota'];
	const proximoFilho = (chave: keyof typeof plano) => ordem.slice(ordem.indexOf(chave) + 1).find((x) => (x === 'itens' ? plano.itens.length > 0 : plano[x] !== undefined));
	const temFilhoDepois = (chave: keyof typeof plano) => proximoFilho(chave) !== undefined;

	// ---------- filhos num quadro (o fantasma usa o estado final, com todos os itens abertos) ----------
	const montar = (frame: number): React.ReactNode[] => {
		const filhos: React.ReactNode[] = [];
		if (plano.cab !== undefined) {
			const a = q(plano.cab);
			const icone = iconeExiste(txt(c.icone, '')) ? txt(c.icone, '') : '';
			const bloco = txt(c.iconeEstilo, 'bloco') !== 'linha';
			const tam = num(c.tamanhoIcone, bloco ? 72 : 64) * u;
			const pop = mola(frame, fps, a, MOLAS.snappy);
			const desenho = prog(frame, a + q(3), a + q(19), DESENHO);
			const rotulo = txt(c.rotulo, '').toUpperCase();
			filhos.push(
				<div key="cab" style={{display: 'flex', alignItems: 'center', gap: 20 * u, marginBottom: temFilhoDepois('cab') ? 28 * u : 0}}>
					{icone &&
						(bloco ? (
							<BlocoIcone nome={icone} tamanho={tam} acento={acento} profundo={cor.profundo} creme={creme} pop={pop} desenho={desenho} u={u} />
						) : (
							<div style={{transform: `scale(${0.7 + 0.3 * pop})`, opacity: Math.min(1, pop * 1.4)}}>
								<IconeLucide nome={icone} tamanho={tam} cor={creme} traco={1.5} desenho={desenho} />
							</div>
						))}
					{rotulo && (
						<div style={{fontFamily: fb.family, fontWeight: 600, fontSize: 22 * u, lineHeight: 1.2, letterSpacing: '0.14em', color: rgba(creme, 0.62), whiteSpace: 'nowrap', ...filhoEntra(frame, a + q(2), fps, u, 10)}}>{rotulo}</div>
					)}
				</div>,
			);
		}

		if (plano.numero !== undefined) {
			const a = q(plano.numero);
			const tam = num(c.tamanhoNumero, 128) * u;
			let mostrado: string;
			if (typeof c.numero === 'number') {
				const casas = num(c.casas, casasDe(c.numero));
				const conta = prog(frame, a, a + q(36));
				const v = num(c.de, 0) + (c.numero - num(c.de, 0)) * conta;
				mostrado = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas}).format(v);
			} else mostrado = String(c.numero);
			// conta um pouco maior (1,04) e assenta em 1 quando a contagem pousa (6 q, sem passar do ponto)
			const assenta = typeof c.numero === 'number' ? 1 + 0.04 * (1 - prog(frame, a + q(28), a + q(34), CURVAS.suave)) : 1;
			filhos.push(
				<div key="num" style={{...filhoEntra(frame, a, fps, u, 24), marginBottom: temFilhoDepois('numero') ? 14 * u : 0}}>
					<div style={{display: 'inline-block', transform: `scale(${assenta})`, transformOrigin: 'left bottom', fontFamily: FONTES.impacto.family, fontWeight: 900, fontSize: tam, lineHeight: 0.92, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: creme, whiteSpace: 'nowrap', textShadow: `0 0 ${30 * u}px ${rgba(creme, 0.14)}`}}>
						{txt(c.prefixo, '') && <span style={{fontSize: '0.5em', fontWeight: 800, color: rgba(creme, 0.7), marginRight: '0.06em'}}>{txt(c.prefixo, '')}</span>}
						{mostrado}
						{txt(c.sufixo, '') && <span style={{fontSize: '0.5em', fontWeight: 800, color: rgba(creme, 0.7), marginLeft: '0.06em'}}>{txt(c.sufixo, '')}</span>}
					</div>
				</div>,
			);
		}

		if (plano.titulo !== undefined) {
			const tam = num(c.tamanhoTitulo, 56) * u;
			filhos.push(
				<div key="tit" style={{...filhoEntra(frame, q(plano.titulo), fps, u), fontFamily: fp.family, fontWeight: 800, fontSize: tam, lineHeight: 1.04, letterSpacing: '-0.03em', color: creme, textWrap: 'balance', overflowWrap: 'break-word', textShadow: sombra, marginBottom: proximoFilho('titulo') === 'texto' ? 14 * u : temFilhoDepois('titulo') ? 24 * u : 0}}>
					{partesMarcadas(txt(c.titulo, '')).map((p, i) =>
						p.marcado ? (
							<span key={i} style={{fontFamily: fs.family, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em', fontSize: '1.08em'}}>
								{p.texto}
							</span>
						) : (
							<span key={i}>{p.texto}</span>
						),
					)}
				</div>,
			);
		}

		if (plano.texto !== undefined) {
			const tam = num(c.tamanhoTexto, 40) * u;
			filhos.push(
				<div key="txt" style={{...filhoEntra(frame, q(plano.texto), fps, u), fontFamily: fb.family, fontWeight: 500, fontSize: tam, lineHeight: 1.22, letterSpacing: '-0.01em', color: rgba(creme, 0.86), textWrap: 'pretty', overflowWrap: 'break-word', textShadow: sombra, marginBottom: temFilhoDepois('texto') ? 22 * u : 0}}>
					{partesMarcadas(txt(c.texto, '')).map((p, i) => (
						<span key={i} style={p.marcado ? {fontWeight: 800, color: creme} : undefined}>
							{p.texto}
						</span>
					))}
				</div>,
			);
		}

		const itens = lerItens(c.itens);
		if (itens.length) {
			const tam = num(c.tamanhoTexto, 40) * u;
			const numerado = txt(c.marcador, 'ponto') === 'numero';
			const cronometrados = itens.some((it) => it.t !== undefined);
			filhos.push(
				<div key="itens" style={{marginBottom: temFilhoDepois('itens') ? 22 * u : 0}}>
					{itens.map((it, i) => {
						const a = q(plano.itens[i]);
						const e = prog(frame, a, a + q(15));
						const ponto = mola(frame, fps, a + q(2), MOLAS.snappy);
						// o card abre o espaço do item um pouco antes de ele chegar (cresce para baixo, sem espaço vazio esperando)
						const abre = prog(frame, a - q(5), a + q(7));
						// no tempo da fala, o item anterior baixa para 78% quando o próximo chega ("o que está ativo agora")
						const prox = plano.itens[i + 1];
						const apaga = cronometrados && prox !== undefined ? prog(frame, q(prox), q(prox) + q(8), CURVAS.suave) : 0;
						return (
							<Abre key={i} abre={abre} espaco={i > 0 ? 16 * u : 0} folga={16 * u}>
								<div style={{display: 'flex', alignItems: 'flex-start', gap: 18 * u, opacity: 1 - 0.22 * apaga}}>
									<div style={{width: numerado ? 44 * u : 14 * u, height: tam * 1.25, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-start'}}>
										{numerado ? (
											<span style={{fontFamily: fb.family, fontWeight: 600, fontSize: 24 * u, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums', color: rgba(creme, 0.55), opacity: e}}>{String(i + 1).padStart(2, '0')}</span>
										) : (
											<div style={{width: 12 * u, height: 12 * u, borderRadius: '50%', background: acento, boxShadow: `0 0 ${10 * u}px ${rgba(acento, 0.6)}`, transform: `scale(${ponto})`}} />
										)}
									</div>
									<div style={{overflow: 'hidden', paddingBottom: 0.12 * tam, marginBottom: -0.12 * tam}}>
										<div style={{fontFamily: fb.family, fontWeight: 500, fontSize: tam, lineHeight: 1.25, letterSpacing: '-0.01em', color: rgba(creme, 0.94), overflowWrap: 'break-word', textShadow: sombra, opacity: e, transform: `translateY(${(1 - e) * 105}%)`}}>{it.texto}</div>
									</div>
								</div>
							</Abre>
						);
					})}
				</div>,
			);
		}

		if (plano.nota !== undefined) {
			filhos.push(
				<div key="nota" style={{...filhoEntra(frame, q(plano.nota), fps, u, 10), fontFamily: fb.family, fontWeight: 500, fontSize: num(c.tamanhoNota, 26) * u, lineHeight: 1.3, color: rgba(creme, num(c.tamanhoNota, 26) >= 40 ? 0.78 : 0.6), textWrap: 'pretty'}}>
					{txt(c.nota, '')}
				</div>,
			);
		}
		return filhos;
	};

	// estado final (todos os itens abertos): define o tamanho e a posição do card pela âncora
	const ultimo = Math.max(4, ...plano.itens, plano.nota ?? 0, plano.texto ?? 0, plano.titulo ?? 0, plano.numero ?? 0, plano.cab ?? 0);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<Vidro
				material={material}
				tinta={num(c.vidro, 0.62)}
				caixa={{left: cx - largura / 2, top: num(c.y, 0.32) * H, width: largura, transform: `translateY(${ty}%)`}}
				cartao={{transform: `translateY(${anim.dy}px) scale(${anim.escala})`, transformOrigin: '50% 30%'}}
				fantasma={montar(q(ultimo + 60))}
				raio={raio}
				aparece={anim.vis}
				conteudo={anim.vis}
				blur={anim.blur}
				reflexo={reflexo}
				padding={pad}
				u={u}
				creme={creme}
			>
				{montar(frame)}
			</Vidro>
		</AbsoluteFill>
	);
};
