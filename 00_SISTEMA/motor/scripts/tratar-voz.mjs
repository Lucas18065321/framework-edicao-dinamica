// Tratamento opcional da voz (100% local, FFmpeg): tira aspereza e "estouro" sem efeito de lata.
// Não remove ruído de forma agressiva — o objetivo é voz natural e macia.
// Uso: node scripts/tratar-voz.mjs <pasta-do-projeto> [--comparar]
//   gera 05_audio/voz_suave.wav e 05_audio/voz_forte.wav
//   --comparar: gera 06_previas/comparativo_voz.mp4 (12 s ORIGINAL → SUAVE → FORTE, com legenda na tela)
// Para usar no vídeo: em 03_roteiro/edicao.json adicione  "voz": "05_audio/voz_suave.wav"  (ou voz_forte.wav)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const bruto = fs.readdirSync(path.join(proj, '01_bruto')).find((f) => /^bruto\./.test(f));
if (!bruto) {
	console.error('Não achei 01_bruto/bruto.*');
	process.exit(1);
}
const src = path.join(proj, '01_bruto', bruto);
const out = path.join(proj, '05_audio');
fs.mkdirSync(out, {recursive: true});

// Cadeia de um engenheiro de áudio para voz de lapela/celular "esmagada":
// 1. corta ronco < 75 Hz   2. tira "caixa"/embolado (250 Hz)   3. doma a aspereza (2,5–4 kHz)
// 4. de-esser nos "s"      5. suaviza o topo (agudos de AAC)   6. compressor leve só para segurar picos
// De-esser dinâmico calibrado no 1º vídeo: ~5 dB a menos no pico do "s", brilho médio preservado.
const DESS = 'adynamicequalizer=threshold=0.04:dfrequency=7000:dqfactor=1.5:tfrequency=7000:tqfactor=1.2:attack=1:release=80:ratio=3:mode=cutabove:auto=off';
const CADEIAS = {
	suave: [
		'highpass=f=75:p=2',
		'equalizer=f=250:t=q:w=1.0:g=-2',
		'equalizer=f=3200:t=q:w=1.4:g=-3',
		'deesser=i=0.4:m=0.5:f=0.5:s=o',
		'treble=g=-1.5:f=9000',
		'acompressor=threshold=-14dB:ratio=2:attack=8:release=120:makeup=1',
	],
	// "projetada": tira o estouro com cortes ESTREITOS (não abafa) e devolve corpo, presença e ar.
	projetada: [
		'highpass=f=70:p=2',
		'equalizer=f=140:t=q:w=1.0:g=1.5', // corpo
		'equalizer=f=320:t=q:w=1.2:g=-3', // embolado/"microfone barato"
		'equalizer=f=1900:t=q:w=1.0:g=1.5', // projeção (voz vem para frente)
		'equalizer=f=3200:t=q:w=3:g=-3', // aspereza: corte estreito
		'equalizer=f=5500:t=q:w=1.2:g=2', // clareza/inteligibilidade
		'treble=g=2.5:f=10000', // ar
		DESS, // de-esser dinâmico: só age no instante do "s" (o deesser do FFmpeg abafava 8–13 dB acima de 6 kHz)
		'acompressor=threshold=-15dB:ratio=2:attack=8:release=120:makeup=1',
	],
	// "brilho": igual à projetada + excitador harmônico, que regenera os agudos perdidos no celular/AAC.
	brilho: [
		'highpass=f=70:p=2',
		'equalizer=f=140:t=q:w=1.0:g=1.5',
		'equalizer=f=320:t=q:w=1.2:g=-3',
		'equalizer=f=1900:t=q:w=1.0:g=1.5',
		'equalizer=f=3200:t=q:w=3:g=-3',
		'equalizer=f=5500:t=q:w=1.2:g=1.5',
		'aexciter=level_in=1:level_out=1:amount=1.5:drive=6:blend=0:freq=6500:ceil=16000',
		'treble=g=1.5:f=10000',
		DESS,
		'acompressor=threshold=-15dB:ratio=2:attack=8:release=120:makeup=1',
	],
	forte: [
		'highpass=f=80:p=2',
		'equalizer=f=250:t=q:w=1.0:g=-3',
		'equalizer=f=2800:t=q:w=1.2:g=-4.5',
		'equalizer=f=4200:t=q:w=1.6:g=-2.5',
		'deesser=i=0.7:m=0.6:f=0.45:s=o',
		'treble=g=-3:f=8000',
		'lowpass=f=14500',
		'acompressor=threshold=-16dB:ratio=2.5:attack=10:release=150:makeup=1.5',
	],
};

const run = (a) => {
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], {stdio: 'inherit'});
	if (r.status !== 0) process.exit(r.status ?? 1);
};

for (const [nome, cadeia] of Object.entries(CADEIAS)) {
	const dest = path.join(out, `voz_${nome}.wav`);
	run(['-i', src, '-vn', '-af', `${cadeia.join(',')},aresample=48000`, '-c:a', 'pcm_s16le', dest]);
	console.log(`[voz] ${path.relative(proj, dest)}`);
}

if (args.includes('--comparar')) {
	// 12 s de fala (a partir de 3 s), versões em sequência, todas a -14 LUFS para comparar só o timbre.
	// --comparar original,suave,forte (padrão) — qualquer combinação de "original" e nomes de CADEIAS.
	const lista = (args[args.indexOf('--comparar') + 1] ?? '').startsWith('--') || !args[args.indexOf('--comparar') + 1]
		? ['original', 'suave', 'forte']
		: args[args.indexOf('--comparar') + 1].split(',');
	const t0 = '3', dur = '12';
	const font = "fontfile='C\\:/Windows/Fonts/arialbd.ttf'";
	const card = (txt) => `color=c=0x111111:s=1080x1920:d=${dur}:r=30,drawtext=${font}:text='${txt}':fontcolor=white:fontsize=100:x=(w-tw)/2:y=(h-th)/2`;
	const dest = path.join(proj, '06_previas', `comparativo_voz_${lista.join('-')}.mp4`);
	fs.mkdirSync(path.dirname(dest), {recursive: true});
	const ins = lista.flatMap((n) => ['-ss', t0, '-t', dur, '-i', n === 'original' ? src : path.join(out, `voz_${n}.wav`)]);
	const fc =
		lista.map((n, i) => `${card(`${i + 1}. ${n.toUpperCase()}`)}[v${i}];[${i}:a]loudnorm=I=-14:TP=-1.5,aresample=48000[a${i}];`).join('') +
		lista.map((_, i) => `[v${i}][a${i}]`).join('') +
		`concat=n=${lista.length}:v=1:a=1[v][a]`;
	run([...ins, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-c:a', 'aac', '-b:a', '192k', dest]);
	console.log(`[voz] comparativo → ${path.relative(proj, dest)}`);
}
