// Teste da peça selecao (src/kit/pecas/selecao.tsx) sobre um piloto do CUT DINÂMICO.
// Stills (de dentro do motor):
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-selecao.tsx Teste <png> --frame=N
//     --public-dir=../../03_PROJETOS/<projeto piloto do CUT> --gl=angle --scale=0.5
// "Folha" junta 9 momentos de um exemplo num quadro só (--props='{"ex":0,"q":[0,2,3,4,5,6,11,17,30]}').
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Sequence, registerRoot, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {Selecao} from '../kit/pecas/selecao';
import {ESTILOS} from '../modelos/estilos';
import type {Camada} from '../tipos';

const est = {...ESTILOS['cut-dinamico-instagram']};
const FPS = 24;
const DUR = 32; // quadros por exemplo (guia: 30–34 q)

// exemplos do piloto: tempo do bruto (s) e parâmetros da camada
const EXEMPLOS: {bruto: number; c: Camada}[] = [
	// "tem que tentar ser multitarefa" (bruto 22,0 s): acima da cabeça, sobre a parede escura
	{bruto: 21.95, c: {ini: 0, fim: 0, tipo: 'selecao', texto: 'MULTITAREFA', y: 0.175, rotulo: 'mito.txt'}},
	// "um novo app, hack" (bruto 54,9 s): ao lado da cabeça, inclinada, ponto nascendo embaixo à direita
	{bruto: 54.85, c: {ini: 0, fim: 0, tipo: 'selecao', texto: 'HACK', x: 0.3, y: 0.19, tamanho: 130, rotulo: 'app_novo.png', rot: -3, canto: 'id'}},
	// "modo avião" (bruto 2,0 s): sobre o moletom claro, com véu escuro no miolo
	{bruto: 2.0, c: {ini: 0, fim: 0, tipo: 'selecao', texto: 'modo avião', y: 0.5, tamanho: 120, veu: 0.6, rotulo: 'foco.exe'}},
];

const Exemplo: React.FC<{i: number}> = ({i}) => {
	const e = EXEMPLOS[i];
	return (
		<AbsoluteFill style={{background: '#0B0B0C'}}>
			<Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(e.bruto * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			<Selecao c={e.c} dur={DUR} est={est} />
		</AbsoluteFill>
	);
};

const Teste: React.FC = () => (
	<AbsoluteFill style={{background: '#0B0B0C'}}>
		{EXEMPLOS.map((_, i) => (
			<Sequence key={i} from={i * DUR} durationInFrames={DUR} name={`exemplo ${i + 1}`}>
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
		<Composition id="Teste" component={Teste} width={1080} height={1920} fps={FPS} durationInFrames={DUR * EXEMPLOS.length} />
		<Composition id="Folha" component={Folha} width={1080} height={1920} fps={FPS} durationInFrames={DUR} defaultProps={{ex: 0, q: [0, 2, 3, 4, 5, 6, 11, 17, 30]}} />
	</>
);

registerRoot(Raiz);
