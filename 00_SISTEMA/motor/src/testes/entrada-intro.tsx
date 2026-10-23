// Teste das peças da INTRO CINEMATOGRÁFICA do MIX EDIT (16:9, 30 fps): ponto-luz, titulo-quente, flash-foto,
// match-cut (prints) + match-cut-tipo (frases e palavra) e manchete-falada.
// Material (pasta pública própria, nada do projeto é alterado): testes-pub/mix/intro/
//   rosto.jpg (quadro do bruto do piloto em 0:30), foto1–4.jpg (cópias da 02_BIBLIOTECA), pagina1–4.png (páginas
//   FICTÍCIAS geradas pela composição `Pagina` deste arquivo; a palavra FOCO sai em azul só para medir a posição),
//   manchete1–9.png (9 "capturas" FICTÍCIAS de 3840×2160, como o Chrome com deviceScaleFactor 2: 5 títulos de artigo e
//   4 manchetes, todas marcadas TESTE, geradas pela composição `PaginasManchete`; "Focus" em azul só para medir).
// Stills (de dentro do motor; sempre pela fila: node scripts/vez.mjs node node_modules/@remotion/cli/remotion-cli.js …):
//   still src/testes/entrada-intro.tsx <Comp> <png> --frame=N --public-dir=testes-pub/mix/intro --gl=angle --scale=0.5
//     --concurrency=1
//   Pagina (3200×2000 → PNG 1600×1000 com --scale=0.5): --props='{"i":1}' … 4
//   PaginasManchete (9 q, 1920×1080): render … PaginasManchete <pasta> --sequence --image-format=png --scale=2 --log=verbose
//     → element-0..8.png (= manchete1..9.png) e, no log, "CAIXA_TESTE {...}" com as caixas medidas no DOM (mesma conta da
//     função de captura do guia: Range.getBoundingClientRect × devicePixelRatio) → CAIXAS_MANCHETE abaixo.
//   Intro (750 q): A 0–90 flash-foto webgl · A2 90–150 flash-foto css · B 150–240 match-cut · B2 240–330 match-cut debug
//     · C 330–420 match-cut-tipo frases · D 420–570 ponto-luz + titulo-quente (colapso no q 549) · E 570–690 manchete-falada
//     · F 690–750 match-cut-tipo palavra
//   MatchManchete (180 q): o match-cut do piloto (9 itens, rampa e altura padrão, 3 s) em 0–90 e o mesmo com debug em 90–180
//   Pontos (120 q): saídas do ponto-luz: cometa (0–42), lâmpada → centro + colapso (42–84), cantoneiras + apagar (84–120)
//   Folha: 9 quadros congelados de uma composição num quadro só (--props='{"q":[...],"de":"intro"|"manchete"|"pontos"}')
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Composition, Freeze, Img, Sequence, registerRoot, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {ESTILOS} from '../modelos/estilos';
import type {Estilo} from '../modelos/estilos';
import type {Camada} from '../tipos';
import type {PecaProps} from '../modelos/camadas';
import {PontoLuz} from '../kit/pecas/ponto-luz';
import {TituloQuente} from '../kit/pecas/titulo-quente';
import {FlashFoto} from '../kit/pecas/flash-foto';
import {MatchCut, MatchCutTipo} from '../kit/pecas/match-cut';
import {MancheteFalada} from '../kit/pecas/manchete-falada';

const FPS = 30;
// decisão do usuário: acento carmim no MIX (o estilo pode ainda estar com o laranja quando este teste rodar)
const est: Estilo = {...ESTILOS['mix-edit-youtube'], acento: '#B90015', acentoProfundo: '#5E0E06'};
const FUNDO = '#0D0E13';

// caixas medidas nos PNGs das páginas (scripts de medida: bbox do azul = palavra; bbox da tinta = manchete inteira)
// [bx, by, bw, bh] em px do PNG (1600×1000), medidas com o medir.mjs (cobertura subpixel); manchete = tinta + 16 px.
export const CAIXAS: Record<number, {caixa: [number, number, number, number]; manchete: [number, number, number, number]}> = {
	1: {caixa: [94.12, 390, 382.47, 91], manchete: [74, 38, 1452, 722]},
	2: {caixa: [514.61, 386, 316.58, 83], manchete: [75, 57, 1283, 577]},
	3: {caixa: [436.84, 365.47, 338.53, 94.07], manchete: [77, 69, 1172, 660]},
	4: {caixa: [869.81, 191, 288.05, 75], manchete: [73, 38, 1435, 568]},
};

