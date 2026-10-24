import { fingerprintTitle } from '#lib/charts/titles.ts';
import { error } from '@sveltejs/kit';
import {
	fingerprintCells,
	fingerprintChartSummary,
	fingerprintCounts,
	fingerprintListOrder,
	fingerprintOrder,
	fingerprintSummary
} from '#lib/charts/fingerprint-model.ts';
import { respondentsIn } from '#lib/data/format.ts';
import { factsView, similarView } from '#lib/data/society.ts';
import { cellsAll, globalAll, similarityAll, societies } from '#lib/server/derived.ts';
import { societyCode } from '#lib/state/url.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// HR-2, §6.1: one prerendered page per society, at its lower-case ISO3 code (decision 44).
export const entries: EntryGenerator = () =>
	societies.list.map((s) => ({ society: s.code.toLowerCase() }));

// FR-83, FR-87: the society's title, text summaries, facts and similar societies from All data at
// build time, as short strings (decisions 28 and 51). They show until the browser has the data,
// so the default view does not shift (NFR-2).
export const load: PageServerLoad = ({ params }) => {
	const society = societies.get(societyCode(params.society));
	if (!society || params.society !== society.code.toLowerCase()) error(404, 'Not found');
	const who = respondentsIn(society.code, society.name);
	// Every society is in All data (§4.4).
	const model = fingerprintCells(globalAll, cellsAll, cellsAll.indexOf(society.code)!, 'raw');
	const counts = fingerprintCounts(model);
	const similar = similarView(similarityAll, societies, society.code);
	const closest = similar[0] ? respondentsIn(similar[0].code, similar[0].name) : null;
	// D-36: a society with nothing to draw links to the others in its region (two such societies).
	const peers =
		counts.shown === 0
			? societies.list
					.filter((s) => s.region === society.region && s.code !== society.code)
					.sort((a, b) => a.name.localeCompare(b.name, 'en'))
					.map((s) => ({ code: s.code, name: s.name }))
			: [];
	return {
		code: society.code,
		name: society.name,
		region: society.region,
		peers,
		empty: counts.shown === 0,
		// Decision 8: the default order, largest differences first, so the prerendered grid and the
		// phone list's first rows are already in it and nothing moves when the data arrive (NFR-2).
		order: {
			...fingerprintOrder(globalAll, 'raw', 'difference', model),
			list: fingerprintListOrder(globalAll, 'raw', 'difference', model).slice(0, 25)
		},
		summary: fingerprintSummary(who, counts, 'raw', closest),
		chartSummary: fingerprintChartSummary(who, model, 'raw'),
		chartTitle: fingerprintTitle(counts),
		facts: factsView(societies, society.code, 'all')!,
		similar
	};
};
