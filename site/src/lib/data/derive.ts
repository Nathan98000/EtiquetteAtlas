/**
 * Orders, ranks and one-sentence summaries built from the decoded files. The summaries serve
 * both the prerendered text (FR-87) and the chart summaries (NFR-11), so the two always agree.
 * They state observations, never causes (FR-73).
 */

import {
	BEHAVIOR_TEXT,
	BEHAVIORS,
	CELL_COUNT,
	CELLS,
	SITUATION_TEXT,
	SITUATIONS,
	phrase,
	type Behavior
} from './grid';
import { ordinal, percent, place, responseLabel } from './format';
import type { GlobalCells, Scale, Society, SocietyCell } from './model';

export type SortKey = 'paper' | 'mean' | 'disagreement' | 'name' | 'difference' | 'effect';
/** The matrix's orders (FR-12). */
export const SORT_KEYS: readonly SortKey[] = ['paper', 'mean', 'disagreement', 'name'];
/** A fingerprint adds the society's own differences (decision 45). */
export const FINGERPRINT_SORT_KEYS: readonly SortKey[] = [...SORT_KEYS, 'difference'];
/** The audiences' small multiples (FR-41): paper order, the audience effect, or by name. */
export const AUDIENCE_SORT_KEYS: readonly SortKey[] = ['paper', 'effect', 'name'];
/**
 * The change routes (decision 67): largest difference between the two surveys first, the
 * default there, then paper order or by name.
 */
export const CHANGE_SORT_KEYS: readonly SortKey[] = ['difference', 'paper', 'name'];
export const SORT_LABEL: Record<SortKey, string> = {
	paper: 'Paper order',
	mean: 'Most appropriate first',
	disagreement: 'Most disagreement first',
	name: 'Name (A–Z)',
	difference: 'Largest difference first',
	effect: 'Largest audience effect first'
};

/** Data values have two decimals; comparing in hundredths keeps float noise out of ties. */
export const cents = (x: number) => Math.round(x * 100);

/** Indices 0 to count − 1 ordered by a key; ties keep index (paper) order. */
export function orderBy(count: number, key: (i: number) => number | string, descending: boolean) {
	return Array.from({ length: count }, (_, i) => i).sort((a, b) => {
		const ka = key(a);
		const kb = key(b);
		const order =
			typeof ka === 'string'
				? ka.localeCompare(kb as string, 'en')
				: (ka as number) - (kb as number);
		return (descending ? -order : order) || a - b;
	});
}

/**
 * Items by the size of a signed value, largest first; ties keep their order (paper order). Compare
 * mode orders its gaps this way (decision 49) and the change routes their differences.
 */
export function largestFirst<T>(items: readonly T[], value: (item: T) => number): T[] {
	return orderBy(items.length, (i) => cents(Math.abs(value(items[i]))), true).map((i) => items[i]);
}

/** "Arguing Funeral": a cell's behavior and situation labels, for sorting by name. */
export function cellName(cell: number): string {
	return `${BEHAVIOR_TEXT[CELLS[cell].behavior].label} ${SITUATION_TEXT[CELLS[cell].situation].label}`;
}

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * FR-12: row (behavior) and column (situation) orders. Rows and columns sort together by the
 * average over their cells: most appropriate first, most disagreement first, or by name
 * (decision 31). Ties keep paper order.
 */
export function matrixOrder(
	global: GlobalCells,
	scale: Scale,
	sort: SortKey
): { rows: number[]; columns: number[] } {
	const width = SITUATIONS.length;
	const rowCells = (b: number) => SITUATIONS.map((_, s) => b * width + s);
	const columnCells = (s: number) => BEHAVIORS.map((_, b) => b * width + s);
	const value = (cells: number[]) =>
		sort === 'mean'
			? cents(mean(cells.map((c) => global.mean(c, scale))))
			: cents(mean(cells.map((c) => global.tau(c, scale))));
	switch (sort) {
		// "difference" needs a society: the fingerprint orders it (fingerprint-model.ts). "effect"
		// orders behaviors only (audience-model.ts).
		case 'paper':
		case 'difference':
		case 'effect':
			return {
				rows: orderBy(BEHAVIORS.length, () => 0, false),
				columns: orderBy(width, () => 0, false)
			};
		case 'name':
			return {
				rows: orderBy(BEHAVIORS.length, (b) => BEHAVIOR_TEXT[BEHAVIORS[b]].label, false),
				columns: orderBy(width, (s) => SITUATION_TEXT[SITUATIONS[s]].label, false)
			};
		default:
			return {
				rows: orderBy(BEHAVIORS.length, (b) => value(rowCells(b)), true),
				columns: orderBy(width, (s) => value(columnCells(s)), true)
			};
	}
}

