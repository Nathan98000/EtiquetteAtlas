import {
	behaviorStrip,
	behaviorStripSummary,
	changeChartSummary,
	changeSummary,
	globalChange,
	societiesSummary,
	societyStrip,
	societyStripSummary
} from '#lib/charts/change-model.ts';
import { changeAll } from '#lib/server/change.ts';
import { societies } from '#lib/server/derived.ts';
import type { PageServerLoad } from './$types';

// FR-83, FR-87: the overview's summaries from All data at build time, as short strings (decision
// 74). They show until the browser has the active sample's data.
export const load: PageServerLoad = () => {
	const scope = { kind: 'global' } as const;
	const view = globalChange(changeAll);
	const n = changeAll.codes.length;
	const strip = societyStrip(changeAll, (code) => societies.get(code)?.name ?? code);
	return {
		summary: `${changeSummary(scope, view, n)} ${societiesSummary(strip)}`,
		chartSummary: changeChartSummary(scope, view, n),
		societySummary: societyStripSummary(strip),
		behaviorSummary: behaviorStripSummary(behaviorStrip(changeAll), n)
	};
};
