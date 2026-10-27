// Fonte Arial do sistema para o drawtext do FFmpeg (só rótulos de folhas de quadros e comparativos, nunca o vídeo final).
// O FFmpeg não tem fontconfig no Windows e precisa do arquivo; no macOS e no Linux também usamos o arquivo, para o
// resultado ser igual nos três sistemas.
import fs from 'node:fs';

const CANDIDATAS = {
	win32: (b) => [`${process.env.WINDIR ?? 'C:/Windows'}/Fonts/${b ? 'arialbd' : 'arial'}.ttf`],
	darwin: (b) => [`/System/Library/Fonts/Supplemental/${b ? 'Arial Bold' : 'Arial'}.ttf`, `/Library/Fonts/${b ? 'Arial Bold' : 'Arial'}.ttf`, '/System/Library/Fonts/Helvetica.ttc'],
	linux: (b) => [`/usr/share/fonts/truetype/msttcorefonts/${b ? 'Arial_Bold' : 'Arial'}.ttf`, `/usr/share/fonts/truetype/liberation/LiberationSans-${b ? 'Bold' : 'Regular'}.ttf`, `/usr/share/fonts/truetype/dejavu/DejaVuSans${b ? '-Bold' : ''}.ttf`],
};

// Caminho do arquivo da fonte (barras normais). Sem nenhuma candidata, devolve a primeira (o FFmpeg avisa na hora).
export const fonteArquivo = (negrito = false) => {
	const lista = (CANDIDATAS[process.platform] ?? CANDIDATAS.linux)(negrito).map((p) => p.replace(/\\/g, '/'));
	return lista.find((p) => fs.existsSync(p)) ?? lista[0];
};

// Mesmo caminho pronto para `drawtext=fontfile='…'` (o ":" de "C:" precisa de escape dentro do filtro).
export const fonteFiltro = (negrito = false) => fonteArquivo(negrito).replace(/:/g, '\\:');