/** FR-17: the order of the 150 cells in the list. */
export function listOrder(global: GlobalCells, scale: Scale, sort: SortKey): number[] {
	switch (sort) {
		case 'mean':
			return orderBy(CELL_COUNT, (c) => cents(global.mean(c, scale)), true);
		case 'disagreement':
			return orderBy(CELL_COUNT, (c) => cents(global.tau(c, scale)), true);
		case 'name':
			return orderBy(CELL_COUNT, cellName, false);
		default:
			return orderBy(CELL_COUNT, () => 0, false);
	}
}

/** FR-16: the cells with the least and the most disagreement on the scale shown. */
export function extremes(
	global: GlobalCells,
	scale: Scale
): { universal: number; dependent: number } {
	const byTau = orderBy(CELL_COUNT, (c) => cents(global.tau(c, scale)), false);
	return { universal: byTau[0], dependent: byTau[byTau.length - 1] };
}

export interface Rank {
	/** 1 is the most accepting: the highest estimate. */
	rank: number;
	/** The same rank counted from the other end: 1 is the strictest, the lowest estimate. */
	strict: number;
	tied: boolean;
	/** Societies ranked: those with a plotted estimate. */
	of: number;
}

/** FR-25: a society's rank among the societies shown; ties share a rank (decision 33). */
export function rank(
	values: readonly { code: string; value: number }[],
	code: string
): Rank | null {
	const own = values.find((v) => v.code === code);
	if (!own) return null;
	const mine = cents(own.value);
	let above = 0;
	let below = 0;
	let same = 0;
	for (const v of values) {
		const c = cents(v.value);
		if (c > mine) above += 1;
		else if (c < mine) below += 1;
		else same += 1;
	}
	return { rank: above + 1, strict: below + 1, tied: same > 1, of: values.length };
}

/**
 * Counted from the nearer end, so a reader never has to turn it round (D-27): "12th most
 * accepting of 87" in the upper half, "10th strictest of 88" in the lower, "tied 3rd …" for ties.
 */
export function rankText(r: Rank): string {
	const tied = r.tied ? 'tied ' : '';
	return r.strict < r.rank
		? `${tied}${ordinal(r.strict)} strictest of ${r.of}`
		: `${tied}${ordinal(r.rank)} most accepting of ${r.of}`;
}

const capital = (text: string) => text[0].toUpperCase() + text.slice(1);

/**
 * NFR-11, FR-87: the matrix in one sentence, as an observation in the response labels (D-6):
 * "Eating in a restaurant is judged the most appropriate on average (extremely appropriate) and
 * kissing on the mouth in a job interview the least (very inappropriate); societies disagree most
 * about … and least about …". The values are in the details and the table.
 */
export function matrixSummary(global: GlobalCells, scale: Scale): string {
	const byMean = orderBy(CELL_COUNT, (c) => cents(global.mean(c, scale)), false);
	const low = byMean[0];
	const high = byMean[byMean.length - 1];
	const { universal, dependent } = extremes(global, scale);
	return (
		`${capital(phrase(CELLS[high]))} is judged the most appropriate on average ` +
		`(${responseLabel(global.mean(high, scale))}) and ${phrase(CELLS[low])} the least ` +
		`(${responseLabel(global.mean(low, scale))}); societies disagree most about ` +
		`${phrase(CELLS[dependent])} and least about ${phrase(CELLS[universal])}.`
	);
}

/**
 * A pair's disagreement rank among the pairs, counted from both ends: `top` 1 is the most
 * disagreement, `bottom` 1 the least; ties share a rank, compared in hundredths.
 */
export function disagreementRank(
	global: GlobalCells,
	cell: number,
	scale: Scale
): { top: number; bottom: number; of: number } {
	const mine = cents(global.tau(cell, scale));
	let higher = 0;
	let lower = 0;
	for (let c = 0; c < CELL_COUNT; c++) {
		const t = cents(global.tau(c, scale));
		if (t > mine) higher += 1;
		else if (t < mine) lower += 1;
	}
	return { top: higher + 1, bottom: lower + 1, of: CELL_COUNT };
}

const PAIR = 'pair of a behavior and a situation';
const PAIRS = 'pairs of a behavior and a situation';

/**
 * D-7: how much societies disagree about a pair, as a rank in words rather than a bare τ: "more
 * than about any other pair of a behavior and a situation", "about as much as about a typical
 * pair of a behavior and a situation (70th of 150)". The top and bottom ten are named as such and
 * the rest by thirds, counted from the most disagreement; τ itself stays in the details. It also
 * defines "pair" where a page first uses it (decision 5).
 */
