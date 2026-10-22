import { error } from '@sveltejs/kit';
import {
	audienceRows,
	behaviorSummary,
	slopeSummary,
	subjectOf
} from '#lib/charts/audience-model.ts';
import { BEHAVIOR_TEXT, BEHAVIORS, behaviorFromSlug, slug } from '#lib/data/grid.ts';
import { contextsAll } from '#lib/server/derived.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// HR-2, §6.1: one prerendered page per behavior, at its hyphenated slug (decision 57).
export const entries: EntryGenerator = () => BEHAVIORS.map((b) => ({ behavior: slug(b) }));

// FR-83, FR-87: the behavior's title and summaries from All data at build time, for all
// societies on the raw scale, as short strings (decision 61). They show until the browser has the
// data, so the default view does not shift (NFR-2).
export const load: PageServerLoad = ({ params }) => {
	const behavior = behaviorFromSlug(params.behavior);
	if (!behavior) error(404, 'Not found');
	const b = BEHAVIORS.indexOf(behavior);
	const scope = { kind: 'global' } as const;
	const rows = audienceRows(contextsAll, { scope, split: false });
	return {
		behavior: b,
		title: `${BEHAVIOR_TEXT[behavior].gerund}: who's watching?`,
		summary: behaviorSummary(rows, b, subjectOf(scope, contextsAll.codes.length)),
		chartSummary: slopeSummary(rows[b], false)
	};
};
