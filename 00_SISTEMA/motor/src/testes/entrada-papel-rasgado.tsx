// Teste da peça papel-rasgado (src/kit/pecas/papel-rasgado.tsx) sobre um piloto do CUT DINÂMICO.
// Stills (de dentro do motor):
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-papel-rasgado.tsx Teste <png> --frame=N
//     --public-dir=../../03_PROJETOS/<projeto piloto do CUT> --gl=angle --scale=0.5
// "Folha" junta 9 momentos de um exemplo num quadro só (--props='{"ex":0,"q":[0,3,12,15,17,18,20,23,26]}').
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Sequence, registerRoot, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {PapelRasgado} from '../kit/pecas/papel-rasgado';
import {ESTILOS} from '../modelos/estilos';
import type {Camada} from '../tipos';

const est = {...ESTILOS['cut-dinamico-instagram']};
const FPS = 24;
const DUR = 40; // quadros por exemplo

// exemplos do piloto: tempo do bruto (s) no início da camada (o vídeo por baixo é a cena revelada) e parâmetros
const EXEMPLOS: {bruto: number; c: Camada}[] = [
	// "Vamos virar a página" (1:00) → revela o próximo assunto (1:01)
	{bruto: 60.3, c: {ini: 0, fim: 0, tipo: 'papel-rasgado', texto: 'Vamos virar a página'}},
	// entrando pela direita, em caixa mista e rasgo inclinado para o outro lado
	{bruto: 61.0, c: {ini: 0, fim: 0, tipo: 'papel-rasgado', texto: 'modo\nFOCO', caixaAlta: false, entrada: 'desliza', angulo: 7, rasgarEm: 0.95, seed: 3}},
	// sem texto: só a virada, revelando a cena seguinte (1:23,5)
	{bruto: 83.0, c: {ini: 0, fim: 0, tipo: 'papel-rasgado', angulo: -14, seed: 21}},
];

const Exemplo: React.FC<{i: number}> = ({i}) => {
	const e = EXEMPLOS[i];
	return (
		<AbsoluteFill style={{background: '#0B0B0C'}}>
			<Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(e.bruto * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			<PapelRasgado c={e.c} dur={DUR} est={est} />
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
		<Composition id="Folha" component={Folha} width={1080} height={1920} fps={FPS} durationInFrames={DUR} defaultProps={{ex: 0, q: [0, 3, 12, 15, 17, 18, 20, 23, 26]}} />
	</>
);

registerRoot(Raiz);
