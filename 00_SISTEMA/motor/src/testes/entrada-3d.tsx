// Teste das peças 3D do MIX EDIT (src/kit/pecas/texto-3d.tsx, objeto-3d.tsx, piso-3d.tsx), 1920×1080 a 30 fps,
// sobre trechos curtos do bruto de um piloto do MIX e sobre telas escura/grade.
// Public dir: testes-pub/mix/3d/pub (dinheiro.mp4 = bruto 1433,5–1437,5 "Esse dinheiro compensa?";
// foco.mp4 = bruto 44–48 "o foco é primordial"; foco_q27.png + foco_q27_alfa.png = quadro 44,9 s e a pessoa recortada).
// Stills (de dentro do motor, SEMPRE pela fila; 3D exige --gl=angle):
//   node scripts/vez.mjs node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-3d.tsx Folha <png> --frame=0
//     --props="{\"ex\":0,\"q\":[1,3,5,8,12,20,38,41,43]}" --public-dir=testes-pub/mix/3d/pub --gl=angle --scale=0.5 --concurrency=1
//   Exemplo inteiro como vídeo: composição Exemplo com --props="{\"ex\":7}" (render de vídeo: acrescentar os flags de
//   scripts/lib/binarios.mjs, porque o Windows bloqueia o ffmpeg do pacote do Remotion).
// "Folha" = até 9 momentos de um exemplo num quadro só (células de 1/3, cada uma com a composição inteira congelada).
// Cuidado: cada célula com objeto-3d abre 1 contexto WebGL (1 por amostra com motion blur): folhas de objeto com ≤ 6 células.
// "Sons" = still de 1 quadro que escreve no console do navegador ("SONS ...") a lista final de sons de cada exemplo, com a
// mesma conta do motor (entrada + sons internos + ganhoSfx do estilo).
// Exemplos 13 e 14: continuidade do piso (q0 e q119 sem fade × tela grade); 16–19: bases e variantes para medir custo.
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Img, Sequence, registerRoot, staticFile, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import {Texto3d, sfxTexto3d, sonsTexto3d} from '../kit/pecas/texto-3d';
import {Objeto3d, sonsObjeto3d} from '../kit/pecas/objeto-3d';
import {Piso3d, sfxPiso3d, sonsPiso3d} from '../kit/pecas/piso-3d';
import {ESTILOS} from '../modelos/estilos';
import type {Estilo} from '../modelos/estilos';
import type {Camada} from '../tipos';
import type {PecaProps, Som} from '../modelos/camadas';

// decisões do usuário (05/10/2026): acento carmim no MIX (o estilo pode ainda não ter sido atualizado)
const est: Estilo = {...ESTILOS['mix-edit-youtube'], acento: '#B90015', acentoProfundo: '#5E0E06'};
const FPS = 30;
const PECAS: Record<string, React.FC<PecaProps>> = {'texto-3d': Texto3d, 'objeto-3d': Objeto3d, 'piso-3d': Piso3d};

type Fundo = {video: string; ini: number} | {img: string} | {tela: 'escuro' | 'grade'};
type Ex = {nome: string; dur: number; fundo: Fundo; desfoque?: number; escurecer?: number; recorte?: string; camadas: Camada[]};
const cam = (tipo: string, ini: number, fim: number, p: Record<string, unknown>, plano: 'frente' | 'atras' = 'frente'): Camada => ({ini, fim, tipo, plano, ...p});

