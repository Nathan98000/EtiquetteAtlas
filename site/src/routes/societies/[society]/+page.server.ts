import { error } from '@sveltejs/kit';
import {
	fingerprintCells,
	fingerprintChartSummary,
	fingerprintCounts,
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
	return {
		code: society.code,
		name: society.name,
		empty: counts.shown === 0,
		summary: fingerprintSummary(who, counts, 'raw', closest),
		chartSummary: fingerprintChartSummary(who, model, 'raw'),
		facts: factsView(societies, society.code, 'all')!,
		similar
	};
};
