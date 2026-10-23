// Teste das peças EscalaPh e Fonte (src/kit/pecas/escala-ph.tsx) sobre um piloto do CUT DINÂMICO.
// Stills (de dentro do motor):
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-escala-ph.tsx Teste <png> --frame=N
//     --public-dir=../../03_PROJETOS/<projeto piloto do CUT> --gl=angle --scale=0.5
// "Folha" junta 9 momentos de um exemplo num quadro só (--props='{"ex":0,"q":[2,5,9,14,30,80,118,160,177]}').
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Sequence, registerRoot, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {EscalaPh, Fonte} from '../kit/pecas/escala-ph';
import {ESTILOS} from '../modelos/estilos';
import type {Camada} from '../tipos';

const est = {...ESTILOS['cut-dinamico-instagram']};
const FPS = 24;
const DUR = Math.round(7.5 * FPS); // quadros por exemplo
const FONTE_INI = Math.round(0.6 * FPS); // o rodapé entra logo depois do card

// exemplos do piloto: tempo do bruto (s) e parâmetros das camadas
const EXEMPLOS: {bruto: number; escala: Camada; fonte: Camada}[] = [
	// "o pH ideal da água da piscina fica numa faixa estreita… abaixo, ácida… acima, básica" (bruto 61–74 s)
	{
		bruto: 61.0,
		escala: {ini: 0, fim: 7.5, tipo: 'escala-ph', momentos: [{t: 0, valor: 7.4}, {t: 3, valor: 7.3}, {t: 4.5, valor: 7.5}, {t: 6, valor: 7.4}]},
		fonte: {ini: 0.6, fim: 7.5, tipo: 'fonte', texto: 'Autor, Livro de Exemplo (dado ilustrativo)'},
	},
	// mesma fala com rótulos por momento e card mais alto
	{
		bruto: 66.0,
		escala: {
			ini: 0,
			fim: 7.5,
			tipo: 'escala-ph',
			y: 0.6,
			momentos: [
				{t: 0, valor: 7.4, rotulo: 'equilíbrio'},
				{t: 2.5, valor: 7.22, rotulo: 'ácida demais'},
				{t: 4.5, valor: 7.58, rotulo: 'básica demais'},
			],
		},
		fonte: {ini: 0.6, fim: 7.5, tipo: 'fonte', texto: 'Fonte: Autor et al., Revista de Exemplo, 2015 — dado ilustrativo para testar o rodapé em duas linhas'},
	},
];

const Exemplo: React.FC<{i: number}> = ({i}) => {
	const e = EXEMPLOS[i];
	return (
		<AbsoluteFill style={{background: '#0B0B0C'}}>
			<Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(e.bruto * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			<EscalaPh c={e.escala} dur={DUR} est={est} />
			<Sequence from={FONTE_INI} durationInFrames={DUR - FONTE_INI} layout="none">
				<Fonte c={e.fonte} dur={DUR - FONTE_INI} est={est} />
			</Sequence>
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
		<Composition id="Folha" component={Folha} width={1080} height={1920} fps={FPS} durationInFrames={DUR} defaultProps={{ex: 0, q: [2, 5, 9, 14, 30, 80, 118, 160, 177]}} />
	</>
);

registerRoot(Raiz);
