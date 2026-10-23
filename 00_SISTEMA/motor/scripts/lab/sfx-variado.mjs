// SFX variado e mais baixo no INSTAGRAM - TELA DIVIDIDA, SEM tocar no Edicao.tsx (congelado).
// O automático do Edicao.tsx põe 1 som fixo por tipo de transição (blur → whoosh_soft 0,45 …) e um pop_soft em TODA
// ocorrência de palavra destacada. Este script grava no edicao.json "sfxAuto": false + uma lista "sfx" que:
//   - recalcula os mesmos pontos (transições blur/whip/flash/glitch e palavras destacadas, com o mesmo normalizar);
//   - sorteia o som de cada evento num banco por tipo, em ordem cronológica, com semente por evento: fora os últimos
//     K do mesmo tipo (K = metade do banco, até 5) e, entre os livres, o menos usado até ali;
//   - pop só na 1ª ocorrência de cada palavra destacada, com ≥ 5 s entre pops e nenhum a < 0,6 s de outro som;
//   - nivela cada som pela voz medida: transição 12 dB abaixo, pop 17 dB, manuais 11 dB (antes: whoosh ~8 dB e pop
//     ~14 dB abaixo), ±1,5 dB, pelo maior entre o loudness momentâneo e o RMS de 50 ms − 3 dB do arquivo;
//   - põe o pico de cada som no mesmo instante em que o automático punha o pico do som fixo (blur ≈ corte + 0,1 s);
//   - som com mais de 2,4 s ganha cópia aparada com fade (o Edicao.tsx corta todo SFX em 2,5 s);
//   - copia os sons do lab (05_LAB/sfx) para 05_audio/sfx/lab/ do projeto.
// Arquivos ao lado do json de edição (<nome> = nome do json, ex.: edicao):
//   <nome>.antes-sfx.json   cópia do json antes da 1ª rodada (backup);
//   sfx-variado.<nome>.json sons manuais (mantidos, só renivelados), sons gerados e a assinatura de cenas/destaques.
//   Som posto à mão no "sfx" depois da rodada vira manual na rodada seguinte; manual apagado do "sfx" sai.
// Rode de novo depois de mexer em cenas ou destaques (--conferir diz se está desatualizado). Mesma entrada = mesma saída.
// Uso (de dentro de 00_SISTEMA/motor): node scripts/lab/sfx-variado.mjs <proj> [--edicao 03_roteiro/edicao.json]
//   [--semente 1] [--trans -12] [--pop -17] [--manual -11] [--gap-pop 5] [--seco] [--conferir] [--manuais-do-json]
//   --seco: só o relatório · --conferir: código 2 se cenas/destaques mudaram desde a última rodada ou se o json foi
//   reescrito sem a lista gerada (ex.: voltou a "sfxAuto" automático)
// Em uso no /editar (etapa 5b, só TELA DIVIDIDA).
//   --manuais-do-json: json que já tem "sfxAuto": false sem o arquivo do script → trata a lista "sfx" toda como manual
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const LIB = path.join(RAIZ, '02_BIBLIOTECA', 'sfx');
const LAB = path.join(RAIZ, '05_LAB', 'sfx');
const args = process.argv.slice(2);
const opc = (n, pad) => { const i = args.indexOf(n); return i > 0 ? args[i + 1] : pad; };
const proj = path.resolve(args[0] ?? '');
const edArq = path.resolve(proj, opc('--edicao', path.join('03_roteiro', 'edicao.json')));
const SEMENTE = Number(opc('--semente', 1));
const NIVEL = {trans: Number(opc('--trans', -12)), pop: Number(opc('--pop', -17)), manual: Number(opc('--manual', -11))};
const GAP_POP = Number(opc('--gap-pop', 5));
const SECO = args.includes('--seco');
const MAX_DUR = 2.4; // o Edicao.tsx toca cada SFX numa Sequence de 2,5 s
const falha = (msg) => { console.error(`[sfx-variado] ${msg}`); process.exit(1); };
if (!fs.existsSync(edArq)) falha(`não achei ${edArq}`);
const ed = JSON.parse(fs.readFileSync(edArq, 'utf8'));
if ((ed.modelo ?? 'tela-dividida-instagram') !== 'tela-dividida-instagram') falha(`só para o INSTAGRAM - TELA DIVIDIDA (este é "${ed.modelo}"; CUT e MIX têm SFX próprio no motor de camadas)`);
const nomeEd = path.basename(edArq, '.json');
const sidecarArq = path.join(path.dirname(edArq), `sfx-variado.${nomeEd}.json`);
const backupArq = path.join(path.dirname(edArq), `${nomeEd}.antes-sfx.json`);

