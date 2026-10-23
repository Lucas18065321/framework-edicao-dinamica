// Teste das peças "Apple" do MIX (card-vidro, apresentacao-redes, card-capitulo, dicionario, encerramento-youtube)
// sobre um piloto do MIX (1920×1080, 30 fps).
// Fundos: por padrão, um quadro congelado do bruto (testes-pub/mix/cards/fundos/b<s>.jpg, extraído com ffmpeg), com o
// mesmo enquadramento do motor (zoom no `foco`, desfoque e escurecer): leve para a máquina. Com --props='{"video":true}'
// e --public-dir=<projeto do piloto>, usa o bruto em movimento (01_bruto/bruto.mp4) — mas o Remotion copia a pasta
// pública inteira (bruto de 1,85 GB) a cada still: ~8 min. Use só para conferir o vidro sobre o <Video> de verdade.
// Stills (de dentro do motor, sempre pela fila; public-dir = pasta dos fundos):
//   node scripts/vez.mjs node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-cards.tsx Folha <png>
//     --props='{"ex":0,"q":[3,8,14,22,40,90,140,146,149]}' --public-dir=testes-pub/mix/cards --gl=angle --scale=0.5 --concurrency=1
//   Folha com exemplos misturados: --props='{"celulas":[{"ex":1,"q":100},{"ex":5,"q":90}]}' (até 9 células a 1/3);
//   com "lado":2 são 4 células a 1/2 (detalhe). Um exemplo só: Quadro <png> --props='{"ex":0}' --frame=60 ...
// Exemplos: 0 apresentação (B2) · 1 card escuro na parede · 2 card claro com número no rosto desfocado ·
// 3 capítulo no rosto desfocado · 4 capítulo na grade · 5 dicionário · 6 tela final (com guias) · 7 card sólido na
// grade · 8 apresentação em 2 cartões · 9 dicionário com definições no tempo da fala · 10 ícone por nome antigo
// ('alert-triangle') · 11 ícone inexistente (card sem ícone, número decimal) · 12 tela final com 1 rede (o ponto vira o
// ícone) no rosto desfocado · 13 tela final com 3 redes na grade.
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Img, Sequence, interpolate, registerRoot, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import {CardVidro, coresMix, sfxCardVidro, sonsCardVidro} from '../kit/pecas/card-vidro';
import {Apresentacao, sfxApresentacao, sonsApresentacao} from '../kit/pecas/apresentacao';
import {CardCapitulo, FundoTela, sfxCapitulo, sonsCapitulo} from '../kit/pecas/capitulo';
import {Dicionario, sfxDicionario, sonsDicionario} from '../kit/pecas/dicionario';
import {EncerramentoYoutube, sfxEncerramentoYoutube, sonsEncerramentoYoutube} from '../kit/pecas/encerramento-youtube';
import type {PecaProps, Som} from '../modelos/camadas';
import {ESTILOS} from '../modelos/estilos';
import {CURVAS, clamp} from '../kit/tempo';
import type {Camada} from '../tipos';

// acento carmim (decisão do usuário), mesmo que o estilo ainda não tenha sido atualizado
const est = {...ESTILOS['mix-edit-youtube'], acento: '#B90015', acentoProfundo: '#5E0E06'};
const FPS = 30;
const W = 1920;
const H = 1080;

type FundoEx = {tipo: 'bruto'; img: string; ini: number; zoom: [number, number]; foco: [number, number]; desfoque?: number; escurecer?: number} | {tipo: 'tela'; fundo: 'grade' | 'escuro'};
type Ex = {nome: string; fundo: FundoEx; dur: number; peca: React.FC<PecaProps>; c: Camada};
const cam = (tipo: string, p: Record<string, unknown>): Camada => ({ini: 0, fim: 0, tipo, ...p});

