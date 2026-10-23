// Composições do laboratório. O PAPER VOX ANIMATION virou modelo fixo (paper-vox-instagram, 2026-10-20): o código mora em
// src/modelos/paper-vox/ e é registrado no Root.tsx de produção. O lab só o reaproveita (formato 5: PAPER VOX B-ROLL).
import React from 'react';
import {Composition} from 'remotion';
import {PaperVox, calcularPaperVox} from '../modelos/paper-vox/PaperVox';
import type {QuadroProps} from '../modelos/paper-vox/tipos';

const vazio: QuadroProps = {voz: '', duracao: 5, camera: [{t: 0, x: 0, y: 0, zoom: 1}], elementos: []};

export const RootLab: React.FC = () => (
	<Composition id="PaperVox" component={PaperVox} width={1080} height={1920} fps={24} durationInFrames={120} defaultProps={vazio} calculateMetadata={calcularPaperVox} />
);
