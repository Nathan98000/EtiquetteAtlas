/**
 * The control bar's search (decision 122): societies by name or code, and the 150 behaviors in
 * situations by any of their words ("bus", "eat", "phone funeral"). The pairs come from
 * `grid.ts`; nothing here loads data.
 */

import { BEHAVIOR_TEXT, CELLS, SITUATION_TEXT, headline, type Cell } from './grid';

/** Lower case without accents, so "cote" finds Côte d'Ivoire. */
export function fold(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

const words = (text: string) =>
	fold(text)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

interface Named {
	code: string;
	name: string;
}

/** FR-3: names that start with the text (or the exact code) first, then names that contain it. */
export function matchSocieties<T extends Named>(sorted: readonly T[], query: string): T[] {
	const q = fold(query.trim());
	if (!q) return [...sorted];
	const starts: T[] = [];
	const contains: T[] = [];
	for (const society of sorted) {
		const name = fold(society.name);
		if (name.startsWith(q) || society.code.toLowerCase() === q) starts.push(society);
		else if (name.includes(q)) contains.push(society);
	}
	return [...starts, ...contains];
}

// Each pair's words: its headline ("Eating on a bus") and the short labels ("Use a mobile phone").
const PAIR_WORDS: readonly (readonly string[])[] = CELLS.map((cell) => [
	...new Set(
		words(
			`${headline(cell)} ${BEHAVIOR_TEXT[cell.behavior].label} ${SITUATION_TEXT[cell.situation].label}`
		)
	)
]);

/** The pairs in grid order whose words start with every word typed; none for empty text. */
export function matchPairs(query: string): Cell[] {
	const typed = words(query);
	if (!typed.length) return [];
	return CELLS.filter((cell) =>
		typed.every((t) => PAIR_WORDS[cell.index].some((word) => word.startsWith(t)))
	);
}
