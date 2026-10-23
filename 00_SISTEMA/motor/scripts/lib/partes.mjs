// Render por partes (opção --partes do render.mjs). Correção 2 da crítica do MIX EDIT: uma queda no meio de um final de
// 3 h não pode custar tudo de novo.
//   1. empacota o projeto UMA vez (remotion bundle: a pasta do projeto é copiada uma vez só, não a cada parte);
//   2. renderiza o ÁUDIO inteiro de uma vez (--codec=wav): sem emendas no som;
//   3. renderiza o VÍDEO de cada parte com --frames e --muted, todas com o mesmo codec, CRF e GOP;
//   4. junta o vídeo com o concat do ffmpeg SEM recomprimir (-c copy), muxa o áudio e normaliza o loudness uma vez só,
//      no master (no MIX, 2 passadas lineares, como o --loudnorm-linear).
// Retomável: as partes ficam em 00_SISTEMA/render-partes/<projeto>_<previa|final>/ (fora da pasta do projeto, para não
// serem copiadas no empacotamento). Rodar o MESMO comando de novo pula as partes prontas e válidas (contagem de quadros e
// tamanho conferidos com ffprobe). Se o edicao.json, a qualidade ou o código do motor (src/, menos src/testes) mudaram
// desde a tentativa anterior, as partes velhas são apagadas e tudo recomeça; --reaproveitar-partes usa as partes válidas
// mesmo assim (ex.: corrigiu no motor só o que derrubou o render, sem mudar a imagem das partes prontas).
// Cada parte tem log próprio; a parte que falha ganha uma tentativa extra (depois de 30 s) sem refazer as outras.
// Custo medido no piloto (05/10, máquina ocupada, --concurrency=2): o passe de áudio (--codec=wav) não decodifica o
// vídeo da pessoa (o <Video> do @remotion/media pula a imagem quando o render é só de áudio) e custa ~30 s fixos +
// ~0,28 s por segundo de vídeo (12 s em 33 s; 60 s em 46 s; WAV idêntico com --scale 0,25 ou --concurrency 4, sem
// ganho de tempo) → ~6 min para 19 min de vídeo. Cada parte de vídeo paga ~15–20 s para abrir o Chrome e achar o 1º
// quadro (bruto com GOP de 5 s); o empacotamento único, ~30 s. Ele recebe a prop _soAudio: true (o motor ainda não lê).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {montarSegs, quadrosSaida, relogio} from './saida.mjs';

const esperar = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const seg = (ms) => `${(ms / 1000).toFixed(0)} s`;
const hm = (ms) => {
	const m = Math.round(ms / 60000);
	return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
};

const sonda = (arq) => {
	const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,nb_frames,width,height,duration,sample_rate,channels,bits_per_sample:format=duration', '-of', 'json', arq], {encoding: 'utf8'});
	if (r.status !== 0) return null;
	try {
		const j = JSON.parse(r.stdout);
		const v = j.streams?.find((s) => s.codec_type === 'video');
		const a = j.streams?.find((s) => s.codec_type === 'audio');
		return {v, a, dur: Number(j.format?.duration)};
	} catch {
		return null;
	}
};
// quadros do vídeo LIDOS de verdade (o cabeçalho de um mp4 com faststart diz o total mesmo com o arquivo cortado no
// meio): conta os pacotes até o fim do arquivo; qualquer erro de leitura ("partial file") invalida
const contarQuadros = (arq) => {
	const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', arq], {encoding: 'utf8'});
	if (r.status !== 0 || (r.stderr ?? '').trim()) return -1;
	return Number(r.stdout.trim().replace(/,$/, '')) || 0;
};

// "assinatura" do código do motor: conteúdo de cada arquivo de src/ menos os testes (mudou o motor → partes velhas não servem)
const assinaturaMotor = (MOTOR) => {
	const h = crypto.createHash('sha1');
	const andar = (d) =>
		fs
			.readdirSync(d, {withFileTypes: true})
			.sort((a, b) => a.name.localeCompare(b.name))
			.forEach((e) => {
				const p = path.join(d, e.name);
				if (e.isDirectory()) e.name !== 'testes' && andar(p);
				else h.update(`${path.relative(MOTOR, p)}\n`).update(fs.readFileSync(p));
			});
	andar(path.join(MOTOR, 'src'));
	return h.digest('hex');
};

