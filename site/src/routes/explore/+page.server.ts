import { matrixSummary } from '#lib/data/derive.ts';
import { globalAll } from '#lib/server/derived.ts';
import type { PageServerLoad } from './$types';

// FR-87: the matrix's text summary, built from All data at build time.
export const load: PageServerLoad = () => ({ summary: matrixSummary(globalAll, 'raw') });
