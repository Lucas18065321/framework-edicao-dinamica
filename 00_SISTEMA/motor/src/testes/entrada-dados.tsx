// Teste da frente DADOS E PAPEL do MIX EDIT (16:9, 30 fps): painel-tecnico, grafico-barras, grafico-linha, contador,
// diff e ficha-papel, com exemplos neutros (números ilustrativos, marcados "exemplo" na fonte) sobre o rosto
// desfocado e sobre as telas grade/escura.
// O fundo "rosto" é um quadro do bruto (bruto 50 s, extraído com ffmpeg para testes-pub/mix/dados/rosto.jpg) com o mesmo
// tratamento da cena `fala` do motor: desfoque 22 px, ampliação 1 + 2,5·22/1080 e escurecer 0,4.
// Stills (de dentro do motor, SEMPRE pela fila scripts/vez.mjs: máquina com 7,7 GB e outros renders):
//   node scripts/vez.mjs node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-dados.tsx Folha <png>
//     --props="{\"ex\":0,\"q\":[3,9,30,110,210,240,300,345,430]}" --public-dir=testes-pub/mix/dados --gl=angle --scale=0.5 --concurrency=1
// "Folha" junta 9 momentos de um exemplo (3 × 3; cada célula = quadro inteiro a 1/3: com --scale=0.5 cada célula
// tem 320 px de largura, o tamanho do 16:9 num celular em pé). "Quadro" mostra 1 momento em tamanho cheio.
import React from 'react';
import {AbsoluteFill, Composition, Freeze, Img, Sequence, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import type {PecaProps} from '../modelos/camadas';
import {ESTILOS, type Estilo} from '../modelos/estilos';
import type {Camada} from '../tipos';
import {PainelTecnico} from '../kit/pecas/painel-tecnico';
import {GraficoBarras} from '../kit/pecas/grafico-barras';
import {GraficoLinha} from '../kit/pecas/grafico-linha';
import {Contador} from '../kit/pecas/contador';
import {Diff} from '../kit/pecas/diff';
import {FichaPapel} from '../kit/pecas/ficha-papel';

const FPS = 30;
// estilo do MIX como está no motor (acento carmim, decisão do usuário); papel = cor do guia (o estilo ainda não tem o campo)
const est = {...ESTILOS['mix-edit-youtube'], papel: '#EFEBE4'} as Estilo;

type Fundo = 'rosto' | 'grade' | 'escuro';
type Ex = {nome: string; fundo: Fundo; dur: number; Peca: React.FC<PecaProps>; c: Camada};
const cam = (tipo: string, p: Record<string, unknown>): Camada => ({ini: 0, fim: 0, tipo, ...p});

const EXEMPLOS: Ex[] = [
	// 0 · bruto 47,1–61,6: "Epidemia da hiperprodutividade, sociedade cansada buscando alto rendimento no trabalho,
	// na vida pessoal, na vida familiar e sempre negligenciando o descanso" (t = palavra no bruto − 47,1)
	{
		nome: 'painel mecanismo',
		fundo: 'rosto',
		dur: 14.5,
		Peca: PainelTecnico,
		c: cam('painel-tecnico', {
			titulo: 'Epidemia da hiperprodutividade',
			tituloT: 0.2,
			subtitulo: {t: 3.45, texto: 'Sociedade cansada buscando alto rendimento'},
			linhas: [
				{t: 6.75, texto: 'Trabalho'},
				{t: 7.6, texto: 'Vida pessoal'},
				{t: 9.0, texto: 'Família'},
			],
			destino: {t: 10.2, texto: 'Descanso negligenciado'},
		}),
	},
	// 1 · roteiro "NESTE VÍDEO" (beat 6 da intro) sobre a grade
	{
		nome: 'painel roteiro',
		fundo: 'grade',
		dur: 6,
		Peca: PainelTecnico,
		c: cam('painel-tecnico', {
			modo: 'roteiro',
			linhas: [
				{t: 0.8, texto: 'O que o celular faz com a sua atenção'},
				{t: 2.2, texto: 'Por que não existe produtividade infinita'},
				{t: 3.6, texto: 'Uma rotina de foco que funciona', valor: '15 dias'},
			],
		}),
	},
	// 2 · lux em escala log (ordens de grandeza ilustrativas: sol direto, dia claro, escritório, noite em casa)
	{
		nome: 'barras lux log',
		fundo: 'grade',
		dur: 6,
		Peca: GraficoBarras,
		c: cam('grafico-barras', {
			titulo: 'Quanta luz há em cada lugar, em lux',
			rotulo: 'Fig. 03 — luz',
			barras: [
				{rotulo: 'Sol direto', valor: 100000, prefixo: 'até ', destaque: true},
				{rotulo: 'Dia claro', valor: 25000, prefixo: '~'},
				{rotulo: 'Escritório', valor: 500, prefixo: '~'},
				{rotulo: 'Noite em casa', valor: 30, prefixo: '~'},
			],
			escala: 'log',
			passo: 400,
			fonte: 'Autor et al., Revista de Exemplo 2019 · dado ilustrativo',
		}),
	},
	// 3 · dia nublado × dentro de casa (valores ilustrativos), 2 linhas no rótulo, colchete + selo
	{
		nome: 'barras nublado',
		fundo: 'rosto',
		dur: 6,
		Peca: GraficoBarras,
		c: cam('grafico-barras', {
			titulo: 'Até nublado, lá fora tem *mais luz*',
			barras: [
				{rotulo: 'Dia nublado,\nao ar livre', valor: 800, destaque: true},
				{rotulo: 'Dentro\nde casa', valor: 179},
			],
			sufixo: ' lux',
			destaqueEm: 1.9,
			selo: '4,5×',
			fonte: 'Autor et al., Revista de Exemplo 2021 · dado ilustrativo',
		}),
	},
	// 4 · 2 séries esquemáticas com cruzamento (a 2ª troca de lado: o pôr do sol)
	{
		nome: 'linha luz do dia',
		fundo: 'grade',
		dur: 7,
		Peca: GraficoLinha,
		c: cam('grafico-linha', {
			titulo: 'À noite, só sobra a luz de casa',
			series: [
				{nome: 'Sol', pontos: [[6, 0.05], [8, 0.55], [10, 0.85], [12, 1], [14, 0.95], [16, 0.75], [18, 0.35], [20, 0.02], [22, 0], [24, 0]], dur: 2},
				{nome: 'Casa', pontos: [[6, 0.18], [9, 0.2], [12, 0.2], [15, 0.2], [18, 0.22], [21, 0.26], [24, 0.24]], cor: 'acento', dur: 2},
			],
			eixoX: {rotulo: 'hora do dia', marcas: ['6h', '12h', '18h', '24h']},
			eixoY: 'luz no ambiente',
			cruzamento: 'pôr do sol',
			cruzamentoN: 2,
		}),
	},
	// 5 · "economizei 10 mil e em 3 meses gastei 12" (gasto que volta, esquemático) sobre o rosto desfocado
	{
		nome: 'linha gasto',
		fundo: 'rosto',
		dur: 7,
		Peca: GraficoLinha,
		c: cam('grafico-linha', {
			titulo: 'Guardei 10 mil… e gastei 12 depois',
			series: [
				{
					nome: 'Saldo',
					pontos: [{x: 0, y: 100}, {x: 1, y: 96}, {x: 2, y: 92}, {x: 3, y: 90, rotulo: '−10 mil'}, {x: 4, y: 95}, {x: 5, y: 99}, {x: 6, y: 102, rotulo: '+12 mil'}],
					dur: 2.6,
				},
			],
			eixoX: {rotulo: 'tempo', marcas: ['início', '', '', 'fim do plano', '', '', '3 meses depois']},
			eixoY: 'gastos',
		}),
	},
	// 6 · número com fonte no rodapé sobre a tela escura (dado ilustrativo)
	{
		nome: 'contador min',
		fundo: 'escuro',
		dur: 4.5,
		Peca: Contador,
		c: cam('contador', {valor: 23, prefixo: '+', sufixo: ' min/dia', tamanho: 240, rotulo: 'de tela a mais por dia', fonte: 'Autor et al., Revista de Exemplo 2020 · dado ilustrativo', fundo: 'escuro'}),
	},
	// 7 · "90%" numa tela de acento (quebra de modo), rótulo de enquete (não é estudo)
	{
		nome: 'contador 90%',
		fundo: 'escuro',
		dur: 4,
		Peca: Contador,
		c: cam('contador', {valor: 90, sufixo: '%', tamanho: 340, rotulo: 'dos meus seguidores procrastinam toda semana · enquete no perfil', fundo: 'acento'}),
	},
	// 8 · diff sobre o rosto desfocado
	{
		nome: 'diff',
		fundo: 'rosto',
		dur: 4,
		Peca: Diff,
		c: cam('diff', {menos: 'Virar a noite e compensar no sábado', mais: 'Blocos curtos todos os dias', rotulo: 'Mito × evidência'}),
	},
	// 9 · "não tem como fazer um estudo duplo-cego com quem sabe que está sem celular": dá para randomizar,
	// não dá para cegar
	{
		nome: 'ficha papel',
		fundo: 'grade',
		dur: 6,
		Peca: FichaPapel,
		c: cam('ficha-papel', {
			titulo: 'Estudos de foco e celular',
			rotulo: 'Ficha 01',
			itens: [
				{t: 0.7, texto: 'Randomizado', marca: 'v'},
				{t: 1.5, texto: 'Duplo-cego', marca: 'x', riscar: true},
				{t: 2.3, texto: 'Medida objetiva', marca: 'v'},
			],
			carimbo: 'Limitação',
		}),
	},
	// 10 · dado em poucos pontos (segmentos retos, escala no eixo Y, fonte; números ilustrativos): grupo com método
	// −12% até a semana 40 e −4% na 80; grupo controle −1,5% e −0,5%
	{
		nome: 'linha pontos',
		fundo: 'grade',
		dur: 7,
		Peca: GraficoLinha,
		c: cam('grafico-linha', {
			titulo: 'Parou o método: 2/3 do ganho sumiram',
			series: [
				{nome: 'Com método', cor: 'acento', pontos: [{x: 0, y: 0}, {x: 40, y: -12, rotulo: '−12%'}, {x: 80, y: -4, rotulo: '−4%'}]},
				{nome: 'Controle', cor: 'creme', pontos: [[0, 0], [40, -1.5], [80, -0.5]]},
			],
			eixoX: {rotulo: 'semanas', marcas: [{x: 0, texto: '0'}, {x: 40, texto: '40 · parou'}, {x: 80, texto: '80'}]},
			eixoY: {rotulo: 'variação do tempo de tela (%)', marcas: [0, -5, -10, -15, -20]},
			interpolacao: 'reta',
			cruzamento: false,
			esquematico: false,
			fonte: 'Autor et al., Revista de Exemplo 2022 · dado ilustrativo',
		}),
	},
	// 11 · o mesmo dado do 6 numa tela de acento: rodapé de fonte com fio creme e texto a 94% (contraste no carmim)
	{
		nome: 'contador min acento',
		fundo: 'escuro',
		dur: 4.5,
		Peca: Contador,
		c: cam('contador', {valor: 23, prefixo: '+', sufixo: ' min/dia', tamanho: 240, rotulo: 'de tela a mais por dia', fonte: 'Autor et al., Revista de Exemplo 2020 · dado ilustrativo', fundo: 'acento'}),
	},
];

const Fundo: React.FC<{tipo: Fundo}> = ({tipo}) => {
	if (tipo === 'rosto') {
		const desfoque = 22;
		return (
			<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
				<Img src={staticFile('rosto.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${desfoque}px)`, transform: `scale(${1 + (2.5 * desfoque) / 1080})`, transformOrigin: '47% 28%'}} />
				<AbsoluteFill style={{background: '#000', opacity: 0.4}} />
			</AbsoluteFill>
		);
	}
	if (tipo === 'grade') {
		// grade nova do guia: 96 px, #222634, linhas passando pelo centro (960, 540) + luz de topo
		return (
			<AbsoluteFill style={{background: '#0D0E13'}}>
				<AbsoluteFill style={{backgroundImage: 'linear-gradient(#222634 1.5px, transparent 1.5px), linear-gradient(90deg, #222634 1.5px, transparent 1.5px)', backgroundSize: '96px 96px', backgroundPosition: '0px 60px'}} />
				<AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(255,255,255,0.05), transparent 70%)'}} />
			</AbsoluteFill>
		);
	}
	return <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #15161C 0%, #0D0E13 60%, #07080B 100%)'}} />;
};

const quadros = (i: number) => Math.round(EXEMPLOS[i].dur * FPS);

const Exemplo: React.FC<{i: number}> = ({i}) => {
	const e = EXEMPLOS[i];
	return (
		<AbsoluteFill>
			<Fundo tipo={e.fundo} />
			<e.Peca c={e.c} dur={quadros(i)} est={est} />
			{/* vinheta do MIX (0,25) */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)'}} />
		</AbsoluteFill>
	);
};

// o <Freeze> só mostra quadros dentro da duração da composição: Folha e Quadro duram o maior exemplo
const MAIOR = Math.max(...EXEMPLOS.map((_, i) => quadros(i)));

const inicio = (i: number) => EXEMPLOS.slice(0, i).reduce((a, _, k) => a + quadros(k), 0);

const Dados: React.FC = () => (
	<AbsoluteFill style={{background: '#000'}}>
		{EXEMPLOS.map((e, i) => (
			<Sequence key={i} from={inicio(i)} durationInFrames={quadros(i)} name={`${i} · ${e.nome}`}>
				<Exemplo i={i} />
			</Sequence>
		))}
	</AbsoluteFill>
);

const Folha: React.FC<{ex: number; q: number[]}> = ({ex, q}) => (
	<AbsoluteFill style={{background: '#222'}}>
		{q.slice(0, 9).map((f, j) => (
			<div key={j} style={{position: 'absolute', left: (j % 3) * 640, top: Math.floor(j / 3) * 360, width: 1920, height: 1080, overflow: 'hidden', transform: 'scale(0.3333)', transformOrigin: '0 0'}}>
				<Freeze frame={f}>
					<Exemplo i={ex} />
				</Freeze>
				<div style={{position: 'absolute', left: 24, top: 18, color: '#fff', font: '700 64px sans-serif', textShadow: '0 0 10px #000'}}>q{f}</div>
			</div>
		))}
	</AbsoluteFill>
);

const Quadro: React.FC<{ex: number; q: number}> = ({ex, q}) => (
	<Freeze frame={q}>
		<Exemplo i={ex} />
	</Freeze>
);

// Revisão num render só (1 bundle): cada quadro da composição "Revisao" é uma folha (9 momentos a 1/3) ou um quadro
// inteiro. Render (de dentro do motor, pela fila):
//   node scripts/vez.mjs node node_modules/@remotion/cli/remotion-cli.js render src/testes/entrada-dados.tsx Revisao
//     testes-pub/mix/dados/png/rev --sequence --frames=0-15 --image-format=png --public-dir=testes-pub/mix/dados --gl=angle
//     --scale=0.5 --concurrency=1
// (a composição dura o maior exemplo porque o <Freeze> não passa da duração dela; --frames = 1 quadro por entrada)
const REVISAO: ({ex: number; q: number[]} | {ex: number; quadro: number})[] = [
	{ex: 0, q: [4, 40, 120, 215, 250, 318, 340, 400, 431]},
	{ex: 1, q: [3, 24, 40, 70, 100, 130, 160, 170, 176]},
	{ex: 2, q: [3, 12, 24, 36, 48, 62, 80, 150, 176]},
	{ex: 3, q: [3, 12, 22, 34, 46, 60, 75, 150, 176]},
	{ex: 4, q: [4, 14, 30, 45, 60, 75, 95, 150, 206]},
	{ex: 5, q: [4, 20, 40, 58, 75, 95, 110, 150, 206]},
	{ex: 6, q: [2, 6, 14, 24, 34, 42, 55, 100, 132]},
	{ex: 7, q: [2, 5, 10, 20, 32, 40, 50, 80, 118]},
	{ex: 8, q: [3, 8, 14, 21, 24, 30, 34, 60, 118]},
	{ex: 9, q: [3, 14, 30, 45, 62, 80, 100, 104, 150]},
	{ex: 10, q: [4, 14, 24, 34, 46, 56, 70, 150, 206]},
	{ex: 2, quadro: 150},
	{ex: 4, quadro: 150},
	{ex: 11, quadro: 100},
	{ex: 9, quadro: 150},
	{ex: 10, quadro: 150},
];
const Revisao: React.FC = () => {
	const k = REVISAO[Math.min(useCurrentFrame(), REVISAO.length - 1)];
	return 'quadro' in k ? <Quadro ex={k.ex} q={k.quadro} /> : <Folha ex={k.ex} q={k.q} />;
};

const Raiz: React.FC = () => (
	<>
		<Composition id="Dados" component={Dados} width={1920} height={1080} fps={FPS} durationInFrames={EXEMPLOS.reduce((a, _, i) => a + quadros(i), 0)} />
		<Composition id="Folha" component={Folha} width={1920} height={1080} fps={FPS} durationInFrames={MAIOR} defaultProps={{ex: 0, q: [3, 9, 30, 110, 210, 240, 300, 330, 430]}} />
		<Composition id="Quadro" component={Quadro} width={1920} height={1080} fps={FPS} durationInFrames={MAIOR} defaultProps={{ex: 0, q: 330}} />
		<Composition id="Revisao" component={Revisao} width={1920} height={1080} fps={FPS} durationInFrames={Math.max(MAIOR, REVISAO.length)} />
	</>
);

registerRoot(Raiz);
