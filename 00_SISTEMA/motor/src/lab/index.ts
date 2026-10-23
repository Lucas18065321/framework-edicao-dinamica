// Entrada própria do laboratório (05_LAB): nada daqui entra no src/index.ts dos formatos fixos.
// Render: node scripts/lab/render-lab.mjs <proj> --comp PaperVox --props 03_roteiro/<arquivo>.json
import {registerRoot} from 'remotion';
import {RootLab} from './RootLab';

registerRoot(RootLab);
