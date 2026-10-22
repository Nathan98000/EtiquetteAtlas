// The All data aggregates, read at build time for the prerendered summaries (FR-83, FR-87;
// decision 28). Server-only: nothing here reaches the browser bundles.

import cellsJson from '../../../../data/derived/cells-all.json';
import globalJson from '../../../../data/derived/global-all.json';
import societiesJson from '../../../../data/derived/societies.json';
import { GlobalCells, Societies, SocietyCells } from '../data/model';

export const globalAll = new GlobalCells(globalJson, 'all');
export const cellsAll = new SocietyCells(cellsJson, 'all');
export const societies = new Societies(societiesJson);
