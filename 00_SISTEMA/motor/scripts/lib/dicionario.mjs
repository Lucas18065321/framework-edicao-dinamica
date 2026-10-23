// Verificador de palavra pt-BR (dicionário Hunspell do LibreOffice em 00_SISTEMA/ferramentas/dicionario-ptbr).
// Leitura reversa dos afixos (sufixo e prefixo, 1 nível): diz se uma palavra transcrita existe em português.
// Uso: import {carregarDicionario} from './lib/dicionario.mjs'; const ehPalavra = carregarDicionario(); ehPalavra('funcioed') → false
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'ferramentas', 'dicionario-ptbr');

export function carregarDicionario() {
	const ler = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/^﻿/, '');
	const dic = new Map();
	for (const l of ler('pt_BR.dic').split(/\r?\n/).slice(1)) {
		if (!l) continue;
		const [w, fl = ''] = l.split('/');
		const k = w.toLowerCase();
		const atual = dic.get(k) ?? new Set();
		for (const c of [...fl.split(/\s/)[0]]) atual.add(c);
		dic.set(k, atual);
	}
	const sfx = new Map(); // fim do sufixo (últimas 2 letras) → regras
	const pfx = [];
	const cond = (c, fim) => (c === '.' ? null : new RegExp(fim ? `${c}$` : `^${c}`, 'u'));
	for (const l of ler('pt_BR.aff').split(/\r?\n/)) {
		const m = l.match(/^(SFX|PFX)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/u);
		if (!m || /^[YN]$/.test(m[3]) && /^\d+$/.test(m[4])) continue; // cabeçalho do grupo
		const [, tipo, flag, strip, addRaw, c] = m;
		const add = addRaw.split('/')[0] === '0' ? '' : addRaw.split('/')[0];
		const regra = {flag, strip: strip === '0' ? '' : strip, add, cond: cond(c, tipo === 'SFX')};
		if (tipo === 'SFX') {
			const k = add.slice(-2);
			if (!sfx.has(k)) sfx.set(k, []);
			sfx.get(k).push(regra);
		} else pfx.push(regra);
	}
	const temFlag = (stem, flag) => dic.get(stem)?.has(flag);
	const porSufixo = (w) => {
		for (const k of new Set([w.slice(-2), w.slice(-1), ''])) {
			for (const r of sfx.get(k) ?? []) {
				if (r.add && !w.endsWith(r.add)) continue;
				const stem = w.slice(0, w.length - r.add.length) + r.strip;
				if (stem && temFlag(stem, r.flag) && (!r.cond || r.cond.test(stem))) return true;
			}
		}
		return false;
	};
	const cache = new Map();
	return function ehPalavra(palavra) {
		const w = String(palavra).toLowerCase().replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');
		if (!w) return true;
		if (/\d/.test(w)) return true; // números
		if (cache.has(w)) return cache.get(w);
		let ok = dic.has(w) || porSufixo(w);
		if (!ok) for (const r of pfx) {
			if (r.add && w.startsWith(r.add)) { const resto = r.strip + w.slice(r.add.length); if (temFlag(resto, r.flag) || porSufixo(resto)) { ok = true; break; } }
		}
		if (!ok && w.includes('-')) ok = w.split('-').every((p) => !p || dic.has(p) || porSufixo(p));
		cache.set(w, ok);
		return ok;
	};
}
