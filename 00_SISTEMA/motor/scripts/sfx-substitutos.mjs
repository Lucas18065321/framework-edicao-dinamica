// Gera SUBSTITUTOS sintetizados para os SFX de terceiros que o código chama pelo nome, só onde o arquivo falta:
//   - pacote Motionix: 02_BIBLIOTECA/sfx/motionix/<categoria>/<categoria>_NN_<nome>.wav (o CUT DINÂMICO e o MIX EDIT tocam
//     esses sons pelo nome nas transições, cards e ícones; sem o arquivo, o render falha);
//   - categorias do lab: 05_LAB/sfx/<categoria>/ (o PAPER VOX ANIMATION sorteia sons daqui; categoria vazia = erro
//     "banco vazio" no gerador). Só cria quando a pasta da categoria não tem nenhum .wav.
// Por quê: SFX de terceiros não podem ir no repositório (licença). Os substitutos deixam tudo renderizar desde o 1º dia.
// Cada substituto é um dos 11 sons básicos do synth-sfx.mjs (02_BIBLIOTECA/sfx), com tom e volume levemente diferentes
// por nome (todos distintos: o sorteio de SFX descarta arquivos idênticos).
// Para usar os sons reais: ponha o arquivo com o MESMO nome no lugar (este script nunca sobrescreve nada). Nos do lab,
// apague os *_sintetizado.wav da categoria quando colocar os seus.
// Uso (de dentro de 00_SISTEMA/motor, depois de: node scripts/synth-sfx.mjs ../../02_BIBLIOTECA/sfx):
//   node scripts/sfx-substitutos.mjs            → cria o que falta e mostra o resumo
//   node scripts/sfx-substitutos.mjs --listar   → só lista o que falta, sem criar
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const BIB = path.join(RAIZ, '02_BIBLIOTECA', 'sfx');
const LAB = path.join(RAIZ, '05_LAB', 'sfx');
const LISTAR = process.argv.includes('--listar');

// Nomes do pacote Motionix (os que o código referencia e os que o sorteio usa por número), por categoria.
const MOTIONIX = {
	'camera-shutters': ['01_camera-shutter', '02_little-bit-hard-cammera-shutter', '03_smooth-cammera-shutter'],
	clicks: ['01_cinematic-click', '02_click-1', '03_click-2', '04_click-2', '05_high-click', '06_mouse-click-198485'],
	'data-collect': ['01_cinematic-data', '02_cinematic-data-collect-2', '03_data-collect', '04_data-collect', '05_ma-tuttkile-stopwatch-3'],
	gear: ['01_fast-gear-2', '02_fast-gear', '03_smooth-and-premium-gear', '04_soft-gear-1', '05_soft-gear-2', '06_long-speed-gear', '07_middle-gear'],
	money: ['01_cinematic-money-1', '02_cinematic-money-2', '03_high-volume-money', '04_mediam-volume-mone'],
	pop: ['01_meadia-pop', '02_normal-pop', '03_premium-and-smooth-pop', '04_slow-and-smooth-pop', '05_smooth-pop', '06_sweet-ui-open'],
	risers: ['01_premium-riser', '02_rjd-riser', '03_riser-2', '04_riser', '05_smooth-riser'],
	'ui-sound-effects': ['01_ui-typing', '02_ui-beatbox-click-01', '03_ui-premium-open', '04_ui-all-in-one', '05_ui-backspace', '06_ui-click-digital-03', '07_ui-click-digital-04', '08_ui-click', '09_ui-digital-click', '10_ui-enter', '11_ui-glitch-click', '12_ui-glitch-flicker-text-2', '13_ui-granular-button-select-9', '14_ui-granular-button-select', '15_ui-open', '16_ui-typing', '17_ui-button', '18_ui-stretch', '19_ui', '20_uu-click-digital-01', '21_v4-type-delete-2'],
	whooshes: ['01_cinematic-low-whoosh', '02_cinematic-fast-normal-whoosh', '03_cinematic-fast-whoosh', '04_cinematic-long-whoosh', '05_cinematic-low-whoosh', '06_cinematic-mediam-whoosh', '07_data-whoosh', '08_fast-whoosh', '09_fast-whoosh', '10_high-and-fast-whoosh', '11_high-and-fast-woosh', '12_long-whoosh', '13_simple-whoosh-2', '14_simple-whoosh', '15_slow-and-smooth-whoosh', '16_smooth-and-fast-whoosh', '17_smooth-like-a-butter-whoosh', '18_whoosh-deep-light-2', '19_whoosh-deep-short', '20_epic-fast-whoosh-345469'],
};
// Categorias do lab que o código lê (scripts/lib/mural.mjs e scripts/lab/sfx-variado.mjs) e o som básico de cada uma.
const LAB_CAT = {clique: 'click_soft', ding: 'shimmer', glitch: 'glitch', impacto: 'impact_sub', 'scroll-ui': 'tick_micro', whoosh: 'whoosh_fast', papel: 'swish_air'};
const POR_LAB = 4; // substitutos por categoria vazia do lab

