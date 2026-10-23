// What the method page reads at build time (FR-71, FR-72; decision 93): the manifest and the
// global cells of the two other samples, beside All data's. Server-only, like derived.ts.

import attentionJson from '../../../../data/derived/global-attention.json';
import manifestJson from '../../../../data/derived/manifest.json';
import paperJson from '../../../../data/derived/global-paper.json';
import { GlobalCells, Manifest } from '../data/model';

export const manifest = new Manifest(manifestJson);
export const globalPaper = new GlobalCells(paperJson, 'paper');
export const globalAttention = new GlobalCells(attentionJson, 'attention');