export const EXEMPLOS: Ex[] = [
	// 0: texto 3D na parede, ao lado do rosto nítido (só preto quente na parede: paleta 'parede')
	{nome: 'dinheiro-parede', dur: 1.6, fundo: {video: 'dinheiro.mp4', ini: 0.6}, camadas: [cam('texto-3d', 0, 1.6, {texto: 'ESSE\nDINHEIRO\n*COMPENSA?*', paleta: 'parede', x: 0.8, y: 0.3, largura: 0.28})]},
	// 1: "FOCO" atrás da cabeça (recorte), parede lisa x 0,32–0,92
	{nome: 'foco-atras', dur: 1.4, fundo: {img: 'foco_q27.png'}, recorte: 'foco_q27_alfa.png', camadas: [cam('texto-3d', 0, 1.4, {texto: 'FOCO', paleta: 'parede', x: 0.62, y: 0.25, largura: 0.6, alturaMax: 300}, 'atras')]},
	// 2: tela escura, face creme com a palavra no acento
	{nome: 'foco-escuro', dur: 1.4, fundo: {tela: 'escuro'}, camadas: [cam('texto-3d', 0, 1.4, {texto: '*FOCO*', x: 0.5, y: 0.46, largura: 0.55})]},
	// 3: rosto desfocado e escurecido, entrada 'giro', saída Apple
	{nome: 'compensa-desfocado', dur: 1.6, fundo: {video: 'dinheiro.mp4', ini: 0.6}, desfoque: 22, escurecer: 0.45, camadas: [cam('texto-3d', 0, 1.6, {texto: 'ESSE DINHEIRO\n*COMPENSA?*', x: 0.5, y: 0.45, largura: 0.62, entrada: 'giro', saida: 'blur'})]},
	// 4: tela grade, face no acento, entrada 'surgir'
	{nome: 'foco-acento', dur: 1.4, fundo: {tela: 'grade'}, camadas: [cam('texto-3d', 0, 1.4, {texto: 'FOCO', paleta: 'acento', x: 0.5, y: 0.47, largura: 0.5, entrada: 'surgir', lado: -1})]},
	// 5: lua flutuando na tela escura
	{nome: 'lua', dur: 2.0, fundo: {tela: 'escuro'}, camadas: [cam('objeto-3d', 0, 2.0, {modelo: 'lua', x: 0.5, y: 0.47, tamanho: 420})]},
	// 6: despertador na área livre da parede, com o rosto nítido
	{nome: 'relogio', dur: 2.0, fundo: {video: 'dinheiro.mp4', ini: 0.6}, camadas: [cam('objeto-3d', 0, 2.0, {modelo: 'relogio', x: 0.8, y: 0.3, tamanho: 300, voltasMinuto: 2})]},
	// 7: cápsula passando rente à câmera (wipe de 18 q, com CameraMotionBlur de 6 amostras)
	{nome: 'capsula-passar', dur: 0.6, fundo: {video: 'dinheiro.mp4', ini: 0.6}, camadas: [cam('objeto-3d', 0, 0.6, {modelo: 'capsula', modo: 'passar', y: 0.45})]},
	// 8: sol orbitando atrás e na frente da cabeça (2 camadas: metade 'tras' sob o recorte, metade 'frente' por cima; centro e inclinação padrão)
	{
		nome: 'sol-orbita',
		dur: 2.4,
		fundo: {img: 'foco_q27.png'},
		recorte: 'foco_q27_alfa.png',
		camadas: [
			cam('objeto-3d', 0, 2.4, {modelo: 'sol', modo: 'orbitar', raio: 330, voltas: 0.85, tamanho: 190, metade: 'tras'}, 'atras'),
			cam('objeto-3d', 0, 2.4, {modelo: 'sol', modo: 'orbitar', raio: 330, voltas: 0.85, tamanho: 190, metade: 'frente'}),
		],
	},
	// 9: prato na tela grade, saída voando para a câmera
	{nome: 'prato', dur: 1.6, fundo: {tela: 'grade'}, camadas: [cam('objeto-3d', 0, 1.6, {modelo: 'prato', x: 0.5, y: 0.5, tamanho: 520, saida: 'voar'})]},
	// 10: piso 3D: a grade plana inclina, título e 2 cards levantam, a câmera desliza; sai achatando
	{
		nome: 'piso',
		dur: 4.0,
		fundo: {tela: 'grade'},
		camadas: [
			cam('piso-3d', 0, 4.0, {
				itens: [
					{texto: 'FOCO', t: 0.55},
					{tipo: 'card', rotulo: 'Notificações', texto: '*Distração*', nota: 'sobe', x: -560, z: 380, tamanho: 76, t: 0.95},
					{tipo: 'card', rotulo: 'Atenção', texto: 'Foco', nota: 'cai', x: 560, z: 380, tamanho: 76, t: 1.3},
				],
			}),
		],
	},
	// 11: piso com trilho no acento, itens de frente para a câmera e saída mergulhando
	{
		nome: 'piso-trilho',
		dur: 3.0,
		fundo: {tela: 'escuro'},
		camadas: [cam('piso-3d', 0, 3.0, {itens: [{texto: '50 *min*', caixaAlta: false, t: 0.6}, {tipo: 'card', rotulo: 'Por bloco', texto: 'Trabalho focado', x: 0, z: 900, t: 1.0}], trilho: true, deFrente: true, saida: 'avancar', avanco: [0, 320], giro: [0, -5]})],
	},
	// 12: os 5 modelos lado a lado (5 contextos WebGL num quadro): materiais e luz
	{
		nome: 'modelos',
		dur: 2.0,
		fundo: {tela: 'escuro'},
		camadas: (['lua', 'relogio', 'capsula', 'sol', 'prato'] as const).map((m, i) => cam('objeto-3d', 0, 2.0, {modelo: m, x: 0.14 + 0.18 * i, y: 0.5, tamanho: 290, sombra: 0.4})),
	},
	// 13: = 10 sem fade, para conferir que o 1º e o último quadro (q0 e q119) casam com a tela grade (ex. 14) pixel a pixel
	{
		nome: 'piso-sem-fade',
		dur: 4.0,
		fundo: {tela: 'grade'},
		camadas: [cam('piso-3d', 0, 4.0, {fade: 0, itens: [{texto: 'FOCO', t: 0.55}, {tipo: 'card', rotulo: 'Notificações', texto: '*Distração*', nota: 'sobe', x: -560, z: 380, t: 0.95}, {tipo: 'card', rotulo: 'Atenção', texto: 'Foco', nota: 'cai', x: 560, z: 380, t: 1.3}]})],
	},
	// 14: só a tela grade (referência das comparações)
	{nome: 'tela-grade', dur: 1.0, fundo: {tela: 'grade'}, camadas: []},
	// 15: "ESSE DINHEIRO COMPENSA?" na frente da pessoa, centrado sobre o rosto desfocado, entrada pela esquerda e ponto de fuga no quadro
	{nome: 'compensa-quadro', dur: 1.4, fundo: {video: 'dinheiro.mp4', ini: 0.6}, desfoque: 24, escurecer: 0.45, camadas: [cam('texto-3d', 0, 1.4, {texto: 'ESSE DINHEIRO\n*COMPENSA?*', x: 0.5, y: 0.42, largura: 0.64, lado: -1, pontoFuga: 'quadro'})]},
	// 16: só o rosto (base de custo do vídeo, sem peça)
	{nome: 'base-video', dur: 1.6, fundo: {video: 'dinheiro.mp4', ini: 0.6}, camadas: []},
	// 17–19: variantes do 10 só para isolar o custo de render (sem reflexo; sem itens; câmera parada no repouso)
	{nome: 'piso-sem-reflexo', dur: 4.0, fundo: {tela: 'grade'}, camadas: [cam('piso-3d', 0, 4.0, {reflexo: false, itens: [{texto: 'FOCO', t: 0.55}, {tipo: 'card', rotulo: 'Notificações', texto: '*Distração*', nota: 'sobe', x: -560, z: 380, t: 0.95}, {tipo: 'card', rotulo: 'Atenção', texto: 'Foco', nota: 'cai', x: 560, z: 380, t: 1.3}]})]},
	{nome: 'piso-sem-itens', dur: 4.0, fundo: {tela: 'grade'}, camadas: [cam('piso-3d', 0, 4.0, {itens: []})]},
	{nome: 'piso-camera-parada', dur: 4.0, fundo: {tela: 'grade'}, camadas: [cam('piso-3d', 0, 4.0, {avanco: [0, 0], giro: [0, 0], itens: [{texto: 'FOCO', t: 0.55}, {tipo: 'card', rotulo: 'Notificações', texto: '*Distração*', nota: 'sobe', x: -560, z: 380, t: 0.95}, {tipo: 'card', rotulo: 'Atenção', texto: 'Foco', nota: 'cai', x: 560, z: 380, t: 1.3}]})]},
];