// Réplica de src/legendas.ts → normalizar (o Edicao.tsx compara destaques assim)
const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

// ---------- eventos do automático (mesmos pontos do Edicao.tsx) ----------
const TIPOS = ['blur', 'whip', 'flash', 'glitch'];
const SOM_AUTO = {blur: ['whoosh_soft', 0.45, -0.22], whip: ['whoosh_fast', 0.5, -0.12], flash: ['shimmer', 0.35, -0.05], glitch: ['glitch', 0.3, -0.02]};
const cortes = ed.cenas.map((c, i) => ({t: c.ini, tipo: c.transicao, i})).filter((c) => c.i > 0 && TIPOS.includes(c.tipo));
const assinatura = crypto.createHash('md5').update(JSON.stringify({cortes: cortes.map((c) => [c.t, c.tipo]), destaques: ed.destaques ?? []})).digest('hex').slice(0, 12);
const sidecar = fs.existsSync(sidecarArq) ? JSON.parse(fs.readFileSync(sidecarArq, 'utf8')) : null;
if (args.includes('--conferir')) {
	if (!sidecar) { console.log('[sfx-variado] nunca rodou neste json'); process.exit(2); }
	if (sidecar.assinatura !== assinatura) { console.log('[sfx-variado] DESATUALIZADO: cenas ou destaques mudaram; rode o sfx-variado de novo'); process.exit(2); }
	const noJson = new Set((ed.sfx ?? []).map((s) => `${Number(s.t).toFixed(3)}|${s.som}`));
	if (ed.sfxAuto !== false || sidecar.gerados.some((s) => !noJson.has(`${Number(s.t).toFixed(3)}|${s.som}`))) {
		console.log('[sfx-variado] DESATUALIZADO: o json foi reescrito (voltou ao SFX automático ou perdeu sons gerados); rode o sfx-variado de novo');
		process.exit(2);
	}
	console.log('[sfx-variado] em dia');
	process.exit(0);
}

// ---------- sons manuais ----------
const chave = (s) => `${Number(s.t).toFixed(3)}|${s.som}`;
const avisos = [];
let manuais;
if (sidecar) {
	const atuais = new Set((ed.sfx ?? []).map(chave));
	const gerados = new Set(sidecar.gerados.map(chave));
	const conhecidos = new Set(sidecar.manuais.map(chave));
	const novos = (ed.sfx ?? []).filter((s) => !gerados.has(chave(s)) && !conhecidos.has(chave(s)));
	const apagados = sidecar.manuais.filter((s) => !atuais.has(chave(s)));
	manuais = [...sidecar.manuais.filter((s) => atuais.has(chave(s))), ...novos];
	if (novos.length) avisos.push(`${novos.length} som(ns) posto(s) à mão no "sfx" virou(aram) manual: ${novos.map((s) => `${s.som}@${s.t}`).join(', ')}`);
	if (apagados.length) avisos.push(`${apagados.length} manual(is) apagado(s) do "sfx" saiu(íram): ${apagados.map((s) => `${s.som}@${s.t}`).join(', ')}`);
} else if (ed.sfxAuto === false && (ed.sfx ?? []).length && !args.includes('--manuais-do-json')) {
	falha(`o json já tem "sfxAuto": false e ${ed.sfx.length} sons, sem ${path.basename(sidecarArq)}. Não sei quais são manuais: rode com --manuais-do-json para tratar todos como manuais.`);
} else {
	manuais = (ed.sfx ?? []).map((s) => ({...s}));
}

