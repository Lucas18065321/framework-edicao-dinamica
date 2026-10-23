// Formato do arquivo 03_roteiro/edicao.json de cada projeto. Caminhos são relativos à pasta do projeto.
export type Layout = 'split' | 'card' | 'fala' | 'texto' | 'grafico';

export type Grafico = {
	titulo?: string; // ex.: "Taxa de conclusão"
	barras: {rotulo: string; valor: number}[];
	sufixo?: string; // ex.: "%"
	nota?: string; // rodapé pequeno (fonte do estudo etc.)
	fundo?: 'escuro' | 'claro';
	destaqueEm?: number; // s (relativo à cena) em que o colchete + selo aparecem ligando as barras
	selo?: string; // texto do selo (padrão "≈")
};

export type Orbita = {
	imagens: string[]; // PNGs com fundo transparente
	raio?: [number, number]; // elipse (rx, ry) em px; padrão [380, 560]
	tamanho?: number; // px; padrão 230
	voltas?: number; // fração de volta durante a cena; padrão 0.3
	intervalo?: number; // s entre o surgimento de cada objeto; padrão 0.32
};
export type Transicao = 'corte' | 'blur' | 'whip' | 'flash' | 'glitch';

export type Cena = {
	ini: number; // segundos no bruto
	fim: number;
	layout: Layout;
	broll?: string; // imagem ou vídeo (split/card)
	sequencia?: string[]; // stop-motion: imagens em ordem, trocadas a cada `quadroDur` s (substitui broll)
	quadroDur?: number; // segundos por quadro da sequência (padrão: divide a cena igualmente)
	grafico?: Grafico; // layout 'grafico'
	orbita?: Orbita; // layout 'texto': objetos girando em volta do texto
	brollIni?: number; // segundo inicial dentro do vídeo de B-roll
	movimento?: 'in' | 'out' | 'esq' | 'dir'; // Ken Burns do B-roll
	punch?: number; // zoom do rosto em 'fala' (1 = sem zoom)
	transicao?: Transicao; // como ESTA cena entra
	texto?: string; // layout 'texto': use *palavra* para o destaque
	fundo?: 'escuro' | 'claro';
	semLegenda?: boolean;
};

export type Sfx = {t: number; som: string; vol?: number};

export type Edicao = {
	modelo?: string; // id do modelo de edição (01_REFERENCIAS/modelos/<id>); padrão: tela-dividida-instagram
	duracao: number; // segundos (preenchido pelo render a partir de 02_analise/meta.json)
	fonte: 'A' | 'B' | 'C' | 'D';
	bruto: string;
	voz?: string; // áudio tratado (scripts/tratar-voz.mjs); se ausente, usa o áudio do bruto
	rostoY?: number; // 0..1, altura do rosto no bruto (enquadramento do split)
	aspectoBruto?: number; // largura/altura do bruto (preenchido pelo render a partir do meta.json)
	palavras: string; // 02_analise/palavras.json
	destaques: string[]; // palavras-chave em fonte de destaque
	cenas: Cena[];
	sfx?: Sfx[]; // efeitos manuais (os automáticos vêm das transições e destaques)
	sfxAuto?: boolean;
	musica?: {
		arquivo: string;
		vol?: number; // com fala
		volSemFala?: number;
		ini?: number; // segundo da trilha que coincide com o início do vídeo
		quedas?: {ini: number; fim: number; vol: number}[]; // respiros (ex.: virada), vol multiplica o nível
	};
	cor?: {contraste?: number; saturacao?: number; calor?: number};
	grao?: number; // 0..0.15
};

export type Palavra = {w: string; ini: number; fim: number};

// ---------- Motor de camadas: INSTAGRAM - EDIÇÃO CUT DINÂMICO e YOUTUBE - MIX EDIT ----------
// (o INSTAGRAM - TELA DIVIDIDA usa os tipos acima e a composição Edicao, que está congelada)
// Tempos de cenas e camadas em segundos da SAÍDA. Sem `montagem`, saída = bruto (1:1), como no Tela Dividida.

// desenho/risco/assento: tokens do MIX EDIT (guia "Movimento contínuo"); os 5 primeiros são os do CUT aprovado
export type Curva = 'suave' | 'entrada' | 'saida' | 'linear' | 'expo' | 'desenho' | 'risco' | 'assento';

// Trecho do bruto, ou pausa inserida (s) sem voz: tela escura, título, trilha sozinha.
export type Trecho = {ini: number; fim: number} | {pausa: number};