const quadros = (ex: Ex) => Math.round(ex.dur * FPS);

// cópia fiel da Tela do motor (src/modelos/MotorCamadas.tsx, estilo MIX), para os testes de continuidade do piso-3d
const Tela: React.FC<{tipo: 'escuro' | 'grade'}> = ({tipo}) => {
	const {width: W, height: H} = useVideoConfig();
	if (tipo === 'escuro') return <AbsoluteFill style={{background: `radial-gradient(ellipse at center, #171922 0%, ${est.fundoEscuro} 70%, #08090C 100%)`}} />;
	const u = Math.min(W, H) / 1080;
	const g = est.grade!;
	const passo = g.passo * u;
	const esp = (g.espessura ?? 1.5) * u;
	const linha = (dir: string) => `linear-gradient(${dir}, ${g.cor} ${esp}px, transparent ${esp}px)`;
	return (
		<AbsoluteFill style={{background: est.fundoEscuro ?? '#0D0E13'}}>
			<AbsoluteFill style={{backgroundImage: `${linha('180deg')}, ${linha('90deg')}`, backgroundSize: `${passo}px ${passo}px`, backgroundPosition: `${((W / 2) % passo) - esp / 2}px ${((H / 2) % passo) - esp / 2}px`}} />
			{(g.luz ?? 0) > 0 && <AbsoluteFill style={{background: `radial-gradient(60% 50% at 50% -10%, rgba(255,255,255,${g.luz}) 0%, transparent 100%)`}} />}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, #00000080 100%)'}} />
		</AbsoluteFill>
	);
};

