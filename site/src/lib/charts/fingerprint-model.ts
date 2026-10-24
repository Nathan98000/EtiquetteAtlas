/**
 * What a society's fingerprint shows for each of the 150 cells (FR-30, FR-31): the difference
 * between its shrunken estimate and the global cell mean on the scale shown (decision 46),
 * whether that difference is notable, and the counts, orders and sentences the grid, list,
 * table and details share.
 */

import {
	BEHAVIORS,
	CELL_COUNT,
	CELLS,
	SITUATIONS,
	headline,
	phrase,
	type Cell
} from '../data/grid';
import { cents, listOrder, matrixOrder, orderBy, type SortKey } from '../data/derive';
import { score } from '../data/format';
import {
	Status,
	type Estimate,
	type GlobalCells,
	type Scale,
	type SocietyCells,
	type StatusCode
} from '../data/model';
import { DEVIATION_MAX, deviationStyle } from './colors';
import { markOf, type Mark } from './matrix-model';

export interface FingerprintCell extends Cell {
	headline: string;
	status: StatusCode;
	n: number | null;
	/** The society's shrunken estimate on the scale shown; null when suppressed (DR-9). */
	estimate: Estimate | null;
	/** Share choosing an appropriate answer, society and all societies (DR-11, §6.5). */
	share: number | null;
	globalShare: number;
	global: number;
	globalLo: number;
	globalHi: number;
	/** Estimate − global mean, in hundredths; null when suppressed. */
	deviation: number | null;
	/** Beyond the colour scale's ±1.5 (decision 46). */
	clamped: boolean;
	/** FR-31 on the scale shown (decision 24), or missing. */
	mark: Mark;
	/** Fill and ink; undefined for a cell with nothing to show. */
	style: string | undefined;
}

export function fingerprintCells(
	global: GlobalCells,
	cells: SocietyCells,
	society: number,
	scale: Scale
): FingerprintCell[] {
	return cells.row(society, 'shrunk', scale).map((value, c) => {
		const g = global.mean(c, scale);
		const { lo, hi } = global.meanInterval(c, scale);
		const deviation = value.estimate ? cents(value.estimate.value - g) / 100 : null;
		return {
			...CELLS[c],
			headline: headline(CELLS[c]),
			status: value.status,
			n: value.n,
			estimate: value.estimate,
			share: value.share,
			globalShare: global.share(c),
			global: g,
			globalLo: lo,
			globalHi: hi,
			deviation,
			clamped: deviation !== null && Math.abs(deviation) > DEVIATION_MAX,
			mark: markOf(value)!,
			style: deviation === null ? undefined : deviationStyle(deviation)
		};
	});
}

export interface FingerprintCounts {
	/** Cells with an estimate. */
	shown: number;
	stricter: number;
	looser: number;
	close: number;
	tooFew: number;
	notAsked: number;
}

/** FR-31: how many pairs are clearly stricter or looser, and how many cannot be shown. */
export function fingerprintCounts(cells: readonly FingerprintCell[]): FingerprintCounts {
	const counts = { shown: 0, stricter: 0, looser: 0, close: 0, tooFew: 0, notAsked: 0 };
	for (const cell of cells) {
		if (cell.status === Status.NotAsked) counts.notAsked += 1;
		else if (cell.mark === 'missing') counts.tooFew += 1;
		else {
			counts.shown += 1;
			counts[cell.mark] += 1;
		}
	}
	return counts;
}

/** The size of a difference in hundredths; −1 sorts cells with nothing to show last. */
const size = (cell: FingerprintCell) =>
	cell.deviation === null ? -1 : cents(Math.abs(cell.deviation));

/**
 * Row and column orders: the matrix's (FR-12), so the two views line up, or by the society's
 * own differences, largest first (decision 45).
 */
export function fingerprintOrder(
	global: GlobalCells,
	scale: Scale,
	sort: SortKey,
	cells: readonly FingerprintCell[] | undefined
): { rows: number[]; columns: number[] } {
	if (sort !== 'difference' || !cells) return matrixOrder(global, scale, sort);
	const width = SITUATIONS.length;
	const average = (indices: number[]) => {
		const sizes = indices.map((c) => size(cells[c])).filter((s) => s >= 0);
		return sizes.length ? sizes.reduce((sum, s) => sum + s, 0) / sizes.length : -1;
	};
	const rowCells = (b: number) => SITUATIONS.map((_, s) => b * width + s);
	const columnCells = (s: number) => BEHAVIORS.map((_, b) => b * width + s);
	return {
		rows: orderBy(BEHAVIORS.length, (b) => average(rowCells(b)), true),
		columns: orderBy(width, (s) => average(columnCells(s)), true)
	};
}

