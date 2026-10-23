// Objeto 3D (MIX EDIT, peça `objeto-3d`; linguagem "3D flash"): objeto do tema modelado por código (sem arquivo
// externo) num ThreeCanvas (@remotion/three), com MeshPhysicalMaterial (verniz/clearcoat), reflexos de um ambiente
// gerado por código (RoomEnvironment) e mapeamento de tom neutro (as cores da paleta não mudam de matiz).
// Modelos: 'lua' (crescente com volume, pontas arredondadas), 'relogio' (despertador: corpo no acento, mostrador creme, sinos;
// ponteiros giram para o tempo passar), 'capsula' (pílula: metade acento, metade creme), 'sol' (esfera com 12 raios
// girando devagar), 'prato' (prato de cerâmica com filete no acento).
// Movimentos (`modo`):
//   'flutuar' (padrão): nasce da profundidade com mola snappy no ponto (x, y), flutua girando devagar e sai recuando
//     (ou voando para a câmera com saida 'voar'). Para a área livre da parede ou sobre tela escura.
//   'passar': atravessa o quadro rente à câmera, crescendo (wipe de pico, 12–24 q). Com ≤ 24 q ganha CameraMotionBlur
//     (6 amostras). Começa e termina fora do quadro.
//   'orbitar': gira em elipse inclinada em volta da cabeça (centro padrão x 0.47, y 0.35, para o piloto: com raio 320 e
//     inclinacao 0.6 a frente passa no alto do peito, abaixo do queixo, e o fundo atrás da testa, escondido pela cabeça
//     no meio da volta). Para passar ATRÁS da cabeça, use duas camadas iguais: uma com "plano": "atras" + metade
//     'tras' (precisa de recorte cobrindo o tempo) e outra na frente com metade 'frente'; o objeto troca de camada na
//     lateral da elipse, longe do rosto (raio ≥ 220 px).
// Custo (medido, 05/10): 3D exige --gl=angle. +25–60 ms por quadro sobre a cena (1 contexto WebGL por camada; ~2 s a
// mais no 1º quadro de cada camada); 'passar' com CameraMotionBlur de 6 amostras ≈ 0,4 s/quadro (1 contexto por amostra).
// Parâmetros:
//   modelo ('lua' | 'relogio' | 'capsula' | 'sol' | 'prato'), modo ('flutuar' | 'passar' | 'orbitar'),
//   x, y (0..1: centro do objeto em 'flutuar' (0.8, 0.32: área livre da parede), da órbita em 'orbitar' (0.47, 0.35)
//     e altura da passagem em 'passar' (y 0.5)),
//   tamanho (diâmetro em px de 1080 no plano da tela; 260 em flutuar/orbitar, 420 em passar),
//   cor (cor principal do modelo; padrão por modelo: acento no relógio e na cápsula, creme na lua e no prato, dourado no sol),
//   cor2 (cor secundária: mostrador/metade creme/filete), giro (rad/s do giro lento; padrão por modelo),
//   pose ([rotX, rotY, rotZ] em graus somados à pose do modelo), lado (1 = da esquerda para a direita / anti-horário; −1 ao contrário),
//   passar: profundidade ([z inicial, z final] em unidades da cena, câmera em z 10; [2, 6.5]: cresce ao passar), arco (px, 60),
//   orbitar: raio (px, 320), voltas (0.5), fase (graus do início; −90 = começa na lateral), inclinacao (0.6: a frente da elipse passa mais baixo que o rosto
//     e o fundo mais alto que a cabeça; 0 = órbita no plano dos olhos), metade ('toda' | 'tras' | 'frente'),
//   relogio: horas ('10:10' no início), voltasMinuto (voltas do ponteiro dos minutos na peça, 1),
//   entrada: sempre mola snappy (z −3→0, escala 0,08→1 e giro de 63°; em 'passar' não se aplica),
//   saida ('recuar' padrão: 9 q encolhendo para o fundo | 'voar': 6 q para a câmera, com blur e fade | 'corte'),
//   motionBlur (amostras do CameraMotionBlur, 0–8; padrão 6 em 'passar' com ≤ 24 q, 0 no resto; ignorado acima de 24 q),
//   sombra (0.3: sombra suave projetada; 0 = sem), ambiente (intensidade dos reflexos, 0.45).
import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import type {Estilo} from '../../modelos/estilos';
import {CURVAS, MOLAS, clamp} from '../tempo';