// ---------- medição (cache em 05_LAB/sfx/medidas.tsv; falha de ffmpeg nunca entra no cache) ----------
const CACHE = path.join(LAB, 'medidas.tsv');
const cache = new Map();
if (fs.existsSync(CACHE)) fs.readFileSync(CACHE, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).forEach((l) => { const [som, tam, dur, mmax, tpico, rms50] = l.split('\t'); cache.set(`${som}|${tam}`, {dur: +dur, mmax: +mmax, tpico: +tpico, rms50: +rms50}); });
let cacheMudou = false;
const rodar = (cmd, a, oQue) => {
	const r = spawnSync(cmd, a, {encoding: 'utf8', maxBuffer: 64 << 20});
	if (r.status !== 0) falha(`${cmd} falhou (${oQue}): ${(r.stderr || '').trim().split('\n').pop()}`);
	return r;
};
const medir = (s) => {
	const tam = fs.statSync(s.origem).size;
	const k = `${s.som}|${tam}`;
	if (cache.has(k)) return cache.get(k);
	const dur = Number(rodar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', s.origem], s.som).stdout.trim());
	const eb = rodar('ffmpeg', ['-hide_banner', '-nostats', '-v', 'verbose', '-i', s.origem, '-af', 'apad=whole_dur=1,ebur128=framelog=verbose', '-f', 'null', '-'], s.som).stderr;
	const ms = [...eb.matchAll(/t:\s*[\d.]+\s+TARGET:.*?M:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
	// RMS de 50 ms em estéreo (o downmix mono cancelaria conteúdo fora de fase)
	const rms = rodar('ffmpeg', ['-v', 'error', '-i', s.origem, '-af', 'asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], s.som).stdout;
	let tpico = 0;
	let melhor = -Infinity;
	let tAtual = 0;
	for (const l of rms.split(/\r?\n/)) {
		const t = l.match(/pts_time:([\d.]+)/);
		if (t) tAtual = Number(t[1]);
		const v = l.match(/RMS_level=(-?[\d.]+|-inf)/);
		if (v && v[1] !== '-inf' && Number(v[1]) > melhor) [melhor, tpico] = [Number(v[1]), tAtual + 0.025];
	}
	if (!Number.isFinite(dur) || !ms.length || !Number.isFinite(melhor)) falha(`medição inválida de ${s.som} (${s.origem})`);
	const m = {dur: +dur.toFixed(3), mmax: Math.max(...ms), tpico: +Math.min(tpico, dur).toFixed(3), rms50: +melhor.toFixed(1)};
	cache.set(k, m);
	cacheMudou = true;
	return m;
};
// Nível do som: o maior entre o loudness momentâneo (janela de 400 ms) e o RMS de 50 ms − 3 dB.
// Só o de 400 ms dilui um clique de 0,1 s (subestima ~6 dB) e o ganho subiria demais.
const nivelSom = (m) => Math.max(m.mmax, m.rms50 - 3);

// ---------- voz ----------
const vozArq = path.join(proj, ed.voz ?? ed.bruto);
const ebVoz = rodar('ffmpeg', ['-hide_banner', '-nostats', '-i', vozArq, '-vn', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], 'voz').stderr;
const LUFS_VOZ = Number([...ebVoz.matchAll(/I:\s*(-?[\d.]+)\s*LUFS/g)].pop()?.[1]); // a última é a do resumo
if (!Number.isFinite(LUFS_VOZ)) falha(`não consegui medir a voz em ${vozArq}`);

// ---------- bancos de som ----------
// 'nome' = raiz de 02_BIBLIOTECA/sfx · 'mx:<pasta>:<NN>' = Motionix · 'lab:<categoria>' = todos os da categoria no lab
// (o Motionix 17 é cópia idêntica do 15 e ficou de fora)
const BANCOS = {
	blur: ['whoosh_soft', 'swish_air', ...['01', '02', '05', '06', '13', '14', '15', '16', '18', '19'].map((n) => `mx:whooshes:${n}`)],
	whip: ['whoosh_fast', ...['03', '07', '08', '09', '10', '11', '20'].map((n) => `mx:whooshes:${n}`), 'lab:whoosh'],
	flash: ['shimmer', 'mx:ui-sound-effects:15', 'mx:pop:06', 'mx:data-collect:03', 'mx:data-collect:04', 'lab:ding'],
	glitch: ['glitch', 'mx:ui-sound-effects:11', 'mx:ui-sound-effects:12', 'lab:glitch'],
	pop: ['pop_soft', 'click_soft', 'tick_micro', ...['01', '03', '04', '05'].map((n) => `mx:clicks:${n}`),
		...['02', '06', '07', '13', '14', '17', '20'].map((n) => `mx:ui-sound-effects:${n}`), 'mx:pop:04', 'mx:pop:05', 'lab:clique'],
};
const resolver = (ent) => {
	if (ent.startsWith('mx:')) {
		const [, pasta, n] = ent.split(':');
		const f = fs.readdirSync(path.join(LIB, 'motionix', pasta)).find((x) => x.startsWith(`${pasta}_${n}_`) && x.endsWith('.wav'));
		if (!f) falha(`Motionix ${pasta} ${n} não encontrado`);
		return [{som: `motionix/${pasta}/${f.slice(0, -4)}`, origem: path.join(LIB, 'motionix', pasta, f), lab: false}];
	}
	if (ent.startsWith('lab:')) {
		const dir = path.join(LAB, ent.slice(4));
		if (!fs.existsSync(dir)) return [];
		return fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).sort().map((f) => ({som: `lab/${ent.slice(4)}/${f.slice(0, -4)}`, origem: path.join(dir, f), lab: true}));
	}
	const f = path.join(LIB, `${ent}.wav`);
	if (!fs.existsSync(f)) falha(`${ent}.wav não está em 02_BIBLIOTECA/sfx`);
	return [{som: ent, origem: f, lab: false}];
};
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const tirados = [];
const banco = {};
for (const [tipo, lista] of Object.entries(BANCOS)) {
	const vistos = new Set();
	const alvo = tipo === 'pop' ? NIVEL.pop : NIVEL.trans;
	banco[tipo] = lista.flatMap(resolver).filter((s) => {
		const h = md5(s.origem);
		if (vistos.has(h)) return false; // arquivo idêntico com outro nome
		vistos.add(h);
		// som baixo demais para chegar ao alvo sem vol > 1 (o Edicao.tsx não amplifica)
		if (LUFS_VOZ + alvo + 1.5 - nivelSom(medir(s)) > 0) { tirados.push(s.som); return false; }
		return true;
	});
	if (banco[tipo].length < 4) falha(`banco "${tipo}" ficou com ${banco[tipo].length} sons`);
}

// ---------- sorteio: semente por evento, ordem cronológica ----------
const semente = (txt) => { let h = 2166136261; for (const c of `${SEMENTE}|${path.basename(proj)}|${txt}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const gerador = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// Por tipo: fora os últimos K usados (K = metade do banco, até 5) e, entre os que sobram, o menos usado até ali;
// o empate se resolve pela ordem sorteada com a semente do evento.
const usos = {};
const ultimos = {};
const sortear = (tipo, rnd) => {
	const b = [...banco[tipo]];
	for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
	const u = (ultimos[tipo] ??= []);
	const k = Math.min(5, Math.floor(b.length / 2));
	const livres = b.filter((x) => !u.slice(-k).includes(x.som));
	const s = (livres.length ? livres : b).map((x, i) => [x, i]).sort((p, q) => (usos[p[0].som] ?? 0) - (usos[q[0].som] ?? 0) || p[1] - q[1])[0][0];
	u.push(s.som);
	usos[s.som] = (usos[s.som] ?? 0) + 1;
	return s;
};

// ---------- posições ----------
const medidaAuto = Object.fromEntries(TIPOS.map((t) => [t, medir(resolver(SOM_AUTO[t][0])[0])]));
const picoAuto = (tipo) => SOM_AUTO[tipo][2] + medidaAuto[tipo].tpico; // onde o automático punha o pico, relativo ao corte
const manEnts = manuais.map((mn) => {
	// o render copia 02_BIBLIOTECA/sfx para 05_audio/sfx; um som próprio do projeto só existe lá
	const noProj = path.join(proj, '05_audio', 'sfx', `${mn.som}.wav`);
	const ent = {som: mn.som, origem: fs.existsSync(noProj) ? noProj : path.join(LIB, `${mn.som}.wav`), lab: false};
	if (!fs.existsSync(ent.origem)) falha(`som manual ${mn.som}.wav não existe`);
	const m = medir(ent);
	return {mn, ent, m, ini: mn.t, pico: mn.t + m.tpico};
});
const perto = (t, lista, d) => lista.some((x) => Math.abs(x - t) < d);
const marcasManuais = manEnts.flatMap((x) => [x.ini, x.pico]);
const transicoes = cortes.map((c) => ({...c, pico: c.t + picoAuto(c.tipo)})).filter((c) => !perto(c.pico, marcasManuais, 0.35) && !perto(c.t, marcasManuais, 0.35));
const ocupados = [...transicoes.map((c) => c.pico), ...marcasManuais];
const palavras = JSON.parse(fs.readFileSync(path.join(proj, ed.palavras), 'utf8'));
const chaves = new Set((ed.destaques ?? []).map(normalizar));
const pops = [];
const vistas = new Set();
for (const w of palavras) {
	const k = normalizar(w.w);
	if (!chaves.has(k) || vistas.has(k)) continue;
	vistas.add(k); // só a 1ª ocorrência concorre
	if (pops.length && w.ini - pops[pops.length - 1].t < GAP_POP) continue;
	if (perto(w.ini, ocupados, 0.6)) continue;
	pops.push({t: w.ini, palavra: w.w});
}

// ---------- sons ----------
const cortesDir = path.join(proj, '05_audio', 'sfx', 'lab', 'cortes');
const preparar = (s) => {
	const m = medir(s);
	if (m.dur <= MAX_DUR) return {s, m};
	// cópia aparada: começa até 1 s antes do pico, dura 2,4 s, fade-out de 0,35 s
	const ini = Math.max(0, m.tpico - 1.0);
	const nome = s.som.replace(/[\\/]/g, '__');
	const destino = path.join(cortesDir, `${nome}.wav`);
	if (!SECO && !fs.existsSync(destino)) {
		fs.mkdirSync(cortesDir, {recursive: true});
		const tmp = destino.replace(/\.wav$/, '.tmp.wav');
		const af = `${ini > 0 ? 'afade=t=in:d=0.03,' : ''}afade=t=out:st=${(MAX_DUR - 0.35).toFixed(2)}:d=0.35`;
		rodar('ffmpeg', ['-v', 'error', '-y', '-ss', ini.toFixed(3), '-t', String(MAX_DUR), '-i', s.origem, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', tmp], `aparar ${s.som}`);
		const d = Number(rodar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp], 'conferir aparo').stdout.trim());
		if (!(Math.abs(d - MAX_DUR) < 0.05)) { fs.rmSync(tmp, {force: true}); falha(`aparo de ${s.som} saiu com ${d} s`); }
		fs.renameSync(tmp, destino);
	}
	return {s: {som: `lab/cortes/${nome}`, origem: destino, lab: false}, m: {...m, dur: MAX_DUR, tpico: m.tpico - ini}};
};
const nivelar = (m, alvo, rnd) => {
	const bruto = 10 ** ((LUFS_VOZ + alvo + (rnd() * 2 - 1) * 1.5 - nivelSom(m)) / 20);
	return {vol: Math.min(1, Math.max(0.02, bruto)), limitado: bruto > 1};
};
const eventos = [...transicoes.map((c) => ({tipo: c.tipo, t: c.pico, c})), ...pops.map((p) => ({tipo: 'pop', t: p.t, p}))].sort((a, b) => a.t - b.t);
const saidaSfx = [];
for (const e of eventos) {
	const rnd = gerador(semente(`${e.tipo}|${Math.round(e.t * 10)}`));
	const {s, m} = preparar(sortear(e.tipo, rnd));
	const t = e.c ? e.c.pico - m.tpico : e.p.t - 0.03 - Math.min(m.tpico, 0.05);
	const n = nivelar(m, e.c ? NIVEL.trans : NIVEL.pop, rnd);
	saidaSfx.push({t: Math.max(0, t), som: s.som, ...n, gerado: true, _ev: e.c ? `transição ${e.tipo} @${e.c.t.toFixed(2)}` : `pop "${e.p.palavra}" @${e.p.t.toFixed(2)}`, _s: s});
}
for (const x of manEnts) {
	const n = nivelar(x.m, NIVEL.manual, gerador(semente(`manual|${chave(x.mn)}`)));
	saidaSfx.push({t: x.mn.t, som: x.mn.som, ...n, gerado: false, _ev: `manual ${x.mn.som} (era ${x.mn.vol ?? 0.5})`, _s: x.ent});
}
saidaSfx.sort((a, b) => a.t - b.t);

// ---------- relatório ----------
const dur = ed.duracao ?? palavras[palavras.length - 1]?.fim ?? 60;
const antesPops = palavras.filter((w) => chaves.has(normalizar(w.w))).length;
const antesSons = [...cortes.map((c) => SOM_AUTO[c.tipo][0]), ...Array(antesPops).fill('pop_soft'), ...manuais.map((s) => s.som)];
const maisUsado = (l) => Object.entries(l.reduce((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
const depoisSons = saidaSfx.map((s) => s.som);
const rel = (som, vol) => nivelSom(medir(resolver(som)[0])) + 20 * Math.log10(vol) - LUFS_VOZ;
const db = (v) => 20 * Math.log10(v);
console.log(`[sfx-variado] ${path.basename(proj)} · ${path.basename(edArq)} · voz ${LUFS_VOZ.toFixed(1)} LUFS · ${dur.toFixed(0)} s`);
console.log(`  ANTES : ${antesSons.length} sons (${(antesSons.length / (dur / 60)).toFixed(1)}/min), ${new Set(antesSons).size} diferentes, o mais usado "${maisUsado(antesSons)[0]}" ${maisUsado(antesSons)[1]}×, ${antesPops} pops`);
console.log(`  DEPOIS: ${saidaSfx.length} sons (${(saidaSfx.length / (dur / 60)).toFixed(1)}/min), ${new Set(depoisSons).size} diferentes, o mais usado "${maisUsado(depoisSons)[0]}" ${maisUsado(depoisSons)[1]}×, ${pops.length} pops, ${cortes.length - transicoes.length} transição(ões) sem som por coincidir com som manual`);
console.log(`  nível em relação à voz, ANTES: ${TIPOS.map((t) => `${SOM_AUTO[t][0]} ${rel(SOM_AUTO[t][0], SOM_AUTO[t][1]).toFixed(1)} dB`).join(', ')}, pop_soft ${rel('pop_soft', 0.28).toFixed(1)} dB`);
console.log(`  nível em relação à voz, DEPOIS: transição ${NIVEL.trans} dB, pop ${NIVEL.pop} dB, manual ${NIVEL.manual} dB, ±1,5 dB`);
if (tirados.length) console.log(`  fora dos bancos (baixos demais para o alvo): ${tirados.join(', ')}`);
avisos.forEach((a) => console.log(`  AVISO: ${a}`));
for (const s of saidaSfx) console.log(`   ${s.t.toFixed(2).padStart(7)}s  ${s._ev.padEnd(34)} ${s.som}  vol ${s.vol.toFixed(3)} (${db(s.vol).toFixed(1)} dB)${s.limitado ? ' LIMITADO a 1' : ''}`);
const gravarCache = () => cacheMudou && fs.writeFileSync(CACHE, ['som\ttamanho\tdur\tm_max\tt_pico\trms50', ...[...cache].map(([k, m]) => `${k.split('|')[0]}\t${k.split('|')[1]}\t${m.dur}\t${m.mmax}\t${m.tpico}\t${m.rms50}`)].join('\n') + '\n');
if (SECO) { gravarCache(); process.exit(0); }

// ---------- grava ----------
for (const s of saidaSfx) if (s._s.lab) {
	const destino = path.join(proj, '05_audio', 'sfx', `${s.som}.wav`);
	fs.mkdirSync(path.dirname(destino), {recursive: true});
	if (!fs.existsSync(destino)) fs.copyFileSync(s._s.origem, destino);
}
if (!fs.existsSync(backupArq)) fs.copyFileSync(edArq, backupArq);
ed.sfxAuto = false;
ed.sfx = saidaSfx.map((s) => ({t: +s.t.toFixed(3), som: s.som, vol: +s.vol.toFixed(3)}));
fs.writeFileSync(edArq, JSON.stringify(ed, null, 2) + '\n');
fs.writeFileSync(sidecarArq, JSON.stringify({
	nota: 'gerado por 00_SISTEMA/motor/scripts/lab/sfx-variado.mjs; manuais = sons postos à mão (mantidos), gerados = sons do script',
	assinatura,
	manuais: manuais.map((m) => ({t: m.t, som: m.som, ...(m.vol !== undefined ? {vol: m.vol} : {})})),
	gerados: ed.sfx.filter((_, i) => saidaSfx[i].gerado),
}, null, 2) + '\n');
gravarCache();
console.log(`[sfx-variado] gravado: ${path.relative(RAIZ, edArq)} ("sfxAuto": false + ${ed.sfx.length} sons); backup ${path.basename(backupArq)}; ${path.basename(sidecarArq)}`);