// Onde cortar: limites dos capítulos (auto) ou N partes iguais, sempre puxando o corte para o início de cena mais perto.
export const planejarPartes = ({ed, fps, f0, f1, pedido}) => {
	const len = f1 - f0;
	const dentro = (q) => q > f0 + fps && q < f1 - fps; // nenhuma parte com menos de 1 s
	const caps = [...new Set((Array.isArray(ed.capitulos) ? ed.capitulos : []).map((c) => Math.round(Number(c?.t) * fps)).filter(Number.isFinite).filter(dentro))].sort((a, b) => a - b);
	const cenas = [...new Set((ed.cenas ?? []).map((c) => Math.round(Number(c.ini) * fps)).filter(Number.isFinite).filter(dentro))].sort((a, b) => a - b);
	const perto = (alvo, lista, raio) => lista.filter((q) => Math.abs(q - alvo) <= raio).sort((a, b) => Math.abs(a - alvo) - Math.abs(b - alvo))[0];
	const PASSO = 180 * fps; // ~3 min
	let cortes = [];
	if (pedido === 'auto') {
		if (caps.length) {
			cortes = [...caps];
			// capítulo muito longo (> 5,4 min) ganha cortes extras a cada ~3 min, em início de cena
			const limites = [f0, ...caps, f1];
			for (let i = 1; i < limites.length; i++) {
				const [a, b] = [limites[i - 1], limites[i]];
				const n = Math.round((b - a) / PASSO);
				if (b - a <= 1.8 * PASSO || n < 2) continue;
				for (let k = 1; k < n; k++) {
					const alvo = a + ((b - a) * k) / n;
					cortes.push(perto(alvo, cenas.filter((q) => q > a && q < b), 30 * fps) ?? Math.round(alvo));
				}
			}
		} else {
			const n = Math.max(1, Math.round(len / PASSO));
			for (let k = 1; k < n; k++) {
				const alvo = f0 + (len * k) / n;
				cortes.push(perto(alvo, cenas, 30 * fps) ?? Math.round(alvo));
			}
		}
	} else {
		const n = Math.max(1, Math.min(Math.floor(Number(pedido)) || 1, Math.floor(len / fps)));
		const raio = (len / n) * 0.25;
		for (let k = 1; k < n; k++) {
			const alvo = f0 + (len * k) / n;
			cortes.push(perto(alvo, caps, raio) ?? perto(alvo, cenas, raio) ?? Math.round(alvo));
		}
	}
	cortes = [...new Set(cortes.filter(dentro))].sort((a, b) => a - b);
	const limites = [f0, ...cortes, f1];
	return limites.slice(1).map((b, i) => ({ini: limites[i], fim: b})); // fim exclusivo
};

