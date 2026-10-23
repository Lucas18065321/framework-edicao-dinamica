// Estúdio de áudio da voz (soma ao tratar-voz.mjs, que continua igual). Diagnóstico medido + cadeia em etapas +
// EQ casada com uma voz de referência (o timbre que o usuário aprovou) + 3 intensidades para escolher de ouvido.
// Uso (de dentro do motor): node scripts/estudio-audio.mjs <proj> [--referencia <arquivo>] [--escolher equilibrado]
//   → 05_audio/voz_estudio_{suave,equilibrado,intenso}.wav (mesma duração do bruto: entra no campo "voz" do edicao.json),
//     06_previas/estudio_audio.md (diagnóstico, cadeia e medições antes/depois por faixa),
//     06_previas/comparativo_estudio.mp4 (mesmo trecho: original | suave | equilibrado | intenso, volume igual).
// Regra: nunca aplicar por padrão; o /editar pergunta (7b) e o usuário escolhe ouvindo (exceção só com pedido dele).
// Etapas (cada uma só entra se o diagnóstico pedir): passa-alta 70 Hz → desestouro (adeclip) → ruído (DeepFilterNet
// com teto de atenuação, ou afftdn leve) → EQ casada (firequalizer, ±6 dB no máx., suavizada) → de-esser dinâmico
// (adynamicequalizer; nunca o filtro deesser) → ar/presença (aexciter sutil, só se abafado) → compressão leve → limitador.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(MOTOR, '..', '..');
const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const DFN = path.resolve(MOTOR, '..', 'ferramentas', 'deepfilternet', 'deep-filter.exe');
const R = (...p) => path.join(proj, ...p);
const bruto = R('01_bruto', fs.readdirSync(R('01_bruto')).find((f) => /^bruto\./.test(f)));
// Voz de referência (o timbre que o usuário aprovou): --referencia <arquivo>; sem ele, o 1º áudio/vídeo da pasta
// opcional 02_BIBLIOTECA/voz-referencia/; sem nenhum dos dois, a própria voz do projeto (a EQ casada fica neutra).
const PASTA_REF = path.join(RAIZ, '02_BIBLIOTECA', 'voz-referencia');
const refDaPasta = fs.existsSync(PASTA_REF) ? fs.readdirSync(PASTA_REF).filter((f) => /\.(wav|mp3|m4a|flac|ogg|oga|aac|mp4|mov|mkv|webm)$/i.test(f)).sort()[0] : null;
const REF = path.resolve(opt('--referencia', refDaPasta ? path.join(PASTA_REF, refDaPasta) : bruto));
if (!args.includes('--referencia') && !refDaPasta) console.log('[estudio] sem voz de referência (--referencia ou 02_BIBLIOTECA/voz-referencia/): EQ casada neutra');
const tmp = R('05_audio', '_estudio');
fs.mkdirSync(tmp, {recursive: true});
const log = (...m) => console.log('[estudio]', ...m);
const ff = (a, o = {}) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], {encoding: 'utf8', maxBuffer: 1 << 28, ...o});

