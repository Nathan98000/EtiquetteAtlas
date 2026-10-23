// The All data aggregates, read at build time for the prerendered summaries (FR-83, FR-87;
// decision 28). Server-only: nothing here reaches the browser bundles.

import cellsJson from '../../../../data/derived/cells-all.json';
import contextsJson from '../../../../data/derived/contexts-all.json';
import globalJson from '../../../../data/derived/global-all.json';
import similarityJson from '../../../../data/derived/similarity-all.json';
import societiesJson from '../../../../data/derived/societies.json';
import { ContextCells, GlobalCells, Similarity, Societies, SocietyCells } from '../data/model';

export const globalAll = new GlobalCells(globalJson, 'all');
export const cellsAll = new SocietyCells(cellsJson, 'all');
export const societies = new Societies(societiesJson);
export const similarityAll = new Similarity(similarityJson, 'all');
export const contextsAll = new ContextCells(contextsJson, 'all');