// Sons (volumes exportados; o MIX aplica ganhoSfx ×1,25 com piso 0,55). No registro esta peça NÃO tem `sfx` fixo: o som
// de entrada depende do modo e sai daqui, de `sonsObjeto3d` (por isso "sons": false na camada cala também a entrada).
//   passar: whoosh épico com o pico de energia (0,24 s do arquivo) quando o objeto cruza o meio do quadro;
//   flutuar/orbitar: pop suave na entrada + whoosh com o pico no meio da saída; relógio: catraca de engrenagem quando
//   os ponteiros disparam. A metade 'tras' de uma órbita em 2 camadas fica muda (a metade 'frente' já soa).
//   "sfx" na camada (texto ou false) substitui o som de entrada, como nas outras peças.
export const sfxObjeto3d: [string, number] = ['motionix/pop/pop_05_smooth-pop', 0.55];
export const sfxObjeto3dPassar: [string, number] = ['motionix/whooshes/whooshes_20_epic-fast-whoosh-345469', 0.5];
// picos de energia medidos (astats, janelas de 30 ms): whoosh_20 em 0,24 s; whoosh_10 em 0,46 s; whoosh_14 em 0,69 s
const PICO = {passar: 0.24, voar: 0.46, recuar: 0.69};
export const sonsObjeto3d = (c: Camada, fps: number): Som[] => {
	const dur = c.fim - c.ini;
	const modo = txt(c.modo, 'flutuar');
	const saida = txt(c.saida, 'recuar');
	if (modo === 'orbitar' && txt(c.metade, 'toda') === 'tras') return [];
	const out: Som[] = [];
	const entradaPropria = c.sfx === undefined; // texto ou false: o motor cuida (ou silencia) a entrada
	if (modo === 'passar') {
		if (entradaPropria) out.push({t: Math.max(0, dur / 2 - PICO.passar), som: sfxObjeto3dPassar[0], vol: sfxObjeto3dPassar[1]});
	} else {
		if (entradaPropria) out.push({t: 0, som: sfxObjeto3d[0], vol: sfxObjeto3d[1]});
		if (txt(c.modelo, 'lua') === 'relogio') out.push({t: 0.2, som: 'motionix/gear/gear_03_smooth-and-premium-gear', vol: 0.5});
		// a saída dura 6 q (voar) ou 9 q (recuar) e termina no último quadro: pico do whoosh no meio dela
		if (saida === 'voar') out.push({t: Math.max(0.35, dur - 3 / 30 - PICO.voar), som: 'motionix/whooshes/whooshes_10_high-and-fast-whoosh', vol: 0.5});
		else if (saida === 'recuar') out.push({t: Math.max(0.35, dur - 4.5 / 30 - PICO.recuar), som: 'motionix/whooshes/whooshes_14_simple-whoosh', vol: 0.45});
	}
	return out.filter((s) => s.t >= 0 && s.t < dur - 1 / fps);
};

