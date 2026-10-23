// Fila de render: roda um comando só quando nenhum outro render da fila está rodando (máquina com 7,7 GB de RAM:
// vários Chromes do Remotion ao mesmo tempo esgotam a memória e travam tudo). Trava = pasta 00_SISTEMA/.fila-render
// (mkdir é atômico); a trava só é considerada abandonada quando o processo dono não existe mais.
// Uso (de dentro do motor): node scripts/vez.mjs <comando> [args...]
//   ex.: node scripts/vez.mjs node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-x.tsx Folha a.png ...
//        node scripts/vez.mjs node scripts/render.mjs <proj> --previa --trecho 0 10
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TRAVA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.fila-render');
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
	console.error('Uso: node scripts/vez.mjs <comando> [args...]');
	process.exit(1);
}
const esperar = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const t0 = Date.now();
let avisado = false;
for (;;) {
	try {
		fs.mkdirSync(TRAVA);
		fs.writeFileSync(path.join(TRAVA, 'dono.txt'), `${process.pid} ${new Date().toISOString()} ${cmd} ${args.join(' ')}`.slice(0, 500));
		break;
	} catch {
		try {
			// trava velha só é abandonada se o processo dono morreu (um final por partes leva horas e segura a vez)
			const dono = Number(fs.readFileSync(path.join(TRAVA, 'dono.txt'), 'utf8').split(' ')[0]);
			let vivo = false;
			try {
				process.kill(dono, 0);
				vivo = true;
			} catch {}
			if (!vivo && Date.now() - fs.statSync(TRAVA).mtimeMs > 30 * 1000) {
				fs.rmSync(TRAVA, {recursive: true, force: true});
				continue;
			}
		} catch {}
		if (!avisado) {
			console.log('[fila] outro render em andamento; aguardando a vez…');
			avisado = true;
		}
		esperar(4000);
	}
}
if (avisado) console.log(`[fila] vez obtida depois de ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const soltar = () => fs.rmSync(TRAVA, {recursive: true, force: true});
process.on('SIGINT', () => (soltar(), process.exit(130)));
let r;
try {
	r = spawnSync(cmd, args, {stdio: 'inherit', shell: false});
} finally {
	soltar();
}
process.exit(r?.status ?? 1);
