// Decupagem inteligente palavra a palavra (soma ao decupar.mjs, que continua igual).
// Feita para o jeito comum de gravar sem roteiro decorado: retoma de onde parou, repete a frase até sair certa, fala duas versões da
// mesma ideia e conversa antes de começar. Três passos:
//   1. node scripts/decupar-inteligente.mjs <proj>             → 03_roteiro/decupagem_palavras.md (+ decupagem_base.json):
//      transcrição numerada palavra a palavra, pausas medidas e pistas automáticas (⚠ palavra quebrada pelo dicionário
//      pt-BR, 🔁 gaguejo, ↺ retomada de um trecho de até 12 s antes, ≈ frase parecida com outra).
//   2. o agente `decupador` lê o .md e escreve 03_roteiro/decupagem_decisoes.json (o que sai, com tipo e motivo).
//   3. node scripts/decupar-inteligente.mjs <proj> --aplicar [--manter 3,7] [--revisao] [--render]
//      → montagem.json (cortes só em pausa, com o começo e o fim de cada palavra ajustados pelo nível do áudio),
//        decupagem.md (cada corte numerado, com o motivo; vete com --manter N), 02_analise/palavras_decupado.json
//        (palavras no tempo da saída); --revisao gera 06_previas/decupado_revisao.mp4 (720p, rápido, para assistir);
//        --render gera 01_bruto/bruto_decupado.mp4 (resolução do bruto) com microfade de 12 ms em cada emenda.
// Palavras: 02_analise/palavras_turbo.json (transcrever.mjs) ou palavras.json. Glossário de termos e nomes que o
// dicionário não conhece: 00_SISTEMA/ferramentas/glossario.txt (uma palavra por linha; linha que começa com # é comentário).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {carregarDicionario} from './lib/dicionario.mjs';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const APLICAR = args.includes('--aplicar');
const PAUSA = Number(opt('--pausa', 0.45)); // pausa maior que isso dentro de trecho mantido é encurtada
const manter = new Set(String(opt('--manter', '')).split(',').filter(Boolean).map(Number));
const R = (...p) => path.join(proj, ...p);
if (!fs.existsSync(R('01_bruto'))) { console.error('Uso: node scripts/decupar-inteligente.mjs <proj> [--aplicar] [--manter N,M] [--revisao] [--render]'); process.exit(1); }
const bruto = R('01_bruto', fs.readdirSync(R('01_bruto')).find((f) => /^bruto\./.test(f)) ?? fs.readdirSync(R('01_bruto')).find((f) => /^original\./.test(f)));
const fonte = fs.existsSync(R('02_analise', 'palavras_turbo.json')) ? 'palavras_turbo.json' : 'palavras.json';
const palavras = JSON.parse(fs.readFileSync(R('02_analise', fonte), 'utf8')).map((w, i) => ({...w, i}));
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Nível do áudio em janelas de 20 ms (para medir pausas e encaixar o corte no ponto mais silencioso).
const JAN = 0.02;
const rms = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', bruto, '-vn', '-af', 'aresample=16000,aformat=channel_layouts=mono,asetnsamples=n=320:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 29}).stdout;
const niveis = [...rms.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -120 : Number(m[1])));
const ord = [...niveis].sort((a, b) => a - b);
const pct = (p) => ord[Math.floor(p * (ord.length - 1))];
const chao = pct(0.1), fala = pct(0.9), limiar = chao + 0.3 * (fala - chao);
const nivel = (t) => niveis[Math.max(0, Math.min(niveis.length - 1, Math.round(t / JAN)))] ?? -120;
const dur = niveis.length * JAN;

