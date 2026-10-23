// Junções VISÍVEIS dentro dos trechos mantidos da montagem: os pulos de imagem onde o usuário já tirou silêncios no
// próprio bruto (jump cut no mesmo enquadramento). Correção 1 da crítica: só por IMAGEM, porque os tempos de palavra
// do Whisper vêm colados e não mostram onde houve emenda.
// Uso: node scripts/juncoes.mjs <proj> [--edicao 03_roteiro/edicao.json] [--limiar 2.5] [--refazer]
//   --limiar  quantas vezes a diferença do quadro precisa passar o movimento normal em volta (padrão 2,5)
//   --refazer ignora o cache 02_analise/difs_quadros.json e mede o bruto de novo (~5 min para 25 min de bruto 1080p)
// Como mede: diferença média de luminância entre quadros vizinhos a 320 px (tblend=difference + signalstats YAVG),
// numa passada só pelo bruto (cache). Emenda = pico ISOLADO (o único grande a ±6 quadros), ≥ limiar × a mediana local
// (±8 quadros), ≥ 1,8 × os quadros vizinhos e ≥ 1,5 × a mediana do movimento normal da fala no vídeo todo. Gesto rápido
// dura vários quadros e não passa no teste do vizinho; gesto largo, fade de luz ou troca de cena (vários quadros muito
// diferentes) sai numa lista à parte (movimentosGrandes, com "luz" × "gesto" pelo brilho médio do quadro antes e
// depois). Uma emenda colada (≤ 6 q) no começo/fim de um trecho que é corte de verdade ganha "borda": a dica de mover o
// corte. Trecho do bruto usado 2× na montagem aparece nas 2 vezes. Quadros repetidos (diferença ≈ 0; o bruto do piloto
// tem 1 a cada 5, sinal de conversão 25 → 30 fps) são ignorados.
// Validado no piloto (pares de quadros + diferença ampliada): acha as emendas conhecidas de 13,167 s (3 q depois do
// início do trecho 1) e 79,133 s do bruto; as 7 "fracas" conferidas são saltos de pose de verdade; o fade de luz de
// 112,1–112,3 s e o gesto largo de 1264,9 s saem como movimentos grandes. Limite: salto com o corpo quase parado
// (diferença < 1,5 × o movimento normal) passa despercebido, e é justamente o que menos aparece.
// Saída: 02_analise/juncoes.json (tempo no bruto, tempo na saída, intensidade, emendas coladas na borda de um trecho,
// movimentos grandes e os cortes da própria montagem) + resumo no console.
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {lerEdicao, montarSegs, mmss, assinaturaMontagem} from './lib/saida.mjs';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] ?? '');
const opcao = (n, p) => (args.indexOf(n) === -1 ? p : args[args.indexOf(n) + 1]);
const LIMIAR = Number(opcao('--limiar', 2.5));
const VIZINHO = 1.8; // o pico precisa passar os quadros vizinhos por este fator
const JANELA = 8; // quadros de cada lado na mediana local (curta: emenda logo no começo de um trecho tem só um lado)
const ISOLA = 6; // quadros de cada lado em que o pico precisa ser o único grande
const PISO = 1.5; // o pico precisa passar este múltiplo do movimento normal da fala (2 perdia 2 saltos pequenos reais no piloto)
const ESCALA = 320;

let edicao;
try {
	edicao = lerEdicao(proj, opcao('--edicao'));
} catch (e) {
	console.error(e.message);
	process.exit(1);
}
const {ed, edPath, fps: fpsSaida} = edicao;
const bruto = path.join(proj, ed.bruto ?? path.join('01_bruto', fs.readdirSync(path.join(proj, '01_bruto')).find((f) => /^bruto\./.test(f))));
if (!fs.existsSync(bruto)) {
	console.error(`Não achei o bruto: ${bruto}`);
	process.exit(1);
}

// fps real do bruto (pode diferir do fps da saída; os tempos vão em segundos)
const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_frames', '-of', 'json', bruto], {encoding: 'utf8'});
const st = JSON.parse(probe.stdout).streams[0];
const [fn, fd] = st.r_frame_rate.split('/').map(Number);
const fpsB = fn / (fd || 1);

// ---------- 1. diferença entre quadros vizinhos do bruto inteiro (cache) ----------
const cache = path.join(proj, '02_analise', 'difs_quadros.json');
const stat = fs.statSync(bruto);
const assinatura = {arquivo: path.relative(proj, bruto).replace(/\\/g, '/'), tamanho: stat.size, mtime: Math.round(stat.mtimeMs), escala: ESCALA, versao: 1};