const FundoEx: React.FC<{ex: Ex}> = ({ex}) => {
	const f = ex.fundo;
	const filtro = ex.desfoque ? `blur(${ex.desfoque}px)` : undefined;
	const escala = ex.desfoque ? 1 + (2.5 * ex.desfoque) / 1080 : 1;
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			{'video' in f ? (
				<Video src={staticFile(f.video)} trimBefore={Math.round(f.ini * FPS)} muted objectFit="cover" style={{width: '100%', height: '100%', filter: filtro, transform: `scale(${escala})`}} />
			) : 'img' in f ? (
				<Img src={staticFile(f.img)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: filtro, transform: `scale(${escala})`}} />
			) : (
				<Tela tipo={f.tela} />
			)}
			{(ex.escurecer ?? 0) > 0 && <AbsoluteFill style={{background: '#000', opacity: ex.escurecer}} />}
		</AbsoluteFill>
	);
};

const Camadas: React.FC<{ex: Ex; plano: 'frente' | 'atras'}> = ({ex, plano}) => (
	<>
		{ex.camadas
			.filter((c) => (c.plano ?? 'frente') === plano)
			.map((c, i) => {
				const Comp = PECAS[c.tipo];
				const dur = Math.max(1, Math.round((c.fim - c.ini) * FPS));
				return (
					<Sequence key={i} from={Math.round(c.ini * FPS)} durationInFrames={dur} name={`${c.tipo} ${plano}`}>
						<Comp c={c} dur={dur} est={est} />
					</Sequence>
				);
			})}
	</>
);

