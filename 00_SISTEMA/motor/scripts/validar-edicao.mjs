// Valida o 03_roteiro/edicao.json contra as regras DURAS do formato escolhido (campo "modelo"), antes da ilha e do render.
// Princípio: a IA escreve o edicao.json, este script confere as regras e o hook roda o script sozinho. O hook é um
// PostToolUse em Write|Edit no .claude/settings.json de "04 - EDIÇÃO DE VÍDEO" e devolve os ERROS ao modelo.
// Uso: node scripts/validar-edicao.mjs <proj> [--edicao 03_roteiro/edicao.json] [--todos]
//      node scripts/validar-edicao.mjs --hook   (lê o JSON do hook no stdin; só age se o arquivo for */03_roteiro/edicao.json)
//   --todos  lista todos os itens de cada achado (padrão: 6)
// Saída: linhas ERRO/AVISO; código 1 se houver ERRO. Não grava nada (o checar-mix roda com --sem-relatorio).
// Regras (ERRO trava; aviso não):
//   todos  estrutura conforme src/tipos.ts (lido na hora: campo novo lá passa a valer aqui) e peça (`tipo`) do registro
//          de camadas · formato do modelos.json: Instagram 1080×1920 a 24 fps, YouTube 1920×1080 a 30 fps · corte da
//          montagem nunca no meio de palavra (palavras.json; corte dentro de pausa medida em 02_analise/pausas_*.json
//          vale; palavra com tempo colado do Whisper vira aviso, porque o fim dela engole a pausa)
//          avisos: troca de cena (só imagem) dentro de palavra · bruto fora do fps/aspecto do formato
//   MIX    tudo o que o checar-mix.mjs confere (cenas, plano mínimo de 30 q, rosto desfocado, zoom, B-roll repetido,
//          arquivos, flashes, recortes, capítulos), sem duplicar aqui · rodízio de zoom: toda fala declara enquadramento,
//          zoom ou chaves; nunca dois planos colados no mesmo enquadramento; close C ≤ 4 s · música só na intro (cada
//          trilha com `fim` até o 2º capítulo) · rodapé `fonte` a 26 px
//   CUT    cenas sem buraco · plano de fala ≤ 12 q entre falas (pisca o zoom; aviso < 1 s: o piloto aprovado tem 14 e
//          22 q no gancho) · escala ≤ 1,25 × (bruto/quadro) · silhueta só na 1ª cena · chicote/mergulho/esticão só no
//          MIX · marca ≤ 2,5 s depois da última fala · B-roll sem repetir · arquivos existem · 'atras' dentro dos
//          recortes · rodapé `fonte` a 26 px · aviso sem texto 'atras' nos primeiros 3 s · aviso com menos recortes
//          de objeto (`imagem`/`orbita`) que max(3, duração/20 s) (preferências do usuário)
//   TELA DIVIDIDA (congelado)  cenas sem buraco · plano ≥ 1 s · fonte "A" · glitch ≤ 1 · B-roll sem repetir · arquivos
// Fontes: guias de 01_REFERENCIAS/modelos/*/guia-de-estilo.md e manual do motor (CLAUDE.md), com as preferências do
// usuário. Mudou uma regra do formato (a pedido do usuário)? Mude aqui também e rode nos 3 pilotos, que precisam passar.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {MOTOR, RAIZ, lerEdicao, montarSegs, duracaoSaida, mmss} from './lib/saida.mjs';

const args = process.argv.slice(2);
const opcao = (n) => (args.indexOf(n) === -1 ? undefined : args[args.indexOf(n) + 1]);
const MAX_ITENS = args.includes('--todos') ? Infinity : 6;

const lerJson = (p) => {
	try {
		return JSON.parse(fs.readFileSync(p, 'utf8'));
	} catch {
		return null;
	}
};
const desc = (v) => (v === undefined ? 'nada' : JSON.stringify(v)?.slice(0, 40));
const s3 = (t) => `${+t.toFixed(3)} s`;