const EXEMPLOS: Ex[] = [
	// "Pessoal, tudo bem com vocês? Eu me chamo <seu nome> e falo de produtividade" (bruto 13,1–18,1), B2
	{nome: 'apresentacao', fundo: {tipo: 'bruto', img: 'fundos/b15.5.jpg', ini: 13.1, zoom: [1.12, 1.1], foco: [0.9, 0.28]}, dur: 5, peca: Apresentacao, c: cam('apresentacao-redes', {})},
	// "procure ajuda: um mentor, um colega mais experiente, um curso" (bruto 260,9–266,4), A
	{
		nome: 'card-escuro',
		fundo: {tipo: 'bruto', img: 'fundos/b263.0.jpg', ini: 260.9, zoom: [1, 1.03], foco: [0.47, 0.28]},
		dur: 5.5,
		peca: CardVidro,
		c: cam('card-vidro', {icone: 'users', rotulo: 'Bloqueio', titulo: 'Peça ajuda', itens: [{t: 1.42, texto: 'Mentor'}, {t: 2.92, texto: 'Colega'}, {t: 3.6, texto: 'Curso'}]}),
	},
	// "90% deles travam na mesma etapa" (bruto 879,4–884,4), rosto desfocado
	{
		nome: 'card-claro',
		fundo: {tipo: 'bruto', img: 'fundos/b881.0.jpg', ini: 879.4, zoom: [1, 1.02], foco: [0.47, 0.28], desfoque: 24, escurecer: 0.4},
		dur: 5,
		peca: CardVidro,
		c: cam('card-vidro', {material: 'claro', x: 0.5, y: 0.5, largura: 680, icone: 'clipboard-list', rotulo: 'Enquete no perfil', numero: 90, sufixo: '%', texto: 'dos meus seguidores dizem que *procrastinam* toda semana', nota: 'Não é estudo científico.', tamanhoNota: 40}),
	},
	{nome: 'capitulo-rosto', fundo: {tipo: 'bruto', img: 'fundos/b30.0.jpg', ini: 30, zoom: [1, 1.02], foco: [0.47, 0.28], desfoque: 24, escurecer: 0.45}, dur: 3, peca: CardCapitulo, c: cam('card-capitulo', {numero: 1, titulo: 'Procrastinação tem causa'})},
	{nome: 'capitulo-grade', fundo: {tipo: 'tela', fundo: 'grade'}, dur: 3, peca: CardCapitulo, c: cam('card-capitulo', {numero: 3, titulo: 'Não existe produtividade infinita (nem atalho mágico)'})},
	// "isso tem nome" (bruto 923,5–928,5), rosto desfocado
	{
		nome: 'dicionario',
		fundo: {tipo: 'bruto', img: 'fundos/b925.0.jpg', ini: 923.5, zoom: [1, 1.02], foco: [0.47, 0.28], desfoque: 24, escurecer: 0.45},
		dur: 5,
		peca: Dicionario,
		c: cam('dicionario', {
			palavra: 'pro·cras·ti·na·ção',
			classe: 'substantivo feminino',
			tonica: 4,
			definicoes: ['Ato de adiar uma tarefa importante mesmo sabendo que o atraso vai custar caro depois.', 'Costuma piorar quando a tarefa é grande e vaga: dividir em passos curtos ajuda.'],
		}),
	},
	{nome: 'encerramento', fundo: {tipo: 'tela', fundo: 'escuro'}, dur: 12, peca: EncerramentoYoutube, c: cam('encerramento-youtube', {guias: true, texto: 'obrigado por assistir'})},
	// variantes: card sólido na grade (ícone de linha, lista numerada em cascata); apresentação em 2 cartões;
	// dicionário com as definições no tempo da fala (o card cresce)
	{
		nome: 'card-solido',
		fundo: {tipo: 'tela', fundo: 'grade'},
		dur: 4,
		peca: CardVidro,
		c: cam('card-vidro', {material: 'solido', x: 0.5, y: 0.5, largura: 720, icone: 'timer', iconeEstilo: 'linha', rotulo: 'Rotina de foco', titulo: 'Antes de *começar*', itens: ['Celular em outro cômodo', 'Uma tarefa por vez', 'Mesa limpa e água por perto'], marcador: 'numero'}),
	},
	{nome: 'apresentacao-2', fundo: {tipo: 'bruto', img: 'fundos/b15.5.jpg', ini: 13.1, zoom: [1.12, 1.1], foco: [0.9, 0.28]}, dur: 5, peca: Apresentacao, c: cam('apresentacao-redes', {cartoes: 2})},
	{
		nome: 'dicionario-fala',
		fundo: {tipo: 'bruto', img: 'fundos/b925.0.jpg', ini: 923.5, zoom: [1, 1.02], foco: [0.47, 0.28], desfoque: 24, escurecer: 0.45},
		dur: 5,
		peca: Dicionario,
		c: cam('dicionario', {palavra: 'fo·co', classe: 'substantivo masculino', pronuncia: '/ˈfɔ.ku/', tonica: 0, definicoes: [{t: 0.6, texto: 'Atenção concentrada numa única tarefa por um tempo.'}, {t: 2.4, texto: 'Cai quando o celular está por perto.'}]}),
	},
	// robustez do ícone: nome antigo (apelido) do Lucide
	{
		nome: 'icone-apelido',
		fundo: {tipo: 'bruto', img: 'fundos/b263.0.jpg', ini: 260.9, zoom: [1, 1.03], foco: [0.47, 0.28]},
		dur: 4,
		peca: CardVidro,
		c: cam('card-vidro', {icone: 'alert-triangle', rotulo: 'Atenção', titulo: 'Notificação *quebra* o foco', itens: ['Mais distração', 'Menos atenção']}),
	},
	// ícone inexistente: o card fica só com o rótulo (sem bloco vazio); número decimal
	{
		nome: 'icone-invalido',
		fundo: {tipo: 'bruto', img: 'fundos/b263.0.jpg', ini: 260.9, zoom: [1, 1.03], foco: [0.47, 0.28]},
		dur: 4,
		peca: CardVidro,
		c: cam('card-vidro', {icone: 'icone-que-nao-existe', rotulo: 'Sem ícone', numero: 7.5, sufixo: 'h', texto: 'de trabalho focado por dia no grupo que *rendeu mais*', iconeEstilo: 'linha'}),
	},
	// tela final com 1 rede (o ponto vira o ícone) e com 3 redes (ícone no centro), sobre rosto desfocado
	{nome: 'encerramento-1', fundo: {tipo: 'bruto', img: 'fundos/b1486.0.jpg', ini: 1486, zoom: [1, 1.02], foco: [0.47, 0.28], desfoque: 24, escurecer: 0.45}, dur: 4, peca: EncerramentoYoutube, c: cam('encerramento-youtube', {redes: ['instagram']})},
	{nome: 'encerramento-3', fundo: {tipo: 'tela', fundo: 'grade'}, dur: 4, peca: EncerramentoYoutube, c: cam('encerramento-youtube', {redes: ['instagram', 'youtube', 'spotify'], texto: 'até o próximo vídeo'})},
];