if (!APLICAR) {
	// ---------- 1. preparar ----------
	const ehPalavra = carregarDicionario();
	const gl = path.resolve(MOTOR, '..', 'ferramentas', 'glossario.txt');
	const glossario = new Set(fs.existsSync(gl) ? fs.readFileSync(gl, 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).map(norm).filter(Boolean) : []);
	const PARADAS = new Set('a o as os de da do das dos e que um uma em no na nos nas para pra por com se nao eu voce ele ela isso esse essa tem ter vai ja mais muito como mas ou ao me te lhe seu sua'.split(' '));
	const pistas = new Map(); // i → [texto]
	const add = (i, t) => { if (!pistas.has(i)) pistas.set(i, []); pistas.get(i).push(t); };
	palavras.forEach((w, i) => {
		const k = norm(w.w);
		const prox = palavras.slice(i + 1, i + 5).map((x) => norm(x.w));
		const inicioFrase = i === 0 || /[.!?]$/.test(palavras[i - 1].w);
		const nomeProprio = /^\p{Lu}/u.test(w.w) && !inicioFrase;
		if (k.length >= 3 && !glossario.has(k) && !nomeProprio && !ehPalavra(w.w)) {
			const alvo = prox.find((p) => p.length > k.length - 2 && p.slice(0, Math.max(3, Math.floor(k.length * 0.6))) === k.slice(0, Math.max(3, Math.floor(k.length * 0.6))));
			add(i, alvo ? `⚠ palavra quebrada (começo de "${palavras[i + 1 + prox.indexOf(alvo)].w}")` : '⚠ palavra fora do dicionário');
		}
		if (k && k === norm(palavras[i + 1]?.w ?? '')) add(i, '🔁 gaguejo (repete a palavra seguinte)');
		if (i + 3 < palavras.length && k && k === norm(palavras[i + 2].w) && norm(palavras[i + 1].w) === norm(palavras[i + 3].w)) add(i, '🔁 gaguejo (repete as 2 palavras seguintes)');
		// frase abandonada: o modelo grande termina com "…" o que ficou pela metade
		if (/(\.\.\.|…)$/.test(w.w)) add(i, '✂ frase interrompida (termina em …)');
		// retomada: 3 palavras daqui (com pelo menos 1 de conteúdo) já apareceram juntas até 12 s antes,
		// ou 2 palavras que abriam uma frase que ficou interrompida
		if (i >= 2 && k) {
			const n = (d) => norm(palavras[i + d]?.w ?? '');
			const tri = `${k} ${n(1)} ${n(2)}`;
			const conteudo = [k, n(1), n(2)].some((x) => x.length > 3 && !PARADAS.has(x));
			for (let j = i - 1; j >= 0 && w.ini - palavras[j].ini <= 12; j--) {
				const m = (d) => norm(palavras[j + d]?.w ?? '');
				if (j + 2 >= i) continue;
				const fimFrase = palavras.slice(j, i).find((x) => /[.!?…]$/.test(x.w));
				const abandonou = fimFrase && /(\.\.\.|…)$/.test(fimFrase.w);
				if ((conteudo && `${m(0)} ${m(1)} ${m(2)}` === tri) || (abandonou && `${m(0)} ${m(1)}` === `${k} ${n(1)}`)) { add(i, `↺ retomada: recomeça o trecho de ${j} (“${palavras.slice(j, Math.min(i, j + 6)).map((x) => x.w).join(' ')}…”)`); break; }
			}
		}
	});
	// frases (pela pontuação) e frases parecidas
	const frases = [];
	let f = [];
	for (const w of palavras) { f.push(w); if (/[.!?…]$/.test(w.w)) { frases.push(f); f = []; } }
	if (f.length) frases.push(f);
	const chave = (fr) => new Set(fr.map((w) => norm(w.w)).filter((k) => k.length > 2 && !PARADAS.has(k)));
	const parecidas = [];
	frases.forEach((a, x) => frases.slice(x + 1).forEach((b, dy) => {
		const y = x + 1 + dy;
		if (b[0].ini - a[a.length - 1].fim > 45) return;
		const A = chave(a), B = chave(b);
		const comuns = [...A].filter((k) => B.has(k)).length;
		const sim = comuns / Math.max(1, Math.min(A.size, B.size));
		if (A.size >= 2 && B.size >= 2 && sim >= 0.5) parecidas.push({x, y, sim: +sim.toFixed(2)});
	}));
	const pausaAntes = (w) => (w.i === 0 ? w.ini : w.ini - palavras[w.i - 1].fim);
	const linhas = frases.map((fr, x) => {
		const corpo = fr.map((w) => `${pausaAntes(w) >= 0.35 ? `‖${pausaAntes(w).toFixed(1)}s‖ ` : ''}${w.i}:${w.w}`).join(' ');
		const ps = fr.flatMap((w) => (pistas.get(w.i) ?? []).map((t) => `${w.i} ${t}`));
		const pr = parecidas.filter((p) => p.x === x || p.y === x).map((p) => `≈ parecida com S${(p.x === x ? p.y : p.x) + 1} (${Math.round(p.sim * 100)}% das palavras-chave)`);
		return [`**S${x + 1}** [${fmt(fr[0].ini)}–${fmt(fr[fr.length - 1].fim)}] ${corpo}`, ...[...ps, ...pr].map((t) => `  - ${t}`)].join('\n');
	});
	const md = [
		'# Decupagem inteligente: transcrição numerada (para o agente decupador)',
		'',
		`Bruto ${fmt(dur)} · ${palavras.length} palavras (${fonte}) · ${frases.length} frases · ruído ${chao.toFixed(1)} dB, fala ${fala.toFixed(1)} dB.`,
		'Formato: `índice:palavra`; `‖0.8s‖` = pausa antes da palavra. As pistas são automáticas e podem errar: quem decide é o decupador.',
		'',
		...linhas,
		'',
	].join('\n');
	fs.mkdirSync(R('03_roteiro'), {recursive: true});
	fs.writeFileSync(R('03_roteiro', 'decupagem_palavras.md'), md);
	fs.writeFileSync(R('03_roteiro', 'decupagem_base.json'), JSON.stringify({fonte, palavras, frases: frases.map((fr) => [fr[0].i, fr[fr.length - 1].i]), parecidas, pistas: Object.fromEntries(pistas)}, null, 1));
	console.log(`[decupar-inteligente] ${palavras.length} palavras · ${frases.length} frases · ${pistas.size} pistas · ${parecidas.length} pares parecidos → 03_roteiro/decupagem_palavras.md`);
	console.log('Próximo passo: o agente decupador escreve 03_roteiro/decupagem_decisoes.json; depois rode com --aplicar.');
	process.exit(0);
}

