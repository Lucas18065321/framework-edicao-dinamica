// Teste da peça checklist (src/kit/pecas/checklist.tsx) sobre um piloto do CUT DINÂMICO.
// Stills (de dentro do motor):
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-checklist.tsx Teste <png> --frame=N
//     --public-dir=../../03_PROJETOS/<projeto piloto do CUT> --gl=angle --scale=0.5
// "Folha" junta 9 momentos de um exemplo num quadro só (--props='{"ex":0,"q":[2,5,9,30,40,150,180,210,214]}').
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Sequence, registerRoot, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {Checklist} from '../kit/pecas/checklist';
import {ESTILOS} from '../modelos/estilos';
import type {Camada} from '../tipos';

const est = {...ESTILOS['cut-dinamico-instagram']};
const FPS = 24;

// exemplos do piloto: fundo (bruto ou B-roll do projeto), início no arquivo (s), duração (s) e parâmetros da camada
const EXEMPLOS: {src: string; ini: number; dur: number; c: Camada}[] = [
	// "desligue as notificações. Trabalhe em blocos curtos… faça uma pausa de verdade. Respeite seu ritmo"
	// (bruto 87,0–96,0; tempos dos itens = edicao.json do piloto)
	{
		src: '01_bruto/bruto.mp4',
		ini: 87.0,
		dur: 9.0,
		c: {
			ini: 0,
			fim: 0,
			tipo: 'checklist',
			titulo: 'Foco em dia',
			itens: [
				{t: 0.0, texto: 'Notificações desligadas'},
				{t: 0.15, texto: 'Blocos de 50 min'},
				{t: 1.25, texto: 'Pausa curta'},
				{t: 6.1, texto: 'Uma tarefa por vez'},
				{t: 7.2, texto: 'Respeitar o seu ritmo'},
			],
		},
	},
	// sobre um B-roll claro e quente: mais baixo, sem barra e com vidro mais escuro para o creme ler bem
	{
		src: '04_broll/meus/cha-livro-vela.mp4',
		ini: 1.0,
		dur: 3.5,
		c: {
			ini: 0,
			fim: 0,
			tipo: 'checklist',
			titulo: 'Antes de começar',
			y: 0.6,
			progresso: false,
			vidro: 0.7,
			itens: ['Água na mesa', 'Celular longe', 'Lista do dia'],
		},
	},
];

const quadros = (i: number) => Math.round(EXEMPLOS[i].dur * FPS);

const Exemplo: React.FC<{i: number}> = ({i}) => {
	const e = EXEMPLOS[i];
	return (
		<AbsoluteFill style={{background: '#0B0B0C'}}>
			<Video src={staticFile(e.src)} trimBefore={Math.round(e.ini * FPS)} muted objectFit="cover" style={{width: '100%', height: '100%'}} />
			<Checklist c={e.c} dur={quadros(i)} est={est} />
		</AbsoluteFill>
	);
};

const inicio = (i: number) => EXEMPLOS.slice(0, i).reduce((a, _, k) => a + quadros(k), 0);

const Teste: React.FC = () => (
	<AbsoluteFill style={{background: '#0B0B0C'}}>
		{EXEMPLOS.map((_, i) => (
			<Sequence key={i} from={inicio(i)} durationInFrames={quadros(i)} name={`exemplo ${i + 1}`}>
				<Exemplo i={i} />
			</Sequence>
		))}
	</AbsoluteFill>
);

// 9 momentos de um exemplo num quadro só (3 × 3 células reduzidas a 1/3; o quadro continua 1080 × 1920 para a peça medir igual)
const Folha: React.FC<{ex: number; q: number[]}> = ({ex, q}) => (
	<AbsoluteFill style={{background: '#222'}}>
		{q.slice(0, 9).map((f, j) => (
			<div key={j} style={{position: 'absolute', left: (j % 3) * 360, top: Math.floor(j / 3) * 640, width: 1080, height: 1920, overflow: 'hidden', transform: 'scale(0.3333)', transformOrigin: '0 0'}}>
				<Freeze frame={f}>
					<Exemplo i={ex} />
				</Freeze>
				<div style={{position: 'absolute', left: 30, top: 30, color: '#fff', font: '700 90px sans-serif', textShadow: '0 0 10px #000'}}>q{f}</div>
			</div>
		))}
	</AbsoluteFill>
);

const Raiz: React.FC = () => (
	<>
		<Composition id="Teste" component={Teste} width={1080} height={1920} fps={FPS} durationInFrames={EXEMPLOS.reduce((a, _, i) => a + quadros(i), 0)} />
		<Composition id="Folha" component={Folha} width={1080} height={1920} fps={FPS} durationInFrames={quadros(0)} defaultProps={{ex: 0, q: [2, 5, 9, 30, 40, 150, 180, 210, 214]}} />
	</>
);

registerRoot(Raiz);
