import { error } from '@sveltejs/kit';
import { cellSummary } from '#lib/data/derive.ts';
import {
	CELLS,
	behaviorFromSlug,
	cellIndex,
	cellParams,
	headline,
	situationFromSlug
} from '#lib/data/grid.ts';
import { globalAll } from '#lib/server/derived.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// HR-2: one prerendered page per cell, with hyphenated slugs (§4.2).
export const entries: EntryGenerator = () => CELLS.map(cellParams);

// FR-83, FR-87: the cell's title and text summary, from All data at build time.
export const load: PageServerLoad = ({ params }) => {
	const behavior = behaviorFromSlug(params.behavior);
	const situation = situationFromSlug(params.situation);
	if (!behavior || !situation) error(404, 'Not found');
	const cell = cellIndex(behavior, situation);
	return {
		cell,
		title: headline(CELLS[cell]),
		summary: cellSummary(globalAll, cell, 'raw')
	};
};