// ---------- 3. aplicar ----------
const dec = JSON.parse(fs.readFileSync(R('03_roteiro', 'decupagem_decisoes.json'), 'utf8'));
const cortes = (dec.cortes ?? []).map((c, k) => ({...c, n: k + 1})).filter((c) => !manter.has(c.n));
for (const c of dec.correcoes ?? []) if (palavras[c.i]) palavras[c.i].w = c.para;
const fora = new Set();
for (const c of cortes) for (let i = c.de; i <= c.ate; i++) fora.add(i);
const mantidas = palavras.filter((w) => !fora.has(w.i));
// Encaixe no áudio (o tempo das palavras do Whisper desvia 0,1–0,4 s): cada borda de corte procura o SILÊNCIO MEDIDO
// (≥ 80 ms abaixo do limiar) perto da palavra; sem silêncio, vai para o ponto mais baixo da janela.
const SIL = 4; // quadros de 20 ms
const quieto = (t) => { for (let k = 0; k < SIL; k++) if (nivel(t + k * JAN) >= limiar) return false; return true; };
const silencioDepois = (a, b) => { for (let t = a; t <= b; t += JAN) if (quieto(t)) return t; return null; }; // 1º silêncio depois de a
const silencioAntes = (a, b) => { for (let t = b; t >= a; t -= JAN) if (quieto(t - (SIL - 1) * JAN)) return t; return null; }; // último silêncio antes de b
const maisBaixo = (a, b) => { let m = a, v = Infinity; for (let t = a; t <= b; t += JAN) if (nivel(t) < v) { v = nivel(t); m = t; } return m; };
const fimDe = (w, prox, folga) => {
	const a = Math.max(0, w.fim - 0.12), b = Math.max(a + JAN, Math.min(prox ? Math.min(prox.ini + 0.35, prox.fim - 0.05) : dur, w.fim + 0.45));
	const s = silencioDepois(a, b);
	return s != null ? Math.min(s + folga, b) : maisBaixo(a, b);
};
const iniDe = (w, ante, folga) => {
	const b = Math.min(dur, w.ini + 0.12), a = Math.min(b - JAN, Math.max(ante ? Math.max(ante.ini + 0.05, ante.fim - 0.35) : 0, w.ini - 0.45));
	const s = silencioAntes(a, b);
	return s != null ? Math.max(s - folga, a) : maisBaixo(a, b);
};
const segs = [];
mantidas.forEach((w, k) => {
	const ant = mantidas[k - 1];
	const colada = ant && ant.i === w.i - 1; // sem palavra cortada entre as duas
	if (colada && w.ini - ant.fim <= PAUSA) return void (segs[segs.length - 1].wFim = w);
	if (colada) {
		// pausa longa sem corte: respiro curto dos dois lados, cada um encaixado no silêncio
		segs[segs.length - 1].fim = fimDe(ant, w, 0.12);
		segs.push({ini: Math.max(segs[segs.length - 1].fim, iniDe(w, ant, 0.08)), wFim: w});
		return;
	}
	// depois de um corte (ou no começo): a borda fica no silêncio antes da palavra mantida
	if (segs.length) segs[segs.length - 1].fim = fimDe(segs[segs.length - 1].wFim, palavras[segs[segs.length - 1].wFim.i + 1], 0.04);
	segs.push({ini: Math.max(segs.length ? segs[segs.length - 1].fim : 0, iniDe(w, palavras[w.i - 1], 0.02)), wFim: w});
});
if (segs.length) segs[segs.length - 1].fim = fimDe(segs[segs.length - 1].wFim, palavras[segs[segs.length - 1].wFim.i + 1], 0.1);
// Silêncio longo de verdade dentro de um trecho mantido (medido no áudio, ≥ PAUSA): o Whisper às vezes estica a palavra
// por cima dele. Encurta para um respiro (0,14 s depois da voz + 0,1 s antes da próxima).
const semPausasLongas = (s) => {
	const out = [];
	let a = s.ini, t = s.ini + 0.1, run = null;
	for (; t < s.fim - 0.1; t += JAN) {
		if (nivel(t) < limiar) { if (run == null) run = t; }
		else { if (run != null && t - run >= PAUSA) { out.push({ini: a, fim: run + 0.14}); a = t - 0.1; } run = null; }
	}
	out.push({ini: a, fim: s.fim});
	return out;
};
const montagem = segs.flatMap(semPausasLongas).reduce((acc, s) => { const u = acc[acc.length - 1]; if (u && s.ini <= u.fim + 0.01) u.fim = Math.max(u.fim, s.fim); else acc.push({ini: +s.ini.toFixed(3), fim: +s.fim.toFixed(3)}); return acc; }, []);
const total = montagem.reduce((s, m) => s + m.fim - m.ini, 0);
// palavras no tempo da saída
let off = 0;
const mapa = montagem.map((m) => { const o = {...m, saida: off}; off += m.fim - m.ini; return o; });
const naSaida = (t) => { const m = mapa.find((x) => t >= x.ini - 1e-6 && t <= x.fim + 1e-6); return m ? m.saida + (t - m.ini) : null; };
const palavrasSaida = mantidas.map((w) => ({w: w.w, ini: naSaida(w.ini) ?? naSaida(Math.min(w.fim, w.ini + 0.05)), fim: naSaida(w.fim) ?? naSaida(Math.max(w.ini, w.fim - 0.05))})).filter((w) => w.ini != null && w.fim != null).map((w) => ({...w, ini: +w.ini.toFixed(3), fim: +w.fim.toFixed(3)}));
const txt = (a, b) => palavras.slice(a, b + 1).map((w) => w.w).join(' ');
const md = [
	'# Decupagem inteligente: cortes',
	'',
	`Bruto ${fmt(dur)} → editado **${fmt(total)}** (${montagem.length} trechos, ${(dec.cortes ?? []).length} cortes de conteúdo + pausas longas encurtadas). Fonte: ${fonte}.`,
	'Para devolver um corte: rode de novo com `--manter N` (números da tabela). Os cortes caem em pausa, no ponto mais silencioso.',
	'',
	'| # | tempo no bruto | tipo | o que sai | motivo |',
	'|---|---|---|---|---|',
	...(dec.cortes ?? []).map((c, k) => `| ${k + 1}${manter.has(k + 1) ? ' (mantido)' : ''} | ${fmt(palavras[c.de].ini)}–${fmt(palavras[c.ate].fim)} | ${c.tipo} | ${txt(c.de, c.ate)} | ${c.motivo ?? ''} |`),
	'',
	'## Texto final',
	'',
	palavrasSaida.map((w) => w.w).join(' '),
	'',
].join('\n');
fs.writeFileSync(R('03_roteiro', 'decupagem.md'), md);
fs.writeFileSync(R('03_roteiro', 'montagem.json'), JSON.stringify(montagem, null, 1));
fs.writeFileSync(R('02_analise', 'palavras_decupado.json'), JSON.stringify(palavrasSaida, null, 1));
// Palavras para o edicao.json (tempo do BRUTO, junto com a "montagem"): só as que ficam, cada uma presa dentro do seu
// trecho. O Whisper às vezes marca a palavra ~0,5 s antes do trecho começar, e o motor descartaria a palavra da
// legenda; as palavras cortadas não entram (não piscam 1 quadro na emenda).
const dentro = [];
for (const w of mantidas) {
	const meio = (w.ini + w.fim) / 2;
	let s = montagem.find((m) => meio >= m.ini && meio <= m.fim) ?? montagem.find((m) => m.ini > w.ini && m.ini - w.ini <= 0.9);
	if (!s) continue;
	let ini = Math.max(w.ini, s.ini + 0.01), fim = Math.min(w.fim, s.fim - 0.01);
	if (fim - ini < 0.08) fim = Math.min(s.fim - 0.01, ini + Math.max(0.12, w.fim - w.ini));
	const ant = dentro[dentro.length - 1];
	if (ant && ini < ant.fim) ini = ant.fim;
	if (fim <= ini) fim = Math.min(s.fim, ini + 0.05);
	dentro.push({w: w.w, ini: +ini.toFixed(3), fim: +fim.toFixed(3)});
}
fs.writeFileSync(R('02_analise', 'palavras_montagem.json'), JSON.stringify(dentro, null, 1));
console.log(`[decupar-inteligente] ${cortes.length} cortes aplicados · ${fmt(dur)} → ${fmt(total)} · ${montagem.length} trechos → decupagem.md, montagem.json, palavras_decupado.json`);

