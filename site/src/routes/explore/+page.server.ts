import { pairsTitle } from '#lib/charts/titles.ts';
import { matrixSummary } from '#lib/data/derive.ts';
import { CELLS } from '#lib/data/grid.ts';
import { globalAll } from '#lib/server/derived.ts';
import type { PageServerLoad } from './$types';

// FR-87: the matrix's text summary and its chart's title, built from All data at build time.
export const load: PageServerLoad = () => ({
	summary: matrixSummary(globalAll, 'raw'),
	title: pairsTitle(CELLS.map((c) => globalAll.mean(c.index, 'raw')))
});