const medir = () =>
	new Promise((ok, falha) => {
		console.log(`[junções] medindo a diferença entre quadros do bruto a ${ESCALA} px (passada única; o resultado fica em cache)…`);
		const t0 = Date.now();
		const total = Number(st.nb_frames) || 0;
		const difs = [];
		const ff = spawn('ffmpeg', ['-hide_banner', '-nostats', '-skip_loop_filter', 'all', '-flags2', '+fast', '-i', bruto, '-an', '-sn', '-vf', `scale=${ESCALA}:-2:flags=fast_bilinear,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, '-f', 'null', '-'], {stdio: ['ignore', 'pipe', 'pipe']});
		let resto = '';
		let n = -1;
		let aviso = 0;
		ff.stdout.setEncoding('utf8');
		ff.stdout.on('data', (txt) => {
			const linhas = (resto + txt).split('\n');
			resto = linhas.pop();
			for (const l of linhas) {
				const p = l.match(/pts_time:([\d.]+)/);
				if (p) n = Math.round(Number(p[1]) * fpsB);
				const y = l.match(/YAVG=([\d.]+)/);
				if (y && n >= 0) difs[n] = Math.round(Number(y[1]) * 1000) / 1000;
			}
			if (total && n / total >= aviso + 0.1) {
				aviso = Math.floor((n / total) * 10) / 10;
				process.stdout.write(`  ${Math.round(aviso * 100)}% (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
			}
		});
		let erro = '';
		ff.stderr.on('data', (d) => (erro = (erro + d).slice(-4000)));
		ff.on('close', (cod) => {
			if (cod !== 0) return falha(new Error(`ffmpeg falhou (${cod}):\n${erro}`));
			for (let i = 0; i < difs.length; i++) difs[i] ??= null; // quadro 0 não tem anterior
			console.log(`[junções] ${difs.length} quadros medidos em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
			ok(difs);
		});
	});

let difs;
if (!args.includes('--refazer') && fs.existsSync(cache)) {
	const c = JSON.parse(fs.readFileSync(cache, 'utf8'));
	if (Object.entries(assinatura).every(([k, v]) => c[k] === v) && c.fps === fpsB) difs = c.difs;
}
if (!difs) {
	difs = await medir();
	fs.writeFileSync(cache, JSON.stringify({...assinatura, fps: fpsB, metrica: 'YAVG de |quadro n − quadro n−1| em cinza a 320 px; difs[n] = diferença que CHEGA no quadro n', difs}));
}

// ---------- 2. picos isolados dentro de cada trecho mantido ----------
const segs = montarSegs(ed, fpsSaida);
const mediana = (v) => {
	if (!v.length) return 0;
	const s = [...v].sort((a, b) => a - b);
	return s[Math.floor((s.length - 1) / 2)];
};
// intervalos de quadros do bruto [a, b] de cada trecho; num trecho que continua o anterior no bruto (sem corte entre
// eles), a diferença que chega no 1º quadro também é interna e entra na conta
const colados = (p, s) => p?.bruto != null && s?.bruto != null && Math.abs(p.bruto + (p.fim - p.ini) - s.bruto) < 0.5 / fpsSaida;
const faixas = segs.flatMap((s, k) => {
	if (s.bruto == null) return [];
	const a = Math.round(s.bruto * fpsB);
	// cortaIni/cortaFim: a borda do trecho é um corte de verdade (não continua o trecho vizinho no bruto)
	return [{k, a, b: Math.round((s.bruto + (s.fim - s.ini)) * fpsB) - 1, de: colados(segs[k - 1], s) ? a : a + 1, cortaIni: !colados(segs[k - 1], s), cortaFim: !colados(s, segs[k + 1])}];
});
const dentro = faixas.flatMap(({de, b}) => difs.slice(de, b + 1)).filter((d) => d != null);
const M0 = mediana(dentro);
const DUP = 0.25 * M0; // quadro repetido (≈ 0)
const M = mediana(dentro.filter((d) => d > DUP)); // movimento normal da fala
const achados = [];
const luzes = []; // vários quadros seguidos muito diferentes (gesto rápido, luz, troca de cena): não é jump cut
for (const {k, a, b, de, cortaIni, cortaFim} of faixas) {
	const vals = []; // [quadro, dif] sem os repetidos, só pares inteiros dentro do trecho
	for (let n = de; n <= b; n++) if (difs[n] != null && difs[n] > DUP) vals.push([n, difs[n]]);
	vals.forEach(([n, d], i) => {
		if (d < PISO * M) return;
		// isolado: nenhum outro quadro a ±6 com 70% da diferença ou mais (fade de luz e troca de cena duram vários)
		const isolado = !vals.some(([m, x]) => m !== n && Math.abs(m - n) <= ISOLA && x >= 0.7 * d);
		if (!isolado) {
			if (d >= 5 * M) luzes.push({n, k, d});
			return;
		}
		const viz = Math.max(vals[i - 1]?.[1] ?? 0, vals[i + 1]?.[1] ?? 0);
		if (d < VIZINHO * viz) return;
		const local = mediana(vals.filter(([m]) => m !== n && Math.abs(m - n) <= JANELA).map(([, x]) => x));
		const r = d / Math.max(local, 0.5 * M);
		if (r < LIMIAR) return;
		achados.push({n, k, d, r, a, b, cortaIni, cortaFim});
	});
}
// picos a ≤ 3 quadros um do outro (no mesmo trecho): fica o mais forte
const juncoes = [];
for (const j of achados.sort((x, y) => x.k - y.k || x.n - y.n)) {
	const u = juncoes[juncoes.length - 1];
	if (u && u.k === j.k && j.n - u.n <= 3) {
		if (j.r > u.r) juncoes[juncoes.length - 1] = j;
	} else juncoes.push(j);
}

const nivel = (r) => (r >= 5 ? 'forte' : r >= 3.2 ? 'media' : 'fraca');
const saida = juncoes
	.map(({n, k, d, r, a, b, cortaIni, cortaFim}) => {
		const tb = n / fpsB; // 1º quadro DEPOIS do pulo
		// tempo na saída pelo próprio trecho onde a emenda foi achada (trecho do bruto usado 2× aparece nas 2 vezes)
		const o = {bruto: +tb.toFixed(3), saida: +(segs[k].ini + (tb - segs[k].bruto)).toFixed(3), trecho: k + 1, intensidade: +r.toFixed(1), dif: +d.toFixed(2), nivel: nivel(r)};
		if (cortaIni && n > a && n - a <= 6) o.borda = `${n - a} q depois do início do trecho: mova o ini do trecho para ${tb.toFixed(3)} (some um pedaço de ${n - a} q da pose anterior)`;
		else if (cortaFim && b - n < 6) o.borda = `${b - n + 1} q antes do fim do trecho: mova o fim do trecho para ${tb.toFixed(3)}`;
		return o;
	})
	.sort((x, y) => x.saida - y.saida);

// movimentos grandes: agrupa os quadros a ≤ 10 q um do outro
const mudancas = [];
for (const l of luzes.sort((x, y) => x.k - y.k || x.n - y.n)) {
	const u = mudancas[mudancas.length - 1];
	if (u && u.k === l.k && l.n - u.ate <= 10) (u.ate = l.n), (u.pico = Math.max(u.pico, l.d));
	else mudancas.push({de: l.n, ate: l.n, k: l.k, pico: l.d});
}
// luz × gesto: compara o brilho médio do próprio quadro antes e depois do evento (fade e luz mudam o brilho do quadro
// inteiro; gesto largo mexe muito na diferença, mas quase nada no brilho médio). Só alguns quadros: é rápido.
const brilho = (q) => {
	const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-ss', Math.max(0, q / fpsB - 0.5 / fpsB).toFixed(4), '-i', bruto, '-frames:v', '1', '-an', '-vf', `scale=${ESCALA}:-2,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, '-f', 'null', '-'], {encoding: 'utf8'});
	const m = (r.stdout ?? '').match(/YAVG=([\d.]+)/);
	return m ? Number(m[1]) : NaN;
};
const luz = mudancas.map((m) => {
	const antes = brilho(Math.max(0, m.de - 2)), depois = brilho(m.ate + 1);
	const dBrilho = depois - antes;
	return {
		bruto: +(m.de / fpsB).toFixed(3),
		brutoFim: +(m.ate / fpsB).toFixed(3),
		saida: +(segs[m.k].ini + (m.de / fpsB - segs[m.k].bruto)).toFixed(3),
		trecho: m.k + 1,
		pico: +m.pico.toFixed(1),
		tipo: Number.isFinite(dBrilho) ? (Math.abs(dBrilho) >= 10 ? (dBrilho < 0 ? 'luz (escurece)' : 'luz (clareia)') : 'gesto/movimento') : '?',
		brilho: Number.isFinite(dBrilho) ? [+antes.toFixed(1), +depois.toFixed(1)] : null,
	};
});

// cortes da própria montagem (trechos não contíguos no bruto), para o enquadramento cobrir junto
const cortes = [];
for (let i = 1; i < segs.length; i++) {
	const p = segs[i - 1], s = segs[i];
	if (p.bruto == null || s.bruto == null) continue;
	if (Math.abs(p.bruto + (p.fim - p.ini) - s.bruto) < 0.5 / fpsSaida) continue; // contíguo no bruto: não é corte
	cortes.push({saida: +s.ini.toFixed(3), brutoAntes: +(p.bruto + (p.fim - p.ini)).toFixed(3), brutoDepois: +s.bruto.toFixed(3), trecho: i + 1});
}

const destino = path.join(proj, '02_analise', 'juncoes.json');
fs.writeFileSync(
	destino,
	JSON.stringify(
		{
			edicao: path.relative(proj, edPath).replace(/\\/g, '/'),
			montagem: assinaturaMontagem(ed), // o checar-mix avisa se a montagem mudou depois desta medição
			fpsBruto: fpsB,
			movimentoNormal: +M.toFixed(3),
			limiar: LIMIAR,
			criterio: `pico isolado (único grande a ±${ISOLA} q): dif ≥ ${LIMIAR} × mediana local (±${JANELA} q), ≥ ${VIZINHO} × vizinhos e ≥ ${PISO} × ${M.toFixed(2)} (movimento normal)`,
			juncoes: saida,
			movimentosGrandes: luz,
			cortesMontagem: cortes,
		},
		null,
		1,
	),
);

// ---------- 3. resumo ----------
const por = (nv) => saida.filter((j) => j.nivel === nv).length;
// junções a menos de 45 q (de 30 fps) da anterior NA SAÍDA, contando os cortes da montagem (a montagem pode reordenar)
// (as emendas coladas na borda de um trecho ficam de fora: o conserto delas é mover o corte)
const naSaida = [...saida.filter((j) => !j.borda).map((j) => j.saida), ...cortes.map((c) => c.saida)].filter(Number.isFinite).sort((a, b) => a - b);
const perto = naSaida.filter((t, i) => i > 0 && t - naSaida[i - 1] < 45 / 30);
const dur = segs[segs.length - 1].fim;
console.log(`[junções] movimento normal da fala: ${M.toFixed(2)} (YAVG a ${ESCALA} px) · limiar ${LIMIAR}× local`);
console.log(`[junções] ${saida.length} junções internas visíveis em ${faixas.length} trechos (${por('forte')} fortes, ${por('media')} médias, ${por('fraca')} fracas) · ${cortes.length} cortes da montagem · saída de ${mmss(dur)}`);
if (saida.length) console.log(`[junções] em média 1 a cada ${(dur / (saida.length + cortes.length)).toFixed(1)} s, contando os cortes da montagem`);
if (perto.length) console.log(`[junções] ${perto.length} a menos de 45 q da anterior (cobrir o trecho em vez de reenquadrar duas vezes)`);
const bordas = saida.filter((j) => j.borda);
if (bordas.length) {
	console.log(`[junções] ${bordas.length} emendas coladas no início/fim de um trecho da montagem (ajuste o corte):`);
	bordas.forEach((j) => console.log(`   trecho ${j.trecho}: bruto ${j.bruto.toFixed(3)} s → ${j.borda}`));
}
if (luz.length) {
	console.log(`[junções] ${luz.length} movimentos grandes (vários quadros seguidos muito diferentes: não é jump cut, mas aparece na saída):`);
	luz.forEach((l) => console.log(`   saída ${mmss(l.saida)} · bruto ${l.bruto.toFixed(2)}–${l.brutoFim.toFixed(2)} s · ${l.tipo}${l.brilho ? ` (brilho ${l.brilho[0]} → ${l.brilho[1]})` : ''}`));
}
console.log('   saída      bruto      intensidade');
saida.slice(0, 25).forEach((j) => console.log(`   ${mmss(j.saida).padEnd(10)} ${j.bruto.toFixed(3).padStart(9)}  ${String(j.intensidade).padStart(5)}× ${j.nivel}${j.borda ? ' (borda)' : ''}`));
if (saida.length > 25) console.log(`   … e mais ${saida.length - 25} (lista completa em ${path.relative(proj, destino)})`);
console.log(`[junções] gravado em ${path.relative(proj, destino)}`);
