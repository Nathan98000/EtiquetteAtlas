import { audiencesTitle } from '#lib/charts/titles.ts';
import {
	audienceOrder,
	audienceRows,
	audiencesSummary,
	subjectOf
} from '#lib/charts/audience-model.ts';
import { contextsAll } from '#lib/server/derived.ts';
import type { PageServerLoad } from './$types';

// FR-83, FR-87: the small multiples' summary from All data at build time, for all societies on
// the raw scale (decision 61). It shows until the browser has the active sample's data.
export const load: PageServerLoad = () => {
	const scope = { kind: 'global' } as const;
	const rows = audienceRows(contextsAll, { scope, split: false });
	return {
		summary: audiencesSummary(rows, subjectOf(scope, contextsAll.codes.length)),
		title: audiencesTitle(rows.map((r) => r.effect)),
		// Decision 126: the panels prerender in the default order, largest drop first (NFR-2).
		order: audienceOrder(rows, 'effect')
	};
};
