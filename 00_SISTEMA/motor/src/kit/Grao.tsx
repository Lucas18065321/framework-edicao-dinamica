// Grão de filme com semente fixa (mesmo algoritmo do Tela Dividida, que fica intocado em Edicao.tsx).
import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

export const Grao: React.FC<{forca: number}> = ({forca}) => {
	const frame = useCurrentFrame();
	const tile = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = c.height = 256;
		const ctx = c.getContext('2d')!;
		const img = ctx.createImageData(256, 256);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = Math.floor(random(`grain${i}`) * 255);
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
		ctx.putImageData(img, 0, 0);
		return c.toDataURL();
	}, []);
	const x = Math.floor(random(`gx${frame}`) * 256);
	const y = Math.floor(random(`gy${frame}`) * 256);
	return <AbsoluteFill style={{backgroundImage: `url(${tile})`, backgroundPosition: `${x}px ${y}px`, opacity: forca, mixBlendMode: 'overlay', pointerEvents: 'none'}} />;
};
