// Etapa de refino milimétrico dos SFX do INSTAGRAM - PAPER VOX ANIMATION (objetivo: timing
// milimétrico na entrada de cada efeito sonoro, porque alguns quadros de diferença mudam a percepção do vídeo).
//   1. confere cada SFX do quadro.json contra o instante VISUAL que ele marca (evento, posto pelo gerador com M.ev.*):
//      onde o ataque/pico do som cai, o desvio em ms e o quadro; avisa SFX sem evento, fora do quadro, colados ou
//      repetidos em seguida;
//   2. com --video (a prévia), monta o carretel de audição: um clipe de 1,5 s por SFX, com número, categoria e evento
//      escritos e uma barra carmim no quadro exato do evento. O usuário ouve todos em ~40 s e pede ajuste por número
//      ("o 7 entra 2 quadros antes" → ajuste: -83 no plano do gerador). Com sfxNaMixagem, o ajuste custa segundos:
//      gerador → mixar-audio.mjs na base guardada (render-paper-vox --manter-base), sem renderizar de novo.
// Uso (de dentro do motor): node scripts/refinar-sfx.mjs <proj> [--props 03_roteiro/quadro.json]
//   [--video 06_previas/<prévia>.mp4 [--desde <s do vídeo no início do trecho>]] [--saida 06_previas/sfx-refino.mp4]
// Saídas: 03_roteiro/sfx_refino.md (tabela + avisos) e, com --video, o carretel em 06_previas/.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pontosDoSom, RAIZ} from './lib/mural.mjs';

const args = process.argv.slice(2);
const opcao = (nome, padrao = null) => (args.includes(nome) ? args[args.indexOf(nome) + 1] : padrao);
const proj = path.resolve(args[0] ?? '');
if (!args[0] || !fs.existsSync(proj)) {
	console.error('Uso: node scripts/refinar-sfx.mjs <proj> [--props 03_roteiro/quadro.json] [--video <prévia.mp4> [--desde s]] [--saida f.mp4]');
	process.exit(1);
}
const props = JSON.parse(fs.readFileSync(path.resolve(proj, opcao('--props', '03_roteiro/quadro.json')), 'utf8'));
const FPS = 24, QUADRO = 1000 / FPS;
const naMix = !!props.sfxNaMixagem;
const cacheArq = path.join(proj, '05_audio/sfx/lab/medidas.json');
const cache = fs.existsSync(cacheArq) ? JSON.parse(fs.readFileSync(cacheArq, 'utf8')) : {};
const pontos = (rel) => {
	cache[rel] ??= {};
	if (cache[rel].t_ataque == null) { const p = pontosDoSom(path.join(proj, rel)); cache[rel].t_ataque = p.ataque; cache[rel].t_pico = p.pico; }
	return {ataque: cache[rel].t_ataque, pico: cache[rel].t_pico};
};
const cat = (s) => s.som.split('/')[3] ?? path.basename(s.som);

