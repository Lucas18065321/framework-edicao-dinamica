// Tempo da SAÍDA para os scripts (render por partes, SRT, junções, checagens).
// É a mesma conta de src/modelos/MotorCamadas.tsx (montarSegs / paraSaida): cortes arredondados no grid de quadros
// do fps do modelo e pausas {pausa: s} sem voz. Se o motor mudar essa conta, mude aqui também.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const MOTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RAIZ = path.resolve(MOTOR, '..', '..');

export const lerModelos = () => JSON.parse(fs.readFileSync(path.join(MOTOR, 'src', 'modelos.json'), 'utf8'));

// Lê o edicao.json (ou o arquivo de --edicao, relativo ao projeto) e completa `duracao` pelo meta.json, como o render.
export const lerEdicao = (proj, arq) => {
	const edPath = path.resolve(proj, arq ?? path.join('03_roteiro', 'edicao.json'));
	if (!fs.existsSync(edPath)) throw new Error(`Não achei ${edPath}`);
	const ed = JSON.parse(fs.readFileSync(edPath, 'utf8'));
	const reg = lerModelos();
	const idModelo = ed.modelo ?? reg.padrao;
	const mod = reg.modelos[idModelo];
	if (!mod) throw new Error(`Modelo desconhecido: "${idModelo}". Opções: ${Object.keys(reg.modelos).join(', ')}`);
	const meta = path.join(proj, '02_analise', 'meta.json');
	if (fs.existsSync(meta)) ed.duracao ??= JSON.parse(fs.readFileSync(meta, 'utf8')).duracao_s;
	return {ed, edPath, idModelo, mod, fps: mod.fps};
};

// Trechos do bruto e pausas, na ordem da saída: {ini, fim} em s da saída; bruto = início no bruto (null = pausa).
export const montarSegs = (ed, fps) => {
	const q = (s) => Math.round(s * fps) / fps;
	if (!ed.montagem?.length) return [{ini: 0, fim: ed.duracao, bruto: 0}];
	let t = 0;
	return ed.montagem.map((m) => {
		const d = 'pausa' in m ? q(m.pausa) : q(m.fim) - q(m.ini);
		const s = {ini: t, fim: t + d, bruto: 'pausa' in m ? null : q(m.ini)};
		t += d;
		return s;
	});
};

// "assinatura" da montagem (para saber se um resultado, ex. o juncoes.json, foi medido com a montagem atual)
export const assinaturaMontagem = (ed) => crypto.createHash('sha1').update(JSON.stringify(ed.montagem ?? null)).digest('hex').slice(0, 12);

// s do bruto → s da saída (null quando o instante ficou fora da montagem)
export const paraSaida = (tb, segs) => {
	for (const s of segs) if (s.bruto != null && tb >= s.bruto - 1e-6 && tb < s.bruto + (s.fim - s.ini) - 1e-6) return s.ini + (tb - s.bruto);
	return null;
};

// índice do trecho que contém o instante do bruto (ou -1)
export const trechoDoBruto = (tb, segs) => segs.findIndex((s) => s.bruto != null && tb >= s.bruto - 1e-6 && tb < s.bruto + (s.fim - s.ini) - 1e-6);

export const duracaoSaida = (segs) => segs[segs.length - 1].fim;
// duração da composição em quadros (calcularCamadas: ceil do fim do último trecho)
export const quadrosSaida = (segs, fps) => Math.max(1, Math.ceil(duracaoSaida(segs) * fps));

// Palavras no tempo da saída, na ordem da saída (a montagem pode reordenar o bruto). O fim é cortado no fim do trecho.
// Sem reordenar por tempo: os trechos já vêm na ordem da saída e, dentro de cada um, vale a ordem do palavras.json (o
// Whisper às vezes deixa palavras de 0 s com o tempo alguns ms fora de ordem, e ordenar trocaria a ordem do texto).
// Trecho do bruto usado duas vezes na montagem (gancho reaproveitado) tem as palavras nas duas vezes.
export const palavrasNaSaida = (palavras, segs) => {
	const out = [];
	segs.forEach((s, k) => {
		if (s.bruto == null) return;
		const fimB = s.bruto + (s.fim - s.ini);
		for (const w of palavras) {
			if (w.ini < s.bruto - 1e-6 || w.ini >= fimB - 1e-6) continue;
			const ini = s.ini + (w.ini - s.bruto);
			out.push({w: w.w, ini, fim: Math.max(ini, Math.min(s.fim, s.ini + (w.fim - s.bruto))), trecho: k});
		}
	});
	return out;
};

// 83.4 → "1:23"; 3725 → "1:02:05" (corta os décimos: capítulo do YouTube começa um pouco antes, nunca depois)
export const relogio = (s) => {
	const t = Math.max(0, Math.floor(s + 1e-6));
	const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
	return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

// 83.4 → "1:23,4" (para relatórios)
export const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`;