// som básico (synth-sfx) para cada arquivo Motionix
const baseMotionix = (cat, nome) => {
	if (cat === 'whooshes') return /fast|high|epic|data/.test(nome) ? 'whoosh_fast' : /slow|long|low|deep|butter|mediam/.test(nome) ? 'whoosh_soft' : 'swish_air';
	if (cat === 'ui-sound-effects') return /glitch/.test(nome) ? 'glitch' : /typing|type|backspace|delete/.test(nome) ? 'tick_micro' : /stretch/.test(nome) ? 'swish_air' : /open|enter|select|button/.test(nome) ? 'pop_soft' : 'click_soft';
	return {pop: 'pop_soft', clicks: 'click_soft', 'data-collect': 'tick_micro', gear: 'click_soft', 'camera-shutters': 'click_soft', risers: 'riser_short', money: 'shimmer'}[cat] ?? 'click_soft';
};

// variação estável por nome: tom 0,85–1,20 e volume 0,85–1,00
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const variacao = (nome) => { const h = hash(nome); return {tom: +(0.85 + ((h % 1000) / 1000) * 0.35).toFixed(4), vol: +(0.85 + (((h >>> 10) % 1000) / 1000) * 0.15).toFixed(3)}; };

const faltam = [];
for (const [cat, nomes] of Object.entries(MOTIONIX)) {
	for (const n of nomes) {
		const arq = path.join(BIB, 'motionix', cat, `${cat}_${n}.wav`);
		if (!fs.existsSync(arq)) faltam.push({arq, base: baseMotionix(cat, n)});
	}
}
for (const [cat, base] of Object.entries(LAB_CAT)) {
	const dir = path.join(LAB, cat);
	const temWav = fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.toLowerCase().endsWith('.wav'));
	if (!temWav) for (let i = 1; i <= POR_LAB; i++) faltam.push({arq: path.join(dir, `${cat}_9${i}_sintetizado.wav`), base});
}

const rel = (p) => path.relative(RAIZ, p).replace(/\\/g, '/');
if (!faltam.length) {
	console.log('[sfx-substitutos] nada a fazer: todos os SFX que o código chama já existem');
	process.exit(0);
}
if (LISTAR) {
	for (const f of faltam) console.log(`falta: ${rel(f.arq)}  (substituto: ${f.base})`);
	console.log(`[sfx-substitutos] ${faltam.length} arquivo(s) faltando`);
	process.exit(0);
}
const semBase = [...new Set(faltam.map((f) => f.base))].filter((b) => !fs.existsSync(path.join(BIB, `${b}.wav`)));
if (semBase.length) {
	console.error(`[sfx-substitutos] faltam os sons básicos (${semBase.join(', ')}) em 02_BIBLIOTECA/sfx: rode antes, de dentro de 00_SISTEMA/motor:\n  node scripts/synth-sfx.mjs ../../02_BIBLIOTECA/sfx`);
	process.exit(1);
}
let ok = 0;
for (const f of faltam) {
	const {tom, vol} = variacao(rel(f.arq));
	fs.mkdirSync(path.dirname(f.arq), {recursive: true});
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(BIB, `${f.base}.wav`), '-af', `asetrate=${Math.round(48000 * tom)},aresample=48000,volume=${vol}`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', '-map_metadata', '-1', f.arq], {encoding: 'utf8'});
	if (r.status !== 0) {
		console.error(`[sfx-substitutos] ffmpeg falhou em ${rel(f.arq)}: ${(r.stderr || r.error?.message || '').trim()}`);
		process.exit(1);
	}
	ok++;
}
console.log(`[sfx-substitutos] ${ok} substituto(s) criado(s) (Motionix em 02_BIBLIOTECA/sfx/motionix e categorias vazias de 05_LAB/sfx). Troque pelos reais com o mesmo nome quando tiver.`);
