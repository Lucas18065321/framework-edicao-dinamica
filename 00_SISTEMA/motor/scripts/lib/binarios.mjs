// Binários que o Remotion usa (ffmpeg, ffprobe e o compositor remotion.exe).
// Em 05/10/2026, às 18:23, o Controle Inteligente de Aplicativos do Windows passou a recusar a avfilter-10.dll que vem
// no pacote @remotion/compositor-win32-x64-msvc (código 0xC0E90002 no ffmpeg, no ffprobe e no remotion.exe), e todo
// render com vídeo parou. As configurações de segurança do Windows NÃO são mexidas: quando os binários do pacote estão
// bloqueados, o Remotion passa a usar o ffmpeg do sistema (o mesmo de todos os nossos scripts, aceito pelo Windows).
// Sem o compositor, só o <OffthreadVideo> fica indisponível (os formatos novos usam o <Video> do @remotion/media e
// sequências de imagens nos recortes). Se o Windows voltar a aceitar os do pacote, eles voltam a ser usados sozinhos.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

let cache = null;

export const binariosRemotion = (MOTOR) => {
	if (cache) return cache;
	const pacote = path.join(MOTOR, 'node_modules', '@remotion', 'compositor-win32-x64-msvc');
	const teste = spawnSync(path.join(pacote, 'ffmpeg.exe'), ['-hide_banner', '-version'], {encoding: 'utf8'});
	if (teste.status === 0) return (cache = []);
	const onde = spawnSync('where', ['ffmpeg'], {encoding: 'utf8'}).stdout.split(/\r?\n/).find((l) => l.trim().toLowerCase().endsWith('ffmpeg.exe'));
	if (!onde) {
		console.error('[render] o ffmpeg do Remotion está bloqueado e não achei um ffmpeg no sistema');
		return (cache = []);
	}
	const pasta = path.dirname(onde.trim());
	// O ffmpeg 7.1+ trocou -filter_complex_script por -/filter_complex (o 9 nem aceita mais o antigo). A forma nova
	// funciona também no ffmpeg 7 do pacote; o ajuste é idempotente e vale até a próxima instalação do pacote.
	// O ffmpeg do sistema não tem o libfdk_aac: o AAC passa a ser o nativo do ffmpeg, cujo atraso inicial ("priming") é
	// de 1024 amostras, não 2048 (sem isso o áudio sairia ~21 ms adiantado). A versão ESM recebe os mesmos ajustes.
	const dist = path.join(MOTOR, 'node_modules', '@remotion', 'renderer', 'dist');
	const ajustes = [
		['create-ffmpeg-complex-filter.js', "'-filter_complex_script'", "'-/filter_complex'"],
		['options/audio-codec.js', "return 'libfdk_aac';", "return 'aac';"],
		['aac-priming.js', 'LIBFDK_AAC_LC_ENCODER_DELAY_IN_SAMPLES = 2048', 'LIBFDK_AAC_LC_ENCODER_DELAY_IN_SAMPLES = 1024'],
		['esm/index.mjs', '"-filter_complex_script"', '"-/filter_complex"'],
		['esm/index.mjs', 'return "libfdk_aac";', 'return "aac";'],
		['esm/index.mjs', 'LIBFDK_AAC_LC_ENCODER_DELAY_IN_SAMPLES = 2048', 'LIBFDK_AAC_LC_ENCODER_DELAY_IN_SAMPLES = 1024'],
	];
	for (const [rel, de, para] of ajustes) {
		const arq = path.join(dist, rel);
		const js = fs.readFileSync(arq, 'utf8');
		if (js.includes(de)) fs.writeFileSync(arq, js.split(de).join(para));
	}
	console.log(`[render] binários do Remotion bloqueados pelo Windows (código ${(teste.status >>> 0).toString(16).toUpperCase()}); usando o ffmpeg do sistema: ${pasta}`);
	return (cache = [`--binaries-directory=${pasta}`]);
};