// ---------- tipos.ts → verificador de estrutura ----------
// Lê os `export type` do arquivo e confere o valor contra eles (objetos, listas, tuplas, uniões, interseções,
// literais, `Tipo['campo']` e `NonNullable<>`). Campo fora do tipo é ERRO: o motor ignora calado (erro de digitação).
const lerTipos = () => {
	const src = fs
		.readFileSync(path.join(MOTOR, 'src', 'tipos.ts'), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/[^\n]*/g, '');
	const toks = src.match(/'[^']*'|"[^"]*"|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|\S/g) ?? [];
	let i = 0;
	const ver = () => toks[i];
	const prox = () => toks[i++];
	const esperar = (t) => {
		if (toks[i] !== t) throw new Error(`tipos.ts: esperava "${t}" e achei "${toks[i]}"`);
		i++;
	};
	const tipo = () => {
		if (ver() === '|') prox();
		const ms = [inter()];
		while (ver() === '|') prox(), ms.push(inter());
		return ms.length === 1 ? ms[0] : {k: 'uniao', membros: ms};
	};
	const inter = () => {
		const ps = [posfixo()];
		while (ver() === '&') prox(), ps.push(posfixo());
		return ps.length === 1 ? ps[0] : {k: 'inter', partes: ps};
	};
	const posfixo = () => {
		let n = primario();
		while (ver() === '[') {
			if (toks[i + 1] === ']') (i += 2), (n = {k: 'lista', de: n});
			else {
				prox();
				const chave = prox().slice(1, -1);
				esperar(']');
				n = {k: 'indice', de: n, chave};
			}
		}
		return n;
	};
	const objeto = () => {
		const campos = {};
		let indice = null;
		while (ver() !== '}') {
			if (ver() === '[') {
				prox(), prox(), esperar(':'), tipo(), esperar(']'), esperar(':');
				indice = tipo();
			} else {
				const nome = prox();
				const opc = ver() === '?';
				if (opc) prox();
				esperar(':');
				campos[nome] = {tipo: tipo(), opc};
			}
			if (ver() === ';' || ver() === ',') prox();
		}
		prox();
		return {k: 'obj', campos, indice};
	};
	const primario = () => {
		const t = prox();
		if (t === '(') {
			const n = tipo();
			esperar(')');
			return n;
		}
		if (t === '{') return objeto();
		if (t === '[') {
			const itens = [];
			while (ver() !== ']') {
				itens.push(tipo());
				if (ver() === ',') prox();
			}
			prox();
			return {k: 'tupla', itens};
		}
		if (/^['"]/.test(t)) return {k: 'lit', v: t.slice(1, -1)};
		if (/^\d/.test(t)) return {k: 'lit', v: Number(t)};
		if (t === 'true' || t === 'false') return {k: 'lit', v: t === 'true'};
		if (['number', 'string', 'boolean', 'unknown', 'any'].includes(t)) return {k: t};
		if (/^[A-Za-z_$]/.test(t)) {
			if (ver() !== '<') return {k: 'ref', nome: t};
			prox();
			const arg = tipo();
			esperar('>');
			if (t !== 'NonNullable') throw new Error(`tipos.ts: genérico ${t}<> não suportado pelo validador`);
			return arg;
		}
		throw new Error(`tipos.ts: não entendi "${t}"`);
	};
	const T = {};
	while (i < toks.length) {
		if (toks[i] === 'export' && toks[i + 1] === 'type') {
			i += 2;
			const nome = prox();
			esperar('=');
			T[nome] = tipo();
			if (ver() === ';') prox();
		} else i++;
	}

	const resolver = (n) => {
		for (;;) {
			if (n.k === 'ref') {
				if (!T[n.nome]) throw new Error(`tipos.ts: tipo ${n.nome} não existe`);
				n = T[n.nome];
			} else if (n.k === 'indice') {
				const c = comoObjeto(n.de)?.campos[n.chave];
				if (!c) throw new Error(`tipos.ts: campo ${n.chave} não existe`);
				n = c.tipo;
			} else return n;
		}
	};
	const comoObjeto = (n) => {
		n = resolver(n);
		if (n.k === 'obj') return n;
		if (n.k !== 'inter') return null;
		const out = {k: 'obj', campos: {}, indice: null};
		for (const p of n.partes) {
			const o = comoObjeto(p);
			if (!o) return null;
			Object.assign(out.campos, o.campos);
			out.indice ??= o.indice;
		}
		return out;
	};
	const forma = (n) => {
		n = resolver(n);
		if (n.k === 'lista' || n.k === 'tupla') return 'array';
		if (n.k === 'obj' || n.k === 'inter') return 'object';
		if (n.k === 'lit') return typeof n.v;
		if (n.k === 'uniao') return 'uniao';
		return n.k;
	};
	const formaValor = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
	const nome = (n) => {
		n = resolver(n);
		if (n.k === 'lit') return JSON.stringify(n.v);
		if (n.k === 'lista') return `${nome(n.de)}[]`;
		if (n.k === 'tupla') return `[${n.itens.map(nome).join(', ')}]`;
		if (n.k === 'obj' || n.k === 'inter') return '{…}';
		if (n.k === 'uniao') return n.membros.map(nome).join(' | ');
		return n.k;
	};
	const junta = (onde, k) => (onde ? `${onde}.${k}` : k);
	const checar = (v, n, onde, erros) => {
		n = resolver(n);
		switch (n.k) {
			case 'unknown':
			case 'any':
				return;
			case 'number':
				if (typeof v !== 'number' || !Number.isFinite(v)) erros.push(`${onde}: precisa ser número (veio ${desc(v)})`);
				return;
			case 'string':
			case 'boolean':
				if (typeof v !== n.k) erros.push(`${onde}: precisa ser ${n.k === 'string' ? 'texto' : 'true/false'} (veio ${desc(v)})`);
				return;
			case 'lit':
				if (v !== n.v) erros.push(`${onde}: precisa ser ${JSON.stringify(n.v)} (veio ${desc(v)})`);
				return;
			case 'lista':
				if (!Array.isArray(v)) return void erros.push(`${onde}: precisa ser lista ${nome(n)} (veio ${desc(v)})`);
				v.forEach((x, k) => checar(x, n.de, `${onde}[${k}]`, erros));
				return;
			case 'tupla':
				if (!Array.isArray(v) || v.length !== n.itens.length) return void erros.push(`${onde}: precisa ser ${nome(n)} (veio ${desc(v)})`);
				v.forEach((x, k) => checar(x, n.itens[k], `${onde}[${k}]`, erros));
				return;
			case 'obj':
			case 'inter': {
				const o = comoObjeto(n);
				if (!v || typeof v !== 'object' || Array.isArray(v)) return void erros.push(`${onde || 'edicao'}: precisa ser objeto {…} (veio ${desc(v)})`);
				for (const [k, c] of Object.entries(o.campos)) {
					if (v[k] === undefined) {
						if (!c.opc) erros.push(`${junta(onde, k)}: obrigatório e não veio`);
					} else checar(v[k], c.tipo, junta(onde, k), erros);
				}
				for (const k of Object.keys(v)) {
					if (k in o.campos) continue;
					if (o.indice) checar(v[k], o.indice, junta(onde, k), erros);
					else erros.push(`${junta(onde, k)}: campo que não existe em tipos.ts (o motor ignora; erro de digitação?)`);
				}
				return;
			}
			case 'uniao': {
				const ms = n.membros.map(resolver);
				if (ms.every((m) => m.k === 'lit')) {
					if (!ms.some((m) => m.v === v)) erros.push(`${onde}: ${desc(v)} não vale; opções: ${ms.map((m) => JSON.stringify(m.v)).join(' | ')}`);
					return;
				}
				const fv = formaValor(v);
				const candidatos = ms.filter((m) => forma(m) === fv || forma(m) === 'uniao' || forma(m) === 'unknown');
				if (!candidatos.length) return void erros.push(`${onde}: precisa ser ${nome(n)} (veio ${desc(v)})`);
				let melhor = null;
				for (const m of candidatos) {
					const e = [];
					checar(v, m, onde, e);
					if (!e.length) return;
					if (!melhor || e.length < melhor.length) melhor = e;
				}
				erros.push(...melhor);
				return;
			}
		}
		erros.push(`${onde}: tipo de tipos.ts que o validador não conhece (${n.k})`);
	};
	return {checar, T};
};

// peças do registro de camadas (src/modelos/camadas.tsx: chaves do objeto CAMADAS)
const lerPecas = () => {
	const src = fs.readFileSync(path.join(MOTOR, 'src', 'modelos', 'camadas.tsx'), 'utf8');
	const ini = src.indexOf('export const CAMADAS');
	if (ini < 0) return null;
	const bloco = src.slice(ini).split(/\n\};/)[0];
	return new Set([...bloco.matchAll(/^\t(?:'([\w-]+)'|([A-Za-z_]\w*))\s*:/gm)].map((m) => m[1] ?? m[2]));
};

// ---------- validação ----------
const validar = (proj, arqEdicao) => {
	const A = [];
	const erro = (regra, msg, itens = []) => A.push({nivel: 'ERRO', regra, msg, itens});
	const aviso = (regra, msg, itens = []) => A.push({nivel: 'AVISO', regra, msg, itens});
	let ed, edPath, idModelo, mod, fps;
	try {
		({ed, edPath, idModelo, mod, fps} = lerEdicao(proj, arqEdicao));
	} catch (e) {
		erro('json', `não consegui ler o edicao.json: ${String(e.message).split('\n')[0]}`);
		return {A, titulo: path.basename(proj)};
	}
	const titulo = `${mod.nome} · ${path.basename(proj)} · ${path.relative(proj, edPath)}`;
	const MIX = idModelo === 'mix-edit-youtube';
	const CUT = idModelo === 'cut-dinamico-instagram';
	const TD = mod.composicao === 'Edicao'; // INSTAGRAM - TELA DIVIDIDA (tipo Edicao; os outros usam EdicaoCamadas)
	const Q = 1 / fps;

	// 1. estrutura (se falhar, as outras regras dariam ruído ou quebrariam: para aqui)
	try {
		const {checar} = lerTipos();
		const errosEstr = [];
		checar(ed, {k: 'ref', nome: TD ? 'Edicao' : 'EdicaoCamadas'}, '', errosEstr);
		if (errosEstr.length) {
			erro('estrutura', `${errosEstr.length} problema(s) contra src/tipos.ts (${TD ? 'Edicao' : 'EdicaoCamadas'})${ed.duracao === undefined ? '; sem duracao: falta 02_analise/meta.json' : ''}`, errosEstr);
			return {A, titulo};
		}
	} catch (e) {
		erro('interno', `não consegui ler src/tipos.ts: ${e.message}`);
		return {A, titulo};
	}
	const cenas = ed.cenas;
	const camadas = ed.camadas ?? [];
	if (!TD) {
		const pecas = lerPecas();
		if (!pecas) aviso('camada-tipo', 'não achei o registro CAMADAS em src/modelos/camadas.tsx: peças não conferidas');
		else {
			const falsas = camadas.map((c, i) => [c, i]).filter(([c]) => !pecas.has(c.tipo));
			if (falsas.length) erro('camada-tipo', `${falsas.length} camada(s) com peça que não existe no motor (catálogo: 02_BIBLIOTECA/kit/KIT.md)`, falsas.map(([c, i]) => `camadas[${i}].tipo "${c.tipo}" (${mmss(c.ini)})`));
		}
	}

	// 2. formato: Instagram 1080×1920 a 24 fps; YouTube 1920×1080 a 30 fps (modelos.json, congelado)
	if (/instagram/i.test(idModelo) && !(mod.largura === 1080 && mod.altura === 1920 && mod.fps === 24)) erro('formato', `modelos.json: ${idModelo} está em ${mod.largura}×${mod.altura} a ${mod.fps} fps; regra do Instagram: 1080×1920 a 24 fps (não subir)`);
	if (MIX && !(mod.largura === 1920 && mod.altura === 1080 && mod.fps === 30)) erro('formato', `modelos.json: ${idModelo} está em ${mod.largura}×${mod.altura} a ${mod.fps} fps; o MIX EDIT é 1920×1080 a 30 fps`);
	const meta = lerJson(path.join(proj, '02_analise', 'meta.json'));
	let fBruto = 1;
	if (meta?.largura && meta?.altura) {
		const gira = Math.abs(meta.rotacao ?? 0) % 180 === 90;
		const [bw, bh] = gira ? [meta.altura, meta.largura] : [meta.largura, meta.altura];
		fBruto = Math.max(1, Math.min(bw / mod.largura, bh / mod.altura));
		if (Math.abs(bw / bh - mod.largura / mod.altura) > 0.01) aviso('formato', `bruto em ${bw}×${bh}, fora do aspecto do formato (${mod.largura}×${mod.altura}): use o preparar.mjs`);
		if (meta.fps && /instagram/i.test(idModelo) && Math.abs(meta.fps - 24) > 0.01) aviso('formato', `bruto a ${meta.fps} fps; o Instagram sai a 24 fps (o preparar.mjs converte 23,976 → 24)`);
	}

	// 3. tempos da saída e palavras
	const segs = montarSegs(ed, fps);
	const dur = duracaoSaida(segs);
	const palArq = path.resolve(proj, ed.palavras);
	let pal = lerJson(palArq);
	if (pal && !Array.isArray(pal)) pal = pal.palavras;
	if (!Array.isArray(pal)) {
		if (fs.existsSync(palArq)) erro('arquivos', `${ed.palavras} não é uma lista de palavras {w, ini, fim}`);
		pal = [];
	}
	// tempo "colado" (fim de uma = início da outra, típico do Whisper do FFmpeg): o fim da palavra engole a pausa
	const P = pal.map((w, k) => ({...w, colado: (k > 0 && Math.abs(w.ini - pal[k - 1].fim) < 0.005) || (k + 1 < pal.length && Math.abs(pal[k + 1].ini - w.fim) < 0.005)}));
	// pausas medidas no áudio (aperto: −36 dB ≥ 0,14 s; assistir.mjs) e pontos de corte da decupagem (decupar.mjs →
	// 03_roteiro/montagem.json; decupagem fina → montagem_fina.json), que também saem do áudio
	const pausas = ['pausas_aperto.json', 'pausas_e_cortes.json'].flatMap((f) => lerJson(path.join(proj, '02_analise', f))?.pausas ?? []);
	const emPausa = (tb) => pausas.some((p) => tb >= p.ini - Q && tb <= p.fim + Q);
	const dirRoteiro = path.join(proj, '03_roteiro');
	const pontosDecupagem = (fs.existsSync(dirRoteiro) ? fs.readdirSync(dirRoteiro) : [])
		.filter((f) => /^montagem.*\.json$/i.test(f))
		.flatMap((f) => {
			const j = lerJson(path.join(dirRoteiro, f));
			return (Array.isArray(j) ? j : (j?.montagem ?? [])).flatMap((m) => (m && typeof m.ini === 'number' ? [m.ini, m.fim] : []));
		});
	const naDecupagem = (tb) => pontosDecupagem.some((p) => Math.abs(p - tb) <= Q);
	const palavraEm = (tb, lista = P) => lista.find((w) => tb > w.ini + Q && tb < w.fim - Q);

	// 4. corte da montagem nunca no meio de palavra [guias CUT e MIX: "corte sempre em fim de palavra (palavras.json)"]
	// Corte seguro: fronteira de palavra (± 1 q), pausa medida ou ponto da decupagem. Fora disso, dentro de palavra:
	// ERRO se o tempo da palavra é confiável; aviso se é "colado" (o Whisper do FFmpeg cola todas as palavras e erra
	// 0,1–0,3 s; o piloto MIX aprovado tem cortes assim, conferidos de ouvido).
	if (ed.montagem) {
		const invalidos = [], ruins = [], duvidas = [];
		ed.montagem.forEach((m, k) => {
			if ('pausa' in m) {
				if (!(m.pausa > 0)) invalidos.push(`montagem[${k}]: pausa ${desc(m.pausa)} (precisa ser > 0)`);
				return;
			}
			if (!(m.fim > m.ini) || m.ini < -Q || m.fim > ed.duracao + Q) invalidos.push(`montagem[${k}]: ${m.ini}–${m.fim} fora do bruto (0–${+ed.duracao.toFixed(3)} s) ou com fim ≤ ini`);
			for (const [lado, tb] of [['ini', m.ini], ['fim', m.fim]]) {
				const w = palavraEm(tb);
				if (!w || emPausa(tb) || naDecupagem(tb)) continue;
				(w.colado ? duvidas : ruins).push(`montagem[${k}].${lado} = ${s3(tb)} (${mmss(tb)} do bruto) dentro de "${w.w}" (${w.ini.toFixed(3)}–${w.fim.toFixed(3)})`);
			}
		});
		if (invalidos.length) erro('montagem', `${invalidos.length} trecho(s) inválido(s) na montagem`, invalidos);
		if (ruins.length) erro('corte-palavra', `${ruins.length} corte(s) da montagem no meio de palavra (o áudio sai mutilado): corte na fronteira de palavra (palavras.json), numa pausa medida (02_analise/pausas_*.json) ou num ponto da decupagem`, ruins);
		if (duvidas.length) aviso('corte-palavra', `${duvidas.length} corte(s) da montagem fora de fronteira de palavra, pausa medida ou ponto da decupagem (tempos colados do Whisper: confira ouvindo na ilha ou mova para a fronteira/pausa mais próxima)`, duvidas);
	}
	// palavras no tempo da saída (como palavrasNaSaida do lib/saida.mjs, levando o `colado` e o deslocamento ao bruto)
	const PS = [];
	segs.forEach((s) => {
		if (s.bruto == null) return;
		const fimB = s.bruto + (s.fim - s.ini);
		for (const w of P) if (w.ini >= s.bruto - 1e-6 && w.ini < fimB - 1e-6) PS.push({w: w.w, ini: s.ini + (w.ini - s.bruto), fim: Math.min(s.fim, s.ini + (w.fim - s.bruto)), colado: w.colado, desloc: s.bruto - s.ini});
	});
	// troca de cena (só imagem; o áudio segue) dentro de palavra: aviso, os pilotos aprovados têm algumas
	{
		const dentro = [];
		for (const t of new Set(cenas.slice(1).map((c) => c.ini))) {
			const w = palavraEm(t, PS.filter((x) => !x.colado));
			if (w && !emPausa(t + w.desloc)) dentro.push({t, w, d: Math.min(t - w.ini, w.fim - t)});
		}
		dentro.sort((a, b) => b.d - a.d);
		if (dentro.length) aviso('corte-cena', `${dentro.length} troca(s) de cena no meio de uma palavra (guia: corte de cena em fim de palavra; o áudio não corta, só a imagem)`, dentro.map(({t, w, d}) => `${s3(t)} (${mmss(t)}) dentro de "${w.w}", a ${Math.round(d * fps)} q da ponta`));
	}

	// 5. cenas em ordem, sem sobreposição e sem quadro sem cena (tela preta); no MIX quem confere é o checar-mix
	if (!MIX) {
		const probs = [];
		cenas.forEach((c, i) => {
			if (!(c.fim > c.ini)) probs.push(`cenas[${i}]: fim (${c.fim}) não é maior que ini (${c.ini})`);
			const ant = cenas[i - 1];
			if (ant && c.ini < ant.fim - Q / 2) probs.push(`cenas[${i}] começa ${(ant.fim - c.ini).toFixed(2)} s antes do fim de cenas[${i - 1}] (${mmss(c.ini)}): sobreposição`);
		});
		// cada quadro renderizado precisa de uma cena (sobra de menos de 1 quadro no fim não aparece)
		const buracos = [];
		for (let k = 0, NQ = Math.max(1, Math.ceil(dur * fps - 1e-6)); k < NQ; k++) {
			const t = k / fps;
			if (cenas.some((c) => t >= c.ini - 1e-6 && t < c.fim - 1e-6)) continue;
			const u = buracos[buracos.length - 1];
			if (u && u[1] === k - 1) u[1] = k;
			else buracos.push([k, k]);
		}
		buracos.forEach(([a, b]) => probs.push(`${b - a + 1} quadro(s) sem cena em ${mmss(a / fps)}–${mmss((b + 1) / fps)}: tela preta`));
		if (probs.length) erro('cenas', `${probs.length} problema(s) na sequência de cenas`, probs);
	}
	if (!TD) {
		const fora = camadas.map((c, i) => [c, i]).filter(([c]) => !(c.fim > c.ini) || c.ini < -Q || c.fim > dur + Q);
		if (fora.length) erro('camadas', `${fora.length} camada(s) com tempo inválido ou fora do vídeo (0–${mmss(dur)})`, fora.map(([c, i]) => `camadas[${i}] ${c.tipo}: ${c.ini}–${c.fim}`));
	}

	// 6. B-roll sem repetir e arquivos que existem (no MIX quem confere é o checar-mix)
	if (!MIX) {
		const ARQ = /\.(png|jpe?g|webp|gif|svg|avif|mp4|mov|webm|m4v|mkv|mp3|wav|m4a|aac|ogg|json|lottie)$/i;
		const coletar = (v, onde, out) => {
			if (typeof v === 'string') {
				if (!/^https?:/i.test(v) && (ARQ.test(v) || (/[/\\]$/.test(v) && /[/\\]./.test(v)))) out.push({arq: v, onde});
			} else if (Array.isArray(v)) v.forEach((x, i) => coletar(x, `${onde}[${i}]`, out));
			else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => coletar(x, `${onde}.${k}`, out));
		};
		const visuais = [];
		cenas.forEach((c, i) => coletar(c, `cenas[${i}]`, visuais));
		camadas.forEach((c, i) => Object.entries(c).forEach(([k, v]) => !['ini', 'fim', 'tipo', 'plano', 'sfx'].includes(k) && coletar(v, `camadas[${i}].${k}`, visuais)));
		const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
		const grupos = new Map();
		visuais.filter((v) => /^04_broll\//.test(norm(v.arq)) && !/^04_broll\/recortes\//.test(norm(v.arq))).forEach((v) => grupos.set(norm(v.arq), [...(grupos.get(norm(v.arq)) ?? []), v.onde]));
		const rep = [...grupos].filter(([, g]) => g.length > 1);
		if (rep.length) erro('broll-repetido', `${rep.length} arquivo(s) de B-roll repetido(s) (diretriz: nenhuma repetição visual no vídeo)`, rep.map(([a, g]) => `${a}: ${g.join(' · ')}`));

		const todos = [...visuais];
		for (const k of ['bruto', 'voz', 'palavras']) if (ed[k]) todos.push({arq: ed[k], onde: k});
		const musicas = Array.isArray(ed.musica) ? ed.musica : ed.musica ? [ed.musica] : [];
		musicas.forEach((m, i) => todos.push({arq: m.arquivo, onde: `musica${Array.isArray(ed.musica) ? `[${i}]` : ''}`}));
		(ed.recortes ?? []).forEach((r, i) => todos.push({arq: r.arquivo, onde: `recortes[${i}]`}));
		const faltam = todos.filter(({arq}) => {
			const p = path.resolve(proj, arq);
			if (/[/\\]$/.test(arq)) return !fs.existsSync(path.join(p, 'q0001.webp')) && !(fs.existsSync(p) && fs.readdirSync(p).length);
			return !fs.existsSync(p);
		});
		// sons: o render copia 02_BIBLIOTECA/sfx para 05_audio/sfx; vale qualquer um dos dois
		const sons = new Set([...(ed.sfx ?? []).map((s) => s.som), ...camadas.map((c) => c.sfx).filter((s) => typeof s === 'string')]);
		const somFalta = [...sons].filter((s) => !fs.existsSync(path.join(proj, '05_audio', 'sfx', `${s}.wav`)) && !fs.existsSync(path.join(RAIZ, '02_BIBLIOTECA', 'sfx', `${s}.wav`)));
		if (faltam.length || somFalta.length) erro('arquivos', `${faltam.length + somFalta.length} arquivo(s) referenciado(s) não existe(m)`, [...faltam.map((f) => `${f.arq} (${f.onde})`), ...somFalta.map((s) => `som ${s}.wav (nem em 05_audio/sfx nem em 02_BIBLIOTECA/sfx)`)]);
	}

	// 7. rodapé de fonte a 26 px numa linha (correção do usuário de 06/10/2026: a 40 px engolia o gráfico)
	if (!TD) {
		const fontes = camadas.map((c, i) => [c, i]).filter(([c]) => c.tipo === 'fonte');
		const tam = fontes.filter(([c]) => c.tamanho !== undefined && c.tamanho !== 26);
		if (tam.length) erro('rodape', `${tam.length} rodapé(s) de fonte fora de 26 px (tire o \`tamanho\` ou use 26)`, tam.map(([c, i]) => `camadas[${i}] (${mmss(c.ini)}): tamanho ${desc(c.tamanho)}`));
		const u = Math.min(mod.largura, mod.altura) / 1080;
		const longas = fontes.filter(([c]) => {
			const texto = String(c.texto ?? '').replace(/^fonte\s*:\s*/i, '');
			const larg = (c.seguro === false ? 0.95 : 0.84) * mod.largura - (c.x ?? 0.07) * mod.largura;
			return /\n/.test(texto) || texto.length * 0.5 * 26 * u > larg; // ~0,5 em por caractere (Inter Tight 500)
		});
		if (longas.length) aviso('rodape', `${longas.length} rodapé(s) de fonte que devem passar de 1 linha (encurte: autor, revista, ano)`, longas.map(([c, i]) => `camadas[${i}] (${mmss(c.ini)}): "${String(c.texto).slice(0, 60)}…"`));
		const curtos = fontes.filter(([c]) => c.fim - c.ini < 3 - Q / 2);
		if (curtos.length) aviso('rodape', `${curtos.length} rodapé(s) de fonte com menos de 3 s no ar (guia: ≥ 3 s para dar para ler)`, curtos.map(([c, i]) => `camadas[${i}] (${mmss(c.ini)}): ${(c.fim - c.ini).toFixed(1)} s`));
	}

	// 8. INSTAGRAM - TELA DIVIDIDA (congelado)
	if (TD) {
		const curtas = cenas.map((c, i) => [c, i]).filter(([c]) => c.fim - c.ini < 1 - Q / 2);
		if (curtas.length) erro('plano-minimo', `${curtas.length} cena(s) com menos de 1 s (plano mínimo; o guia troca layout a cada 2–5 s)`, curtas.map(([c, i]) => `cenas[${i}] ${c.layout} ${mmss(c.ini)}: ${Math.round((c.fim - c.ini) * fps)} q`));
		if (ed.fonte !== 'A') erro('fonte-A', `fonte "${ed.fonte}": a decidida é "A" (Instrument Serif itálica + Inter Tight) em todos os vídeos`);
		const conta = (tr) => cenas.filter((c) => c.transicao === tr).length;
		if (conta('glitch') > 1) erro('transicoes', `${conta('glitch')} transições glitch (guia: no máximo 1 por vídeo)`);
		if (conta('flash') > 2) aviso('transicoes', `${conta('flash')} transições flash (guia: viradas fortes, 1–2 por vídeo)`);
		const impactos = (ed.sfx ?? []).filter((s) => s.som === 'impact_sub').length;
		if (impactos > 3) aviso('sfx', `${impactos} impact_sub (guia: no máximo 2–3 por vídeo)`);
	}

	// 9. INSTAGRAM - EDIÇÃO CUT DINÂMICO
	if (CUT) {
		const colado = (a, b) => a && b && Math.abs(b.ini - a.fim) < Q / 2;
		const piscam = [], curtos = [];
		cenas.forEach((c, i) => {
			if (c.layout !== 'fala' || c.fim - c.ini >= 1 - Q / 2) return;
			const q = Math.round((c.fim - c.ini) * fps);
			const entreFalas = (cenas[i - 1]?.layout === 'fala' && colado(cenas[i - 1], c)) || (cenas[i + 1]?.layout === 'fala' && colado(c, cenas[i + 1]));
			(q <= 12 && entreFalas ? piscam : curtos).push(`cenas[${i}] ${mmss(c.ini)}: ${q} q`);
		});
		if (piscam.length) erro('plano-minimo', `${piscam.length} plano(s) de fala com até 12 q colado(s) a outra fala: o zoom pisca (junte ao vizinho)`, piscam);
		if (curtos.length) aviso('plano-minimo', `${curtos.length} plano(s) de fala com menos de 1 s (preferências do usuário: plano mínimo de 1 s; guia do CUT: 20–73 q)`, curtos);
		const LIM = 1.25 * fBruto;
		const zoomAlto = [];
		cenas.forEach((c, i) => {
			if (c.layout !== 'fala') return;
			const zs = [...(c.zoom ?? []), ...(c.chaves ?? []).map((k) => k.zoom).filter((z) => typeof z === 'number')];
			const zMax = Math.max(1, ...zs);
			const pico = Math.max(zMax, ...(c.golpes ?? []).map((g) => zMax * (g.punch ?? 1.1)));
			if (pico > LIM + 1e-6) zoomAlto.push(`cenas[${i}] ${mmss(c.ini)}: escala ${pico.toFixed(2)}`);
		});
		if (zoomAlto.length) erro('zoom', `${zoomAlto.length} cena(s) passam da escala máxima ${LIM.toFixed(2)} (1,25 com bruto do tamanho do quadro; perde nitidez)`, zoomAlto);
		const silhuetas = cenas.map((c, i) => [c, i]).filter(([c]) => c.transicao === 'silhueta');
		if (silhuetas.length > 1 || silhuetas.some(([, i]) => i !== 0)) erro('silhueta', 'a silhueta fica só na abertura, 1× (cenas[0])', silhuetas.map(([c, i]) => `cenas[${i}] ${mmss(c.ini)}`));
		const soMix = cenas.map((c, i) => [c, i]).filter(([c]) => ['chicote', 'mergulho', 'esticao'].includes(c.transicao));
		if (soMix.length) erro('transicoes', `${soMix.length} transição(ões) que só existem no MIX EDIT (chicote, mergulho, esticão)`, soMix.map(([c, i]) => `cenas[${i}] ${mmss(c.ini)}: ${c.transicao}`));
		const enq = cenas.filter((c) => c.enquadramento).length;
		if (enq) aviso('enquadramento', `${enq} cena(s) com \`enquadramento\`: só vale nos formatos com predefinições (MIX); no CUT o motor ignora`);
		const ultima = Math.max(0, ...PS.map((w) => w.fim));
		if (PS.length && dur - ultima > 2.5 + Q) erro('marca-final', `${(dur - ultima).toFixed(2)} s depois da última fala (${mmss(ultima)}); o guia permite no máximo 2,5 s de marca no fim`);
		// camada 'atras' dentro dos recortes (a mesma conta do checar-mix)
		const cob = (ed.recortes ?? [])
			.flatMap((r) =>
				segs.flatMap((s) => {
					if (s.bruto == null) return [];
					const a = Math.max(r.brutoIni, s.bruto), b = Math.min(r.brutoFim, s.bruto + (s.fim - s.ini));
					return b - a > Q ? [[s.ini + (a - s.bruto), s.ini + (b - s.bruto)]] : [];
				}),
			)
			.sort((x, y) => x[0] - y[0]);
		const fora = [];
		camadas.forEach((c, i) => {
			if (c.plano !== 'atras') return;
			let t = c.ini;
			const buracos = [];
			for (const [a, b] of cob) {
				if (b <= t + Q / 2) continue;
				if (a > t + Q) buracos.push([t, Math.min(a, c.fim)]);
				t = Math.max(t, b);
				if (t >= c.fim - Q / 2) break;
			}
			if (t < c.fim - Q) buracos.push([t, c.fim]);
			const sobra = buracos.filter(([a, b]) => b - a > Q);
			if (sobra.length) fora.push(`camadas[${i}] ${c.tipo} (${mmss(c.ini)}–${mmss(c.fim)}): sem recorte em ${sobra.map(([a, b]) => `${mmss(a)}–${mmss(b)}`).join(', ')}`);
		});
		if (fora.length) erro('atras', `${fora.length} camada(s) 'atras' fora dos recortes (o texto passaria na frente da pessoa)`, fora);
		// Obrigatórios do CUT (preferências do usuário): texto da abertura atrás da cabeça + recortes de objeto como elemento gráfico.
		// Só AVISO: a posição da palavra em relação à cabeça (cobrir 10–30%) não dá para medir aqui; confira no quadros.mjs.
		const ABERTURA = 3;
		if (!camadas.some((c) => c.plano === 'atras' && c.ini < ABERTURA))
			aviso('abertura-atras', `nenhuma camada 'atras' começando nos primeiros ${ABERTURA} s: o texto do início vai atrás da cabeça em todo vídeo (preferências do usuário; palavra posicionada pela cabeça da cena, cobrindo 10–30%)`);
		const objetos = [
			...camadas.map((c, i) => [c, i]).filter(([c]) => c.tipo === 'imagem').map(([c, i]) => `camadas[${i}] ${mmss(c.ini)}: ${c.arquivo ?? '?'}`),
			...cenas.map((c, i) => [c, i]).filter(([c]) => c.orbita?.imagens?.length).flatMap(([c, i]) => c.orbita.imagens.map((a) => `cenas[${i}].orbita ${mmss(c.ini)}: ${a}`)),
		];
		const minObj = Math.max(3, Math.round(dur / 20));
		if (objetos.length < minObj)
			aviso('recortes-objeto', `${objetos.length} recorte(s) de objeto (camada \`imagem\` ou \`orbita\`); o combinado é ≥ ${minObj} neste vídeo (1 a cada ~20 s, mínimo 3), como elemento gráfico perto do corpo, somando ao B-roll (preferências do usuário)`, objetos);
	}

	// 10. YOUTUBE - MIX EDIT: rodízio de zoom e música só na intro (preferências do usuário)
	if (MIX) {
		const caps = (ed.capitulos ?? []).slice().sort((a, b) => a.t - b.t);
		const titulo = camadas.find((c) => c.tipo === 'colagem-titulo');
		const fimIntro = caps[1]?.t ?? camadas.filter((c) => c.tipo === 'card-capitulo').sort((a, b) => a.ini - b.ini)[0]?.ini ?? titulo?.fim ?? null;
		// rodízio A → C → B2 → A → C → B1 nas junções (gerador do piloto: 03_roteiro/montar_edicao.mjs)
		// A ordem exata do ciclo e a parcela de close (≤ 15% na tabela do guia) não são conferidas: o gerador junta
		// planos curtos depois do rodízio e o piloto aprovado tem 24% de C. O que não pode é corte sem troca de zoom.
		const colado = (a, b) => a && b && a.layout === 'fala' && b.layout === 'fala' && Math.abs(b.ini - a.fim) < Q / 2;
		// desfoque da cena no instante s (conta linear entre as chaves; basta para separar rosto nítido de desfocado)
		const desfoqueEm = (c, s) => {
			const ks = (c.chaves ?? []).filter((k) => typeof k.desfoque === 'number');
			if (!ks.length || s < ks[0].t) return c.desfoque ?? 0;
			const j = ks.findIndex((k) => k.t >= s);
			if (j < 0) return ks[ks.length - 1].desfoque;
			if (j === 0) return ks[0].desfoque;
			const a = ks[j - 1], b = ks[j];
			return a.desfoque + ((b.desfoque - a.desfoque) * (s - a.t)) / Math.max(1e-6, b.t - a.t);
		};
		const semZoom = [], iguais = [], closes = [];
		cenas.forEach((c, i) => {
			if (c.layout !== 'fala') return;
			if (!c.enquadramento && !c.zoom && !(c.chaves ?? []).some((k) => typeof k.zoom === 'number')) semZoom.push(`cenas[${i}] ${mmss(c.ini)}`);
			if (c.enquadramento === 'C' && c.fim - c.ini > 4 + Q / 2) {
				let nitido = 0;
				for (let s = 0; s < c.fim - c.ini - 1e-6; s += Q) if (desfoqueEm(c, s) < 8) nitido += Q;
				if (nitido > 4 + Q / 2) closes.push(`cenas[${i}] ${mmss(c.ini)}: ${nitido.toFixed(1)} s de rosto nítido`);
			}
			const a = cenas[i - 1];
			if (colado(a, c) && a.enquadramento && a.enquadramento === c.enquadramento && !c.zoom && !a.zoom) iguais.push(`cenas[${i - 1}] → cenas[${i}] (${mmss(c.ini)}): ${c.enquadramento} → ${c.enquadramento}`);
		});
		if (semZoom.length) erro('rodizio', `${semZoom.length} cena(s) de fala sem enquadramento (A, B1, B2, C), zoom nem chaves de zoom (guia: declarar zoom em toda cena fala)`, semZoom);
		if (iguais.length) erro('rodizio', `${iguais.length} junção(ões) de fala sem troca de enquadramento (nunca dois planos seguidos no mesmo enquadramento: junte as cenas ou alterne no rodízio A → C → B2 → A → C → B1)`, iguais);
		if (closes.length) aviso('rodizio', `${closes.length} close(s) C com mais de 4 s de rosto nítido (preferências do usuário: close C ≤ 4 s; o piloto aprovado tem até 5,8 s)`, closes);
		// música: só na intro, crescendo até a parada brusca no título; corpo sem música
		const faixas = Array.isArray(ed.musica) ? ed.musica : ed.musica ? [ed.musica] : [];
		if (!faixas.length) aviso('musica-intro', 'sem trilha: o padrão é tensão investigativa na intro, com parada brusca no título');
		else if (fimIntro == null) aviso('musica-intro', 'não achei o fim da intro (2º capítulo, card-capitulo ou colagem-titulo): música não conferida');
		else {
			const probs = [];
			faixas.forEach((f, i) => {
				const de = f.de ?? 0;
				if (typeof f.fim !== 'number') probs.push(`musica[${i}] sem \`fim\`: tocaria o vídeo todo`);
				else if (f.fim > fimIntro + Q) probs.push(`musica[${i}] vai até ${mmss(f.fim)}, depois do fim da intro (${mmss(fimIntro)})`);
				if (de >= fimIntro - Q) probs.push(`musica[${i}] começa em ${mmss(de)}, já no corpo`);
			});
			if (probs.length) erro('musica-intro', 'música fora da intro (preferências do usuário: só na intro, corpo sem música)', probs);
			else if (titulo && typeof titulo.bateEm === 'number') {
				const bate = titulo.ini + titulo.bateEm;
				const fimMus = Math.max(...faixas.map((f) => f.fim));
				if (fimMus > bate + 1.5 || fimMus < bate - Q) aviso('musica-intro', `a trilha acaba em ${mmss(fimMus)} e o título bate em ${mmss(bate)}: a parada brusca é no título (até ~1 s depois)`);
			}
		}

		// tudo o que o checar-mix já confere (sem duplicar)
		const r = spawnSync(process.execPath, [path.join(MOTOR, 'scripts', 'checar-mix.mjs'), proj, '--edicao', edPath, '--sem-relatorio'], {encoding: 'utf8', cwd: MOTOR, maxBuffer: 64 << 20});
		let atual = null;
		for (const l of (r.stdout ?? '').split(/\r?\n/)) {
			let m;
			if ((m = l.match(/^✗ ERRO: (.*)$/))) A.push((atual = {nivel: 'ERRO', regra: 'checar-mix', msg: m[1].replace(/:$/, ''), itens: []}));
			else if ((m = l.match(/^! aviso: (.*)$/))) A.push((atual = {nivel: 'AVISO', regra: 'checar-mix', msg: m[1].replace(/:$/, ''), itens: []}));
			else if (atual && (m = l.match(/^\s+- (.*)$/))) !/^… e mais/.test(m[1]) && atual.itens.push(m[1]);
			else if (!/^\s/.test(l)) atual = null;
		}
		if (r.status !== 0 && !A.some((a) => a.regra === 'checar-mix' && a.nivel === 'ERRO')) erro('checar-mix', `o checar-mix.mjs não terminou (código ${r.status ?? r.signal}): ${String(r.stderr || r.error?.message || '').trim().split('\n').pop()}`);
	}
	return {A, titulo};
};

// ---------- saída ----------
const ordenar = (A) => [...A.filter((a) => a.nivel === 'ERRO'), ...A.filter((a) => a.nivel === 'AVISO')];
const texto = (A, max) =>
	ordenar(A)
		.map((a) => [`${a.nivel === 'ERRO' ? 'ERRO ' : 'AVISO'} [${a.regra}] ${a.msg}`, ...a.itens.slice(0, max).map((x) => `      - ${x}`), ...(a.itens.length > max ? [`      - … e mais ${a.itens.length - max}`] : [])].join('\n'))
		.join('\n');
const contar = (A) => ({nE: A.filter((a) => a.nivel === 'ERRO').length, nA: A.filter((a) => a.nivel === 'AVISO').length});
const porRegra = (A) => Object.entries(A.reduce((o, a) => ((o[a.regra] = (o[a.regra] ?? 0) + 1), o), {})).map(([r, n]) => (n > 1 ? `${r} ×${n}` : r)).join(', ');

if (args.includes('--hook')) {
	// PostToolUse em Write|Edit: só age no 03_roteiro/edicao.json; ERRO → decision "block" (o motivo volta ao modelo)
	let entrada = {};
	try {
		entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
	} catch {
		process.exit(0);
	}
	const arq = String(entrada.tool_input?.file_path ?? entrada.tool_response?.filePath ?? '');
	if (!/[\\/]03_roteiro[\\/]edicao\.json$/i.test(arq)) process.exit(0);
	const proj = path.dirname(path.dirname(path.resolve(arq)));
	const cmd = `node "${path.join(MOTOR, 'scripts', 'validar-edicao.mjs').replace(/\\/g, '/')}" "${proj.replace(/\\/g, '/')}"`;
	let saida;
	try {
		const {A, titulo} = validar(proj);
		const {nE, nA} = contar(A);
		if (nE) {
			const so = A.filter((a) => a.nivel === 'ERRO');
			saida = {
				decision: 'block',
				reason: `validar-edicao: ${nE} ERRO(S) no edicao.json (${titulo}). Corrija o edicao.json (não mexa no validador nem nos guias) e salve de novo; o hook confere sozinho.\n${texto(so, 6)}${nA ? `\n(+ ${nA} aviso(s): ${porRegra(A.filter((a) => a.nivel === 'AVISO'))}; detalhes: ${cmd})` : ''}`,
			};
		} else saida = {hookSpecificOutput: {hookEventName: 'PostToolUse', additionalContext: `validar-edicao: 0 ERRO${nA ? ` · ${nA} aviso(s): ${porRegra(A)} (detalhes: ${cmd})` : ' · 0 aviso'}`}};
	} catch (e) {
		saida = {hookSpecificOutput: {hookEventName: 'PostToolUse', additionalContext: `validar-edicao falhou (${String(e.message).split('\n')[0]}); rode à mão: ${cmd}`}};
	}
	process.stdout.write(JSON.stringify(saida));
	process.exit(0);
}

if (!args[0] || args[0].startsWith('--')) {
	console.error('Uso: node scripts/validar-edicao.mjs <proj> [--edicao 03_roteiro/edicao.json] [--todos]');
	process.exit(2);
}
const t0 = Date.now();
const {A, titulo} = validar(path.resolve(args[0]), opcao('--edicao'));
const {nE, nA} = contar(A);
console.log(`validar-edicao · ${titulo}`);
if (A.length) console.log(texto(A, MAX_ITENS));
console.log(`[validar-edicao] ${nE ? `${nE} ERRO(S)` : '0 ERRO'} · ${nA} aviso(s) · ${((Date.now() - t0) / 1000).toFixed(1).replace('.', ',')} s`);
process.exit(nE ? 1 : 0);