// Faixas (centro em Hz) para o espectro médio da voz.
const FAIXAS = [100, 160, 250, 400, 630, 1000, 1600, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500];
const medirFaixas = (arq) => FAIXAS.map((fc) => {
	const e = ff(['-i', arq, '-vn', '-af', `aformat=channel_layouts=mono,bandpass=f=${fc}:width_type=o:w=0.5,astats=measure_overall=RMS_level:measure_perchannel=none`, '-f', 'null', '-']).stderr;
	return Number((e.match(/RMS level dB: (-?[\d.]+)/) || [])[1] ?? -99);
});
const medirGeral = (arq) => {
	const e = ff(['-i', arq, '-vn', '-af', 'aformat=channel_layouts=mono,astats=measure_overall=Peak_level+RMS_level+Peak_count+Number_of_samples:measure_perchannel=none,ebur128=peak=true', '-f', 'null', '-']).stderr;
	const n = (re) => Number((e.match(re) || [])[1]);
	const resumo = e.slice(e.lastIndexOf('Summary:'));
	const nr = (re) => Number((resumo.match(re) || [])[1]);
	return {pico: n(/Peak level dB: (-?[\d.]+)/), rms: n(/RMS level dB: (-?[\d.]+)/), picos: n(/Peak count: ([\d.]+)/), amostras: n(/Number of samples: ([\d.]+)/), lufs: nr(/I:\s+(-?[\d.]+) LUFS/), truePeak: nr(/Peak:\s+(-?[\d.]+) dBFS/)};
};
const ruidoPausas = (arq) => {
	const e = ff(['-i', arq, '-vn', '-af', 'aformat=channel_layouts=mono,silencedetect=n=-40dB:d=0.4', '-f', 'null', '-']).stderr;
	const ints = [];
	let s = null;
	for (const l of e.split(/\r?\n/)) { const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/); if (a) s = Number(a[1]); if (b && s != null) { if (Number(b[1]) - s > 0.6) ints.push([s + 0.1, Number(b[1]) - 0.1]); s = null; } }
	if (!ints.length) return {db: null, ints};
	const sel = ints.slice(0, 12).map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join('+');
	const e2 = ff(['-i', arq, '-vn', '-af', `aformat=channel_layouts=mono,aselect='${sel}',astats=measure_overall=RMS_level:measure_perchannel=none`, '-f', 'null', '-']).stderr;
	return {db: Number((e2.match(/RMS level dB: (-?[\d.]+)/) || [])[1] ?? -90), ints};
};

