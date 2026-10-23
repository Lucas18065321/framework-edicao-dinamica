import type {Palavra} from './tipos';

export const normalizar = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^\p{L}\p{N}]/gu, '');

export type Bloco = {ini: number; fim: number; palavras: (Palavra & {destaque: boolean})[]};

// Agrupa palavras em blocos curtos (até 3 palavras / 18 caracteres), quebrando em pontuação,
// pausas e logo após uma palavra-chave, para que cada destaque feche o seu bloco.
export function montarBlocos(palavras: Palavra[], destaques: string[]): Bloco[] {
	const chaves = new Set(destaques.map(normalizar));
	const blocos: Bloco[] = [];
	let atual: Bloco['palavras'] = [];
	const fechar = () => {
		if (atual.length) blocos.push({ini: atual[0].ini, fim: atual.at(-1)!.fim, palavras: atual});
		atual = [];
	};
	palavras.forEach((p, i) => {
		const destaque = chaves.has(normalizar(p.w));
		if (destaque && atual.some((x) => x.destaque)) fechar();
		atual.push({...p, destaque});
		const prox = palavras[i + 1];
		const chars = atual.reduce((n, x) => n + x.w.length + 1, 0);
		const quebra =
			!prox ||
			/[.!?…,;:]$/.test(p.w) ||
			prox.ini - p.fim > 0.35 ||
			destaque ||
			atual.length >= 3 ||
			chars + prox.w.length > 18;
		if (quebra) fechar();
	});
	// Cada bloco fica na tela até o próximo começar (no máximo +0,5 s de respiro).
	blocos.forEach((b, i) => {
		const prox = blocos[i + 1];
		b.fim = prox ? Math.min(prox.ini, b.fim + 0.5) : b.fim + 0.5;
	});
	return blocos;
}

export const limparPalavra = (w: string) => w.replace(/[.,;:…]+$/u, '');
