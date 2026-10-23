// Corrige 02_analise/palavras.json a partir de uma lista de regras (guarda o original em palavras_original.json).
// Uso: node scripts/corrigir-palavras.mjs <pasta-do-projeto> <correcoes.json>
// correcoes.json: lista com dois tipos de regra, aplicadas em ordem:
//   troca:   { "t": 15.1, "de": "a receita leva dois o vos,", "para": "a receita leva dois ovos," }
//     t    = segundo aproximado (±2 s) onde a sequência "de" começa
//     de   = palavras exatamente como estão no palavras.json (pontuação/maiúsculas ignoradas)
//     para = texto novo ("" apaga). O tempo do trecho é redistribuído entre as palavras novas.
//   inserção: { "t": 93.0, "inserir": "A produtividade tóxica, as horas", "ini": 93.03, "fim": 99.7 }
//     coloca palavras que o Whisper pulou num VÃO sem palavras (s do bruto). Os tempos são distribuídos entre ini e fim
//     pelo tamanho de cada palavra, e as palavras entram na posição certa do array (ordem por tempo).
//     Palavra antiga que só ENCOSTA no vão (o Whisper costuma esticar a palavra por cima do silêncio) é aparada na borda;
//     palavra antiga INTEIRA dentro do vão faz a regra falhar (use uma troca). t é opcional (só para o relatório).
import fs from 'node:fs';
import path from 'node:path';

const [proj, arq] = process.argv.slice(2);
const dir = path.join(path.resolve(proj), '02_analise');
const orig = path.join(dir, 'palavras_original.json');
if (!fs.existsSync(orig)) fs.copyFileSync(path.join(dir, 'palavras.json'), orig);
let w = JSON.parse(fs.readFileSync(orig, 'utf8')); // sempre parte do original: rodar de novo é seguro
const regras = JSON.parse(fs.readFileSync(arq, 'utf8'));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}%]/gu, '');
const r3 = (x) => +x.toFixed(3);

// Inserção num vão: devolve uma mensagem de erro ou null.
const inserir = (r) => {
	const ini = Number(r.ini), fim = Number(r.fim);
	const novas = String(r.inserir).split(/\s+/).filter(Boolean);
	if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim <= ini) return 'precisa de "ini" < "fim" (s do bruto)';
	if (!novas.length) return '"inserir" vazio';
	const TOL = 0.02;
	const dentro = w.filter((x) => x.ini >= ini - TOL && x.fim <= fim + TOL);
	if (dentro.length) return `o vão ${ini}–${fim} s não está vazio: ${dentro.map((x) => `"${x.w}" (${x.ini}–${x.fim})`).join(', ')}. Use uma troca {t, de, para}`;
	const aparadas = [];
	for (const x of w) {
		if (x.ini < ini && x.fim > ini + TOL) aparadas.push(`"${x.w}" fim ${x.fim} → ${ini}`), (x.fim = r3(ini)); // esticada por cima do começo do vão
		else if (x.ini < fim - TOL && x.fim > fim && x.ini >= ini) aparadas.push(`"${x.w}" ini ${x.ini} → ${fim}`), (x.ini = r3(fim)); // começa dentro, termina depois
	}
	// tempo proporcional ao tamanho da palavra (letras + 2, ~ sílabas), sem buracos entre elas
	const peso = novas.map((p) => p.replace(/[^\p{L}\p{N}]/gu, '').length + 2);
	const total = peso.reduce((a, b) => a + b, 0);
	let t = ini;
	const itens = novas.map((p, k) => {
		const d = ((fim - ini) * peso[k]) / total;
		const it = {w: p, ini: r3(t), fim: r3(k === novas.length - 1 ? fim : t + d)};
		t += d;
		return it;
	});
	let pos = 0; // logo depois da última palavra que começa antes do vão
	w.forEach((x, k) => x.ini < ini && (pos = k + 1));
	w.splice(pos, 0, ...itens);
	return aparadas.length ? `aparadas: ${aparadas.join('; ')}` : '';
};

let falhas = 0;
for (const r of regras) {
	if ('inserir' in r) {
		const msg = inserir(r);
		const ok = msg === '' || msg.startsWith('aparadas');
		if (!ok) {
			console.warn(`✗ inserção em ${r.t ?? r.ini}s: ${msg}`);
			falhas++;
			continue;
		}
		console.log(`✓ ${r.t ?? r.ini}s  + "${r.inserir}" (${r.ini}–${r.fim} s)${msg ? `  [${msg}]` : ''}`);
		continue;
	}
	const de = r.de.split(/\s+/).filter(Boolean).map(norm);
	// entre as ocorrências a até ±2 s, usa a mais próxima de t (frases repetidas pela transcrição são comuns)
	let i = -1;
	w.forEach((x, k) => {
		if (Math.abs(x.ini - r.t) <= 2 && de.every((d, j) => w[k + j] && norm(w[k + j].w) === d) && (i === -1 || Math.abs(x.ini - r.t) < Math.abs(w[i].ini - r.t))) i = k;
	});
	if (i === -1) {
		console.warn(`✗ não achei "${r.de}" perto de ${r.t}s`);
		falhas++;
		continue;
	}
	const ini = w[i].ini, fim = w[i + de.length - 1].fim;
	const novas = r.para.split(/\s+/).filter(Boolean);
	const d = (fim - ini) / Math.max(1, novas.length);
	w.splice(i, de.length, ...novas.map((p, k) => ({w: p, ini: +(ini + k * d).toFixed(3), fim: +(ini + (k + 1) * d).toFixed(3)})));
	console.log(`✓ ${r.t}s  "${r.de}" → "${r.para}"`);
}
fs.writeFileSync(path.join(dir, 'palavras.json'), JSON.stringify(w, null, 1));
fs.writeFileSync(path.join(dir, 'transcript.json'), JSON.stringify(w.map((x) => ({text: x.w, start: x.ini, end: x.fim})), null, 1));
console.log(`${regras.length - falhas}/${regras.length} correções aplicadas · ${w.length} palavras`);
if (falhas) process.exit(2);