const Exemplo: React.FC<{ex: number}> = ({ex}) => {
	const e = EXEMPLOS[ex];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FundoEx ex={e} />
			<Camadas ex={e} plano="atras" />
			{e.recorte && <Img src={staticFile(e.recorte)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />}
			<Camadas ex={e} plano="frente" />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)'}} />
		</AbsoluteFill>
	);
};

// até 9 momentos (quadros a 30 fps) de um exemplo num quadro só
const Folha: React.FC<{ex: number; q: number[]}> = ({ex, q}) => (
	<AbsoluteFill style={{background: '#222'}}>
		{q.slice(0, 9).map((f, j) => (
			<div key={j} style={{position: 'absolute', left: (j % 3) * 640, top: Math.floor(j / 3) * 360, width: 1920, height: 1080, overflow: 'hidden', transform: 'scale(0.3333)', transformOrigin: '0 0'}}>
				<Freeze frame={f}>
					<Exemplo ex={ex} />
				</Freeze>
				<div style={{position: 'absolute', left: 30, top: 24, color: '#fff', font: '700 64px sans-serif', textShadow: '0 0 10px #000'}}>q{f}</div>
			</div>
		))}
	</AbsoluteFill>
);

// Sons de cada exemplo com a MESMA conta do motor (MotorCamadas: entrada da peça + sons internos, ganhoSfx do estilo).
// Render: still da composição Sons; a lista sai no console do navegador (linhas 'SONS ...').
const REGISTRO: Record<string, {sfx?: [string, number]; sons?: (c: Camada, fps: number) => Som[]}> = {'texto-3d': {sfx: sfxTexto3d, sons: sonsTexto3d}, 'objeto-3d': {sons: sonsObjeto3d}, 'piso-3d': {sfx: sfxPiso3d, sons: sonsPiso3d}};
const listaSons = (c: Camada) => {
	const gs = est.ganhoSfx;
	const ganho = (v: number) => (gs ? Math.min(gs.teto, Math.max(gs.piso ?? 0, v * gs.fator)) : v);
	const peca = REGISTRO[c.tipo];
	const out: Som[] = [];
	if (c.sfx !== false) {
		if (typeof c.sfx === 'string') out.push({t: c.ini, som: c.sfx, vol: gs ? ganho(0.55) : 0.55});
		else if (peca?.sfx) out.push({t: c.ini, som: peca.sfx[0], vol: gs ? ganho(peca.sfx[1]) : Math.min(0.7, peca.sfx[1] * 1.5)});
	}
	if (c.sons !== false && peca?.sons) peca.sons(c, FPS).forEach((x) => x.t >= 0 && x.t < c.fim - c.ini && out.push({t: c.ini + x.t, som: x.som, vol: ganho(x.vol)}));
	return out.map((x) => ({t: Math.round(x.t * 1000) / 1000, q: Math.round(x.t * FPS), som: x.som.replace('motionix/', ''), vol: Math.round(x.vol * 100) / 100}));
};
const Sons: React.FC = () => {
	React.useEffect(() => {
		EXEMPLOS.forEach((e, i) => e.camadas.forEach((c) => console.log(`SONS ex${i} ${e.nome} ${c.tipo}${c.plano === 'atras' ? ' (atras)' : ''} dur ${(c.fim - c.ini).toFixed(2)} s: ${JSON.stringify(listaSons(c))}`)));
	}, []);
	return <AbsoluteFill style={{background: '#000'}} />;
};

const Raiz: React.FC = () => (
	<>
		<Composition id="Exemplo" component={Exemplo} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ex: 0}} calculateMetadata={({props}) => ({durationInFrames: quadros(EXEMPLOS[props.ex])})} />
		<Composition id="Sons" component={Sons} width={320} height={180} fps={FPS} durationInFrames={1} />
		<Composition id="Folha" component={Folha} width={1920} height={1080} fps={FPS} durationInFrames={150} defaultProps={{ex: 0, q: [1, 3, 5, 8, 12, 20, 38, 41, 43]}} />
	</>
);

registerRoot(Raiz);
