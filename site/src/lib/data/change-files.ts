// The change module's data (DR-13), imported with ?url like every other file (decision 27) but
// kept apart: a build with CHANGE_MODULE=off swaps this module for change-files.off.ts, so no
// 2000–2003 aggregate reaches build/ (R-6; vite.config.ts).

import changeAll from '../../../../data/derived/change-all.json?url';
import changePaper from '../../../../data/derived/change-paper.json?url';
import changeAttention from '../../../../data/derived/change-attention.json?url';
import type { SampleId } from './model';

export const CHANGE_FILES: Record<SampleId, string> | null = {
	all: changeAll,
	paper: changePaper,
	attention: changeAttention
};