// ---------------------------------------------------------------------------------------------------------------
// Páginas fictícias (só para testar a conta do match-cut; nenhuma imita veículo real)
const AZUL = '#1040FF';
const Foco: React.FC = () => <span style={{color: AZUL}}>FOCO</span>;
const Pagina: React.FC<{i: number}> = ({i}) => {
	const corpo: React.CSSProperties = {position: 'absolute', left: 180, width: 2840};
	if (i === 1)
		return (
			<AbsoluteFill style={{background: '#FFFFFF', color: '#111'}}>
				<div style={{...corpo, top: 90, font: '900 96px Arial', letterSpacing: '0.02em'}}>PÁGINA DE TESTE A</div>
				<div style={{...corpo, top: 110, textAlign: 'right', font: '400 56px Arial', color: '#777'}}>conteúdo fictício · só para teste</div>
				<div style={{...corpo, top: 260, height: 6, background: '#111'}} />
				<div style={{...corpo, top: 340, font: '700 60px Arial', color: '#666', letterSpacing: '0.08em'}}>TESTE · EXEMPLO</div>
				<div style={{...corpo, top: 450, font: '700 250px Georgia', lineHeight: 1.12}}>
					Título de exemplo: o <Foco /> entra no meio da frase
				</div>
				<div style={{...corpo, top: 1420, font: '400 60px Arial', color: '#666'}}>05/10/2026 · 08h00 · Redação Teste</div>
				<div style={{...corpo, top: 1600, font: '400 70px Georgia', color: '#999', lineHeight: 1.4}}>Texto corrido de enchimento, sem sentido, só para a página parecer uma página.</div>
			</AbsoluteFill>
		);
	if (i === 2)
		return (
			<AbsoluteFill style={{background: '#F3F3F3', color: '#1a1a1a'}}>
				<div style={{...corpo, top: 120, font: '700 80px "Segoe UI"', color: '#333'}}>Teste B ▸ Notícias de exemplo</div>
				<div style={{...corpo, top: 280, font: '400 54px "Segoe UI"', color: '#888'}}>Atualizado em 05/10/2026, 10:30</div>
				<div style={{...corpo, top: 470, font: '700 230px "Segoe UI"', lineHeight: 1.08, letterSpacing: '-0.01em'}}>
					TESTE: exemplo com a palavra <Foco /> em outra posição
				</div>
				<div style={{...corpo, top: 1650, font: '400 64px "Segoe UI"', color: '#999'}}>Por Autor Fictício · página de teste</div>
			</AbsoluteFill>
		);
	if (i === 3)
		return (
			<AbsoluteFill style={{background: '#FAF7F0', color: '#222'}}>
				<div style={{...corpo, top: 140, font: '300 84px "Segoe UI"', letterSpacing: '0.2em', color: '#555'}}>EXEMPLO · C</div>
				<div style={{...corpo, top: 380, font: '300 260px "Segoe UI"', lineHeight: 1.1}}>
					Mais um título fictício sobre <Foco /> e teste
				</div>
				<div style={{...corpo, top: 1350, font: '400 58px "Segoe UI"', color: '#888'}}>Página de teste · 05/10/2026</div>
			</AbsoluteFill>
		);
	return (
		<AbsoluteFill style={{background: '#FFFFFF', color: '#111'}}>
			<div style={{...corpo, top: 110, font: '600 62px Arial', color: '#4a5a6a', letterSpacing: '0.06em'}}>REVISTA DE TESTE · ARTIGO ORIGINAL (FICTÍCIO)</div>
			<div style={{...corpo, top: 330, font: '400 220px "Times New Roman"', lineHeight: 1.15}}>
				Efeito fictício do <Foco /> em um estudo de exemplo
			</div>
			<div style={{...corpo, top: 1000, font: 'italic 400 70px "Times New Roman"', color: '#444'}}>Autor A, Autor B e Autor C</div>
			<div style={{...corpo, top: 1130, font: '400 56px Arial', color: '#777'}}>Publicado em 05/10/2026 · DOI 10.0000/teste.0001</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------------------------------------------------------
// 9 "capturas" FICTÍCIAS no formato das reais (viewport 1920×1080 CSS px, renderizado com --scale=2 = 3840×2160):
// 5 títulos de artigo (1–5) e 4 manchetes (6–9), com fontes do sistema diferentes, a palavra em posições e caixas
// diferentes ("Focus" e "focus") e tudo marcado TESTE/FICTÍCIO. Nenhum veículo real é imitado.
type PgManchete = {
	tipo: 'artigo' | 'noticia';
	fundo: string;
	veiculo: string;
	rotulo: string;
	antes: string;
	palavra: string;
	depois: string;
	fonte: string;
	peso: number;
	tamanho: number;
	x: number;
	y: number;
	largura: number;
	data: string;
	autores?: string;
};
const PAGINAS_MANCHETE: PgManchete[] = [
	{tipo: 'artigo', fundo: '#FFFFFF', veiculo: 'REVISTA DE TESTE (FICTÍCIA)', rotulo: 'ARTIGO ORIGINAL · TESTE', antes: '[TESTE] ', palavra: 'Focus', depois: ' blocks and a fictitious outcome in a test sample', fonte: 'Georgia', peso: 400, tamanho: 50, x: 230, y: 250, largura: 1250, data: 'Publicado em 05/10/2026 · DOI 10.0000/teste.0001', autores: 'Autor A, Autor B e Autor C'},
	{tipo: 'artigo', fundo: '#FBFBF8', veiculo: 'ANAIS FICTÍCIOS DE TESTE', rotulo: 'PESQUISA · CONTEÚDO DE TESTE', antes: 'Effects of short ', palavra: 'focus', depois: ' sessions on an example variable: a test cohort [TESTE]', fonte: 'Times New Roman', peso: 400, tamanho: 58, x: 320, y: 300, largura: 1300, data: 'Recebido em 05/10/2026 · DOI 10.0000/teste.0002', autores: 'Autor D e Autor E'},
	{tipo: 'artigo', fundo: '#FFFFFF', veiculo: 'TEST JOURNAL OF EXAMPLES (FICTÍCIO)', rotulo: 'ORIGINAL ARTICLE · TESTE', antes: '', palavra: 'Focus', depois: ' duration and a sample measure: a fictitious test article', fonte: 'Cambria', peso: 700, tamanho: 50, x: 200, y: 380, largura: 1200, data: '05/10/2026 · DOI 10.0000/teste.0003', autores: 'Autor F, Autor G'},
	{tipo: 'artigo', fundo: '#F7F7F5', veiculo: 'BOLETIM DE TESTE (FICTÍCIO)', rotulo: 'ENSAIO · TESTE', antes: 'A fictitious trial of ', palavra: 'focus', depois: ' training in a test group [TESTE]', fonte: 'Palatino Linotype', peso: 400, tamanho: 56, x: 420, y: 230, largura: 1150, data: 'Publicado em 05/10/2026 · DOI 10.0000/teste.0004', autores: 'Autor H et al.'},
	{tipo: 'artigo', fundo: '#FFFFFF', veiculo: 'PORTAL DE ARTIGOS DE TESTE', rotulo: 'RESEARCH · TEST ONLY', antes: 'Test study (fictitious): ', palavra: 'Focus', depois: ' and an example outcome', fonte: 'Segoe UI', peso: 600, tamanho: 46, x: 260, y: 330, largura: 1100, data: 'First published 05/10/2026 · DOI 10.0000/teste.0005', autores: 'Autor I, Autor J'},
	{tipo: 'noticia', fundo: '#FFFFFF', veiculo: 'JORNAL DE TESTE', rotulo: 'CIÊNCIA · TESTE', antes: '[TESTE] Lack of ', palavra: 'focus', depois: ' linked to a fictitious outcome', fonte: 'Arial', peso: 700, tamanho: 64, x: 180, y: 260, largura: 1150, data: '5 de outubro de 2026 · Redação de Teste'},
	{tipo: 'noticia', fundo: '#F4F1EA', veiculo: 'GAZETA FICTÍCIA', rotulo: 'COMPORTAMENTO · TESTE', antes: 'Why ', palavra: 'Focus', depois: ' Matters: A Test Headline (Fictitious)', fonte: 'Franklin Gothic Medium', peso: 400, tamanho: 62, x: 260, y: 300, largura: 1250, data: '05/10/2026, 08:30 · Autor Fictício'},
	{tipo: 'noticia', fundo: '#FFFFFF', veiculo: 'TESTE NOTÍCIAS', rotulo: 'CIÊNCIA · TESTE', antes: 'Fictitious report: ', palavra: 'focus', depois: ' and a test example [TESTE]', fonte: 'Verdana', peso: 700, tamanho: 48, x: 340, y: 340, largura: 1150, data: 'Atualizado em 05/10/2026 · Equipe de Teste'},
	{tipo: 'noticia', fundo: '#FFFFFF', veiculo: 'DIÁRIO DE TESTE', rotulo: 'CIÊNCIA · TESTE', antes: 'How ', palavra: 'Focus', depois: ' Affects a Test Variable [TESTE]', fonte: 'Trebuchet MS', peso: 700, tamanho: 60, x: 220, y: 280, largura: 1300, data: '05/10/2026 · Por Repórter Fictício'},
];
const LinhasCinza: React.FC<{x: number; y: number; w: number; n: number; alt?: number}> = ({x, y, w, n, alt = 30}) => (
	<>
		{Array.from({length: n}, (_, k) => (
			<div key={k} style={{position: 'absolute', left: x, top: y + k * alt * 1.7, width: k === n - 1 ? w * 0.6 : w, height: alt * 0.55, borderRadius: 4, background: '#E2E2E2'}} />
		))}
	</>
);
const PaginasManchete: React.FC = () => {
	const frame = useCurrentFrame();
	const p = PAGINAS_MANCHETE[Math.min(frame, PAGINAS_MANCHETE.length - 1)];
	const refPalavra = useRef<HTMLSpanElement>(null);
	const refMan = useRef<HTMLDivElement>(null);
	// a mesma conta da função de captura do guia (Range na palavra × devicePixelRatio = px do PNG)
	useLayoutEffect(() => {
		if (!refPalavra.current || !refMan.current) return;
		const d = window.devicePixelRatio;
		const r = document.createRange();
		r.selectNodeContents(refPalavra.current);
		const b = r.getBoundingClientRect();
		const m = refMan.current.getBoundingClientRect();
		const px = (x: DOMRect) => [x.x * d, x.y * d, x.width * d, x.height * d].map((v) => +v.toFixed(2));
		console.log(`CAIXA_TESTE ${JSON.stringify({i: frame + 1, caixa: px(b), manchete: px(m), dpr: d})}`);
	}, [frame]);
	const artigo = p.tipo === 'artigo';
	return (
		<AbsoluteFill style={{background: p.fundo, color: '#151515', overflow: 'hidden'}}>
			{/* barra do "site" + faixa de TESTE impossível de não ver */}
			<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 84, background: artigo ? '#2B3A4A' : '#151515'}} />
			<div style={{position: 'absolute', left: 60, top: 22, font: `700 34px ${artigo ? 'Georgia' : 'Arial'}`, color: '#fff', letterSpacing: '0.04em'}}>{p.veiculo}</div>
			<div style={{position: 'absolute', right: 60, top: 18, padding: '8px 22px', borderRadius: 24, background: '#E0E0E0', font: '700 26px Arial', color: '#222'}}>PÁGINA DE TESTE · CONTEÚDO FICTÍCIO</div>
			<LinhasCinza x={60} y={120} w={1800} n={1} alt={22} />
			{/* bloco da manchete (veículo + rótulo + título + data) = caixaManchete */}
			<div ref={refMan} style={{position: 'absolute', left: p.x, top: p.y, width: p.largura}}>
				<div style={{font: `700 26px Arial`, letterSpacing: '0.12em', color: artigo ? '#2B5C8A' : '#B00000', marginBottom: 22}}>
					{p.veiculo} · {p.rotulo}
				</div>
				<div style={{fontFamily: p.fonte, fontWeight: p.peso, fontSize: p.tamanho, lineHeight: 1.22, color: '#111'}}>
					{p.antes}
					<span ref={refPalavra} style={{color: '#1040FF'}}>
						{p.palavra}
					</span>
					{p.depois}
				</div>
				{p.autores && <div style={{font: `italic 400 28px ${p.fonte}`, color: '#444', marginTop: 26}}>{p.autores}</div>}
				<div style={{font: '400 24px Arial', color: '#666', marginTop: p.autores ? 12 : 26}}>{p.data}</div>
			</div>
			{/* resto da "página" */}
			{artigo ? (
				<>
					<div style={{position: 'absolute', left: p.x, top: p.y + 520, font: '700 26px Arial', color: '#333'}}>Abstract (texto de teste)</div>
					<LinhasCinza x={p.x} y={p.y + 570} w={p.largura} n={6} />
				</>
			) : (
				<>
					<div style={{position: 'absolute', left: p.x, top: p.y + 470, width: 900, height: 420, background: '#CFCFCF'}} />
					<div style={{position: 'absolute', left: p.x + 950, top: p.y + 470, font: '400 22px Arial', color: '#888', width: 400}}>imagem de teste (cinza)</div>
					<LinhasCinza x={p.x + 950} y={p.y + 520} w={420} n={7} />
				</>
			)}
		</AbsoluteFill>
	);
};

