// Fontes das peças do kit (formatos novos). Identidade: fonte A (Instrument Serif itálica + Inter Tight),
// com Inter Tight pesada (800) e de impacto (900) para títulos.
import {loadFont as loadInterTight} from '@remotion/google-fonts/InterTight';
import {loadFont as loadInstrumentSerif, getInfo as infoInstrumentSerif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFontFromInfo} from '@remotion/google-fonts/from-info';

const opts = {subsets: ['latin', 'latin-ext'] as ('latin' | 'latin-ext')[]};
const inter = loadInterTight('normal', {weights: ['300', '500', '600', '800', '900'], ...opts}).fontFamily;
const serifa = loadInstrumentSerif('italic', {weights: ['400'], ...opts}).fontFamily;
// Instrument Serif NORMAL (reta), para o dicionário do MIX. Carregada com OUTRO nome de família de propósito:
// se entrasse como "Instrument Serif", o measureText (que mede sem font-style) e todo texto da família sem itálico
// passariam a usar a face reta e mudariam o CUT aprovado. Com nome próprio, nada do que já existe muda.
const serifaReta = loadFontFromInfo({...infoInstrumentSerif(), fontFamily: 'Instrument Serif Reta'}, 'normal', {weights: ['400'], ...opts}).fontFamily;

export type Fonte = {family: string; weight: number; style: 'normal' | 'italic'; tracking: string; altura: number};

export const FONTES: Record<'impacto' | 'pesada' | 'destaque' | 'base' | 'leve' | 'serifa' | 'serifaReta', Fonte> = {
	impacto: {family: inter, weight: 900, style: 'normal', tracking: '-0.04em', altura: 0.85}, // caixa-alta de impacto
	pesada: {family: inter, weight: 800, style: 'normal', tracking: '-0.045em', altura: 0.92},
	destaque: {family: inter, weight: 900, style: 'normal', tracking: '-0.03em', altura: 0.95}, // palavra-chave da legenda cinética
	base: {family: inter, weight: 500, style: 'normal', tracking: '-0.01em', altura: 1.1}, // voz
	leve: {family: inter, weight: 300, style: 'normal', tracking: '0.01em', altura: 1.15},
	serifa: {family: serifa, weight: 400, style: 'italic', tracking: '-0.01em', altura: 1}, // conector
	serifaReta: {family: serifaReta, weight: 400, style: 'normal', tracking: '-0.01em', altura: 1}, // MIX: palavra-entrada do dicionário
};
