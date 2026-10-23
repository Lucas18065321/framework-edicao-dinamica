// Teste da peça palavra-impacto (src/kit/pecas/palavra-impacto.tsx) sobre um piloto do CUT DINÂMICO.
// Stills (de dentro do motor):
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-palavra-impacto.tsx Teste <png> --frame=N
//     --public-dir=../../03_PROJETOS/<projeto piloto do CUT> --gl=angle --scale=0.5
// "Folha" junta 9 momentos de um exemplo num quadro só (--props='{"ex":0,"q":[0,1,2,4,6,9,20,35,38]}'; "exs" mistura exemplos).
// "TesteAtras": palavra atrás da pessoa com o recorte de um projeto de teste que tenha recorte da pessoa (--public-dir dele).
import React from 'react';
import {AbsoluteFill, Composition, Freeze, OffthreadVideo, Sequence, registerRoot, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {PalavraImpacto} from '../kit/pecas/palavra-impacto';
import {ESTILOS} from '../modelos/estilos';
import type {Camada} from '../tipos';

const est = {...ESTILOS['cut-dinamico-instagram']};
const FPS = 24;
const DUR = 40; // quadros por exemplo

// exemplos do piloto: tempo do bruto (s) e parâmetros da camada
const EXEMPLOS: {bruto: number; c: Camada}[] = [
	{bruto: 2.0, c: {ini: 0, fim: 0, tipo: 'palavra-impacto', texto: 'MODO\nAVIÃO', y: 0.21}},
	{bruto: 6.1, c: {ini: 0, fim: 0, tipo: 'palavra-impacto', texto: '2026', entrada: 'pop', saida: 'chicote', y: 0.6}},
	{bruto: 85.8, c: {ini: 0, fim: 0, tipo: 'palavra-impacto', texto: '50 min', entrada: 'virar', y: 0.62, skew: -8}},
	{bruto: 79.5, c: {ini: 0, fim: 0, tipo: 'palavra-impacto', texto: 'FRESCURA', saida: 'corte', condensar: 0.65, skew: -10, y: 0.2}},
];

const Exemplo: React.FC<{i: number}> = ({i}) => {
	const e = EXEMPLOS[i];
	return (
		<AbsoluteFill style={{background: '#0B0B0C'}}>
			<Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(e.bruto * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			<PalavraImpacto c={e.c} dur={DUR} est={est} />
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
const Folha: React.FC<{ex: number; q: number[]; exs?: number[]}> = ({ex, q, exs}) => (
	<AbsoluteFill style={{background: '#222'}}>
		{q.slice(0, 9).map((f, j) => (
			<div key={j} style={{position: 'absolute', left: (j % 3) * 360, top: Math.floor(j / 3) * 640, width: 1080, height: 1920, overflow: 'hidden', transform: 'scale(0.3333)', transformOrigin: '0 0'}}>
				<Freeze frame={f}>
					<Exemplo i={exs?.[j] ?? ex} />
				</Freeze>
				<div style={{position: 'absolute', left: 30, top: 30, color: '#fff', font: '700 90px sans-serif', textShadow: '0 0 10px #000'}}>{exs ? `${(exs[j] ?? ex) + 1}·` : ''}q{f}</div>
			</div>
		))}
	</AbsoluteFill>
);

// palavra gigante ATRÁS da pessoa: bruto + camada + recorte com alfa por cima (projeto de teste com recorte, r01 = bruto 0,3333–4,6667 s)
const BRUTO_ATRAS = 1.0;
const TesteAtras: React.FC = () => (
	<AbsoluteFill style={{background: '#0B0B0C'}}>
		<Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(BRUTO_ATRAS * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
		<PalavraImpacto c={{ini: 0, fim: 0, tipo: 'palavra-impacto', texto: 'MODO\nAVIÃO', y: 0.385, plano: 'atras'}} dur={44} est={est} />
		<AbsoluteFill>
			<OffthreadVideo src={staticFile('04_broll/recortes/r01.webm')} trimBefore={Math.round((BRUTO_ATRAS - 0.3333) * FPS)} transparent muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
		</AbsoluteFill>
	</AbsoluteFill>
);

const Raiz: React.FC = () => (
	<>
		<Composition id="Teste" component={Teste} width={1080} height={1920} fps={FPS} durationInFrames={DUR * EXEMPLOS.length} />
		<Composition id="Folha" component={Folha} width={1080} height={1920} fps={FPS} durationInFrames={DUR * EXEMPLOS.length} defaultProps={{ex: 0, q: [0, 1, 2, 4, 6, 9, 20, 35, 38]}} />
		<Composition id="TesteAtras" component={TesteAtras} width={1080} height={1920} fps={FPS} durationInFrames={44} />
	</>
);

registerRoot(Raiz);
