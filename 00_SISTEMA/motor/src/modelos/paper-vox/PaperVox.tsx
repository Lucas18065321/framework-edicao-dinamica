// INSTAGRAM - PAPER VOX ANIMATION (modelo fixo paper-vox-instagram), quadro contínuo: todas as cenas moram num mundo grande e uma câmera virtual
// (chaves sincronizadas às palavras) passeia por ele sem corte. Parallax em 3 planos, motion blur só quando a câmera
// corre (amostras sub-quadro, como o CameraMotionBlur), acabamento dark por cima e a voz por baixo.
import React from 'react';
import {AbsoluteFill, Freeze, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {Audio} from '@remotion/media';
import {Grao} from '../../kit/Grao';
import {PARALLAX, cameraViva, transformPlano, velocidadeTela, type EstadoCamera} from './camera';
import {COR, DESLIGADO, ElementoView, nasce} from './elementos';
import {ladrilhoFundo} from './texturas';
import {CURVAS} from '../../kit/tempo';
import type {Elemento, MontagemLab, Plano, QuadroProps} from './tipos';

// Sem duracao válida (ex.: "remotion compositions" rodando com props de outro modelo), fica a duração padrão.
export const calcularPaperVox: CalculateMetadataFunction<QuadroProps> = ({props}) => (Number.isFinite(props.duracao) && props.duracao > 0 ? {durationInFrames: Math.max(1, Math.round(props.duracao * 24))} : {});

const PLANOS: Plano[] = ['fundo', 'meio', 'frente'];
const MARGEM = 260; // px de tela além da borda antes de descartar a peça (corte de desempenho)

// A peça está viva e perto o bastante da tela para valer o desenho?
const visivel = (e: Elemento, t: number, c: EstadoCamera, k: number, W: number, H: number) => {
	if (t < nasce(e) - 0.001 || (e.fim != null && t > e.fim)) return false;
	const z = Math.pow(c.zoom, k);
	const raio = (Math.hypot(e.w, e.h ?? e.w * 1.3) / 2) * z * 1.3;
	const sx = W / 2 + (e.x - c.x * k) * z, sy = H / 2 + (e.y - c.y * k) * z;
	return sx + raio > -MARGEM && sx - raio < W + MARGEM && sy + raio > -MARGEM && sy - raio < H + MARGEM;
};

// Fundo infinito: ladrilho preto-fosco que anda a 40% da câmera (mais longe que o plano "fundo").
const FundoInfinito: React.FC<{c: EstadoCamera; W: number; H: number}> = ({c, W, H}) => {
	const k = 0.4, z = Math.pow(c.zoom, k), S = 512 * z;
	const ox = ((W / 2 - c.x * k * z) % S + S) % S, oy = ((H / 2 - c.y * k * z) % S + S) % S;
	return <AbsoluteFill style={{backgroundColor: COR.preto, backgroundImage: `url(${ladrilhoFundo()})`, backgroundSize: `${S}px ${S}px`, backgroundPosition: `${ox}px ${oy}px`}} />;
};

// Camadas dentro de cada plano (ajuste da prévia 2 do piloto: uma palavra ficou atrás de uma foto e outra atrás da
// linha): o texto fica SEMPRE por cima de papel, foto, recorte e objeto; traço à mão e flash, por cima do texto (o risco
// que corta a palavra continua cortando). A ordem do quadro.json vale dentro de cada camada.
const camada = (e: Elemento) => (e.tipo === 'traco' || (e.tipo === 'objeto' && e.nome === 'flash') ? 2 : e.tipo === 'texto' ? 1 : 0);

const Mundo: React.FC<{p: QuadroProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const t = frame / fps;
	const c = cameraViva(p.camera, t, p.viva ?? 5);
	const ordem = React.useMemo(() => [0, 1, 2].flatMap((k) => p.elementos.filter((e) => camada(e) === k)), [p.elementos]);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			{!DESLIGADO.has('fundo') && <FundoInfinito c={c} W={W} H={H} />}
			{PLANOS.map((pl) => (
				<div key={pl} style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: transformPlano(c, PARALLAX[pl], W, H)}}>
					{ordem
						.filter((e) => (e.plano ?? 'meio') === pl && visivel(e, t, c, PARALLAX[pl], W, H))
						.map((e) => (
							<ElementoView key={e.id} e={e} frame={frame} fps={fps} />
						))}
				</div>
			))}
		</AbsoluteFill>
	);
};

// Motion blur de câmera: n cópias do mundo em instantes sub-quadro (obturador em fração de quadro), somadas.
// A cópia 0 nunca desmonta (chave estável), então ligar e desligar o blur não recarrega nada. Quando o rastro é longo
// e as amostras ficam espaçadas (> 5 px), o CONJUNTO ganha um blur leve de meio espaçamento (1 blur só, não 1 por
// cópia: medido em 2026-10-19, 12 cópias com blur cada custavam 3,9 s/quadro): sem "degraus" no chicote.
const BlurMovimento: React.FC<{amostras: number; obturador: number; suavizar: number; children: React.ReactNode}> = ({amostras, obturador, suavizar, children}) => {
	const frame = useCurrentFrame();
	const n = Math.max(1, Math.round(amostras));
	return (
		<AbsoluteFill style={{isolation: 'isolate', filter: n > 1 && suavizar > 0.5 ? `blur(${suavizar.toFixed(1)}px)` : undefined}}>
			{Array.from({length: n}, (_, i) => {
				const off = n === 1 ? 0 : obturador * (i / (n - 1) - 0.5);
				return (
					<AbsoluteFill key={i} style={n > 1 ? {mixBlendMode: 'plus-lighter', opacity: 1 / n} : undefined}>
						<Freeze frame={Math.max(0, frame + off)}>{children}</Freeze>
					</AbsoluteFill>
				);
			})}
		</AbsoluteFill>
	);
};