// 1. tabela e avisos
const linhas = [], avisos = [];
const sfx = props.sfx ?? [];
sfx.forEach((s, i) => {
	const n = i + 1;
	const p = pontos(s.som);
	const alvo = s.alvo ?? 'ataque';
	const tSom = naMix ? s.t : Math.round(s.t * FPS) / FPS; // na composição, o SFX só entra na grade de quadros
	const cai = tSom + (p[alvo] ?? 0);
	const desvio = s.evento ? (cai - s.evento.t) * 1000 - (s.ajuste ?? 0) : null;
	linhas.push(`| ${n} | ${s.t.toFixed(3)} | ${cat(s)} · ${path.basename(s.som, '.wav')} | ${(20 * Math.log10(s.vol ?? 0.3)).toFixed(1)} dB | ${s.evento ? `${s.evento.tipo} @ ${s.evento.t.toFixed(3)}` : '—'} | ${alvo} (${(p[alvo] ?? 0).toFixed(3)} s) | ${cai.toFixed(3)} | ${desvio == null ? '—' : desvio.toFixed(1)} | ${s.ajuste ?? 0} | ${Math.round(cai * FPS)} |`);
	if (!s.evento) avisos.push(`#${n} (${cat(s)} em ${s.t.toFixed(2)} s) sem evento visual: ancore no gerador (M.ev.palavra/slam/pouso/viagem/mergulho/objeto).`);
	else if (Math.abs(desvio) > (naMix ? 1 : QUADRO / 2)) avisos.push(`#${n} (${cat(s)}) cai ${desvio.toFixed(1)} ms fora do evento "${s.evento.tipo}"${naMix ? '' : ' (grade de quadros: use sfxNaMixagem)'}.`);
	if (i > 0) {
		const a = sfx[i - 1];
		if (s.t - a.t < 1.15) avisos.push(`#${n - 1} e #${n} colados (${(s.t - a.t).toFixed(2)} s; mínimo 1,15 s).`);
		if (cat(a) === cat(s)) avisos.push(`#${n - 1} e #${n}: mesma categoria em seguida (${cat(s)}).`);
	}
});
fs.writeFileSync(cacheArq, JSON.stringify(cache, null, 1));
const md = [
	`# Refino dos SFX (${new Date().toISOString().slice(0, 10)})`,
	'',
	`${sfx.length} SFX · ${naMix ? 'na mixagem (amostra exata)' : 'na composição (grade de 1/24 s = 41,7 ms)'} · ${sfx.filter((s) => s.evento).length} com evento visual.`,
	'Desvio = onde o ataque/pico do som cai menos o instante do evento, já descontado o ajuste pedido. Quadro = quadro a 24 fps em que o som bate.',
	'',
	'| # | t do arquivo (s) | som | vol | evento visual | ponto do som | cai em (s) | desvio (ms) | ajuste (ms) | quadro |',
	'|---|---|---|---|---|---|---|---|---|---|',
	...linhas,
	'',
	avisos.length ? '## Avisos' : '## Avisos: nenhum',
	...avisos.map((a) => `- ${a}`),
	'',
	'Ajuste: no plano do gerador, 5º item da linha do SFX: {ajuste: ms} (negativo = antes; 1 quadro = 41,7 ms). Depois: gerador → mixar-audio.mjs na base.',
].join('\n');
const mdArq = path.join(proj, '03_roteiro/sfx_refino.md');
fs.writeFileSync(mdArq, md + '\n');
console.log(`[refino] ${sfx.length} SFX · ${avisos.length} avisos → ${path.relative(RAIZ, mdArq)}`);
for (const a of avisos.slice(0, 12)) console.log(`  - ${a}`);

// 2. carretel de audição
const video = opcao('--video');
if (video) {
	const desde = Number(opcao('--desde', '0'));
	const vid = path.resolve(proj, video);
	const durV = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', vid], {encoding: 'utf8'}).stdout) || 0;
	const W = Number(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', vid], {encoding: 'utf8'}).stdout) || 540;
	const fonte = 'C\\:/Windows/Fonts/arial.ttf';
	const limpo = (t) => String(t).replace(/[\\'":%,;[\]=]/g, ' ').replace(/\s+/g, ' ').trim();
	const partes = [], rot = [];
	sfx.forEach((s, i) => {
		const ev = (s.evento?.t ?? s.t) - desde;
		const a = Math.max(0, ev - 0.9), b = Math.min(durV, ev + 0.6);
		if (b - a < 0.3) return;
		const k = partes.length;
		const fs1 = Math.round(W / 22);
		const txt = limpo(`#${i + 1}  ${cat(s)}  ·  ${s.evento?.tipo ?? 'sem evento'}`);
		partes.push(`[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS,drawbox=x=0:y=ih*0.86:w=iw:h=ih*0.02:color=0xB90015@0.95:t=fill:enable='between(t,${(ev - a).toFixed(3)},${(ev - a + 1 / FPS).toFixed(3)})',drawtext=fontfile='${fonte}':text='${txt}':fontcolor=white:fontsize=${fs1}:x=(w-text_w)/2:y=h*0.06:box=1:boxcolor=black@0.6:boxborderw=${Math.round(fs1 / 3)}[v${k}]`);
		partes.push(`[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS[a${k}]`);
		rot.push(`[v${k}][a${k}]`);
	});
	const n = rot.length;
	const saida = path.resolve(proj, opcao('--saida', `06_previas/sfx-refino_${new Date().toISOString().slice(0, 10)}.mp4`));
	const filtro = `${partes.join(';')};${rot.join('')}concat=n=${n}:v=1:a=1[v][a]`;
	const scr = `${saida}.filtro.txt`;
	fs.writeFileSync(scr, filtro);
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', vid, '-/filter_complex', scr, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '24', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', saida], {stdio: 'inherit'});
	fs.rmSync(scr, {force: true});
	if (r.status !== 0) process.exit(r.status ?? 1);
	console.log(`[refino] carretel: ${n} clipes de 1,5 s → ${path.relative(RAIZ, saida)} (barra carmim = quadro exato do evento)`);
}
