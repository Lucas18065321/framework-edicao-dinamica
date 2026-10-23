// Apresentação "Apple" (YOUTUBE - MIX EDIT, peça `apresentacao-redes`, beat 5 da intro, ≤ 5 s): 2–3 cards de vidro
// escuro empilhados à direita, com nome, credencial, ícones das redes e @. Mostra credencial, não "me segue".
// Enquadramento recomendado: cena `fala` com zoom 1,12 e foco [0.9, 0.28] (B2: o rosto vai para x ≈ 0,42 e a parede
// direita abre). Com o B2, o ombro direito chega a x ≈ 0,64 e o tablet começa em y ≈ 0,66: a coluna padrão
// (x 0,640–0,940, y ≈ 0,27–0,69) fica longe do rosto; o canto de baixo à esquerda pode encostar na manga e o card de
// baixo cobre o topo do tablet (objetos, nunca o rosto). Conferido no quadro 100 do teste (bruto 13,1 s).
// Sequência (q a 30 fps): cada card sobe 24 px + escala 0,96→1 + blur 12→0 + fade em 12 q (expo-out), cascata de 4 q
// entre cards e de 3 q entre os filhos de cada card; reflexo diagonal 1× em 18 q em cada card (em cascata);
// ícones com mola snappy, 3 q entre eles (o do Instagram se desenha); o gradiente do Instagram passa 1× por 48 q
// (`brilho`); deriva leve; saída na ordem da entrada (de cima para baixo, 2 q entre cards), blur 0→12 + escala 0,96 em 8 q.
// Parâmetros:
//   nome ('Seu Nome', Inter Tight 800), cargo ('Sua profissão', Instrument Serif itálica),
//   credencial (registro profissional, título ou selo, ex.: 'Registro 00000'; padrão '' = sem o card da credencial),
//   credencialIcone (Lucide, 'badge-check'; '' = sem ícone),
//   arroba (est.arroba), redes (['instagram', 'youtube']; aceita também tiktok, spotify, whatsapp, threads, x,
//   facebook, telegram), cartoes (3 = nome | credencial | redes; 2 = credencial dentro do card do nome),
//   x (0.79: centro da coluna; com largura 576 = x 0,640–0,940), y (0.48: centro da pilha), largura (576 px em 1080),
//   espaco (16 px entre cards), tamanhoNome (72), tamanhoCargo (42), tamanhoTexto (40: credencial e @, também no modo de 2
//   cartões: a identificação profissional precisa ser lida), tamanhoIcone (54),
//   cascata (4 q entre cards), brilho (s do gradiente do Instagram, 1.1; false = sem), material ('escuro').
// Sons: entrada sfxApresentacao; sonsApresentacao = pop no 1º ícone e no brilho do Instagram.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {siFacebook, siSpotify, siTelegram, siThreads, siTiktok, siWhatsapp, siX, siYoutube} from 'simple-icons';
import type {PecaProps, Som} from '../../modelos/camadas';
import type {Camada} from '../../tipos';
import {CURVAS} from '../tempo';
import {FONTES} from '../fontes';
import {IconeInstagram} from './marca';
import {BlocoIcone, DESENHO, MOLAS, Vidro, coresMix, entradaCard, filhoEntra, iconeExiste, lerMaterial, mola, num, prog, rgba, sombraTexto, txt} from './card-vidro';

export const sfxApresentacao: [string, number] = ['motionix/ui-sound-effects/ui-sound-effects_03_ui-premium-open', 0.55];
const SOM_ICONE = 'motionix/pop/pop_06_sweet-ui-open';

const GLIFOS: Record<string, {path: string}> = {youtube: siYoutube, tiktok: siTiktok, spotify: siSpotify, whatsapp: siWhatsapp, threads: siThreads, x: siX, facebook: siFacebook, telegram: siTelegram};
const BRILHO_Q = 48; // o gradiente do Instagram fica 48 q

const lerRedes = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((r): r is string => typeof r === 'string' && (r === 'instagram' || Object.hasOwn(GLIFOS, r))))] : ['instagram', 'youtube']);

