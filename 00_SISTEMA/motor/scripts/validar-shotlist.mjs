// Valida a shot list do INSTAGRAM - PAPER VOX ANIMATION (quadro contínuo) contra as regras do guia
// (01_REFERENCIAS/modelos/paper-vox-instagram/guia-de-estilo.md) e contra o palavras.json travado.
// Uso (de dentro do motor): node scripts/validar-shotlist.mjs <proj> [--shotlist 03_roteiro/shotlist.json]
// ERRO (código 1):
//   - palavra da fala fora de estação, ou em duas; montagem por cima de fala; "fala" diferente da transcrição;
//   - texto de tela que não está na fala da estação, âncora (palavra@segundo) que não acha a palavra;
//   - < 4 eventos nos 3 primeiros s; 3 receitas iguais seguidas; o mesmo arquivo de SFX duas vezes seguidas;
//   - imagens acima do teto (25 por minuto); palavra vetada na tela; palavra em dúvida na tela;
//   - plano de montagem fora de 0,12–0,4 s ou montagem maior que a pausa.
// AVISO: buraco > 1,5 s sem evento (fora de respiro), estação < 1 s, mesma chegada 3× seguidas, mesma categoria de
//   SFX 3× seguidas.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const proj = path.resolve(args[0] ?? '');
const slPath = path.resolve(proj, opt('--shotlist', '03_roteiro/shotlist.json'));
if (!args[0] || !fs.existsSync(slPath)) {
	console.error('Uso: node scripts/validar-shotlist.mjs <proj> [--shotlist 03_roteiro/shotlist.json]');
	process.exit(1);
}
const sl = JSON.parse(fs.readFileSync(slPath, 'utf8'));
const pal = JSON.parse(fs.readFileSync(path.resolve(proj, sl.palavras ?? '02_analise/palavras.json'), 'utf8'));
const erros = [], avisos = [];
const E = (m) => erros.push(m), A = (m) => avisos.push(m);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}%\s]/gu, ' ').split(/\s+/).filter(Boolean);
const meio = (w) => (w.ini + w.fim) / 2;
const est = sl.estacoes ?? [];
const mont = sl.montagens ?? [];

// âncora "palavra@segundo" → índice da palavra mais perto com esse texto
const ancora = (a, faixa) => {
	const m = String(a).match(/^(.+)@([\d.]+)$/);
	if (!m) return -1;
	const alvo = norm(m[1]).join(' '), t = Number(m[2]);
	let best = -1, bd = Infinity;
	pal.forEach((w, i) => {
		if (norm(w.w).join(' ') !== alvo) return;
		if (faixa && (meio(w) < faixa[0] - 0.05 || meio(w) > faixa[1] + 0.05)) return;
		const d = Math.abs(w.ini - t);
		if (d < bd) (bd = d), (best = i);
	});
	return bd <= 1.0 ? best : -1;
};

// 1. cobertura da fala e "fala" exata
const dono = new Array(pal.length).fill(null);
for (const e of est) {
	const idx = pal.map((w, i) => (meio(w) >= e.ini && meio(w) < e.fim ? i : -1)).filter((i) => i >= 0);
	for (const i of idx) {
		if (dono[i]) E(`palavra "${pal[i].w}" (${pal[i].ini}s) em duas estações: ${dono[i]} e ${e.id}`);
		dono[i] = e.id;
	}
	const fala = norm(idx.map((i) => pal[i].w).join(' ')).join(' ');
	if (e.fala != null && norm(e.fala).join(' ') !== fala) E(`${e.id}: "fala" não bate com a transcrição do intervalo ${e.ini}–${e.fim} s → "${idx.map((i) => pal[i].w).join(' ')}"`);
	if (e.fim - e.ini < 1 && !e.rajada) A(`${e.id}: estação de ${(e.fim - e.ini).toFixed(2)} s (< 1 s)`);
	e._idx = idx;
}
pal.forEach((w, i) => { if (!dono[i]) E(`palavra "${w.w}" (${w.ini}–${w.fim} s) fora de qualquer estação`); });
for (const m of mont) {
	const [a, b] = m.pausa;
	const dentro = pal.filter((w) => meio(w) > a + 0.05 && meio(w) < b - 0.05);
	if (dentro.length) E(`${m.id}: montagem ${a}–${b} s por cima da fala: ${dentro.map((w) => w.w).join(' ')}`);
	const soma = (m.planos ?? []).reduce((s, p) => s + p.dur, 0) + (m.entrada?.dur ?? 0) + (m.saida?.dur ?? 0);
	if (soma > b - a + 0.3) E(`${m.id}: planos + entrada + saída = ${soma.toFixed(2)} s numa pausa de ${(b - a).toFixed(2)} s`);
	for (const p of m.planos ?? []) if (p.dur < 0.12 || p.dur > 0.4) E(`${m.id}: plano de ${p.dur} s (0,12–0,4)`);
}

