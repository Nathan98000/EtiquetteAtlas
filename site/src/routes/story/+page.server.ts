import { CHANGE_MODULE } from '#lib/change-module.ts';
import { cellsAll, contextsAll, globalAll, societies } from '#lib/server/derived.ts';
import { storyNumbers } from '#lib/story/story-model.ts';
import type { PageServerLoad } from './$types';

// FR-64, FR-83, FR-87: each step's cell or behavior and its numbers, from All data at build time
// (decisions 82 and 83). Only numbers go into __data.json; the prose is in the page. The change
// step's numbers are read only in a build with the change module (R-6, decision 75).
export const load: PageServerLoad = async () => {
	const change = CHANGE_MODULE ? (await import('#lib/server/change.ts')).changeAll : null;
	const numbers = storyNumbers(globalAll, cellsAll, contextsAll, change);
	// Decision 133: the societies step 1 leaves out, by name for the prerendered summary.
	const without = numbers.spread.without.map((code) => societies.get(code)?.name ?? code);
	return { numbers, without };
};
