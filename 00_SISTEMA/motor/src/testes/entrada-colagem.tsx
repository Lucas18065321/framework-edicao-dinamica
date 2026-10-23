// Teste das peças colagem-papel e colagem-titulo (MIX). Still (de dentro do motor), com a pasta de imagens do piloto:
//   node node_modules/@remotion/cli/remotion-cli.js still src/testes/entrada-colagem.tsx Titulo <png> --frame=N
//     --public-dir=../../03_PROJETOS/<projeto piloto do MIX>/04_broll/ia_flow --scale=0.25
import React from 'react';
import {AbsoluteFill, Composition, registerRoot} from 'remotion';
import {ColagemTitulo} from '../kit/pecas/colagem-titulo';
import {ESTILOS} from '../modelos/estilos';
import type {Camada} from '../tipos';

const est = ESTILOS['mix-edit-youtube'];
const c: Camada = {ini: 0, fim: 4, tipo: 'colagem-titulo', texto: 'rotina × *foco*', bateEm: 2.2, fotos: ['stop/s1.jpg', 'stop/s2.jpg', 'stop/s3.jpg', 'stop/s4.jpg', 'stop/s5.jpg', 'stop/s6.jpg', 'stop/s7.jpg', 'stop/s8.jpg']};

const Titulo: React.FC = () => (
	<AbsoluteFill>
		<ColagemTitulo c={c} dur={120} est={est} />
	</AbsoluteFill>
);

registerRoot(() => <Composition id="Titulo" component={Titulo} width={1920} height={1080} fps={30} durationInFrames={120} />);