// Linhas prontas para o registro (src/modelos/camadas.tsx, objeto CAMADAS); aqui só para o tsc conferir os tipos.
export const REGISTRO_CARDS: Record<string, {comp: React.FC<PecaProps>; sfx?: [string, number]; sons?: (c: Camada, fps: number) => Som[]}> = {
	'card-vidro': {comp: CardVidro, sfx: sfxCardVidro, sons: sonsCardVidro},
	'apresentacao-redes': {comp: Apresentacao, sfx: sfxApresentacao, sons: sonsApresentacao},
	'card-capitulo': {comp: CardCapitulo, sfx: sfxCapitulo, sons: sonsCapitulo},
	dicionario: {comp: Dicionario, sfx: sfxDicionario, sons: sonsDicionario},
	'encerramento-youtube': {comp: EncerramentoYoutube, sfx: sfxEncerramentoYoutube, sons: sonsEncerramentoYoutube},
};

const quadros = (i: number) => Math.round(EXEMPLOS[i].dur * FPS);

// mesma conta do enquadrar() do motor para bruto 16:9 em quadro 16:9 (geo = quadro inteiro)
const Fundo: React.FC<{f: FundoEx; durQ: number; video: boolean}> = ({f, durQ, video}) => {
	const frame = useCurrentFrame();
	const cores = coresMix(est);
	if (f.tipo === 'tela') return <FundoTela tipo={f.fundo} cores={cores} opacidade={1} />;
	const p = interpolate(frame, [0, durQ], [0, 1], clamp);
	const des = f.desfoque ?? 0;
	const escala = (f.zoom[0] + (f.zoom[1] - f.zoom[0]) * CURVAS.suave(p)) * (des ? 1 + (2.5 * des) / 1080 : 1);
	const estilo: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: W, height: H, filter: des ? `blur(${des}px)` : undefined};
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<div style={{position: 'absolute', inset: 0, transform: `scale(${escala})`, transformOrigin: `${f.foco[0] * W}px ${f.foco[1] * H}px`}}>
				{video ? <Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(f.ini * FPS)} muted objectFit="fill" style={estilo} /> : <Img src={staticFile(f.img)} style={{...estilo, objectFit: 'fill'}} />}
			</div>
			{(f.escurecer ?? 0) > 0 && <AbsoluteFill style={{background: '#000', opacity: f.escurecer}} />}
		</AbsoluteFill>
	);
};