// Caixas medidas no DOM (log "CAIXA_TESTE" da composição PaginasManchete renderizada com --scale=2), em px do PNG 3840×2160.
// Atenção: estas caixas foram medidas com a palavra de teste anterior (também de 5 letras). Antes de usar como referência,
// renderize a PaginasManchete de novo (comando no topo do arquivo) e copie as caixas do log "CAIXA_TESTE".
// A página 1 foi medida no 1º quadro, antes de o Remotion posicionar a composição (y veio −1.999.998 px deslocado;
// x e as diferenças estavam certos): y corrigido somando 1.999.998 (o topo do bloco da manchete é 250 CSS px = 500 px).
type Cx = [number, number, number, number];
export const CAIXAS_MANCHETE: Record<number, {caixa: Cx; manchete: Cx}> = {
	1: {caixa: [869.63, 608, 238.53, 114], manchete: [460, 500, 2500, 542]},
	2: {caixa: [1382, 710, 238.34, 128], manchete: [640, 600, 2600, 582.03]},
	3: {caixa: [400, 866, 248, 117], manchete: [400, 760, 2400, 544]},
	4: {caixa: [1771.39, 556, 254.69, 152], manchete: [840, 460, 2300, 584.25]},
	5: {caixa: [1433.41, 759, 227.31, 122], manchete: [520, 660, 2200, 533.47]},
	6: {caixa: [1377, 630, 327.31, 143], manchete: [360, 520, 2300, 523.31]},
	7: {caixa: [780.72, 709, 304.38, 141], manchete: [520, 600, 2500, 513.53]},
	8: {caixa: [1616.28, 784, 284.39, 117], manchete: [680, 680, 2300, 445.22]},
	9: {caixa: [720.14, 667, 304.58, 140], manchete: [440, 560, 2600, 357.39]},
};

