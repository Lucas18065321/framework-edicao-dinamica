// Teste das peças de marca (marca.tsx): MarcaArroba sobre um piloto do CUT DINÂMICO e EncerramentoInsta no card final.
// Composições: "Teste" (vídeo real, 8 s) e as folhas de quadros "FolhaMarca" / "FolhaCard" (vários instantes congelados
// num só still, recortados em volta da peça). Render (de dentro do motor):
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-marca.tsx Teste <saida>.png --frame=<N>
//     --public-dir=../../03_PROJETOS/<projeto piloto do CUT> --gl=angle --scale=0.5
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Img, Sequence, registerRoot, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {ESTILOS} from '../modelos/estilos';
import type {Estilo} from '../modelos/estilos';
import type {Camada} from '../tipos';
import {EncerramentoInsta, MarcaArroba} from '../kit/pecas/marca';

const FPS = 24;
const W = 1080;
const H = 1920;
const est: Estilo = {...ESTILOS['cut-dinamico-instagram']};

const INI_MARCA = Math.round(0.1 * FPS); // a marca entra em 0,1 s
const DUR_A = Math.round(5.5 * FPS); // trecho com a pessoa
const DUR_B = Math.round(2.5 * FPS); // card final
// brilho no "link na bio" (aqui em 2,0 s) e troca para o canto esquerdo em 4,3 s (s relativos à camada)
const marca: Camada = {ini: 0.1, fim: 5.5, tipo: 'marca-arroba', pos: 'a', brilho: [2.0], trocas: [{t: 4.3, pos: 'b'}]};
const card: Camada = {ini: 5.5, fim: 8, tipo: 'encerramento-insta', texto: 'segue para mais'};

const Teste: React.FC = () => (
	<AbsoluteFill style={{background: '#0B0B0C'}}>
		<Sequence durationInFrames={DUR_A}>
			<Video src={staticFile('01_bruto/bruto.mp4')} trimBefore={Math.round(28 * FPS)} muted />
		</Sequence>
		<Sequence from={INI_MARCA} durationInFrames={DUR_A - INI_MARCA}>
			<MarcaArroba c={marca} dur={DUR_A - INI_MARCA} est={est} />
		</Sequence>
		<Sequence from={DUR_A} durationInFrames={DUR_B}>
			<EncerramentoInsta c={card} dur={DUR_B} est={est} />
		</Sequence>
	</AbsoluteFill>
);

// ---------- Folhas de quadros: cada célula = um recorte do quadro 1080×1920 num instante congelado ----------
const Folha: React.FC<{
	quadros: number[];
	recorte: [number, number, number, number]; // x, y, largura, altura no quadro 1080×1920
	escala: number;
	colunas: number;
	fundo: 'video' | 'escuro';
	peca: (f: number) => React.ReactNode;
}> = ({quadros, recorte, escala, colunas, fundo, peca}) => {
	const [x0, y0, rw, rh] = recorte;
	const cw = rw * escala;
	const ch = rh * escala;
	const gap = 14;
	const larguraTotal = colunas * cw + (colunas - 1) * gap;
	return (
		<AbsoluteFill style={{background: '#2a2a2c'}}>
			{quadros.map((f, i) => {
				const col = i % colunas;
				const lin = Math.floor(i / colunas);
				return (
					<div key={i} style={{position: 'absolute', left: (W - larguraTotal) / 2 + col * (cw + gap), top: 20 + lin * (ch + gap + 26), width: cw, height: ch + 26}}>
						<div style={{height: 26, color: '#fff', font: '600 18px sans-serif'}}>
							q{f} · {(f / FPS).toFixed(3)} s
						</div>
						<div style={{position: 'relative', width: cw, height: ch, overflow: 'hidden'}}>
							<div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${escala}) translate(${-x0}px, ${-y0}px)`}}>
								{fundo === 'video' ? <Img src={staticFile('02_analise/quadros/q_00029.jpg')} style={{position: 'absolute', width: W, height: H, objectFit: 'cover'}} /> : <AbsoluteFill style={{background: '#0B0B0C'}} />}
								<Freeze frame={f}>{peca(f)}</Freeze>
							</div>
						</div>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

const QUADROS_MARCA = [1, 2, 3, 4, 5, 6, 7, 8, 10, 20, 22, 24, 48, 50, 51, 52, 54, 70, 93, 127];
const QUADROS_CARD = [1, 2, 3, 4, 6, 8, 10, 11, 13, 15, 16, 18, 20, 22, 24, 30, 40, 52];
const marcaFolha: Camada = {...marca, trocas: []}; // sem troca, para ver a saída no canto A
const FolhaMarca: React.FC = () => <Folha quadros={QUADROS_MARCA} recorte={[560, 448, 520, 152]} escala={1} colunas={2} fundo="video" peca={() => <MarcaArroba c={marcaFolha} dur={DUR_A - INI_MARCA} est={est} />} />;
const FolhaCard: React.FC = () => <Folha quadros={QUADROS_CARD} recorte={[240, 740, 600, 440]} escala={0.55} colunas={3} fundo="escuro" peca={() => <EncerramentoInsta c={card} dur={DUR_B} est={est} />} />;

const Root: React.FC = () => (
	<>
		<Composition id="Teste" component={Teste} durationInFrames={DUR_A + DUR_B} fps={FPS} width={W} height={H} />
		<Composition id="FolhaMarca" component={FolhaMarca} durationInFrames={DUR_A + DUR_B} fps={FPS} width={W} height={H} />
		<Composition id="FolhaCard" component={FolhaCard} durationInFrames={DUR_A + DUR_B} fps={FPS} width={W} height={H} />
	</>
);

registerRoot(Root);