const Exemplo: React.FC<{i: number; video?: boolean}> = ({i, video = false}) => {
	const e = EXEMPLOS[i];
	const P = e.peca;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Fundo f={e.fundo} durQ={quadros(i)} video={video} />
			<P c={{...e.c, fim: e.dur}} dur={quadros(i)} est={est} />
			{/* vinheta do estilo MIX (no motor ela fica por cima das camadas) */}
			<AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${est.vinheta}) 100%)`}} />
		</AbsoluteFill>
	);
};

const inicio = (i: number) => EXEMPLOS.slice(0, i).reduce((a, _, k) => a + quadros(k), 0);

const Cards: React.FC<{video?: boolean}> = ({video}) => (
	<AbsoluteFill style={{background: '#000'}}>
		{EXEMPLOS.map((e, i) => (
			<Sequence key={i} from={inicio(i)} durationInFrames={quadros(i)} name={`${i} ${e.nome}`}>
				<Exemplo i={i} video={video} />
			</Sequence>
		))}
	</AbsoluteFill>
);

const Quadro: React.FC<{ex: number; video?: boolean}> = ({ex, video}) => {
	const frame = useCurrentFrame();
	return (
		<Freeze frame={Math.min(frame, quadros(ex) - 1)}>
			<Exemplo i={ex} video={video} />
		</Freeze>
	);
};

// 9 momentos num quadro só (3 × 3 células a 1/3; cada célula mede como o quadro cheio). `celulas` mistura exemplos.
// `lado` = 2 → 2 × 2 células a 1/2 (detalhe: cada célula com metade da resolução, como a prévia).
type Celula = {ex: number; q: number};
const Folha: React.FC<{ex?: number; q?: number[]; celulas?: Celula[]; video?: boolean; lado?: number}> = ({ex = 0, q = [], celulas, video, lado = 3}) => {
	const {width} = useVideoConfig();
	const lista: Celula[] = celulas ?? q.map((f) => ({ex, q: f}));
	return (
		<AbsoluteFill style={{background: '#222'}}>
			{lista.slice(0, lado * lado).map((cel, j) => (
				<div key={j} style={{position: 'absolute', left: (j % lado) * (width / lado), top: Math.floor(j / lado) * (H / lado), width: W, height: H, overflow: 'hidden', transform: `scale(${1 / lado})`, transformOrigin: '0 0'}}>
					<Freeze frame={Math.min(cel.q, quadros(cel.ex) - 1)}>
						<Exemplo i={cel.ex} video={video} />
					</Freeze>
					<div style={{position: 'absolute', left: 24, top: 18, color: '#fff', font: '700 64px sans-serif', textShadow: '0 0 10px #000'}}>
						{EXEMPLOS[cel.ex].nome} q{cel.q}
					</div>
				</div>
			))}
		</AbsoluteFill>
	);
};

const Raiz: React.FC = () => (
	<>
		<Composition id="Cards" component={Cards} width={W} height={H} fps={FPS} durationInFrames={EXEMPLOS.reduce((a, _, i) => a + quadros(i), 0)} defaultProps={{video: false}} />
		<Composition id="Quadro" component={Quadro} width={W} height={H} fps={FPS} durationInFrames={Math.max(...EXEMPLOS.map((_, i) => quadros(i)))} defaultProps={{ex: 0, video: false}} />
		{/* duração = a do maior exemplo: o Remotion limita o quadro do <Freeze> à duração da composição */}
		<Composition id="Folha" component={Folha} width={W} height={H} fps={FPS} durationInFrames={Math.max(...EXEMPLOS.map((_, i) => quadros(i)))} defaultProps={{ex: 0, q: [3, 8, 14, 22, 40, 90, 140, 146, 149], video: false}} />
	</>
);

registerRoot(Raiz);