// Como a cena ENTRA. chicote, mergulho e esticao: só no MIX EDIT (opt-in, como qualquer transição).
//   chicote  = a anterior sai em 3 q correndo de lado com rastro (blur direcional) e a nova entra já correndo, em 4 q
//   mergulho = a anterior mergulha (zoom 1→6 em 11 q) no ponto `alvo` desta cena e apaga; a nova surge do escuro
//   esticao  = esticão vertical de pixels: a anterior estica (scaleY 1→3 + blur vertical) em 3 q e a nova desestica em 3 q
export type TransicaoCamadas = 'corte' | 'flash' | 'blur' | 'zoom' | 'lente' | 'silhueta' | 'chicote' | 'mergulho' | 'esticao';

// Chave de animação de uma cena: o valor de cada campo no instante t (s desde o INÍCIO DA CENA).
// Cada campo anima sozinho, de chave em chave (só entre as chaves que o definem). Antes da 1ª chave do campo ele fica no
// valor-base da cena (zoom[0], foco, desfoque, escurecer) até a chave anterior de qualquer campo; depois da última, fica parado.
// Chaves de zoom substituem o zoom [ini, fim] da cena (o valor-base é o zoom[0]).
// curva = como CHEGA a esta chave (padrão: `curva` da cena ou do estilo). Ex. (rosto desfoca e volta):
// [{t: 2, desfoque: 0}, {t: 2.35, desfoque: 24, escurecer: 0.45, curva: 'entrada'}, {t: 6, desfoque: 24, escurecer: 0.45}, {t: 6.3, desfoque: 0, escurecer: 0}]
export type ChaveCena = {t: number; zoom?: number; foco?: [number, number]; desfoque?: number; escurecer?: number; curva?: Curva};

// Golpe (3D flash) num pico: flash curto + punch de zoom + zoom-blur ou aberração cromática, ≤ 20 q.
export type Golpe = {
	t: number; // s da SAÍDA em que o golpe bate (fim de palavra / palavra-chave)
	dur?: number; // quadros a 30 fps; padrão 12 (punch sobe em 4 q e volta no resto)
	punch?: number; // escala no pico; padrão 1.10
	flash?: number; // opacidade do flash branco (2 q no pico + 2 q caindo); padrão 0.7; 0 = sem flash
	efeito?: 'zoomBlur' | 'aberracao' | 'nenhum'; // padrão 'zoomBlur' (60 px → 0 em 6 q); aberração: 12 px → 0 em 4 q
	som?: false; // tira o som automático (whoosh + impact_sub)
};

// Enquadramento da pessoa (MIX, tabela "Zoom na pessoa"): A aberto, B1 médio centrado, B2 médio com a parede livre, C close.
export type Enquadramento = 'A' | 'B1' | 'B2' | 'C';

export type CenaCamadas = {
	ini: number;
	fim: number;
	layout: 'fala' | 'broll' | 'tela'; // fala = pessoa em tela cheia; broll = imagem/vídeo em tela cheia; tela = fundo próprio, sem a pessoa
	zoom?: [number, number]; // fala: escala no início e no fim da cena (ex.: [1, 1.3] = zoom progressivo no rosto); tela: câmera virtual no fundo
	curva?: Curva; // easing do zoom
	foco?: [number, number]; // ponto do bruto (0..1) que fica fixo no zoom; padrão: `foco` da edição (tela: ponto do quadro, padrão o centro)
	desfoque?: number; // px de desfoque no vídeo (rosto desfocado com infos por cima)
	escurecer?: number; // 0..1
	chaves?: ChaveCena[]; // zoom, foco, desfoque e escurecer animados (fala e tela); pessoa e recorte continuam alinhados
	enquadramento?: Enquadramento; // fala, só nos formatos com predefinições (MIX): zoom e foco da tabela, sentido alternando; zoom/foco da cena têm prioridade
	golpes?: Golpe[]; // 3D flash nos picos (fala, broll e tela): efeitos WebGL no vídeo e na foto; na tela, blur CSS
	broll?: string;
	brollIni?: number;
	movimento?: 'in' | 'out' | 'esq' | 'dir';
	fundo?: string; // tela: 'grade' (padrão), 'escuro' ou um background CSS
	transicao?: TransicaoCamadas; // como ESTA cena entra (silhueta: precisa de recorte no começo da cena)
	alvo?: [number, number]; // mergulho: ponto do QUADRO (0..1) da cena anterior onde a câmera mergulha; padrão [0.5, 0.5]
	direcao?: 'esq' | 'dir'; // chicote: para onde a imagem corre; padrão 'esq'
	silhueta?: {texto?: string}; // símbolo no rosto durante os quadros vermelhos da silhueta (ex.: "???")
	pb?: boolean; // preto e branco seletivo (o texto continua colorido)
	reticula?: boolean; // retícula (halftone) leve por cima, combina com pb
	semLegenda?: boolean;
	legendaY?: number; // posição da legenda nesta cena (fração da altura; ex.: 0.15 = acima da cabeça quando um card ocupa o meio)
};

