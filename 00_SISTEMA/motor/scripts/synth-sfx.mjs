// Synthesizes a clean, modern SFX pack (48 kHz stereo WAV) with no external deps.
// Usage: node scripts/synth-sfx.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const outDir = process.argv[2] ?? 'public/sfx/raw';
fs.mkdirSync(outDir, {recursive: true});

// Deterministic RNG so the pack is reproducible.
let seed = 1337;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

const buf = (sec) => [new Float32Array(Math.round(sec * SR)), new Float32Array(Math.round(sec * SR))];
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

// RBJ biquad with per-sample cutoff (allows sweeps).
function biquad(type) {
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	return (x, f, q = 0.9) => {
		const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
		const c = Math.cos(w), a = Math.sin(w) / (2 * q);
		let b0, b1, b2;
		if (type === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
		else if (type === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
		else [b0, b1, b2] = [a, 0, -a]; // band-pass (0 dB peak)
		const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
		const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
		x2 = x1; x1 = x; y2 = y1; y1 = y;
		return y;
	};
}

// Pinkish noise (Paul Kellet's economy filter).
function pink() {
	let b0 = 0, b1 = 0, b2 = 0;
	return () => {
		const w = rand();
		b0 = 0.99765 * b0 + w * 0.099046;
		b1 = 0.963 * b1 + w * 0.2965164;
		b2 = 0.57 * b2 + w * 1.0526913;
		return (b0 + b1 + b2 + w * 0.1848) * 0.2;
	};
}

function writeWav(name, [L, R]) {
	let peak = 1e-9;
	for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
	const g = 0.89 / peak; // normalize to ~-1 dBFS
	const n = L.length, data = Buffer.alloc(44 + n * 4);
	data.write('RIFF', 0); data.writeUInt32LE(36 + n * 4, 4); data.write('WAVE', 8);
	data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
	data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
	data.write('data', 36); data.writeUInt32LE(n * 4, 40);
	for (let i = 0; i < n; i++) {
		data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
		data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
	}
	fs.writeFileSync(path.join(outDir, name + '.wav'), data);
	console.log('wrote', name, (n / SR).toFixed(2) + 's');
}

// Swept band-passed noise with a swell envelope and a stereo pan: the classic whoosh.
function whoosh({dur, f0, f1, f2, q, attack, pan = [-0.6, 0.6], hp = 0}) {
	const [L, R] = buf(dur), n = L.length, src = pink();
	const bpL = biquad('bp'), bpR = biquad('bp'), hpf = biquad('hp');
	for (let i = 0; i < n; i++) {
		const t = i / n;
		const f = t < attack ? lerp(f0, f1, smooth(t / attack)) : lerp(f1, f2, smooth((t - attack) / (1 - attack)));
		const env = t < attack ? Math.pow(t / attack, 2.2) : Math.pow(1 - (t - attack) / (1 - attack), 1.8);
		let s = src();
		if (hp) s = hpf(s, hp);
		const p = lerp(pan[0], pan[1], smooth(t));
		L[i] = bpL(s, f, q) * env * Math.cos((p + 1) * Math.PI / 4);
		R[i] = bpR(s, f * 1.03, q) * env * Math.sin((p + 1) * Math.PI / 4);
	}
	return [L, R];
}

// 1. Soft whoosh for layout changes / blur dissolve.
writeWav('whoosh_soft', whoosh({dur: 0.55, f0: 250, f1: 1800, f2: 400, q: 0.8, attack: 0.55}));
// 2. Fast whip for directional transitions.
writeWav('whoosh_fast', whoosh({dur: 0.28, f0: 500, f1: 3200, f2: 700, q: 1.1, attack: 0.45, pan: [-0.9, 0.9]}));
// 3. Airy swish, very light, for blur-in of text blocks.
writeWav('swish_air', whoosh({dur: 0.45, f0: 3000, f1: 7000, f2: 4000, q: 0.7, attack: 0.4, pan: [0.2, -0.2], hp: 1500}));

// 4. Soft UI click (keyword lands).
{
	const [L, R] = buf(0.06), n = L.length, bp = biquad('bp');
	for (let i = 0; i < n; i++) {
		const t = i / SR;
		const s = bp(rand(), 3800, 2.5) * Math.exp(-t * 180) + Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 260) * 0.5;
		L[i] = R[i] = s;
	}
	writeWav('click_soft', [L, R]);
}

// 5. Soft pop: quick pitch drop sine (big keyword appears).
{
	const [L, R] = buf(0.14), n = L.length;
	let ph = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SR, f = 260 + 700 * Math.exp(-t * 45);
		ph += (2 * Math.PI * f) / SR;
		const s = Math.sin(ph) * Math.exp(-t * 30) * Math.min(1, t * 2000);
		L[i] = R[i] = s;
	}
	writeWav('pop_soft', [L, R]);
}

