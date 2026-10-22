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
import { ordinal, percent, place, responseLabel, score, spread } from './format';
import type { GlobalCells, Scale, Society, SocietyCell } from './model';

export type SortKey = 'paper' | 'mean' | 'disagreement' | 'name' | 'difference';
/** The matrix's orders (FR-12). */
export const SORT_KEYS: readonly SortKey[] = ['paper', 'mean', 'disagreement', 'name'];
/** A fingerprint adds the society's own differences (decision 45). */
export const FINGERPRINT_SORT_KEYS: readonly SortKey[] = [...SORT_KEYS, 'difference'];
export const SORT_LABEL: Record<SortKey, string> = {
	paper: 'Paper order',
	mean: 'Most appropriate first',
	disagreement: 'Most disagreement first',
	name: 'Name (A–Z)',
	difference: 'Largest difference first'
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
		// "difference" needs a society: the fingerprint orders it (fingerprint-model.ts).
		case 'paper':
		case 'difference':
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
			return orderBy(
				CELL_COUNT,
				(c) =>
					`${BEHAVIOR_TEXT[CELLS[c].behavior].label} ${SITUATION_TEXT[CELLS[c].situation].label}`,
				false
			);
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
	let same = 0;
	for (const v of values) {
		const c = cents(v.value);
		if (c > mine) above += 1;
		else if (c === mine) same += 1;
	}
	return { rank: above + 1, tied: same > 1, of: values.length };
}

/** "12th most accepting of 87", "tied 3rd most accepting of 90". */
export function rankText(r: Rank): string {
	return `${r.tied ? 'tied ' : ''}${ordinal(r.rank)} most accepting of ${r.of}`;
}

/** NFR-11, FR-87: the matrix in one sentence. */
export function matrixSummary(global: GlobalCells, scale: Scale): string {
	const byMean = orderBy(CELL_COUNT, (c) => cents(global.mean(c, scale)), false);
	const low = byMean[0];
	const high = byMean[byMean.length - 1];
	const { universal, dependent } = extremes(global, scale);
	return (
		`Average judgments run from ${score(global.mean(low, scale))} for ${phrase(CELLS[low])} ` +
		`to ${score(global.mean(high, scale))} for ${phrase(CELLS[high])}, and societies disagree ` +
		`most about ${phrase(CELLS[dependent])} and least about ${phrase(CELLS[universal])}.`
	);
}

/** NFR-11, FR-87: one cell's global picture in one sentence. */
export function cellSummary(global: GlobalCells, cell: number, scale: Scale): string {
	const m = global.mean(cell, scale);
	const tau = global.tau(cell, scale);
	const taus = Array.from({ length: CELL_COUNT }, (_, c) => cents(global.tau(c, scale)));
	const higher = taus.filter((t) => t > cents(tau)).length;
	const lower = taus.filter((t) => t < cents(tau)).length;
	const [k, end] = higher <= lower ? [higher + 1, 'highest'] : [lower + 1, 'lowest'];
	const position = k === 1 ? `the ${end}` : `the ${ordinal(k)} ${end}`;
	return (
		`On average, respondents in ${global.societies(cell)} societies judged ` +
		`${phrase(CELLS[cell])} ${responseLabel(m)} (${score(m)}; ${percent(global.share(cell))} ` +
		`chose an appropriate answer), and disagreement between societies is ${spread(tau)}, ` +
		`${position} of the ${CELL_COUNT} pairs.`
	);
}

/** NFR-11: the beeswarm and map in one sentence. */
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
	return (
		`Estimates for ${phrase(CELLS[cell])} run from ${score(low.estimate!.value)} among ` +
		`respondents in ${name(low)} to ${score(high.estimate!.value)} among respondents in ` +
		`${name(high)}${tail}.`
	);
}

/** NFR-11: the behavior strip (FR-26) in one sentence. */
export function stripSummary(global: GlobalCells, behavior: Behavior, scale: Scale): string {
	const b = BEHAVIORS.indexOf(behavior);
	const cells = SITUATIONS.map((_, s) => b * SITUATIONS.length + s);
	const sorted = [...cells].sort((x, y) => global.mean(x, scale) - global.mean(y, scale) || x - y);
	const low = sorted[0];
	const high = sorted[sorted.length - 1];
	const gerund = BEHAVIOR_TEXT[behavior].gerund.toLowerCase();
	return (
		`Across the ${SITUATIONS.length} situations, ${gerund} scores highest ` +
		`${SITUATION_TEXT[CELLS[high].situation].item} (${score(global.mean(high, scale))}) and ` +
		`lowest ${SITUATION_TEXT[CELLS[low].situation].item} (${score(global.mean(low, scale))}).`
	);
}

/** FR-26: the previous and next cells in paper order, wrapping around (decision 39). */
export function neighbours(cell: number): { previous: number; next: number } {
	return {
		previous: (cell + CELL_COUNT - 1) % CELL_COUNT,
		next: (cell + 1) % CELL_COUNT
	};
}
