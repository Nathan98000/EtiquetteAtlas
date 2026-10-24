import { rangeTitle, regionTitle, stripTitle } from '#lib/charts/titles.ts';
import { error } from '@sveltejs/kit';
import { drill, regionSummary } from '#lib/charts/drill-model.ts';
import { cellSummary, societiesSummary, stripSummary } from '#lib/data/derive.ts';
import {
	CELLS,
	behaviorFromSlug,
	cellIndex,
	cellParams,
	headline,
	situationFromSlug
} from '#lib/data/grid.ts';
import { cellsAll, globalAll, societies } from '#lib/server/derived.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// HR-2: one prerendered page per cell, with hyphenated slugs (§4.2).
export const entries: EntryGenerator = () => CELLS.map(cellParams);

// FR-83, FR-87: the cell's title and text summaries, from All data at build time. The chart
// summaries show until the browser has the data, so the default view does not shift (NFR-2).
export const load: PageServerLoad = ({ params }) => {
	const behavior = behaviorFromSlug(params.behavior);
	const situation = situationFromSlug(params.situation);
	if (!behavior || !situation) error(404, 'Not found');
	const cell = cellIndex(behavior, situation);
	const d = drill(cellsAll, societies, globalAll, cell, 'shrunk', 'raw');
	return {
		cell,
		title: headline(CELLS[cell]),
		summary: cellSummary(globalAll, cell, 'raw'),
		stripSummary: stripSummary(globalAll, behavior, 'raw'),
		swarmSummary: societiesSummary(
			[...d.plotted, ...d.tooFew, ...d.notAsked],
			(code) => societies.get(code),
			cell
		),
		mapSummary: regionSummary(d.plotted),
		swarmTitle: rangeTitle(d.plotted.map((p) => p.estimate!.value)),
		mapTitle: regionTitle(d.plotted.map((p) => ({ region: p.region, value: p.estimate!.value }))),
		stripTitle: stripTitle(
			behavior,
			CELLS.filter((c) => c.behavior === behavior).map((c) => ({
				cell: c,
				value: globalAll.mean(c.index, 'raw')
			}))
		)
	};
};