// 2. texto de tela
// palavras vetadas na tela (padrão: promessas absolutas e exageros; ajuste à sua marca)
const VETADAS = ['promessa', 'cura', 'curar', 'garantia', 'garantido', 'garantida', '100%', 'milagre', 'definitivo', 'definitiva'];
const duvidas = (sl.duvidas ?? []).map((d) => norm(d.palavra).join(' '));
for (const e of est) {
	const fala = norm(e._idx.map((i) => pal[i].w).join(' ')).join(' ');
	for (const tx of e.texto ?? []) {
		const t = norm(tx.t).join(' ');
		if (!(` ${fala} `).includes(` ${t} `)) E(`${e.id}: texto "${tx.t}" não está na fala da estação`);
		if (tx.ancora && ancora(tx.ancora, [e.ini, e.fim]) < 0) E(`${e.id}: âncora "${tx.ancora}" não acha a palavra dentro da estação`);
		for (const v of VETADAS) if (norm(tx.t).includes(v)) E(`${e.id}: palavra vetada na tela: "${v}"`);
		for (const d of duvidas) if ((` ${t} `).includes(` ${d} `)) E(`${e.id}: palavra em dúvida na tela: "${d}" (espera o usuário)`);
	}
	for (const ev of e.eventos ?? []) if (ev.ancora && ancora(ev.ancora, [e.ini - 0.5, e.fim + 0.5]) < 0) E(`${e.id}: âncora de evento "${ev.ancora}" não acha a palavra`);
}

// 3. eventos (instantes): chegada, cada palavra do texto de tela (entram uma a uma), eventos
const instantes = [];
for (const e of est) {
	instantes.push({t: e.ini, e: e.id, resp: e.respiro});
	for (const x of [...(e.texto ?? []), ...(e.eventos ?? [])]) {
		const i = x.ancora ? ancora(x.ancora, [e.ini - 0.5, e.fim + 0.5]) : -1;
		const t = i >= 0 ? pal[i].ini : x.seg;
		if (t != null) instantes.push({t, e: e.id, resp: e.respiro});
		if (i >= 0 && x.t) for (let k = 1; k < norm(x.t).length && i + k < pal.length; k++) instantes.push({t: pal[i + k].ini, e: e.id, resp: e.respiro});
	}
}
for (const m of mont) for (let k = 0, t = m.pausa[0] + (m.entrada?.dur ?? 0); k < (m.planos ?? []).length; t += m.planos[k].dur, k++) instantes.push({t, e: m.id});
instantes.sort((a, b) => a.t - b.t);
const nos3 = new Set(instantes.filter((x) => x.t < 3).map((x) => x.t.toFixed(2))).size;
if (nos3 < 4) E(`só ${nos3} eventos nos 3 primeiros s (mínimo 4)`);
for (let i = 1; i < instantes.length; i++) {
	const g = instantes[i].t - instantes[i - 1].t;
	if (g > 1.5 && !instantes[i - 1].resp) A(`${(g).toFixed(1)} s sem evento entre ${instantes[i - 1].t.toFixed(1)} s e ${instantes[i].t.toFixed(1)} s (${instantes[i - 1].e} → ${instantes[i].e})`);
}

// 4. receitas, chegadas, SFX
for (let i = 2; i < est.length; i++) {
	if (est[i].receita === est[i - 1].receita && est[i].receita === est[i - 2].receita) E(`3 receitas "${est[i].receita}" seguidas: ${est[i - 2].id}, ${est[i - 1].id}, ${est[i].id}`);
	const ch = (x) => x.chegada?.tipo;
	if (ch(est[i]) && ch(est[i]) === ch(est[i - 1]) && ch(est[i]) === ch(est[i - 2])) A(`chegada "${ch(est[i])}" 3× seguidas até ${est[i].id}`);
}
const sfx = [...est.flatMap((e) => (e.sfx ?? []).map((s) => ({...s, e: e.id}))), ...mont.flatMap((m) => (m.sfx ?? []).map((s) => ({...s, e: m.id})))]
	.map((s) => ({...s, t: s.seg ?? (s.ancora ? pal[ancora(s.ancora)]?.ini : null)})).filter((s) => s.t != null).sort((a, b) => a.t - b.t);
for (let i = 1; i < sfx.length; i++) {
	if (sfx[i].som && sfx[i].som === sfx[i - 1].som) E(`o mesmo SFX duas vezes seguidas: ${sfx[i].som} (${sfx[i - 1].e} e ${sfx[i].e})`);
	if (i >= 2 && sfx[i].cat && sfx[i].cat === sfx[i - 1].cat && sfx[i].cat === sfx[i - 2].cat) A(`SFX "${sfx[i].cat}" 3× seguidas até ${sfx[i].e} (rodízio de arquivos)`);
}

// 5. imagens
const imgs = new Set();
for (const e of est) for (const c of e.camadas ?? []) if (c.fonte && !/^codigo/.test(c.fonte)) imgs.add(c.fonte);
for (const m of mont) for (const p of m.planos ?? []) if (p.fonte) imgs.add(p.fonte);
const dur = pal[pal.length - 1].fim;
const teto = Math.floor((25 * dur) / 60);
if (imgs.size > teto) E(`${imgs.size} imagens para ${dur.toFixed(0)} s (teto ${teto}: 25 por minuto)`);
const semImg = est.filter((e) => !(e.camadas ?? []).some((c) => c.fonte && !/^codigo/.test(c.fonte))).length;
if (semImg / Math.max(1, est.length) < 0.35) A(`só ${semImg} de ${est.length} estações sem imagem (alvo ≥ 35%)`);

console.log(`[shotlist] ${est.length} estações, ${mont.length} montagens, ${imgs.size} imagens (${[...imgs].filter((f) => /^flow/.test(f)).length} do Flow), ${sfx.length} SFX, ${instantes.length} eventos (${(instantes.length / dur).toFixed(2)} por s), ${semImg} estações sem imagem`);
for (const m of erros) console.log(`ERRO  ${m}`);
for (const m of avisos) console.log(`AVISO ${m}`);
console.log(erros.length ? `[shotlist] ${erros.length} ERRO(S), ${avisos.length} aviso(s)` : `[shotlist] 0 ERRO, ${avisos.length} aviso(s)`);
process.exit(erros.length ? 1 : 0);