// Montagem rápida: entrada (a tela do plano 1 cresce de dentro do mergulho da câmera), planos curtos em tela cheia com
// movimento rápido e 2 quadros de blur + clarão na troca, saída (encolhe e some enquanto a câmera emerge).
const durPlanos = (m: MontagemLab) => m.planos.reduce((s, p) => s + p.dur, 0);
export const cobreTudo = (ms: MontagemLab[] | undefined, t: number) => (ms ?? []).some((m) => t >= m.ini + m.entrada && t <= m.ini + m.entrada + durPlanos(m));
const cl = (v: number) => Math.min(1, Math.max(0, v));
const Montagem: React.FC<{m: MontagemLab; t: number}> = ({m, t}) => {
	const t1 = m.ini + m.entrada, t2 = t1 + durPlanos(m), t3 = t2 + m.saida;
	if (t < m.ini || t > t3) return null;
	let op = 1, esc = 1, blurIO = 0;
	if (t < t1) {
		const p = CURVAS.saida(cl((t - m.ini) / m.entrada));
		op = p;
		esc = 2.2 - 1.2 * p;
		blurIO = 14 * (1 - p);
	} else if (t > t2) {
		const p = CURVAS.entrada(cl((t - t2) / m.saida));
		op = 1 - p;
		esc = 1 - 0.55 * p;
		blurIO = 12 * p;
	}
	let acc = t1, i = 0;
	while (i < m.planos.length - 1 && t >= acc + m.planos[i].dur) acc += m.planos[i++].dur;
	const pl = m.planos[Math.min(i, m.planos.length - 1)];
	const lt = Math.max(0, t - acc), q = cl(lt / pl.dur);
	const troca = cl(1 - lt / (2 / 24)); // 2 quadros de entrada de cada plano
	const mov = pl.mov ?? 'push';
	const tr =
		mov === 'push' ? `scale(${1.08 + 0.16 * q})` :
		mov === 'pull' ? `scale(${1.26 - 0.14 * q})` :
		mov === 'pan-e' ? `scale(1.18) translateX(${4 - 8 * q}%)` :
		mov === 'pan-d' ? `scale(1.18) translateX(${-4 + 8 * q}%)` :
		`scale(1.18) translateY(${3 - 6 * q}%)`;
	const filtro = [`blur(${(blurIO + 9 * troca).toFixed(1)}px)`, `brightness(${((pl.escurecer ?? 1) * (1 + 0.35 * troca)).toFixed(2)})`, 'grayscale(1)', 'contrast(1.08)'].join(' ');
	return (
		<AbsoluteFill style={{opacity: op, transform: `scale(${esc})`, overflow: 'hidden', backgroundColor: COR.preto}}>
			<Img src={staticFile(pl.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: tr, filter: filtro}} />
		</AbsoluteFill>
	);
};

// AcabamentoDark (tela, fora do blur): poço de luz no centro, vinheta e grão.
const Acabamento: React.FC<{grao: number}> = ({grao}) =>
	DESLIGADO.has('acabamento') ? null : (
		<>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(242,239,234,0.06), rgba(242,239,234,0) 70%)', mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.62) 100%)'}} />
			{!DESLIGADO.has('grao') && <Grao forca={grao} />}
		</>
	);

export const PaperVox: React.FC<QuadroProps> = (p) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	DESLIGADO.clear();
	for (const d of p._desligar ?? []) DESLIGADO.add(d);
	const b = p.blur ?? {ativo: true};
	const obt = b.obturador ?? 0.5;
	let n = 1, suavizar = 0;
	if (b.ativo && !cobreTudo(p.montagens, frame / fps)) {
		const v = velocidadeTela(p.camera, frame / fps, 1 / fps, width, height);
		if (v > (b.limiar ?? 18)) {
			const rastro = v * obt; // px que a imagem anda com o obturador aberto
			n = Math.min(b.maxAmostras ?? 8, Math.max(3, Math.ceil(rastro / (b.espaco ?? 14)) + 1));
			const espaco = rastro / (n - 1);
			suavizar = espaco > 5 ? espaco * 0.5 : 0;
		}
	}
	return (
		<AbsoluteFill style={{backgroundColor: COR.preto}}>
			<BlurMovimento amostras={n} obturador={obt} suavizar={suavizar}>
				<Mundo p={p} />
			</BlurMovimento>
			{(p.montagens ?? []).map((m, i) => (
				<Montagem key={i} m={m} t={frame / fps} />
			))}
			<Acabamento grao={p.grao ?? 0.09} />
			{p.voz ? <Audio src={staticFile(p.voz)} trimBefore={Math.round((p.vozIni ?? 0) * fps)} /> : null}
			{(p.sfxNaMixagem ? [] : p.sfx ?? []).map((s, i) => (
				<Sequence key={i} from={Math.round(s.t * fps)}>
					<Audio src={staticFile(s.som)} volume={s.vol ?? 0.3} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
