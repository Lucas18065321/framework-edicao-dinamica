import {loadFont as loadInstrumentSerif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as loadInterTight} from '@remotion/google-fonts/InterTight';
import {loadFont as loadBodoniModa} from '@remotion/google-fonts/BodoniModa';
import {loadFont as loadManrope} from '@remotion/google-fonts/Manrope';
import {loadFont as loadBricolage} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadCormorant} from '@remotion/google-fonts/CormorantGaramond';
import {loadFont as loadOutfit} from '@remotion/google-fonts/Outfit';

export type FontPair = {
	id: string;
	name: string;
	keyword: {family: string; weight: number; style: 'italic' | 'normal'; tracking: string; size: number};
	base: {family: string; weight: number; tracking: string};
};

const opts = {subsets: ['latin', 'latin-ext']};

export const PAIRS: FontPair[] = [
	{
		id: 'A',
		name: 'Editorial: Instrument Serif + Inter Tight',
		keyword: {family: loadInstrumentSerif('italic', {weights: ['400'], ...opts}).fontFamily, weight: 400, style: 'italic', tracking: '-0.01em', size: 150},
		base: {family: loadInterTight('normal', {weights: ['300', '500'], ...opts}).fontFamily, weight: 300, tracking: '0.01em'},
	},
	{
		id: 'B',
		name: 'Luxo: Bodoni Moda + Manrope',
		keyword: {family: loadBodoniModa('italic', {weights: ['600'], ...opts}).fontFamily, weight: 600, style: 'italic', tracking: '-0.02em', size: 128},
		base: {family: loadManrope('normal', {weights: ['400', '600'], ...opts}).fontFamily, weight: 400, tracking: '0.02em'},
	},
	{
		id: 'C',
		name: 'Moderno: Bricolage Grotesque + Inter',
		keyword: {family: loadBricolage('normal', {weights: ['800'], ...opts}).fontFamily, weight: 800, style: 'normal', tracking: '-0.045em', size: 130},
		base: {family: loadInter('normal', {weights: ['300', '500'], ...opts}).fontFamily, weight: 300, tracking: '0.01em'},
	},
	{
		id: 'D',
		name: 'Clássico: Cormorant Garamond + Outfit',
		keyword: {family: loadCormorant('italic', {weights: ['600'], ...opts}).fontFamily, weight: 600, style: 'italic', tracking: '-0.01em', size: 150},
		base: {family: loadOutfit('normal', {weights: ['300', '500'], ...opts}).fontFamily, weight: 300, tracking: '0.03em'},
	},
];
