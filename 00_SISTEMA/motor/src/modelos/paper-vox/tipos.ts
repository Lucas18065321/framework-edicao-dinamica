// Tipos do INSTAGRAM - PAPER VOX ANIMATION (modelo fixo paper-vox-instagram; nasceu no lab como "formato 4").
// Quadro contínuo: coordenadas em px do "mundo"; zoom 1 = 1 px do mundo por px da tela.
// Fica FORA do src/tipos.ts de propósito: o validar-edicao.mjs lê todo export de lá e não aceita Record<…>.
// Tempos em segundos da saída (= segundos do áudio da voz a partir de vozIni).

export type CurvaLab = 'suave' | 'entrada' | 'saida' | 'linear' | 'expo' | 'assento' | 'snap' | 'chicote';

// Chave de câmera: no instante t a câmera mira o ponto (x, y) do mundo com esse zoom e rotação (graus).
// A curva vale para o trecho que CHEGA nesta chave. arco = recuo de zoom no meio do trecho (0,2 = 20%), sem quebrar a
// velocidade: o chicote vira um arco suave (afasta, atravessa, chega), em vez de duas chaves com tranco no meio.
export type ChaveCamera = {t: number; x: number; y: number; zoom: number; rot?: number; curva?: CurvaLab; arco?: number};

// Plano de parallax: fundo anda 55% da câmera, meio 100%, frente 135%.
export type Plano = 'fundo' | 'meio' | 'frente';

// voa: entra de FORA da tela (de = lado de onde vem), curva expo-out bem rápida, com giro e blur de movimento.
export type Entrada = {tipo: 'pousa' | 'sobe' | 'escala' | 'slam' | 'surge' | 'desliza' | 'voa' | 'nenhuma'; dur?: number; de?: 'esq' | 'dir' | 'baixo' | 'cima' | 'ne' | 'no' | 'se' | 'so'; dist?: number}; // dist em px do mundo (padrão 1400)

type Base = {
	id: string;
	x: number; // centro, no mundo
	y: number;
	w: number;
	h?: number;
	rot?: number;
	plano?: Plano;
	ini: number; // nasce
	fim?: number; // some (sem fim: fica no quadro até o vídeo acabar)
	entra?: Entrada;
	passo?: 1 | 2 | 3; // 1 = 24 fps, 2 = 12 fps (papel "feito à mão"), 3 = 8 fps (traço que treme)
	boia?: number; // depois de entrar, deriva orgânica sutil ("boiando"): 0 = parado, 1 = padrão (±7 px, ±1,1°)
	boiaId?: string; // boia junto com outra peça (mesmo ruído, sem rampa): ex. a rachadura desenhada sobre a estátua
};

export type Elemento =
	| (Base & {tipo: 'papel'; cor?: string; semente?: number; vincos?: boolean; colunas?: boolean; rasgado?: boolean})
	| (Base & {tipo: 'foto'; src: string; borda?: number; halftone?: boolean; semente?: number; zoomInterno?: [number, number]})
	| (Base & {tipo: 'recorte'; src: string})
	| (Base & {tipo: 'texto'; palavras: {t: number; w: string}[]; escala: 'apoio' | 'chave' | 'capitulo'; tamanho?: number; cor?: string; alinhar?: 'left' | 'center' | 'right';
			recua?: {t: number; para: number; dur?: number}; // a palavra encolhe até virar legenda (escala extrema)
			torto?: boolean; // letras tortas que tremem a 8 fps
			degrade?: 'salmao-vermelho' | 'salmao-laranja' | 'vermelho-laranja'}) // com cor 'marca' (sem: escolhe pelo id)
	| (Base & {tipo: 'objeto'; nome: string; ev?: Record<string, number>; p?: Record<string, unknown>}) // objetos.tsx
	| (Base & {tipo: 'marca'; cor?: string; dur?: number})
	| (Base & {tipo: 'fita'; semente?: number})
	| (Base & {tipo: 'traco'; d: string; vb: [number, number]; cor?: string; espessura?: number; dur?: number})
	| (Base & {tipo: 'luz'; cor?: string; forca?: number});

// SFX: t = início do arquivo (s). evento = o instante visual que o som marca e alvo = qual ponto do som cai nele
// (ataque: o transiente; pico: o ponto mais alto, ex. whoosh, riser e swell — medido no arquivo). Quem acerta t a partir
// do evento é o scripts/refinar-sfx.mjs (etapa de refino milimétrico).
export type SfxLab = {t: number; som: string; vol?: number; evento?: {tipo: string; t: number}; alvo?: 'ataque' | 'pico'};

// Trilha (a composição NÃO toca): scripts/mixar-audio.mjs mistura depois do render, a 1/4 da voz, e para seco nos cortes.
export type Musica = {nome?: string; src: string; ini?: number; vol: number; volSemFala?: number; pausas?: [number, number][]; cortes?: [number, number][]; fim?: number; fade?: number; vozI?: number; smax?: number};

// Montagem rápida nos silêncios: a câmera mergulha num elemento (entrada), os planos tomam a tela cheia e a câmera
// emerge na estação seguinte (saída). Tempos em s; mov = movimento do plano.
export type PlanoMontagem = {src: string; dur: number; mov?: 'push' | 'pull' | 'pan-e' | 'pan-d' | 'tilt'; escurecer?: number};
export type MontagemLab = {ini: number; entrada: number; saida: number; planos: PlanoMontagem[]};

export type QuadroProps = {
	modelo?: string; // 'paper-vox-instagram' (o render-paper-vox.mjs confere)
	voz: string; // relativo ao projeto (public-dir)
	vozIni?: number; // s do áudio onde a composição começa (protótipo/trecho)
	duracao: number; // s
	camera: ChaveCamera[];
	elementos: Elemento[];
	sfx?: SfxLab[];
	sfxNaMixagem?: boolean; // true: a composição não toca os SFX; o mixar-audio.mjs põe cada um na amostra exata (sem a grade de 1/24 s)
	montagens?: MontagemLab[];
	musica?: Musica; // a escolhida
	musicas?: Record<string, Musica>; // opções para comparar (mixar-audio --trilha A|B)
	blur?: {ativo: boolean; limiar?: number; maxAmostras?: number; obturador?: number; espaco?: number}; // limiar e espaço entre amostras em px de tela
	grao?: number;
	viva?: number; // deriva da câmera viva, px na tela
	_desligar?: string[]; // só para perfil de render: sombra, halftone, borda, textura, luz, grao, acabamento, fundo
};
