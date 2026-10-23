// The All data change file, read at build time for the change routes' prerendered summaries
// (FR-83, FR-87; decision 74). Apart from derived.ts so only the change routes import it, and a
// build without the change module (R-6) reads no 2000–2003 aggregate at all.

import changeJson from '../../../../data/derived/change-all.json';
import { ChangeCells } from '../data/model';

export const changeAll = new ChangeCells(changeJson, 'all');
