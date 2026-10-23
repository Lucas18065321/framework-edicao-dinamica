// Cena de teste das ferramentas de motion (16:9): texto atrás da pessoa recortada, 3D, motion blur,
// ícones de redes, curva desenhada e efeitos WebGL. Render: --public-dir com foto.jpg e pessoa.webm (alfa).
import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {evolvePath} from '@remotion/paths';
import {noise2D} from '@remotion/noise';
import {tear} from '@remotion/effects/tear';
import {glow} from '@remotion/effects/glow';
import {siInstagram, siYoutube, siTiktok} from 'simple-icons';
import {Zap} from 'lucide-react';
import {loadFont} from '@remotion/google-fonts/InterTight';

const {fontFamily} = loadFont('normal', {weights: ['800'], subsets: ['latin', 'latin-ext']});
const LARANJA = '#ff6a1a';
const saida = Easing.bezier(0.16, 1, 0.3, 1); // expo-out: chega rápido e assenta suave

const Grade: React.FC = () => (
	<AbsoluteFill style={{background: '#0b0b0c', backgroundImage: 'linear-gradient(#ffffff10 1px, transparent 1px), linear-gradient(90deg, #ffffff10 1px, transparent 1px)', backgroundSize: '80px 80px'}} />
);

const Toro: React.FC = () => {
	const frame = useCurrentFrame();
	return (
		<ThreeCanvas width={640} height={1080} style={{position: 'absolute', left: 0, top: 0}} camera={{fov: 40, position: [0, 0, 7]}}>
			<ambientLight intensity={0.5} />
			<pointLight position={[3, 3, 5]} intensity={80} />
			<mesh rotation={[frame * 0.03, frame * 0.05, 0]}>
				<torusKnotGeometry args={[1.1, 0.35, 160, 24]} />
				<meshStandardMaterial color={LARANJA} metalness={0.3} roughness={0.25} />
			</mesh>
		</ThreeCanvas>
	);
};

const TextoAtras: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame, fps, config: {damping: 14, stiffness: 120}});
	return (
		<div style={{position: 'absolute', left: 640, top: 0, width: 640, height: 1080, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #5a2a10, #0b0b0c 70%)'}}>
			<div style={{position: 'absolute', top: 360, width: '100%', textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 190, color: LARANJA, letterSpacing: '-0.05em', transform: `scale(${0.6 + 0.4 * s})`, opacity: s}}>
				AÇÚCAR
			</div>
			<OffthreadVideo transparent muted src={staticFile('pessoa.webm')} style={{position: 'absolute', bottom: 0, left: 16, height: 1080}} />
		</div>
	);
};

const Icone: React.FC<{d: string; cor: string; atraso: number; x: number}> = ({d, cor, atraso, x}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: frame - atraso, fps, config: {damping: 11, stiffness: 160, mass: 0.6}});
	const flut = noise2D('icone' + atraso, frame / 50, 0) * 8;
	return (
		<div style={{position: 'absolute', left: x, top: 90 + flut, width: 110, height: 110, borderRadius: 28, background: '#ffffff14', border: '1px solid #ffffff26', display: 'grid', placeItems: 'center', transform: `scale(${s})`}}>
			<svg viewBox="0 0 24 24" width={56} height={56}><path d={d} fill={cor} /></svg>
		</div>
	);
};

const Direita: React.FC = () => {
	const frame = useCurrentFrame();
	const curva = 'M 40 420 C 260 420, 200 120, 560 120';
	const ev = evolvePath(interpolate(frame, [0, 40], [0, 1], {easing: saida, extrapolateRight: 'clamp'}), curva);
	const rasgo = interpolate(frame, [20, 55], [0, 0.9], {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', left: 1280, top: 0, width: 640, height: 1080}}>
			<Icone d={siInstagram.path} cor="#fff" atraso={10} x={60} />
			<Icone d={siYoutube.path} cor="#fff" atraso={16} x={200} />
			<Icone d={siTiktok.path} cor="#fff" atraso={22} x={340} />
			<div style={{position: 'absolute', left: 480, top: 90, width: 110, height: 110, display: 'grid', placeItems: 'center'}}>
				<Zap size={72} color={LARANJA} strokeWidth={1.5} />
			</div>
			<svg width={600} height={480} style={{position: 'absolute', left: 20, top: 230}}>
				<path d={curva} stroke={LARANJA} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
			</svg>
			<Img src={staticFile('foto.jpg')} effects={[tear({progress: rasgo, angle: 12, jaggedness: 18}), glow({radius: 18, intensity: 0.6, threshold: 0.7})]} style={{position: 'absolute', left: 80, top: 640, width: 480, height: 300, objectFit: 'cover', borderRadius: 18}} />
		</div>
	);
};

const Bloco: React.FC = () => {
	const frame = useCurrentFrame();
	const x = interpolate(frame, [5, 25], [-200, 1900], {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <div style={{position: 'absolute', left: x, top: 980, width: 160, height: 60, borderRadius: 30, background: LARANJA}} />;
};

export const TesteKit: React.FC = () => (
	<AbsoluteFill>
		<Grade />
		<Toro />
		<TextoAtras />
		<Direita />
		<CameraMotionBlur shutterAngle={180} samples={8}>
			<AbsoluteFill>
				<Bloco />
			</AbsoluteFill>
		</CameraMotionBlur>
	</AbsoluteFill>
);