// Peça do kit por cima (ou atrás) da pessoa. Catálogo das peças: 02_BIBLIOTECA/kit/KIT.md.
export type Camada = {
	ini: number;
	fim: number;
	tipo: string;
	plano?: 'frente' | 'atras'; // 'atras' = entre o fundo e a pessoa; precisa de um recorte cobrindo o tempo
	sfx?: string | false; // som de entrada (padrão da peça; false = sem som)
	sons?: false; // desliga os sons dos eventos internos da peça (cada ✓, agulha, rasgo...)
	legenda?: false; // esconde a legenda cinética durante a camada (quando a peça já mostra a mesma fala)
	legendaAte?: number; // com legenda: false, esconde só até este segundo da saída
	// presa à câmera da cena ativa, como parte do "mundo" dela: na 'tela' com câmera, a câmera virtual; na 'fala', o
	// enquadramento da pessoa (texto na parede ou atrás da pessoa acompanha o zoom). Herda zoom, foco, chaves, punch e blur
	// da cena e sai/entra junto com ela nas transições (chicote, mergulho, esticão, lente; na entrada também blur e zoom).
	// Card que deve ficar parado e nítido sobre o rosto desfocado não leva camera.
	camera?: boolean;
	[param: string]: unknown;
};

// Pessoa sem fundo (webm com alfa, gerado por scripts/recortar.mjs), em tempos do BRUTO.
// arquivo: pasta com q0001.webp... (terminando em "/", padrão) ou .webm antigo; fps = fps da sequência (o do bruto)
export type Recorte = {arquivo: string; brutoIni: number; brutoFim: number; fps?: number};

// Trilha única (formato antigo, comportamento de sempre). fim = segundo da saída em que a trilha acaba ("some na última nota"); fade em s.
export type MusicaCamadas = NonNullable<Edicao['musica']> & {fim?: number; fade?: number};
// Uma trilha da lista (MIX: intro, corpo A, corpo B...). Tempos `de` e `fim` em s da SAÍDA; `ini` em s da trilha.
// Mesmo ducking da trilha única. Aqui `quedas` com vol > 1 SOBEM a trilha (ex.: trilha subindo num card sem fala). Ex.:
// [{arquivo: '05_audio/musica/intro.mp3', ini: 12.4, fim: 36.2, fade: 0.25, vol: 0.1, volSemFala: 0.6},
//  {arquivo: '05_audio/musica/corpo.mp3', de: 36.2, entrada: 1.5, vol: 0.07, volSemFala: 0.22, quedas: [{ini: 80, fim: 86, vol: 2.5}]}]
export type FaixaMusica = MusicaCamadas & {
	de?: number; // s da saída em que esta trilha entra (padrão 0)
	entrada?: number; // fade de entrada em s (padrão 0.8; 0 = entra seca, ex.: ataque da nota)
};

export type Capitulo = {t: number; titulo: string}; // s da saída; vai para a descrição do YouTube e para o render por partes

export type EdicaoCamadas = {
	modelo: 'cut-dinamico-instagram' | 'mix-edit-youtube';
	duracao: number; // duração do bruto (preenchida pelo render a partir do meta.json)
	bruto: string;
	voz?: string;
	aspectoBruto?: number;
	foco?: [number, number]; // onde está o rosto no bruto (0..1); padrão [0.5, 0.4]
	palavras: string;
	destaques?: string[];
	montagem?: Trecho[];
	cenas: CenaCamadas[];
	camadas?: Camada[];
	recortes?: Recorte[];
	legenda?: boolean; // padrão do modelo: sim no CUT DINÂMICO, não no MIX EDIT
	sfx?: (Sfx & {dur?: number})[];
	sfxAuto?: boolean;
	sfxTexto?: boolean; // clique suave nas palavras-chave da legenda cinética (padrão: sim)
	musica?: MusicaCamadas | FaixaMusica[]; // objeto = trilha única (como sempre); lista = várias trilhas, cada uma na sua Sequence
	cor?: Edicao['cor'];
	grao?: number;
	vinheta?: number; // 0..1
	capitulos?: Capitulo[]; // capítulos do YouTube (0:00 obrigatório, ≥ 3, cada um ≥ 10 s)
};
