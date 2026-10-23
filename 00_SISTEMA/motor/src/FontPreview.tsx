import React from 'react';
import {AbsoluteFill, Img, getStaticFiles, staticFile} from 'remotion';
import {PAIRS} from './fonts';

// Prévia dos pares de fonte (Still FontPreview). Fundo: broll/_preview/top.jpg e bottom.jpg da pasta pública, se existirem
// (não vêm no repositório); sem elas, dois fundos lisos escuros.
const FUNDOS = ['broll/_preview/top.jpg', 'broll/_preview/bottom.jpg'];
const temArquivo = (nome: string) => {
	try {
		return getStaticFiles().some((f) => f.name === nome);
	} catch {
		return false;
	}
};

export const FontPreview: React.FC<{pair: number}> = ({pair}) => {
	const p = PAIRS[pair];
	const shadow = '0 4px 30px rgba(0,0,0,0.55)';
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			{FUNDOS.map((arq, i) =>
				temArquivo(arq) ? (
					<Img key={arq} src={staticFile(arq)} style={{position: 'absolute', top: i * 960, width: 1080, height: 960, objectFit: 'cover'}} />
				) : (
					<div key={arq} style={{position: 'absolute', top: i * 960, width: 1080, height: 960, background: i ? '#1B1A1F' : '#2B2522'}} />
				),
			)}
			{/* legibility band at the seam */}
			<AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 38%, rgba(0,0,0,0.38) 50%, transparent 62%)'}} />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff'}}>
				<div style={{fontFamily: p.base.family, fontWeight: p.base.weight, letterSpacing: p.base.tracking, fontSize: 46, opacity: 0.88, textShadow: shadow}}>
					Marcas de
				</div>
				<div
					style={{
						fontFamily: p.keyword.family,
						fontWeight: p.keyword.weight,
						fontStyle: p.keyword.style,
						letterSpacing: p.keyword.tracking,
						fontSize: p.keyword.size,
						lineHeight: 0.95,
						margin: '6px 0 10px',
						textShadow: shadow,
					}}
				>
					luxo
				</div>
				<div style={{fontFamily: p.base.family, fontWeight: p.base.weight, letterSpacing: p.base.tracking, fontSize: 46, opacity: 0.88, textShadow: shadow}}>
					vendem significado
				</div>
			</AbsoluteFill>
			<div
				style={{
					position: 'absolute',
					top: 48,
					left: 48,
					padding: '14px 26px',
					borderRadius: 999,
					background: 'rgba(0,0,0,0.65)',
					color: '#fff',
					fontFamily: p.base.family,
					fontWeight: 500,
					fontSize: 34,
				}}
			>
				{p.id} · {p.name}
			</div>
		</AbsoluteFill>
	);
};
