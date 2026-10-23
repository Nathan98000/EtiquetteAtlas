import { error } from '@sveltejs/kit';
import { changeChartSummary, changeSummary, societyChange } from '#lib/charts/change-model.ts';
import { respondentsIn } from '#lib/data/format.ts';
import { CHANGE_SOCIETIES } from '#lib/data/model.ts';
import { changeAll, societies } from '#lib/server/derived.ts';
import { societyCode } from '#lib/state/url.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// HR-2, §6.1: a page for each society in both surveys, at its lower-case ISO3 code (decision 67).
// Links are built from CHANGE_SOCIETIES before any file loads, so the build stops if the two differ.
export const entries: EntryGenerator = () => {
	if (JSON.stringify(changeAll.codes) !== JSON.stringify(CHANGE_SOCIETIES)) {
		throw new Error('change-all.json lists other societies than CHANGE_SOCIETIES');
	}
	return changeAll.codes.map((code) => ({ society: code.toLowerCase() }));
};

// FR-83, FR-87: the society's title, summaries and facts from All data at build time, as short
// strings (decision 74). They show until the browser has the active sample's data (NFR-2).
export const load: PageServerLoad = ({ params }) => {
	const society = societies.get(societyCode(params.society));
	const index = society ? changeAll.indexOf(society.code) : undefined;
	if (!society || index === undefined || params.society !== society.code.toLowerCase()) {
		error(404, 'Not found');
	}
	const scope = { kind: 'society', code: society.code, name: society.name } as const;
	const view = societyChange(changeAll, index);
	const n = changeAll.codes.length;
	const facts = changeAll.societies()[index];
	return {
		code: society.code,
		name: society.name,
		title: `${capital(respondentsIn(society.code, society.name))} in 2000–2003 and 2023–2024`,
		summary: changeSummary(scope, view, n),
		chartSummary: changeChartSummary(scope, view, n),
		facts: {
			older: facts.respondents,
			newer: societies.respondents(society.code, 'all'),
			pairs: facts.cells
		}
	};
};

const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