export function disagreementWords(r: { top: number; bottom: number; of: number }): string {
	if (r.top === 1) return `more than about any other ${PAIR}`;
	if (r.bottom === 1) return `less than about any other ${PAIR}`;
	if (r.top <= 10)
		return `more than about almost any other ${PAIR} (${ordinal(r.top)} most of ${r.of})`;
	if (r.bottom <= 10) {
		return `less than about almost any other ${PAIR} (${ordinal(r.bottom)} least of ${r.of})`;
	}
	if (r.top <= r.of / 3) return `more than about most ${PAIRS} (${ordinal(r.top)} of ${r.of})`;
	if (r.top > (2 * r.of) / 3) return `less than about most ${PAIRS} (${ordinal(r.top)} of ${r.of})`;
	return `about as much as about a typical ${PAIR} (${ordinal(r.top)} of ${r.of})`;
}

/**
 * NFR-11, FR-87: one cell's global picture, the finding first (D-5, D-7) and the response label
 * and share before any number (D-6): "Societies disagree about singing at a funeral ceremony more
 * than about any other pair of a behavior and a situation. Respondents in 90 societies judged it
 * somewhat inappropriate on average, and 31% chose an appropriate answer." The share is the average
 * of the societies' shares (decision 5).
 */
export function cellSummary(global: GlobalCells, cell: number, scale: Scale): string {
	const words = disagreementWords(disagreementRank(global, cell, scale));
	return (
		`Societies disagree about ${phrase(CELLS[cell])} ${words}. Respondents in ` +
		`${global.societies(cell)} societies judged it ${responseLabel(global.mean(cell, scale))} on ` +
		`average, and ${percent(global.share(cell))} chose an appropriate answer.`
	);
}

/**
 * NFR-11: the beeswarm and map in one sentence, in response labels (D-6): "Average answers about
 * singing at a funeral ceremony run from extremely inappropriate among respondents in Saudi Arabia
 * to somewhat appropriate among respondents in the Caribbean". The axis carries the numbers.
 */
export function societiesSummary(
	column: readonly SocietyCell[],
	lookup: (code: string) => Society | undefined,
	cell: number
): string {
	const shown = column.filter((c) => c.estimate !== null);
	const hidden = column.length - shown.length;
	const tail = hidden
		? `; ${hidden} ${hidden === 1 ? 'society has' : 'societies have'} too few responses or ` +
			`${hidden === 1 ? 'was' : 'were'} not asked`
		: '';
	if (!shown.length) return `No society has enough responses for ${phrase(CELLS[cell])}${tail}.`;
	const sorted = [...shown].sort((a, b) => a.estimate!.value - b.estimate!.value);
	const name = (c: SocietyCell) => {
		const society = lookup(c.code);
		return society ? place(society.code, society.name) : c.code;
	};
	const low = sorted[0];
	const high = sorted[sorted.length - 1];
	const [lowLabel, highLabel] = [low, high].map((c) => responseLabel(c.estimate!.value));
	if (lowLabel === highLabel) {
		return (
			`Every society's average answer about ${phrase(CELLS[cell])} is ${lowLabel}, from ` +
			`respondents in ${name(low)} to respondents in ${name(high)}${tail}.`
		);
	}
	return (
		`Average answers about ${phrase(CELLS[cell])} run from ${lowLabel} among respondents in ` +
		`${name(low)} to ${highLabel} among respondents in ${name(high)}${tail}.`
	);
}

/**
 * NFR-11: the behavior strip (FR-26) in one sentence, in response labels (D-6): "Judgments of
 * eating run from extremely appropriate in a restaurant to very inappropriate in a job interview."
 */
export function stripSummary(global: GlobalCells, behavior: Behavior, scale: Scale): string {
	const b = BEHAVIORS.indexOf(behavior);
	const cells = SITUATIONS.map((_, s) => b * SITUATIONS.length + s);
	const sorted = [...cells].sort((x, y) => global.mean(x, scale) - global.mean(y, scale) || x - y);
	const low = sorted[0];
	const high = sorted[sorted.length - 1];
	const what = BEHAVIOR_TEXT[behavior].gerund.toLowerCase();
	const where = (c: number) => SITUATION_TEXT[CELLS[c].situation].item;
	const [highLabel, lowLabel] = [high, low].map((c) => responseLabel(global.mean(c, scale)));
	return highLabel === lowLabel
		? `Judgments of ${what} are ${highLabel} in every situation, highest ${where(high)} and ` +
				`lowest ${where(low)}.`
		: `Judgments of ${what} run from ${highLabel} ${where(high)} to ${lowLabel} ${where(low)}.`;
}

/**
 * FR-26: the previous and next cells in paper order, wrapping around (decision 39); with a count,
 * the same for another list in paper order, such as the 15 behaviors.
 */
export function neighbours(index: number, count = CELL_COUNT): { previous: number; next: number } {
	return {
		previous: (index + count - 1) % count,
		next: (index + 1) % count
	};
}