/** The phone list's order (FR-17): the matrix's, or the largest differences first. */
export function fingerprintListOrder(
	global: GlobalCells,
	scale: Scale,
	sort: SortKey,
	cells: readonly FingerprintCell[] | undefined
): number[] {
	if (sort !== 'difference' || !cells) return listOrder(global, scale, sort);
	return orderBy(CELL_COUNT, (c) => size(cells[c]), true);
}

const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const howMany = (n: number) => (n === 0 ? 'none' : String(n));

/** How a cell compares with the global average, in words (FR-31). */
export function markPhrase(mark: Mark): string {
	switch (mark) {
		case 'looser':
			return 'clearly looser than the global average';
		case 'stricter':
			return 'clearly stricter than the global average';
		case 'close':
			return 'too close to call against the global average';
		case 'missing':
			return 'not shown';
	}
}

/** "too few responses", "not asked", or the difference and how it compares. */
export function deviationPhrase(cell: FingerprintCell): string {
	if (cell.status === Status.NotAsked) return 'not asked';
	if (cell.deviation === null) return 'too few responses';
	const small = cell.status === Status.Small ? ', small sample' : '';
	return `${score(cell.deviation)}, ${markPhrase(cell.mark)}${small}`;
}

/** The accessible name of a fingerprint cell; the details add the estimates. */
export function fingerprintLabel(cell: FingerprintCell): string {
	return `${cell.headline}: ${deviationPhrase(cell)}`;
}

/**
 * The counts in words: "Respondents in Chile were clearly stricter than the global average on
 * 23 of the 150 pairs and clearly looser on 41". `who` is "respondents in Chile".
 */
function countsClause(
	who: string,
	counts: FingerprintCounts,
	scale: Scale,
	define = false
): string {
	// "Pair" is defined where the page first uses it, the lede (decision 5).
	const kind = define ? 'pairs of a behavior and a situation' : 'pairs';
	const pairs =
		counts.shown === CELL_COUNT
			? `the ${CELL_COUNT} ${kind}`
			: `the ${counts.shown} ${kind} with enough responses`;
	const start = scale === 'centered' ? `Relative to each society's average, ${who}` : capital(who);
	return (
		`${start} were clearly stricter than the global average on ${howMany(counts.stricter)} ` +
		`of ${pairs} and clearly looser on ${howMany(counts.looser)}`
	);
}

/** No pair can be shown (decision 53). */
export function emptySummary(who: string): string {
	return `No pair was rated by 10 or more ${who}, so none can be shown.`;
}

/**
 * FR-87, NFR-11: the society in one sentence, for the page's lede. `closest` names the most
 * similar society ("respondents in Uruguay"), or is null when there is none to name; leave
 * `hasSimilarity` false while the similarity file loads.
 */
export function fingerprintSummary(
	who: string,
	counts: FingerprintCounts,
	scale: Scale,
	closest: string | null,
	hasSimilarity = true
): string {
	if (counts.shown === 0) return emptySummary(who);
	const similar = !hasSimilarity
		? ''
		: closest
			? `, and their answers are most like those of ${closest}`
			: '; too few of their pairs have enough responses to compare them with other societies';
	return `${countsClause(who, counts, scale, true)}${similar}.`;
}

/** NFR-11: the grid in one sentence, with its largest differences either way. */
export function fingerprintChartSummary(
	who: string,
	cells: readonly FingerprintCell[],
	scale: Scale
): string {
	const counts = fingerprintCounts(cells);
	if (counts.shown === 0) return emptySummary(who);
	const shown = cells.filter((c) => c.deviation !== null);
	const high = shown.reduce((a, b) => (cents(b.deviation!) > cents(a.deviation!) ? b : a));
	const low = shown.reduce((a, b) => (cents(b.deviation!) < cents(a.deviation!) ? b : a));
	const part = (c: FingerprintCell) => `${phrase(c)} (${score(c.deviation!)})`;
	const extremes = [high.deviation! > 0 ? high : null, low.deviation! < 0 ? low : null].filter(
		(c): c is FingerprintCell => c !== null
	);
	const tail =
		extremes.length === 2
			? `; the largest differences are for ${part(extremes[0])} and ${part(extremes[1])}`
			: extremes.length === 1
				? `; the largest difference is for ${part(extremes[0])}`
				: '';
	return `${countsClause(who, counts, scale)}${tail}.`;
}
