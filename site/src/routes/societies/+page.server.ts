import { placesTitle } from '#lib/charts/titles.ts';
import { indexSummary, mapSummary } from '#lib/data/society.ts';
import { REGIONS, type Region } from '#lib/data/model.ts';
import { societies } from '#lib/server/derived.ts';
import type { PageServerLoad } from './$types';

// FR-87: the index's and its map's summaries from All data at build time, and how many societies
// each region lists, so the space for the list is reserved before it arrives (NFR-2, decision 52).
export const load: PageServerLoad = () => ({
	summary: indexSummary(societies, 'all'),
	mapSummary: mapSummary(societies, 'all'),
	mapTitle: placesTitle(societies.list.map((s) => s.region)),
	regions: Object.fromEntries(
		REGIONS.map((region) => [region, societies.list.filter((s) => s.region === region).length])
	) as Record<Region, number>
});