// credencial da camada (`credencial`); '' = sem o card da credencial
const credencial = (c: Camada) => txt(c.credencial, '');

// quando cada card entra e quando os ícones chegam (q a 30 fps)
const planoApresentacao = (c: Camada) => {
	const cascata = num(c.cascata, 4);
	const temCred = credencial(c) !== '';
	const n = num(c.cartoes, 3) === 2 || !temCred ? 2 : 3;
	const cards = Array.from({length: n}, (_, i) => i * cascata);
	const redes = cards[n - 1];
	const icones = lerRedes(c.redes).map((_, i) => redes + 3 + i * 3);
	return {n, cards, icones, arroba: redes + 3 + icones.length * 3 + 1};
};

export const sonsApresentacao = (c: Camada): Som[] => {
	const p = planoApresentacao(c);
	const out: Som[] = [];
	if (p.icones.length) out.push({t: p.icones[0] / 30, som: SOM_ICONE, vol: 0.45});
	const b = c.brilho === false ? undefined : num(c.brilho, 1.1);
	if (b !== undefined && lerRedes(c.redes).includes('instagram') && (!p.icones.length || b * 30 - p.icones[0] >= 8)) out.push({t: b, som: SOM_ICONE, vol: 0.45});
	return out;
};

export const Apresentacao: React.FC<PecaProps> = ({c, dur, est}) => {
	const frame = useCurrentFrame();
	const {fps, width: W, height: H} = useVideoConfig();
	const u = Math.min(W, H) / 1080;
	const k = fps / 30;
	const q = (n: number) => n * k;
	const t = frame / fps;
	const cor = coresMix(est);
	const creme = cor.creme;
	const material = lerMaterial(c.material);
	const plano = planoApresentacao(c);
	const largura = num(c.largura, 576) * u;
	const cx = Math.min(Math.max(num(c.x, 0.79) * W, 0.05 * W + largura / 2), 0.95 * W - largura / 2);
	const pad = 36 * u;
	const raio = 28 * u;
	const sombra = sombraTexto(material, u);
	const fb = FONTES.base;
	const tamTxt = num(c.tamanhoTexto, 40) * u;
	const tamIco = num(c.tamanhoIcone, 54) * u;
	const cred = credencial(c);
	const credIcone = txt(c.credencialIcone, 'badge-check');

	// ---------- conteúdo de cada card ----------
	const nomeCard = (a: number, comCred: boolean) => (
		<>
			<div style={{...filhoEntra(frame, a + q(2), fps, u), fontFamily: FONTES.pesada.family, fontWeight: 800, fontSize: num(c.tamanhoNome, 72) * u, lineHeight: 1, letterSpacing: '-0.035em', color: creme, whiteSpace: 'nowrap', textShadow: sombra}}>
				{txt(c.nome, 'Seu Nome')}
			</div>
			<div style={{...filhoEntra(frame, a + q(5), fps, u), marginTop: 12 * u, fontFamily: FONTES.serifa.family, fontStyle: 'italic', fontWeight: 400, fontSize: num(c.tamanhoCargo, 42) * u, lineHeight: 1.08, letterSpacing: '-0.005em', color: rgba(creme, 0.84), textWrap: 'balance', textShadow: sombra}}>
				{txt(c.cargo, 'Sua profissão')}
			</div>
			{comCred && cred && (
				<div style={{...filhoEntra(frame, a + q(8), fps, u), marginTop: 16 * u, fontFamily: fb.family, fontWeight: 500, fontSize: tamTxt, lineHeight: 1.1, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', color: rgba(creme, 0.8), whiteSpace: 'nowrap', textShadow: sombra}}>{cred}</div>
			)}
		</>
	);
	const credCard = (a: number) => (
		<div style={{display: 'flex', alignItems: 'center', gap: 20 * u}}>
			{iconeExiste(credIcone) && <BlocoIcone nome={credIcone} tamanho={tamIco + 4 * u} acento={cor.acento} profundo={cor.profundo} creme={creme} pop={mola(frame, fps, a + q(2), MOLAS.snappy)} desenho={prog(frame, a + q(5), a + q(21), DESENHO)} u={u} />}
			<div style={{...filhoEntra(frame, a + q(4), fps, u, 10), fontFamily: fb.family, fontWeight: 600, fontSize: tamTxt, lineHeight: 1.1, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', color: creme, whiteSpace: 'nowrap', textShadow: sombra}}>{cred}</div>
		</div>
	);
	const redesCard = () => {
		const redes = lerRedes(c.redes);
		const b = c.brilho === false ? undefined : num(c.brilho, 1.1);
		const BR = 0.25; // s da virada creme ↔ gradiente
		const grad: [number, number] = b === undefined ? [0, 0] : [prog(t, b, b + BR, CURVAS.suave), prog(t, b + BRILHO_Q / 30 - BR, b + BRILHO_Q / 30, CURVAS.suave)];
		const brilho = Math.min(grad[0], 1 - grad[1]);
		return (
			<div style={{display: 'flex', alignItems: 'center', gap: 18 * u}}>
				{redes.map((r, i) => {
					const a = q(plano.icones[i]);
					const pop = mola(frame, fps, a, MOLAS.snappy);
					const estilo: React.CSSProperties = {flex: 'none', transform: `scale(${0.45 + 0.55 * pop})`, opacity: Math.min(1, pop * 1.5)};
					if (r === 'instagram') {
						const d: [number, number, number] = [prog(frame, a, a + q(5)), prog(frame, a + q(3), a + q(9)), prog(frame, a + q(7), a + q(11))];
						return (
							<div key={r} style={estilo}>
								<IconeInstagram tamanho={tamIco} traco={tamIco * 0.095} cor={creme} desenho={d} gradiente={grad} brilho={brilho * 0.8} sombra={false} />
							</div>
						);
					}
					return (
						<svg key={r} viewBox="0 0 24 24" width={tamIco} height={tamIco} style={{...estilo, display: 'block'}}>
							<path d={GLIFOS[r].path} fill={creme} />
						</svg>
					);
				})}
				<div style={{...filhoEntra(frame, q(plano.arroba), fps, u, 10), marginLeft: 6 * u, fontFamily: fb.family, fontWeight: 600, fontSize: tamTxt, lineHeight: 1.1, letterSpacing: '0.005em', color: creme, whiteSpace: 'nowrap', textShadow: sombra}}>
					{txt(c.arroba, est.arroba)}
				</div>
			</div>
		);
	};

	const conteudos = plano.n === 3 ? [nomeCard(q(plano.cards[0]), false), credCard(q(plano.cards[1])), redesCard()] : [nomeCard(q(plano.cards[0]), true), redesCard()];

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* pilha centrada em y; cada card é relativo dentro dela (transform no pai não corta o backdrop-filter) */}
			<div style={{position: 'absolute', left: cx - largura / 2, top: num(c.y, 0.48) * H, width: largura, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: num(c.espaco, 16) * u}}>
				{conteudos.map((filhos, i) => {
					const a = plano.cards[i];
					const anim = entradaCard(frame, fps, dur, {u, q: 12, sobe: 24, atraso: a, saidaAtraso: (plano.n - 1 - i) * 2, deriva: 0.01});
					const reflexo = prog(frame, q(a + 8), q(a + 26), CURVAS.suave);
					return (
						<div key={i} style={{position: 'relative'}}>
							<Vidro
								material={material}
								caixa={{position: 'relative', width: '100%', transform: `translateY(${anim.dy}px) scale(${anim.escala})`, transformOrigin: '50% 50%'}}
								raio={raio}
								aparece={anim.vis}
								conteudo={anim.vis}
								blur={anim.blur}
								reflexo={reflexo}
								padding={i === 0 ? `${34 * u}px ${pad}px ${38 * u}px` : `${26 * u}px ${pad}px`}
								u={u}
								creme={creme}
							>
								{filhos}
							</Vidro>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