const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
const txt = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
const trio = (v: unknown): [number, number, number] => (Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number') ? [v[0], v[1], v[2]] : [0, 0, 0]);
const par = (v: unknown, padrao: [number, number]): [number, number] => (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number') ? [v[0], v[1]] : padrao);
const rad = (g: number) => (g * Math.PI) / 180;

const TINTA = '#1C0A06';
const CAM_Z = 10; // câmera em z 10 olhando para a origem
const FOV = 30;
const MOLA = MOLAS.snappy; // Apple: assenta em ~11 q, ~0,6% de passagem (sem quique visível)
const PASSAGEM = Easing.bezier(0.3, 0.12, 0.7, 0.88);

type Modelo = 'lua' | 'relogio' | 'capsula' | 'sol' | 'prato';
// pose de repouso (rad) e giro lento padrão (rad/s) de cada modelo
const BASE: Record<Modelo, {pose: [number, number, number]; giro: number}> = {
	lua: {pose: [0.15, -0.35, -0.35], giro: 0.55},
	relogio: {pose: [0.12, -0.42, 0.04], giro: 0}, // oscila (não mostra as costas)
	capsula: {pose: [0.3, 0, 0.7], giro: 1.1},
	sol: {pose: [0.1, -0.2, 0], giro: 0.25},
	prato: {pose: [0.95, 0, 0], giro: 0.35},
};

// ---------- materiais e modelos (diâmetro ≈ 2 unidades) ----------

const fisico = (cor: string, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
	new THREE.MeshPhysicalMaterial({color: cor, roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.18, ...extra});

// lua crescente: tubo ao longo de um arco, grosso no meio e afinando até as pontas (arredondadas), levemente achatado
// em z: um crescente "de verdade", com volume em todo o contorno (a extrusão de um recorte 2D ficava chapada)
const geoLua = () => {
	const RM = 0.6; // raio do arco central
	const RT = 0.37; // raio do tubo no meio
	const A0 = rad(58);
	const A1 = rad(302); // abertura voltada para a direita
	const NU = 96;
	const NV = 40;
	const pos: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i <= NU; i++) {
		const uu = i / NU;
		const a = A0 + (A1 - A0) * uu;
		const r = RT * Math.pow(Math.sin(Math.PI * uu), 0.62) + 0.004;
		const cx = RM * Math.cos(a) - 0.12;
		const cy = RM * Math.sin(a);
		for (let j = 0; j <= NV; j++) {
			const f = (j / NV) * Math.PI * 2;
			const radial = r * Math.cos(f);
			pos.push(cx + radial * Math.cos(a), cy + radial * Math.sin(a), r * Math.sin(f) * 0.78);
		}
	}
	for (let i = 0; i < NU; i++)
		for (let j = 0; j < NV; j++) {
			const a = i * (NV + 1) + j;
			const b = a + NV + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	return geo;
};

// meia cápsula (torno): equador em y 0 até a ponta em y = meio + raio
const geoMeiaCapsula = (raio: number, meio: number) => {
	const pts: THREE.Vector2[] = [new THREE.Vector2(raio, 0), new THREE.Vector2(raio, meio)];
	for (let i = 1; i <= 16; i++) {
		const a = (i / 16) * (Math.PI / 2);
		pts.push(new THREE.Vector2(Math.max(0.0001, raio * Math.cos(a)), meio + raio * Math.sin(a)));
	}
	return new THREE.LatheGeometry(pts, 64);
};

const geoPrato = () =>
	new THREE.LatheGeometry(
		[
			[0.001, 0],
			[0.55, 0],
			[0.6, 0.02],
			[0.95, 0.15],
			[1.0, 0.18],
			[0.99, 0.205],
			[0.95, 0.2],
			[0.62, 0.075],
			[0.56, 0.065],
			[0.001, 0.065],
		].map(([x, y]) => new THREE.Vector2(x, y - 0.1)),
		96,
	);

type CoresModelo = {cor: string; cor2: string; tinta: string};

const Lua: React.FC<CoresModelo> = ({cor}) => {
	const geo = useMemo(geoLua, []);
	const mat = useMemo(() => fisico(cor, {roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3, emissive: new THREE.Color('#F2CF8C'), emissiveIntensity: 0.05, sheen: 0.5, sheenColor: new THREE.Color('#FFF3D6'), side: THREE.DoubleSide}), [cor]);
	return <mesh geometry={geo} material={mat} />;
};

const Relogio: React.FC<CoresModelo & {minutos: number}> = ({cor, cor2, tinta, minutos}) => {
	const corpo = useMemo(() => fisico(cor, {roughness: 0.28, clearcoat: 1}), [cor]);
	const mostrador = useMemo(() => fisico(cor2, {roughness: 0.55, clearcoat: 0.2}), [cor2]);
	const escuro = useMemo(() => fisico(tinta, {roughness: 0.4, clearcoat: 0.4}), [tinta]);
	const metal = useMemo(() => fisico(cor, {roughness: 0.18, metalness: 0.55, clearcoat: 1}), [cor]);
	const angMin = -(minutos / 60) * Math.PI * 2;
	const angHora = -(minutos / 720) * Math.PI * 2;
	return (
		<group>
			{/* corpo e aro */}
			<mesh material={corpo} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[1, 1, 0.5, 96]} />
			</mesh>
			<mesh material={corpo} position={[0, 0, 0.25]}>
				<torusGeometry args={[0.95, 0.075, 24, 96]} />
			</mesh>
			<mesh material={mostrador} position={[0, 0, 0.252]}>
				<circleGeometry args={[0.9, 96]} />
			</mesh>
			{/* marcas das horas */}
			{Array.from({length: 12}, (_, i) => {
				const a = (i / 12) * Math.PI * 2;
				const longa = i % 3 === 0;
				const rr = longa ? 0.72 : 0.76;
				return (
					<mesh key={i} material={escuro} position={[Math.sin(a) * rr, Math.cos(a) * rr, 0.262]} rotation={[0, 0, -a]}>
						<boxGeometry args={[longa ? 0.06 : 0.035, longa ? 0.17 : 0.1, 0.02]} />
					</mesh>
				);
			})}
			{/* ponteiros (giram em volta do centro) */}
			<group position={[0, 0, 0.28]} rotation={[0, 0, angHora]}>
				<mesh material={escuro} position={[0, 0.2, 0]}>
					<boxGeometry args={[0.075, 0.46, 0.025]} />
				</mesh>
			</group>
			<group position={[0, 0, 0.3]} rotation={[0, 0, angMin]}>
				<mesh material={escuro} position={[0, 0.3, 0]}>
					<boxGeometry args={[0.05, 0.66, 0.025]} />
				</mesh>
			</group>
			<mesh material={corpo} position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.065, 0.065, 0.05, 32]} />
			</mesh>
			{/* sinos, martelo, alça e pés */}
			{[-1, 1].map((s) => (
				<group key={s} position={[s * 0.62, 0.86, -0.02]} rotation={[0, 0, -s * 0.62]}>
					<mesh material={metal}>
						<sphereGeometry args={[0.36, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
					</mesh>
					<mesh material={metal} position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
						<circleGeometry args={[0.36, 48]} />
					</mesh>
				</group>
			))}
			<mesh material={metal} position={[0, 1.12, -0.02]}>
				<torusGeometry args={[0.24, 0.035, 12, 48, Math.PI]} />
			</mesh>
			<mesh material={escuro} position={[0, 1.04, -0.02]}>
				<sphereGeometry args={[0.07, 24, 12]} />
			</mesh>
			{[-1, 1].map((s) => (
				<mesh key={s} material={escuro} position={[s * 0.55, -0.93, -0.02]} rotation={[0, 0, s * 0.5]}>
					<cylinderGeometry args={[0.05, 0.08, 0.26, 20]} />
				</mesh>
			))}
		</group>
	);
};

const Capsula: React.FC<CoresModelo> = ({cor, cor2}) => {
	const geo = useMemo(() => geoMeiaCapsula(0.4, 0.5), []);
	const a = useMemo(() => fisico(cor, {roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08}), [cor]);
	const b = useMemo(() => fisico(cor2, {roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1}), [cor2]);
	return (
		<group scale={1.08}>
			<mesh geometry={geo} material={a} />
			<mesh geometry={geo} material={b} rotation={[Math.PI, 0, 0]} />
		</group>
	);
};

const Sol: React.FC<CoresModelo & {t: number}> = ({cor, t}) => {
	const mat = useMemo(() => fisico(cor, {roughness: 0.35, clearcoat: 0.7, emissive: new THREE.Color(cor), emissiveIntensity: 0.35}), [cor]);
	return (
		<group>
			<mesh material={mat}>
				<sphereGeometry args={[0.52, 64, 32]} />
			</mesh>
			<group rotation={[0, 0, t * 0.5]}>
				{Array.from({length: 12}, (_, i) => {
					const a = (i / 12) * Math.PI * 2;
					return (
						<mesh key={i} material={mat} position={[Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0]} rotation={[0, 0, a - Math.PI / 2]}>
							<capsuleGeometry args={[0.065, 0.2, 6, 16]} />
						</mesh>
					);
				})}
			</group>
		</group>
	);
};

const Prato: React.FC<CoresModelo> = ({cor, cor2}) => {
	const geo = useMemo(geoPrato, []);
	const mat = useMemo(() => fisico(cor, {roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide}), [cor]);
	const filete = useMemo(() => fisico(cor2, {roughness: 0.25, clearcoat: 1}), [cor2]);
	return (
		<group>
			<mesh geometry={geo} material={mat} />
			<mesh material={filete} position={[0, 0.072, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.9, 0.018, 8, 96]} />
			</mesh>
		</group>
	);
};

// reflexos de um "estúdio" gerado por código (sem arquivo HDR); vale para todos os materiais da cena
const Ambiente: React.FC<{intensidade: number}> = ({intensidade}) => {
	const {gl, scene} = useThree();
	const env = useMemo(() => {
		const pm = new THREE.PMREMGenerator(gl);
		const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
		pm.dispose();
		return tex;
	}, [gl]);
	useLayoutEffect(() => {
		scene.environment = env;
		scene.environmentIntensity = intensidade;
		return () => {
			scene.environment = null;
		};
	}, [scene, env, intensidade]);
	return null;
};

// ---------- cena ----------

type Params = {
	modelo: Modelo;
	modo: string;
	x: number;
	y: number;
	tamanho: number;
	cores: CoresModelo;
	giro: number;
	pose: [number, number, number];
	lado: number;
	prof: [number, number];
	arco: number;
	raio: number;
	voltas: number;
	fase: number;
	inclinacao: number;
	metade: string;
	minutos0: number;
	voltasMinuto: number;
	saida: string;
	ambiente: number;
};

const Cena: React.FC<{p: Params; dur: number}> = ({p, dur}) => {
	const frame = useCurrentFrame(); // fracionário dentro do CameraMotionBlur
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const t = frame / fps;
	const visH = 2 * CAM_Z * Math.tan(rad(FOV / 2)); // altura visível no plano z = 0
	const visW = (visH * W) / H;
	const mundo = (px: number) => (px * u * visH) / H; // px de 1080 → unidades da cena (no plano z = 0)
	const X = (fx: number) => (fx - 0.5) * visW;
	const Y = (fy: number) => (0.5 - fy) * visH;
	const escalaBase = mundo(p.tamanho) / 2;

	let pos: [number, number, number] = [X(p.x), Y(p.y), 0];
	let escala = escalaBase;
	let rot: [number, number, number] = [0, 0, 0];
	let visivel = true;
	const qSaida = Math.round((9 * fps) / 30);
	const qVoar = Math.round((6 * fps) / 30);

	if (p.modo === 'passar') {
		// atravessa de fora a fora, aproximando-se da câmera; velocidade quase constante no meio (wipe)
		const pr = interpolate(frame, [0, dur], [0, 1], clamp);
		const k = PASSAGEM(pr); // quase linear: não freia nas pontas (que ficam fora do quadro)
		const z = p.prof[0] + (p.prof[1] - p.prof[0]) * k;
		const meia = (CAM_Z - z) * Math.tan(rad(FOV / 2)) * (W / H); // meia largura visível nessa profundidade
		const margem = escalaBase * 1.3;
		const x0 = -(meia + margem) * p.lado;
		pos = [x0 + 2 * (meia + margem) * p.lado * k, Y(p.y) + mundo(p.arco) * Math.sin(Math.PI * k) * ((CAM_Z - z) / CAM_Z), z];
		rot = [0.5 * k, p.lado * Math.PI * 1.4 * k, -p.lado * 0.6 * k];
	} else {
		const m = spring({frame, fps, config: MOLA});
		let zExtra = -3 * (1 - m);
		escala = escalaBase * (0.08 + 0.92 * m); // nasce quase do nada (nada entra seco)
		rot = [0, -1.1 * p.lado * (1 - m), 0];
		if (p.modo === 'orbitar') {
			const th = rad(p.fase) + p.lado * 2 * Math.PI * p.voltas * (frame / Math.max(1, dur));
			const rx = mundo(p.raio);
			const rz = rx * 0.85;
			const zRel = rz * Math.cos(th);
			pos = [X(p.x) + rx * Math.sin(th), Y(p.y) - p.inclinacao * rz * Math.cos(th), zRel];
		} else {
			// flutuação lenta (seno, sem ruído: nada de tremida)
			pos = [pos[0], pos[1] + mundo(10) * Math.sin((2 * Math.PI * t) / 3.2), 0];
			rot[0] += 0.08 * Math.sin((2 * Math.PI * t) / 4.5);
		}
		// saída
		if (p.saida === 'voar') {
			const s = interpolate(frame, [dur - 1 - qVoar, dur - 1], [0, 1], {...clamp, easing: CURVAS.saida});
			zExtra += 7.5 * s;
			rot[1] += 1.2 * p.lado * s;
		} else if (p.saida === 'recuar') {
			const s = interpolate(frame, [dur - 1 - qSaida, dur - 1], [0, 1], {...clamp, easing: CURVAS.saida});
			zExtra -= 3 * s;
			escala *= 1 - s;
			rot[1] += 0.9 * p.lado * s;
		}
		pos = [pos[0], pos[1], pos[2] + zExtra];
		// órbita em 2 camadas: cada uma desenha só a sua metade (pela profundidade final, que inclui entrada e saída)
		if (p.modo === 'orbitar') visivel = p.metade === 'tras' ? pos[2] < 0 : p.metade === 'frente' ? pos[2] >= 0 : true;
	}
	// giro lento (o relógio só oscila, para não mostrar as costas)
	const giro = p.modelo === 'relogio' ? 0.35 * Math.sin((2 * Math.PI * t) / 3) : p.giro * t * p.lado;
	const base = BASE[p.modelo].pose;
	const minutos = p.minutos0 + 60 * p.voltasMinuto * (frame / Math.max(1, dur));

	return (
		<ThreeCanvas
			width={W}
			height={H}
			style={{position: 'absolute', left: 0, top: 0}}
			camera={{fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 100}}
			onCreated={({gl}) => {
				gl.toneMapping = THREE.NeutralToneMapping;
				gl.toneMappingExposure = 1;
			}}
		>
			<Ambiente intensidade={p.ambiente} />
			<ambientLight intensity={0.12} />
			<directionalLight position={[-4, 5, 5]} intensity={2.8} />
			<directionalLight position={[5, 1, -3]} intensity={1.8} color="#FFE6CC" />
			<directionalLight position={[1, -4, 3]} intensity={0.25} />
			<group position={pos} scale={escala} visible={visivel}>
				<group rotation={[rot[0], rot[1] + giro, rot[2]]}>
					<group rotation={[base[0] + rad(p.pose[0]), base[1] + rad(p.pose[1]), base[2] + rad(p.pose[2])]}>
						{p.modelo === 'lua' ? (
							<Lua {...p.cores} />
						) : p.modelo === 'relogio' ? (
							<Relogio {...p.cores} minutos={minutos} />
						) : p.modelo === 'capsula' ? (
							<Capsula {...p.cores} />
						) : p.modelo === 'sol' ? (
							<Sol {...p.cores} t={t} />
						) : (
							<Prato {...p.cores} />
						)}
					</group>
				</group>
			</group>
		</ThreeCanvas>
	);
};

const coresPadrao = (modelo: Modelo, est: Estilo, c: Camada): CoresModelo => {
	const creme = est.creme;
	const tinta = est.tinta ?? TINTA;
	const padrao: Record<Modelo, [string, string]> = {
		lua: ['#F1E3C2', creme],
		relogio: [est.acento, creme],
		capsula: [est.acento, creme],
		sol: ['#F0B255', creme],
		prato: [creme, est.acento],
	};
	return {cor: txt(c.cor, padrao[modelo][0]), cor2: txt(c.cor2, padrao[modelo][1]), tinta};
};

export const Objeto3d: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const modelo = (['lua', 'relogio', 'capsula', 'sol', 'prato'].includes(txt(c.modelo, '')) ? c.modelo : 'lua') as Modelo;
	const modo = txt(c.modo, 'flutuar');
	const [hh, mm] = txt(c.horas, '10:10').split(':').map((v) => parseInt(v, 10) || 0);
	const p: Params = {
		modelo,
		modo,
		x: num(c.x, modo === 'passar' ? 0.5 : modo === 'orbitar' ? 0.47 : 0.8),
		y: num(c.y, modo === 'passar' ? 0.5 : modo === 'orbitar' ? 0.35 : 0.32),
		tamanho: num(c.tamanho, modo === 'passar' ? 420 : 260),
		cores: coresPadrao(modelo, est, c),
		giro: num(c.giro, BASE[modelo].giro),
		pose: trio(c.pose),
		lado: num(c.lado, 1) < 0 ? -1 : 1,
		prof: par(c.profundidade, [2, 6.5]),
		arco: num(c.arco, 60),
		raio: num(c.raio, 320),
		voltas: num(c.voltas, 0.5),
		fase: num(c.fase, -90),
		inclinacao: num(c.inclinacao, 0.6),
		metade: txt(c.metade, 'toda'),
		minutos0: (hh % 12) * 60 + mm,
		voltasMinuto: num(c.voltasMinuto, 1),
		saida: txt(c.saida, 'recuar'),
		ambiente: num(c.ambiente, 0.45),
	};
	const q30 = (dur * 30) / fps;
	const amostras = q30 <= 24 ? Math.max(0, Math.min(8, Math.round(num(c.motionBlur, modo === 'passar' ? 6 : 0)))) : 0;
	const sombra = num(c.sombra, modo === 'passar' ? 0 : 0.3);
	const u = Math.min(W, H) / 1080;
	// saída 'voar': o objeto cresce para a câmera e some com blur (como o texto-3d), em vez de sumir seco no corte
	let opac = 1;
	let blur = 0;
	if (modo !== 'passar' && p.saida === 'voar') {
		const s = interpolate(frame, [dur - 1 - Math.round((6 * fps) / 30), dur - 1], [0, 1], {...clamp, easing: CURVAS.saida});
		blur = 30 * u * s;
		opac = 1 - interpolate(s, [0.45, 1], [0, 1], clamp);
	}
	const filtros = [blur > 0.3 ? `blur(${blur}px)` : '', sombra > 0 ? `drop-shadow(0 ${26 * u}px ${34 * u}px rgba(0,0,0,${sombra}))` : ''].filter(Boolean).join(' ');
	return (
		<AbsoluteFill style={{pointerEvents: 'none', opacity: opac, filter: filtros || undefined}}>
			{amostras > 1 ? (
				<CameraMotionBlur samples={amostras} shutterAngle={180}>
					<Cena p={p} dur={dur} />
				</CameraMotionBlur>
			) : (
				<Cena p={p} dur={dur} />
			)}
		</AbsoluteFill>
	);
};