// 1. Voz em WAV 48 kHz mono (a mesma duração do bruto).
const voz = path.join(tmp, 'voz_original.wav');
ff(['-loglevel', 'error', '-y', '-i', bruto, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s24le', voz]);
log('medindo a voz…');
const g0 = medirGeral(voz);
const b0 = medirFaixas(voz);
const r0 = ruidoPausas(voz);
log('medindo a referência…');
const refWav = path.join(tmp, 'referencia.wav');
ff(['-loglevel', 'error', '-y', '-i', REF, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s24le', refWav]);
const bRef = medirFaixas(refWav);
const gRef = medirGeral(refWav);

// 2. Diagnóstico.
const rel = (b, g) => b.map((x) => x - g.rms); // espectro relativo ao nível geral
const d0 = rel(b0, g0), dRef = rel(bRef, gRef);
const dif = d0.map((x, i) => dRef[i] - x); // quanto falta (+) ou sobra (−) em cada faixa
const fx = (lo, hi) => FAIXAS.map((f, i) => [f, i]).filter(([f]) => f >= lo && f <= hi).map(([, i]) => i);
const media = (ix, arr) => ix.reduce((s, i) => s + arr[i], 0) / ix.length;
const clipPct = g0.amostras ? (100 * g0.picos) / g0.amostras : 0;
const diag = {
	estouro: g0.pico > -0.3 && clipPct > 0.001,
	clipPct: +clipPct.toFixed(4),
	crista: +(g0.pico - g0.rms).toFixed(1),
	ruido: r0.db,
	abafado: +(media(fx(4000, 12500), dif)).toFixed(1), // + = falta brilho em relação à referência
	embolado: +(-media(fx(250, 400), dif)).toFixed(1), // + = sobra de 250–400 Hz
	aspero: +(-media(fx(2500, 4000), dif)).toFixed(1), // + = sobra de 2,5–4 kHz
	sibilancia: +(-media(fx(6300, 8000), dif)).toFixed(1),
};
log(`diagnóstico: estouro ${diag.estouro ? 'SIM' : 'não'} (${diag.clipPct}%), pico−RMS ${diag.crista} dB, ruído ${diag.ruido?.toFixed?.(1) ?? '—'} dB, abafado ${diag.abafado} dB, embolado ${diag.embolado} dB, áspero ${diag.aspero} dB, sibilância ${diag.sibilancia} dB`);

// 3. EQ casada: ganho por faixa = diferença para a referência, limitado a ±6 dB e suavizado entre vizinhas.
const eqGanhos = (forca) => {
	const lim = dif.map((x) => Math.max(-6, Math.min(6, x)));
	const suave = lim.map((x, i) => (0.25 * (lim[i - 1] ?? x) + 0.5 * x + 0.25 * (lim[i + 1] ?? x)) * forca);
	return FAIXAS.map((f, i) => `entry(${f},${suave[i].toFixed(2)})`).join(';');
};
const temDFN = fs.existsSync(DFN) && spawnSync(DFN, ['--help'], {encoding: 'utf8'}).status === 0;
const precisaRuido = r0.db != null && r0.db > -62;

const cadeia = (nivel) => {
	const forca = {suave: 0.5, equilibrado: 0.85, intenso: 1}[nivel];
	const f = ['highpass=f=70:poles=2'];
	if (diag.estouro) f.push('adeclip=window=55:overlap=75:arorder=8:threshold=10:hsize=1000');
	if (precisaRuido && !temDFN) f.push(`afftdn=nr=${nivel === 'intenso' ? 12 : 8}:nf=${Math.max(-80, Math.round(r0.db - 4))}:tn=1`);
	f.push(`firequalizer=gain_entry='${eqGanhos(forca)}':zero_phase=1`);
	if (diag.sibilancia > 1) f.push(`adynamicequalizer=dfrequency=6800:dqfactor=2:tfrequency=6800:tqfactor=2:threshold=${nivel === 'intenso' ? 0.03 : 0.04}:ratio=${nivel === 'intenso' ? 3 : 2}:attack=1:release=40:makeup=0:range=${nivel === 'intenso' ? 9 : 6}:mode=cutbelow:tftype=bell:auto=off`);
	if (diag.abafado > 2 && nivel !== 'suave') f.push(`aexciter=level_in=1:level_out=1:amount=${nivel === 'intenso' ? 1.6 : 1}:drive=6:blend=0:freq=6000:ceil=14000`);
	f.push(`acompressor=threshold=${nivel === 'suave' ? -20 : -22}dB:ratio=${nivel === 'intenso' ? 3 : 2.2}:attack=8:release=120:makeup=${nivel === 'intenso' ? 3 : 2}dB:knee=4`);
	f.push('alimiter=limit=0.89:attack=3:release=60:level=disabled');
	return f.join(',');
};

// 4. Ruído com DeepFilterNet (teto de atenuação para não soar "lata"), uma vez, antes das cadeias.
let entradaCadeia = voz;
if (precisaRuido && temDFN) {
	log('ruído: DeepFilterNet (teto de 12 dB)…');
	const d48 = path.join(tmp, 'voz_dfn_in.wav');
	ff(['-loglevel', 'error', '-y', '-i', voz, '-c:a', 'pcm_s16le', '-ar', '48000', d48]);
	const dirOut = path.join(tmp, 'dfn');
	fs.mkdirSync(dirOut, {recursive: true});
	const r = spawnSync(DFN, ['--atten-lim-db', '12', '-D', '-o', dirOut, d48], {encoding: 'utf8'});
	const out = path.join(dirOut, 'voz_dfn_in.wav'); // o deep-filter grava com o mesmo nome na pasta de saída
	if (r.status === 0 && fs.existsSync(out)) entradaCadeia = out;
	else log('DeepFilterNet falhou; segue sem ele', r.stderr?.slice(0, 200));
}

const niveis = ['suave', 'equilibrado', 'intenso'];
const resultados = {};
for (const n of niveis) {
	const saida = R('05_audio', `voz_estudio_${n}.wav`);
	const r = ff(['-loglevel', 'error', '-y', '-i', entradaCadeia, '-af', `${cadeia(n)},aresample=48000`, '-ac', '1', '-c:a', 'pcm_s24le', saida]);
	if (r.status !== 0) { log(`✗ ${n}: ${r.stderr.slice(0, 300)}`); continue; }
	const g = medirGeral(saida), b = medirFaixas(saida);
	const desvio = rel(b, g).map((x, i) => +(dRef[i] - x).toFixed(1));
	resultados[n] = {g, desvio, erroMedio: +(desvio.reduce((s, x) => s + Math.abs(x), 0) / desvio.length).toFixed(2)};
	log(`${n}: pico ${g.pico.toFixed(1)} dB, ${g.lufs} LUFS, distância média da referência ${resultados[n].erroMedio} dB (antes ${(dif.reduce((s, x) => s + Math.abs(x), 0) / dif.length).toFixed(2)} dB)`);
}

// 5. Comparativo (mesmo trecho de 12 s, volume igual): original | suave | equilibrado | intenso.
const ini = Math.max(0, (r0.ints[1]?.[1] ?? 20));
const partes = [voz, ...niveis.map((n) => R('05_audio', `voz_estudio_${n}.wav`))].filter((f) => fs.existsSync(f));
const fc = partes.map((_, k) => `[${k}:a]atrim=${ini.toFixed(2)}:${(ini + 12).toFixed(2)},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a${k}]`).join(';') + ';' + partes.map((_, k) => `[a${k}]`).join('') + `concat=n=${partes.length}:v=0:a=1[a]`;
const comp = R('06_previas', 'comparativo_estudio.mp4');
fs.mkdirSync(path.dirname(comp), {recursive: true});
ff(['-loglevel', 'error', '-y', ...partes.flatMap((f) => ['-i', f]), '-f', 'lavfi', '-i', `color=c=0x111111:s=1280x720:d=${12 * partes.length}`, '-filter_complex', fc, '-map', `${partes.length}:v`, '-map', '[a]', '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '192k', comp]);

// 6. Relatório.
const linha = (arr) => arr.map((x) => (x >= 0 ? '+' : '') + x.toFixed(1)).join(' | ');
const md = [
	'# Estúdio de áudio',
	'',
	`Voz: ${path.relative(proj, bruto)} · referência: ${path.relative(RAIZ, REF)}`,
	'',
	'## Diagnóstico',
	`- Estouro: ${diag.estouro ? `**sim** (${diag.clipPct}% das amostras no teto)` : 'não'} · pico ${g0.pico.toFixed(1)} dB · true peak ${g0.truePeak} dBFS · pico − RMS ${diag.crista} dB${diag.crista < 14 ? ' (muito comprimida na origem)' : ''}`,
	`- Ruído nas pausas: ${r0.db != null ? `${r0.db.toFixed(1)} dB` : 'sem pausa longa para medir'}${precisaRuido ? ' → limpeza leve' : ''}`,
	`- Em relação à referência: abafado ${diag.abafado} dB · embolado (250–400 Hz) ${diag.embolado} dB · áspero (2,5–4 kHz) ${diag.aspero} dB · sibilância (6–8 kHz) ${diag.sibilancia} dB (positivo = problema)`,
	'',
	'## Espectro: quanto falta (+) ou sobra (−) para a referência, por faixa',
	`| Hz | ${FAIXAS.join(' | ')} |`,
	`|---|${FAIXAS.map(() => '---').join('|')}|`,
	`| antes | ${linha(dif)} |`,
	...niveis.filter((n) => resultados[n]).map((n) => `| ${n} | ${linha(resultados[n].desvio)} |`),
	'',
	'## Cadeias',
	...niveis.map((n) => `- **${n}**: \`${cadeia(n)}\`${precisaRuido && temDFN ? ' (depois do DeepFilterNet, teto 12 dB)' : ''}`),
	'',
	`Comparativo: \`06_previas/comparativo_estudio.mp4\` (12 s a partir de ${ini.toFixed(1)} s: original → suave → equilibrado → intenso, volume igual).`,
	'Para usar: `"voz": "05_audio/voz_estudio_<nível>.wav"` no edicao.json.',
	'',
].join('\n');
fs.writeFileSync(R('06_previas', 'estudio_audio.md'), md);
fs.writeFileSync(R('05_audio', 'estudio_diagnostico.json'), JSON.stringify({diag, geral: g0, ruido: r0.db, dif, resultados}, null, 1));
log('pronto → 05_audio/voz_estudio_*.wav, 06_previas/estudio_audio.md, 06_previas/comparativo_estudio.mp4');