export const renderPorPartes = (c) => {
	const {proj, ed, idModelo, mod, previa, trecho, propsFile, saida, args, opcao, MOTOR, RAIZ, concorrencia, gl} = c;
	const CLI = path.join(MOTOR, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
	const fps = mod.fps;
	const pedido = c.partes;
	const qualidade = previa ? ['--scale=0.5', '--crf=26'] : ['--crf=17'];
	const W = previa ? Math.round(mod.largura / 2) : mod.largura;
	const H = previa ? Math.round(mod.altura / 2) : mod.altura;
	const linear = args.includes('--loudnorm-linear') || idModelo === 'mix-edit-youtube';
	const t0 = Date.now();
	const rel = (f) => path.relative(RAIZ, f);

	// pasta das partes (uma por projeto e qualidade) e o que gerou as partes que estão nela
	const hash = (x) => crypto.createHash('sha1').update(x).digest('hex').slice(0, 12);
	// `capitulos` não muda a imagem nem o som (só a descrição e onde cortar as partes; as partes têm a faixa de quadros
	// no nome): trocar um título não invalida o que já foi renderizado. Se o motor passar a desenhar algo a partir de
	// `capitulos`, tirar esta exceção.
	const chaves = {edicao: hash(JSON.stringify({ed: {...ed, capitulos: undefined}, comp: mod.composicao})), qualidade: hash(JSON.stringify({qualidade, gl})), motor: assinaturaMotor(MOTOR).slice(0, 12)};
	const chave = hash(JSON.stringify(chaves)).slice(0, 10);
	const pasta = path.join(RAIZ, '00_SISTEMA', 'render-partes', `${path.basename(proj)}_${previa ? 'previa' : 'final'}`);
	const arqInfo = path.join(pasta, 'info.json');
	let antes = null;
	try {
		antes = JSON.parse(fs.readFileSync(arqInfo, 'utf8'));
	} catch {}
	const temPartes = fs.existsSync(pasta) && fs.readdirSync(pasta).some((f) => /\.(mp4|wav)$/.test(f));
	const mudou = Object.keys(chaves).filter((k) => antes?.chaves?.[k] !== chaves[k]);
	if (temPartes && mudou.length) {
		const nomes = {edicao: 'o edicao.json', qualidade: 'a qualidade', motor: 'o código do motor'};
		const oque = antes?.chaves ? `${mudou.map((k) => nomes[k]).join(' e ')} ${mudou.length > 1 ? 'mudaram' : 'mudou'} desde a tentativa anterior` : 'as partes que estão lá não têm registro de origem';
		if (args.includes('--reaproveitar-partes')) console.warn(`[partes] ${oque}, mas --reaproveitar-partes usa as partes válidas que já existem`);
		else {
			console.log(`[partes] ${oque}: apagando as partes velhas e recomeçando (--reaproveitar-partes aproveita as válidas)`);
			fs.rmSync(pasta, {recursive: true, force: true});
		}
	}
	fs.mkdirSync(pasta, {recursive: true});
	fs.writeFileSync(arqInfo, JSON.stringify({projeto: proj, edicao: c.edPath, saida, previa, chaves, atualizado: new Date().toISOString()}, null, 1));

	// 1. empacota uma vez (pacotes velhos de uma queda anterior são apagados)
	const tmp = os.tmpdir();
	for (const d of fs.readdirSync(tmp)) {
		if (!d.startsWith('remotion-partes-')) continue;
		const p = path.join(tmp, d);
		try {
			if (d === `remotion-partes-${chave}` || Date.now() - fs.statSync(p).mtimeMs > 12 * 3600e3) fs.rmSync(p, {recursive: true, force: true});
		} catch {}
	}
	const pacote = path.join(tmp, `remotion-partes-${chave}`);
	console.log(`[partes] empacotando o projeto uma vez (a pasta do projeto é copiada para ${rel(pacote)})…`);
	let tb = Date.now();
	const b = spawnSync(process.execPath, [CLI, 'bundle', 'src/index.ts', `--public-dir=${proj}`, `--out-dir=${pacote}`, '--log=error'], {cwd: MOTOR, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
	const entrada = b.status === 0 && fs.existsSync(path.join(pacote, 'index.html')) ? pacote : 'src/index.ts';
	if (entrada === pacote) console.log(`[partes] pacote pronto em ${seg(Date.now() - tb)}`);
	else console.warn(`[partes] o empacotamento falhou; cada parte vai empacotar de novo (mais lento).\n${(b.stderr ?? '').slice(-1500)}`);
	const fonte = entrada === pacote ? [] : [`--public-dir=${proj}`];
	const propsAudio = propsFile.replace(/\.json$/, '.audio.json');
	const limpar = () => {
		fs.rmSync(pacote, {recursive: true, force: true});
		fs.rmSync(propsFile, {force: true});
		fs.rmSync(propsAudio, {force: true});
	};

	// 2. duração exata: a composição calcula (calculateMetadata); a conta do motor fica de reserva
	let total = null;
	const cp = spawnSync(process.execPath, [CLI, 'compositions', entrada, ...fonte, `--props=${propsFile}`, '--log=error', ...gl], {cwd: MOTOR, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
	const linha = (cp.stdout ?? '').split('\n').find((l) => l.trim().startsWith(mod.composicao + ' '));
	const m = linha?.match(/\s(\d+)\s+\(/);
	if (m) total = Number(m[1]);
	if (/^(CutDinamico|MixEdit)$/.test(mod.composicao)) {
		const conta = quadrosSaida(montarSegs(ed, fps), fps);
		if (total == null) total = conta;
		else if (total !== conta) console.warn(`[partes] aviso: a composição tem ${total} quadros e a conta da montagem dá ${conta} (scripts/lib/saida.mjs desatualizado?)`);
	}
	if (total == null) {
		console.error(`[partes] não consegui a duração da composição ${mod.composicao}.\n${(cp.stderr ?? '').slice(-1500)}`);
		limpar();
		process.exit(1);
	}
	const f0 = trecho ? Math.round(trecho[0] * fps) : 0;
	const f1 = trecho ? Math.min(total, Math.round(trecho[1] * fps)) : total;
	if (f1 <= f0) {
		console.error(`[partes] trecho vazio (${f0}–${f1} de ${total} quadros)`);
		limpar();
		process.exit(1);
	}
	const plano = planejarPartes({ed, fps, f0, f1, pedido});
	console.log(`[partes] ${plano.length} partes de vídeo + 1 de áudio (quadros ${f0}–${f1 - 1}, ${relogio(f0 / fps)}–${relogio(f1 / fps)}) em ${rel(pasta)}`);
	plano.forEach((p, i) => console.log(`   ${String(i + 1).padStart(2)}. ${relogio(p.ini / fps).padStart(7)}–${relogio(p.fim / fps).padEnd(7)} quadros ${p.ini}–${p.fim - 1} (${((p.fim - p.ini) / fps).toFixed(1)} s)`));

	const comum = [`--concurrency=${concorrencia}`, '--log=error', ...gl, ...fonte];
	fs.writeFileSync(propsAudio, JSON.stringify({...ed, _soAudio: true}));
	// Só para testar o caminho de falha: PARTES_FALHAR="video_117-245.mp4:1,audio_0-359.wav:2" faz as N primeiras
	// tentativas desse arquivo falharem de propósito (pede um quadro fora da composição).
	const falharTeste = Object.fromEntries(
		(process.env.PARTES_FALHAR ?? '')
			.split(',')
			.filter(Boolean)
			.map((x) => [x.split(':')[0], Number(x.split(':')[1]) || 1]),
	);
	// render de um arquivo com 1 tentativa extra; o erro de cada tentativa fica no log da parte
	const renderizar = (nome, extra, validar, props = propsFile) => {
		const final = path.join(pasta, nome);
		const parcial = final.replace(/(\.\w+)$/, '.parcial$1');
		const log = final.replace(/\.\w+$/, '.log');
		if (validar(final)) return 'pronta';
		for (let tentativa = 1; tentativa <= 2; tentativa++) {
			fs.rmSync(parcial, {force: true});
			const sabotar = tentativa <= (falharTeste[nome] ?? 0);
			const cli = [CLI, 'render', entrada, mod.composicao, parcial, `--props=${props}`, ...comum, ...extra.map((a) => (sabotar && a.startsWith('--frames=') ? '--frames=99999998-99999999' : a))];
			const r = spawnSync(process.execPath, cli, {cwd: MOTOR, stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
			const ok = r.status === 0 && validar(parcial);
			fs.appendFileSync(log, `# tentativa ${tentativa} · ${new Date().toISOString()} · ${ok ? 'ok' : `falhou (código ${r.status})`}\n${cli.join(' ')}\n\n${r.stderr ?? ''}\n\n`);
			if (ok) {
				fs.renameSync(parcial, final);
				return 'ok';
			}
			if (r.stderr) process.stderr.write(r.stderr.slice(-3000));
			if (tentativa === 1) {
				console.error(`[partes] ${nome} falhou (log: ${rel(log)}). Tentando de novo em 30 s…`);
				esperar(30000);
			}
		}
		fs.rmSync(parcial, {force: true});
		return 'falhou';
	};

	// 3. áudio inteiro, uma vez só
	const nomeAudio = `audio_${f0}-${f1 - 1}.wav`;
	const audioOk = (arq) => {
		const s = fs.existsSync(arq) && sonda(arq);
		// WAV cortado no meio ainda diz a duração cheia no cabeçalho: confere também o tamanho dos dados
		const bytes = s?.a ? ((Number(s.a.sample_rate) * Number(s.a.channels) * (Number(s.a.bits_per_sample) || 16)) / 8) * ((f1 - f0) / fps) : Infinity;
		return !!s?.a && Math.abs(s.dur - (f1 - f0) / fps) <= 2 / fps && fs.statSync(arq).size >= bytes * 0.999;
	};
	tb = Date.now();
	console.log(`[partes] áudio (${((f1 - f0) / fps).toFixed(1)} s)…`);
	const ra = renderizar(nomeAudio, ['--codec=wav', `--frames=${f0}-${f1 - 1}`], audioOk, propsAudio);
	console.log(`[partes] áudio ${ra === 'pronta' ? 'já estava pronto (pulado)' : ra === 'ok' ? `pronto em ${seg(Date.now() - tb)}` : 'FALHOU'}`);

	// 4. vídeo, parte por parte
	const falhas = [];
	let feitoQ = 0, feitoMs = 0;
	plano.forEach((p, i) => {
		p.arquivo = `video_${p.ini}-${p.fim - 1}.mp4`;
		const n = p.fim - p.ini;
		const videoOk = (arq) => {
			const s = fs.existsSync(arq) && sonda(arq);
			return !!s?.v && Number(s.v.width) === W && Number(s.v.height) === H && contarQuadros(arq) === n;
		};
		const resta = plano.slice(i).reduce((a, x) => a + x.fim - x.ini, 0);
		const eta = feitoQ ? ` · faltam ~${hm((feitoMs / feitoQ) * resta)}` : '';
		console.log(`[partes] vídeo ${i + 1}/${plano.length} · ${relogio(p.ini / fps)}–${relogio(p.fim / fps)} (${n} quadros)${eta}`);
		const tp = Date.now();
		const r = renderizar(p.arquivo, ['--codec=h264', '--muted', ...qualidade, `--frames=${p.ini}-${p.fim - 1}`], videoOk);
		if (r === 'ok') (feitoQ += n), (feitoMs += Date.now() - tp);
		console.log(`[partes]    ${r === 'pronta' ? 'já estava pronta (pulada)' : r === 'ok' ? `ok em ${seg(Date.now() - tp)} (${((Date.now() - tp) / 1000 / (n / fps)).toFixed(1)} s por s de vídeo)` : 'FALHOU'}`);
		if (r === 'falhou') falhas.push(`${i + 1} (${p.arquivo})`);
	});
	if (ra === 'falhou') falhas.unshift(`áudio (${nomeAudio})`);
	if (falhas.length) {
		console.error(`[partes] não terminou: ${falhas.join(', ')}. As partes prontas ficam em ${rel(pasta)};`);
		console.error('[partes] rode o MESMO comando de novo para retomar (só refaz o que falta).');
		limpar();
		process.exit(1);
	}

	// 5. junta sem recomprimir + áudio + loudness uma vez só
	console.log(`[partes] juntando ${plano.length} partes (vídeo copiado, sem recompressão) e normalizando o áudio${linear ? ' (2 passadas lineares)' : ''}…`);
	const lista = path.join(pasta, `lista_${f0}-${f1 - 1}.txt`);
	fs.writeFileSync(lista, plano.map((p) => `file '${p.arquivo}'`).join('\n') + '\n');
	let filtroLn = 'loudnorm=I=-14:TP=-1:LRA=11';
	if (linear) {
		const med = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', nomeAudio, '-af', `${filtroLn}:print_format=json`, '-f', 'null', '-'], {cwd: pasta, encoding: 'utf8'}).stderr;
		try {
			const j = JSON.parse(med.slice(med.lastIndexOf('{'), med.lastIndexOf('}') + 1));
			filtroLn += `:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
		} catch {
			console.warn('[partes] medição de loudness falhou; usando passada única');
		}
	}
	const saidaTmp = saida.replace(/\.mp4$/, '.juntando.mp4');
	const mux = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'info', '-y', '-f', 'concat', '-safe', '0', '-i', path.basename(lista), '-i', nomeAudio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', `${filtroLn}:print_format=json`, '-ar', '48000', '-c:a', 'aac', '-b:a', previa ? '192k' : '320k', '-movflags', '+faststart', saidaTmp], {cwd: pasta, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
	if (mux.status !== 0) console.error((mux.stderr ?? '').slice(-3000));
	// O loudnorm "linear" volta SOZINHO para o modo dinâmico (compressão) quando o ganho levaria o pico real acima de
	// −1 dBTP, isto é, quando pico − loudness da mixagem passa de 13 dB (fala costuma ter 15–20). O guia manda perguntar
	// ao usuário quando o master não fecha: o log mostra o caso e as contas das alternativas.
	try {
		const e = mux.stderr ?? '';
		const j = JSON.parse(e.slice(e.lastIndexOf('{'), e.lastIndexOf('}') + 1));
		const n = (x) => `${Number(x) > 0 ? '+' : ''}${Number(x).toFixed(1).replace('.', ',')}`;
		console.log(`[partes] loudness: ${j.normalization_type === 'linear' ? 'linear (ganho fixo, sem compressão)' : 'DINÂMICO (o loudnorm comprimiu)'} · entrada ${n(j.input_i)} LUFS / ${n(j.input_tp)} dBTP → saída ${n(j.output_i)} LUFS / ${n(j.output_tp)} dBTP`);
		if (linear && j.normalization_type !== 'linear') {
			const ganho = -14 - Number(j.input_i), teto = -1 - Number(j.input_tp);
			console.log(`[partes]    o ganho linear até −14 LUFS seria ${n(ganho)} dB e levaria o pico real a ${n(Number(j.input_tp) + ganho)} dBTP (teto −1; pico − loudness = ${n(Number(j.input_tp) - Number(j.input_i))} dB > 13).`);
			console.log(`[partes]    Perguntar ao usuário (guia, "Master"): manter assim; ou só ganho linear até o teto (${n(teto)} dB → ${n(Number(j.input_i) + teto)} LUFS, sem compressão); ou ganho linear + limitador de pico.`);
		}
	} catch {}
	const s = mux.status === 0 && sonda(saidaTmp);
	const quadros = s ? contarQuadros(saidaTmp) : 0;
	const durA = Number(s?.a?.duration), durV = Number(s?.v?.duration);
	if (!s || quadros !== f1 - f0 || !(Math.abs(durA - durV) < 0.05)) {
		console.error(`[partes] a junção não conferiu: ${quadros} de ${f1 - f0} quadros; áudio ${durA} s × vídeo ${durV} s. Partes mantidas em ${rel(pasta)}.`);
		fs.rmSync(saidaTmp, {force: true});
		limpar();
		process.exit(1);
	}
	try {
		fs.renameSync(saidaTmp, saida);
	} catch (e) {
		console.error(`[partes] não consegui gravar ${rel(saida)} (${e.code}: aberto num player?). O vídeo pronto ficou em ${rel(saidaTmp)}.`);
		limpar();
		process.exit(1);
	}
	limpar();
	if (!args.includes('--manter-partes')) fs.rmSync(pasta, {recursive: true, force: true});
	console.log(`[partes] conferido: ${quadros} quadros, áudio ${durA.toFixed(2)} s × vídeo ${durV.toFixed(2)} s${args.includes('--manter-partes') ? ` · partes mantidas em ${rel(pasta)}` : ''}`);
	console.log(`[render] ok em ${seg(Date.now() - t0)} → ${rel(saida)}`);
};