// Render do decupado (concat com microfade de 12 ms em cada emenda para não estalar).
// Uma entrada por trecho com -ss/-t (busca rápida no arquivo: o trim num grafo só, em bruto 4K, passava de 40 min) e
// o grafo por arquivo com -/filter_complex (o -filter_complex_script saiu do FFmpeg 9).
const renderizar = (saida, escala, crf, preset) => {
	const ins = montagem.flatMap((m) => ['-ss', m.ini.toFixed(3), '-t', (m.fim - m.ini).toFixed(3), '-i', bruto]);
	const f = montagem.map((m, k) => {
		const d = m.fim - m.ini;
		return `[${k}:v]setpts=PTS-STARTPTS${escala ? `,${escala}` : ''}[v${k}];[${k}:a]asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, d - 0.012).toFixed(3)}:d=0.012[a${k}]`;
	}).join(';');
	const cat = montagem.map((_, k) => `[v${k}][a${k}]`).join('') + `concat=n=${montagem.length}:v=1:a=1[v][a]`;
	const fc = path.join(proj, '06_previas', '_decupar_filtro.txt');
	fs.mkdirSync(path.dirname(fc), {recursive: true});
	fs.writeFileSync(fc, `${f};${cat}`);
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...ins, '-/filter_complex', fc, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', '24', '-c:a', 'aac', '-b:a', '256k', saida], {stdio: 'inherit'});
	console.log(r.status === 0 ? `  → ${path.relative(proj, saida)}` : `  ✗ falhou (${r.status})`);
};
if (args.includes('--revisao')) renderizar(R('06_previas', 'decupado_revisao.mp4'), "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'", 23, 'veryfast');
if (args.includes('--render')) renderizar(R('01_bruto', 'bruto_decupado.mp4'), null, 16, 'medium');