// ---------------------------------------------------------------------------------------------------------------
const cam = (tipo: string, ini: number, fim: number, p: Record<string, unknown>): Camada => ({ini, fim, tipo, ...p});
const Peca: React.FC<{comp: React.FC<PecaProps>; c: Camada}> = ({comp: Comp, c}) => {
	const dur = Math.round((c.fim - c.ini) * FPS);
	return (
		<Sequence from={Math.round(c.ini * FPS)} durationInFrames={dur} name={c.tipo}>
			<Comp c={c} dur={dur} est={est} />
		</Sequence>
	);
};

// rosto (quadro parado do bruto, com o zoom lento de uma cena `fala`); desfoque/escurecer como o rosto desfocado
const Rosto: React.FC<{de: number; ate: number; desfoque?: number; escurecer?: number}> = ({de, ate, desfoque = 0, escurecer = 0}) => (
	<Sequence from={de} durationInFrames={ate - de}>
		<RostoQuadro dur={ate - de} desfoque={desfoque} escurecer={escurecer} />
	</Sequence>
);
const RostoQuadro: React.FC<{dur: number; desfoque: number; escurecer: number}> = ({dur, desfoque, escurecer}) => {
	const f = useCurrentFrame();
	const z = interpolate(f, [0, dur], [1.0, 1.04]) * (1 + (2.5 * desfoque) / 1080);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Img src={staticFile('rosto.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: '47% 28%', filter: desfoque ? `blur(${desfoque}px)` : undefined}} />
			{escurecer > 0 && <AbsoluteFill style={{background: '#000', opacity: escurecer}} />}
		</AbsoluteFill>
	);
};
const Tela: React.FC<{de: number; ate: number}> = ({de, ate}) => (
	<Sequence from={de} durationInFrames={ate - de}>
		<AbsoluteFill style={{background: FUNDO}} />
	</Sequence>
);

// modo caixa (tinta: false): a conta do guia, com as caixas da tinta medidas à mão nos PNGs (caminho C)
const itensMC = (debug: boolean) => ({
	debug,
	tinta: false,
	fonte: 'Página de teste fictícia, 05/10/2026',
	rampa: [8, 6, 5],
	altura: 96,
	itens: [1, 2, 3, 4].map((i) => ({arquivo: `pagina${i}.png`, caixa: CAIXAS[i].caixa, caixaManchete: CAIXAS[i].manchete})),
});

// Linha do tempo (s): A 0–3 · A2 3–5 · B 5–8 · B2 8–11 · C 11–14 · D 14–19 · E 19–23 · F 23–25
const CAMADAS: [React.FC<PecaProps>, Camada][] = [
	// A: beat 3, 4 fotos aceitas + 1 que quebra o mínimo de 12 q de rosto (deve sumir, com aviso no console)
	[
		FlashFoto,
		cam('flash-foto', 0, 3, {
			fotos: [
				{t: 0.3, arquivo: 'foto1.jpg', foco: [0.5, 0.62]},
				{t: 1.0, arquivo: 'foto2.jpg'},
				{t: 1.2, arquivo: 'foto3.jpg'},
				{t: 1.7, arquivo: 'foto3.jpg', foco: [0.5, 0.4]},
				{t: 2.4, arquivo: 'foto4.jpg'},
			],
		}),
	],
	// A2: o mesmo efeito pelo caminho CSS (3 cópias RGB), e a regra de 3 flashes/s com rostoMin 2
	[
		FlashFoto,
		cam('flash-foto', 3, 5, {
			efeito: 'css',
			rostoMin: 2,
			quadros: 6,
			fotos: [
				{t: 0.1, arquivo: 'foto2.jpg'},
				{t: 0.4, arquivo: 'foto4.jpg'},
				{t: 0.7, arquivo: 'foto1.jpg'},
				{t: 0.95, arquivo: 'foto3.jpg'},
			],
		}),
	],
	// B / B2: match-cut de prints (rampa 8, 6, 5 + hold)
	[MatchCut, cam('match-cut', 5, 8, itensMC(false))],
	[MatchCut, cam('match-cut', 8, 11, itensMC(true))],
	// C: match-cut-tipo, frases-tema com "foco" travado
	[
		MatchCutTipo,
		cam('match-cut-tipo', 11, 14, {
			palavra: 'foco',
			frases: ['o *foco* acabou?', '*foco* se treina?', 'pouco *foco*, mais tela', 'o *foco* manda no dia', '*foco* e rotina', 'celular: *foco* que some?', 'o *foco*'],
		}),
	],
	// D: beat 4 (tela escura): o ponto nasce na lâmpada do abajur e vai ao centro; o título nasce dele
	[PontoLuz, cam('ponto-luz', 14, 15.3, {origem: [0.211, 0.218], x: 0.5, y: 0.47, viajarEm: 0.3, viagem: 0.6, cantoneiras: true, saida: 'corte'})],
	[TituloQuente, cam('titulo-quente', 15.3, 19, {texto: 'o foco que rende', subtitulo: 'por que o celular atrapalha o seu dia', x: 0.5, y: 0.47, colapsoEm: 3.0})],
	// E: manchete falada sobre o rosto desfocado (palavras do bruto 28,41–32,50 s, tempos relativos)
	[
		MancheteFalada,
		cam('manchete-falada', 19, 23, {
			palavras: [
				{w: 'O', t: 0.1},
				{w: 'impacto', t: 0.2},
				{w: 'do', t: 0.94},
				{w: 'foco', t: 1.15},
				{w: 'na', t: 1.61},
				{w: 'produtividade', t: 1.78},
				{w: 'vai', t: 3.31},
				{w: 'muito', t: 3.45},
				{w: 'além', t: 3.65, fim: 3.95},
			],
		}),
	],
	// F: match-cut-tipo, palavra por tela no acento
	[MatchCutTipo, cam('match-cut-tipo', 23, 25, {modo: 'palavra', palavras: [{w: 'foco', t: 0}, {w: 'não', t: 0.4}, {w: 'é', t: 0.6}, {w: 'detalhe', t: 0.85}]})],
];

const Intro: React.FC = () => (
	<AbsoluteFill style={{background: '#000'}}>
		<Rosto de={0} ate={150} />
		<Tela de={150} ate={570} />
		<Rosto de={570} ate={690} desfoque={22} escurecer={0.45} />
		{CAMADAS.map(([comp, c], i) => (
			<Peca key={i} comp={comp} c={c} />
		))}
	</AbsoluteFill>
);

// O match-cut do piloto: 9 itens (5 artigos + 4 manchetes, intercalados; o último = hold), rampa e altura padrão,
// caixas do DOM, 3 s; depois o mesmo com debug. Itens sem caixa medida (CAIXAS_MANCHETE vazio) ficam de fora.
const ORDEM_MANCHETE = [1, 6, 2, 7, 3, 8, 4, 5, 9];
const itensManchete = (debug: boolean) => ({
	debug,
	fonte: 'Diário de Teste (fictício), 05/10/2026',
	itens: ORDEM_MANCHETE.filter((i) => CAIXAS_MANCHETE[i]).map((i) => ({arquivo: `manchete${i}.png`, caixa: CAIXAS_MANCHETE[i].caixa, caixaManchete: CAIXAS_MANCHETE[i].manchete})),
});
const MatchManchete: React.FC = () => (
	<AbsoluteFill style={{background: FUNDO}}>
		<Peca comp={MatchCut} c={cam('match-cut', 0, 3, itensManchete(false))} />
		<Peca comp={MatchCut} c={cam('match-cut', 3, 6, itensManchete(true))} />
	</AbsoluteFill>
);

// Saídas do ponto-luz que a Intro não mostra: cometa, colapso (depois de nascer na lâmpada) e apagar (com cantoneiras)
const Pontos: React.FC = () => (
	<AbsoluteFill style={{background: FUNDO}}>
		<Peca comp={PontoLuz} c={cam('ponto-luz', 0, 1.4, {x: 0.5, y: 0.47, saida: 'cometa', saidaEm: 0.9, rumo: -25})} />
		<Peca comp={PontoLuz} c={cam('ponto-luz', 1.4, 2.8, {origem: [0.2, 0.21], x: 0.5, y: 0.47, viajarEm: 0.2, viagem: 0.6})} />
		<Peca comp={PontoLuz} c={cam('ponto-luz', 2.8, 4, {x: 0.5, y: 0.47, cantoneiras: true, saida: 'apagar'})} />
	</AbsoluteFill>
);

const FONTES_FOLHA = {intro: Intro, manchete: MatchManchete, pontos: Pontos} as const;
// 9 quadros congelados de uma composição (3 × 3 células de 640×360); o número do quadro no canto
const Folha: React.FC<{q: number[]; de?: keyof typeof FONTES_FOLHA}> = ({q, de = 'intro'}) => {
	const Fonte = FONTES_FOLHA[de] ?? Intro;
	return (
		<AbsoluteFill style={{background: '#222'}}>
			{q.slice(0, 9).map((f, j) => (
				<div key={j} style={{position: 'absolute', left: (j % 3) * 640, top: Math.floor(j / 3) * 360, width: 1920, height: 1080, overflow: 'hidden', transform: 'scale(0.3333)', transformOrigin: '0 0'}}>
					<Freeze frame={f}>
						<Fonte />
					</Freeze>
					<div style={{position: 'absolute', left: 24, top: 18, color: '#fff', font: '700 64px sans-serif', textShadow: '0 0 10px #000'}}>q{f}</div>
				</div>
			))}
		</AbsoluteFill>
	);
};

const Raiz: React.FC = () => (
	<>
		<Composition id="Pagina" component={Pagina} width={3200} height={2000} fps={FPS} durationInFrames={1} defaultProps={{i: 1}} />
		<Composition id="PaginasManchete" component={PaginasManchete} width={1920} height={1080} fps={FPS} durationInFrames={PAGINAS_MANCHETE.length} />
		<Composition id="Intro" component={Intro} width={1920} height={1080} fps={FPS} durationInFrames={750} />
		<Composition id="MatchManchete" component={MatchManchete} width={1920} height={1080} fps={FPS} durationInFrames={180} />
		<Composition id="Pontos" component={Pontos} width={1920} height={1080} fps={FPS} durationInFrames={120} />
		<Composition id="Folha" component={Folha} width={1920} height={1080} fps={FPS} durationInFrames={750} defaultProps={{q: [9, 10, 12, 30, 37, 51, 72, 90, 95], de: 'intro' as const}} />
	</>
);

registerRoot(Raiz);