// 6. Micro tick for word-by-word captions (use at low volume).
{
	const [L, R] = buf(0.03), n = L.length, hp = biquad('hp');
	for (let i = 0; i < n; i++) {
		const t = i / SR;
		L[i] = R[i] = hp(rand(), 5000) * Math.exp(-t * 400);
	}
	writeWav('tick_micro', [L, R]);
}

// 7. Short riser: noise + rising tone, builds into a reveal.
{
	const dur = 1.6, [L, R] = buf(dur), n = L.length, src = pink(), bp = biquad('bp'), bp2 = biquad('bp');
	let ph = 0;
	for (let i = 0; i < n; i++) {
		const t = i / n, f = 180 * Math.pow(2, t * 3);
		ph += (2 * Math.PI * f) / SR;
		const env = Math.pow(t, 2.5) * (t > 0.97 ? (1 - t) / 0.03 : 1);
		const s = src();
		L[i] = (bp(s, 400 + 6000 * t * t, 0.9) * 0.9 + Math.sin(ph) * 0.18) * env;
		R[i] = (bp2(s, 420 + 6200 * t * t, 0.9) * 0.9 + Math.sin(ph * 1.005) * 0.18) * env;
	}
	writeWav('riser_short', [L, R]);
}

// 8. Sub impact: cinematic "boom" for story beats.
{
	const dur = 1.8, [L, R] = buf(dur), n = L.length, lp = biquad('lp');
	let ph = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SR, f = 38 + 50 * Math.exp(-t * 9);
		ph += (2 * Math.PI * f) / SR;
		const body = Math.sin(ph) * Math.exp(-t * 2.4);
		const trans = lp(rand(), 900) * Math.exp(-t * 35) * 0.9;
		L[i] = R[i] = (body + trans) * Math.min(1, t * 400);
	}
	writeWav('impact_sub', [L, R]);
}

// 9. Shimmer: airy bell cluster for white flash / light leak.
{
	const dur = 1.2, [L, R] = buf(dur), n = L.length;
	const partials = [1318.5, 1975.5, 2637, 3951, 5274];
	for (let i = 0; i < n; i++) {
		const t = i / SR, env = Math.min(1, t * 30) * Math.exp(-t * 3.2);
		let l = 0, r = 0;
		partials.forEach((f, k) => {
			const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * (5 + k) * t + k);
			l += Math.sin(2 * Math.PI * f * t + k) * trem / (k + 1.5);
			r += Math.sin(2 * Math.PI * f * 1.004 * t + k * 2) * trem / (k + 1.5);
		});
		L[i] = l * env; R[i] = r * env;
	}
	writeWav('shimmer', [L, R]);
}

// 10. Glitch: bit-crushed, sample-held noise bursts.
{
	const dur = 0.24, [L, R] = buf(dur), n = L.length, bp = biquad('bp');
	let hold = 0, held = 0;
	for (let i = 0; i < n; i++) {
		const t = i / n;
		if (hold-- <= 0) { hold = 6 + Math.floor((rand() + 1) * 40); held = rand(); }
		const gate = Math.sin(t * Math.PI * 9) > -0.2 ? 1 : 0.1;
		const s = Math.round(bp(held, 1200 + 2500 * (rand() + 1), 1.5) * 8) / 8;
		L[i] = s * gate * (1 - t * 0.6);
		R[i] = s * gate * (1 - t * 0.6) * (rand() > 0 ? 1 : 0.7);
	}
	writeWav('glitch', [L, R]);
}

// 11. Reverse swell: rising airy tail that sucks into a cut.
{
	const dur = 0.9, [L, R] = buf(dur), n = L.length, src = pink(), lpL = biquad('lp'), lpR = biquad('lp');
	for (let i = 0; i < n; i++) {
		const t = i / n, env = Math.pow(t, 3) * (t > 0.985 ? (1 - t) / 0.015 : 1);
		const s = src();
		L[i] = lpL(s, 600 + 5000 * t, 0.7) * env;
		R[i] = lpR(-s, 650 + 5200 * t, 0.7) * env;
	}
	writeWav('reverse_swell', [L, R]);
}
