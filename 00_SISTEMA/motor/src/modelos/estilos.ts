// Padrões visuais de cada formato novo. CUT DINÂMICO: guia v1 (01_REFERENCIAS/modelos/cut-dinamico-instagram/guia-de-estilo.md).
// MIX EDIT: guia v1 (01_REFERENCIAS/modelos/mix-edit-youtube/guia-de-estilo.md) + decisões do usuário (acento carmim).
import type {Curva, EdicaoCamadas, Enquadramento, TransicaoCamadas} from '../tipos';

export type Grade = {
	passo: number; // px em 1080 (no 16:9, px do quadro)
	cor: string; // cor da linha
	espessura?: number; // px; padrão 1.5
	luz?: number; // luz de topo (elipse branca 60% W × 50% H, centro em y −10%), opacidade; padrão 0
};

export type Estilo = {
	legenda: boolean;
	legendaY: number; // centro da legenda (fração da altura)
	zoom: [number, number]; // zoom padrão das cenas 'fala' (a câmera nunca para); o sentido alterna entre cenas vizinhas
	curva: Curva;
	acento: string; // cor de destaque (1 só por formato)
	acentoProfundo: string; // painéis e fundos de tela gráfica
	creme: string; // cor do texto
	arroba: string; // @ do usuário (peças de marca). Troque @seu_perfil pelo seu @ nos 2 modelos abaixo (ou passe `arroba` na camada)
	// duração das transições em quadros de 30 fps (lente = [desfoque de saída, foco de entrada]).
	// flash (opcional) = [quadros no pico, quadros de decaimento] com opacidade flashPico; sem ele: 8 q a 100% (CUT)
	trans: {zoom: number; lente: [number, number]; flash?: [number, number]; flashPico?: number};
	fundoTela: string; // fundo padrão do layout 'tela'
	grao: number;
	vinheta: number;
	cor: {contraste: number; saturacao: number; calor: number};

	// ---- Opcionais (só o MIX usa por enquanto; sem eles o motor faz exatamente como antes) ----
	tinta?: string; // texto direto na parede do cenário (preto quente)
	gelo?: string; // 2ª cor: fim do gradiente dos títulos, objetos de "estado novo"
	cinza?: string; // rótulos e apoio
	fundoEscuro?: string; // fundo técnico das telas 'grade' e 'escuro'
	grade?: Grade; // grade nova da tela 'grade' (linhas passando pelo centro do quadro); sem ela, a grade antiga
	ganhoSfx?: {fator: number; teto: number; piso?: number}; // sons das peças: vol × fator, entre piso e teto (CUT: × 1,5 até 0,7)
	microfade?: number; // s de fade na voz no início e no fim de cada trecho da montagem
	enquadramentos?: Partial<Record<Enquadramento, {zoom: [number, number]; foco?: [number, number]}>>; // predefinições de `enquadramento` das cenas 'fala'
	volTrans?: Partial<Record<TransicaoCamadas, number>>; // volume próprio do som automático de cada transição
	// cenas e camadas ocupam exatamente os quadros [round(ini), round(fim)) da saída. Sem o campo (CUT): a duração é
	// arredondada à parte e às vezes sobra 1 quadro (título que termina junto com a tela aparecia a 50% no 1º quadro da cena
	// seguinte) ou falta 1 (quadro preto entre duas cenas cujos tempos não caem no grid de quadros)
	quadrosExatos?: boolean;
};

export const ESTILOS: Record<EdicaoCamadas['modelo'], Estilo> = {
	// ref496: carmim medido (#8A0010–#B90015), creme, preto; zoom contínuo alternando; texto cinético = legenda
	'cut-dinamico-instagram': {legenda: true, legendaY: 0.66, zoom: [1, 1.08], curva: 'suave', acento: '#B90015', acentoProfundo: '#5E0E06', creme: '#F5F1EA', arroba: '@seu_perfil', trans: {zoom: 4, lente: [2, 4]}, fundoTela: 'escuro', grao: 0.03, vinheta: 0.3, cor: {contraste: 1.04, saturacao: 1, calor: 0}},
	// ref384: técnico-editorial, grade escura; acento CARMIM (paleta padrão do framework; troque pela sua); sem legenda queimada (só CC).
	// Cor neutra: o bruto do piloto já vem corrigido (correção 9 da crítica). Texto direto na parede só em `tinta`.
	'mix-edit-youtube': {
		legenda: false,
		legendaY: 0.86,
		zoom: [1, 1.03],
		curva: 'suave',
		acento: '#B90015',
		acentoProfundo: '#5E0E06',
		creme: '#F5F1EA',
		arroba: '@seu_perfil',
		trans: {zoom: 7, lente: [2, 4], flash: [2, 6], flashPico: 0.7}, // flash: 2 q a 70% + 6 q caindo (WCAG: nunca 100%)
		fundoTela: 'grade',
		grao: 0.03,
		vinheta: 0.25,
		cor: {contraste: 1, saturacao: 1, calor: 0},
		tinta: '#1C0A06',
		gelo: '#AFC8DA',
		cinza: '#8A8F9C',
		fundoEscuro: '#0D0E13',
		grade: {passo: 96, cor: '#222634', espessura: 1.5, luz: 0.05},
		ganhoSfx: {fator: 1.25, teto: 1, piso: 0.55}, // peças exportam 0,45–0,65 → 0,56–0,81 no ar; nunca abaixo de 0,55 (correção 3)
		microfade: 0.04,
		// tabela "Zoom na pessoa" (bruto 1080): A não desloca; B2 abre a parede direita (rosto em x ≈ 0,42)
		enquadramentos: {
			A: {zoom: [1, 1.03]},
			B1: {zoom: [1.1, 1.12], foco: [0.47, 0.28]},
			B2: {zoom: [1.1, 1.12], foco: [0.9, 0.28]},
			C: {zoom: [1.18, 1.2], foco: [0.47, 0.28]},
		},
		// Sons automáticos das transições no MIX. Correção 3 (prevalece sobre a tabela do guia): piso de 0,55 para SFX durante
		// a fala, então a lente vai a 0,55 (tabela: 0,35). Mergulho e esticão: os whooshes 03 e 08 têm RMS ~13 dB abaixo do 16
		// (chicote); no 0,5/0,4 da tabela ficariam ~12 dB abaixo do pico da voz. Validar ouvindo.
		volTrans: {lente: 0.55, mergulho: 1, esticao: 1},
		quadrosExatos: true,
	},
};
