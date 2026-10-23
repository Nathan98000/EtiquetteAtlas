/**
 * "Change since the early 2000s" (FR-50 to FR-53): how respondents in the 2023–2024 survey (GSN)
 * judged each pair against respondents in the 2000–2003 survey (Gelfand et al. 2011), for one
 * society or for the societies in both surveys together (FR-53). Both surveys' values are raw
 * means (decision 72). A difference is 2023–2024 minus 2000–2003: a difference between two surveys
 * of different people, recruited differently with different questionnaires, never a change in
 * anyone's views (FR-52, §4.7); the text states what the surveys show, never why (FR-73).
 *
 * A difference is higher or lower when its 95% interval excludes 0: its lower bound above 0 or its
 * upper bound below 0, on the stored bounds, so an interval ending at 0.00 is within (decision 68).
 */

import {
	BEHAVIOR_TEXT,
	SITUATION_TEXT,
	headline,
	phrase,
	type Behavior,
	type Cell
} from '../data/grid';
import { cellName, largestFirst, orderBy, type SortKey } from '../data/derive';
import { count, interval, place, score } from '../data/format';
import type { ChangeCells, Estimate } from '../data/model';
import type { PairRow } from './dumbbell-model';

/** 1 judged more appropriate in 2023–2024 beyond the interval, −1 less appropriate, 0 within. */
export type Direction = 1 | -1 | 0;

export function direction(diff: Estimate): Direction {
	return diff.lo > 0 ? 1 : diff.hi < 0 ? -1 : 0;
}

/** ▲ and ▼ as on the fingerprint (decision 47): ▲ more appropriate, ▼ less; nothing within. */
export const DIRECTION_GLYPH: Record<Direction, string> = { 1: '▲', [-1]: '▼', 0: '' };

/** Small samples: 10 to 29 ratings or respondents (DR-9, decision 32). */
export const SMALL = 30;

export interface ChangeRow extends Cell {
	headline: string;
	/** The 2000–2003 mean. */
	older: number;
	/** The 2023–2024 mean. */
	newer: number;
	diff: Estimate;
	direction: Direction;
	/** One society's 2000–2003 ratings and 2023–2024 respondents; null for societies together. */
	n: { older: number; newer: number } | null;
	/** The societies behind an average (FR-53); null for one society. */
	societies: number | null;
	/** Rests on 10 to 29 ratings or respondents in each survey. */
	small: { older: boolean; newer: boolean };
}

export interface Unshown extends Cell {
	headline: string;
	reason: string;
}

/** The 120 pairs for one society or for the societies together, in grid order. */
export interface ChangeView {
	rows: ChangeRow[];
	/** Pairs either survey lacks (Israel: laughing out loud at a party). */
	missing: Unshown[];
}

/** Whose values a view shows: one society, or the societies in both surveys (FR-53). */
export type ChangeScope = { kind: 'society'; code: string; name: string } | { kind: 'global' };

const MISSING = 'not in both surveys’ data';

/** One society's pairs (FR-50); `society` is its row in the file. */
export function societyChange(file: ChangeCells, society: number): ChangeView {
	const rows: ChangeRow[] = [];
	const missing: Unshown[] = [];
	file.cells.forEach((cell, k) => {
		const pair = file.pair(society, k);
		if (!pair.older || !pair.newer || !pair.diff) {
			missing.push({ ...cell, headline: headline(cell), reason: MISSING });
			return;
		}
		rows.push({
			...cell,
			headline: headline(cell),
			older: pair.older.mean,
			newer: pair.newer.mean,
			diff: pair.diff,
			direction: direction(pair.diff),
			n: { older: pair.older.n, newer: pair.newer.n },
			societies: null,
			small: { older: pair.older.n < SMALL, newer: pair.newer.n < SMALL }
		});
	});
	return { rows, missing };
}

/** The societies in both surveys together, averaging the societies that have each pair (FR-53). */
export function globalChange(file: ChangeCells): ChangeView {
	const rows = file.cells.map((cell, k): ChangeRow => {
		const g = file.global(k);
		return {
			...cell,
			headline: headline(cell),
			older: g.older,
			newer: g.newer,
			diff: g.diff,
			direction: direction(g.diff),
			n: null,
			societies: g.societies,
			small: { older: false, newer: false }
		};
	});
	return { rows, missing: [] };
}

export interface ChangeCounts {
	higher: number;
	lower: number;
	within: number;
	shown: number;
}

/** FR-51: pairs judged more and less appropriate in 2023–2024, beyond their intervals. */
export function changeCounts(rows: readonly { direction: Direction }[]): ChangeCounts {
	const counts = { higher: 0, lower: 0, within: 0, shown: rows.length };
	for (const row of rows) {
		if (row.direction === 1) counts.higher += 1;
		else if (row.direction === -1) counts.lower += 1;
		else counts.within += 1;
	}
	return counts;
}

/**
 * The rows in the order `sort` asks for (decision 67): the largest difference first (ties in paper
 * order), paper order, or by behavior and situation name.
 */
export function changeOrder(rows: readonly ChangeRow[], sort: SortKey): ChangeRow[] {
	if (sort === 'paper') return [...rows];
	if (sort === 'name') {
		return orderBy(rows.length, (i) => cellName(rows[i].index), false).map((i) => rows[i]);
	}
	return largestFirst(rows, (row) => row.diff.value);
}

/** "respondents in Japan", or "the 26 societies in both surveys" (decision 71). */
export function subjectOf(scope: ChangeScope, societies: number): string {
	return scope.kind === 'society'
		? `respondents in ${place(scope.code, scope.name)}`
		: `the ${societies} societies in both surveys`;
}

const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const were = (n: number) => (n === 1 ? 'was' : 'were');

/**
 * FR-51, FR-87: the counts in one sentence. For one society: "Of the 120 pairs both surveys asked,
 * respondents in Japan in 2023–2024 judged 22 more appropriate than respondents there in 2000–2003
 * and 38 less appropriate, beyond their 95% intervals; 60 were within them."
 */
export function changeSummary(scope: ChangeScope, view: ChangeView, societies: number): string {
	const c = changeCounts(view.rows);
	const within = `${c.within} ${were(c.within)} within them`;
	if (scope.kind === 'society') {
		return (
			`Of the ${c.shown} pairs both surveys asked, ${subjectOf(scope, societies)} in 2023–2024 ` +
			`judged ${c.higher} more appropriate than respondents there in 2000–2003 and ${c.lower} ` +
			`less appropriate, beyond their 95% intervals; ${within}.`
		);
	}
	return (
		`Averaged over ${subjectOf(scope, societies)}, ${c.higher} of the ${c.shown} pairs ` +
		`${were(c.higher)} judged more appropriate in 2023–2024 than in 2000–2003 and ${c.lower} ` +
		`less appropriate, beyond their 95% intervals; ${within}.`
	);
}

/** NFR-11: the arrows in one sentence, naming the largest difference. */
export function changeChartSummary(
	scope: ChangeScope,
	view: ChangeView,
	societies: number
): string {
	const [top] = largestFirst(view.rows, (row) => row.diff.value);
	const who = subjectOf(scope, societies);
	if (!top) return `${capital(who)} have no pair in both surveys.`;
	return (
		`Each arrow runs from the 2000–2003 average to the 2023–2024 average ` +
		`${scope.kind === 'society' ? 'for' : 'of'} ${who}; the largest difference is for ` +
		`${phrase(top)}, from ${score(top.older)} to ${score(top.newer)} (${score(top.diff.value)}).`
	);
}

/** A row's difference and how it compares with 0, in words. */
export function directionText(d: Direction): string {
	return d === 1
		? 'judged more appropriate in 2023–2024, beyond its 95% interval'
		: d === -1
			? 'judged less appropriate in 2023–2024, beyond its 95% interval'
			: 'within its 95% interval';
}

/** "small sample in 2023–2024", or "" (DR-9). */
export function smallText(row: ChangeRow): string {
	const which = [row.small.older ? '2000–2003' : null, row.small.newer ? '2023–2024' : null].filter(
		Boolean
	);
	return which.length ? `small sample in ${which.join(' and ')}` : '';
}

/** A row in words, for screen readers and the details. */
export function rowText(row: ChangeRow): string {
	const small = smallText(row);
	return (
		`2000–2003 ${score(row.older)}, 2023–2024 ${score(row.newer)}, difference ` +
		`${score(row.diff.value)} (95% interval ${interval(row.diff.lo, row.diff.hi)}), ` +
		`${directionText(row.direction)}${small ? `; ${small}` : ''}`
	);
}

export interface ChangeTableRow {
	key: number;
	behavior: string;
	situation: string;
	older: string;
	newer: string;
	diff: string;
	interval: string;
	direction: string;
	n: string;
}

/** NFR-11: the arrows' values, in the chart's order. */
export function changeTable(rows: readonly ChangeRow[]): ChangeTableRow[] {
	return rows.map((row) => ({
		key: row.index,
		behavior: BEHAVIOR_TEXT[row.behavior].label,
		situation: SITUATION_TEXT[row.situation].label,
		older: score(row.older),
		newer: score(row.newer),
		diff: score(row.diff.value),
		interval: interval(row.diff.lo, row.diff.hi),
		direction:
			row.direction === 1 ? 'Higher' : row.direction === -1 ? 'Lower' : 'Within its interval',
		n: row.n
			? `${count(row.n.older)} ratings; ${count(row.n.newer)} respondents${
					smallText(row) ? ` (${smallText(row)})` : ''
				}`
			: `${row.societies} societies`
	}));
}

/** A row of the overview's strips: a society or a behavior with its mean difference. */
export interface StripRow {
	key: string;
	label: string;
	diff: Estimate;
	direction: Direction;
	/** After the value: "119 pairs", "higher in 23 of 26 societies". */
	note: string;
}

/** Signed, largest first; ties by label. */
function bySize(rows: StripRow[]): StripRow[] {
	return [...rows].sort(
		(a, b) =>
			Math.round((b.diff.value - a.diff.value) * 100) || a.label.localeCompare(b.label, 'en')
	);
}

/**
 * The societies in both surveys with each one's mean difference over its pairs (FR-51), highest
 * first. `name` looks a society's name up.
 */
export function societyStrip(file: ChangeCells, name: (code: string) => string): StripRow[] {
	return bySize(
		file.societies().map((s) => ({
			key: s.code,
			label: name(s.code),
			diff: s.diff,
			direction: direction(s.diff),
			note: s.cells === file.cells.length ? '' : `${s.cells} pairs`
		}))
	);
}

/** The 12 behaviors with each one's mean difference over societies and situations, highest first. */
export function behaviorStrip(file: ChangeCells): StripRow[] {
	return bySize(
		file.behaviors.map((b) => ({
			key: b.behavior,
			label: BEHAVIOR_TEXT[b.behavior].label,
			diff: b.diff,
			direction: direction(b.diff),
			note: `higher in ${b.increased} of ${b.societies} societies`
		}))
	);
}

/**
 * FR-51, FR-87: the societies' mean differences counted. "On average over their pairs, respondents
 * in 13 of the 26 societies judged the pairs more appropriate in 2023–2024 and in 6 less
 * appropriate, beyond their 95% intervals; 7 were within them."
 */
export function societiesSummary(strip: readonly StripRow[]): string {
	const c = changeCounts(strip);
	return (
		`On average over their pairs, respondents in ${c.higher} of the ${c.shown} societies judged ` +
		`the pairs more appropriate in 2023–2024 and in ${c.lower} less appropriate, beyond their ` +
		`95% intervals; ${c.within} ${were(c.within)} within them.`
	);
}

/** NFR-11: the societies strip in one sentence. */
export function societyStripSummary(strip: readonly StripRow[]): string {
	if (!strip.length) return 'No society is in both surveys in this sample.';
	const high = strip[0];
	const low = strip[strip.length - 1];
	return (
		`Averaged over their pairs, differences run from ${score(low.diff.value, 2)} among ` +
		`respondents in ${place(low.key, low.label)} to ${score(high.diff.value, 2)} among ` +
		`respondents in ${place(high.key, high.label)}.`
	);
}

/** NFR-11: the behaviors strip in one sentence. */
export function behaviorStripSummary(strip: readonly StripRow[], societies: number): string {
	const high = strip[0];
	const low = strip[strip.length - 1];
	const gerund = (row: StripRow) => BEHAVIOR_TEXT[row.key as Behavior].gerund.toLowerCase();
	return (
		`Averaged over the ${societies} societies and the 10 situations, differences run from ` +
		`${score(low.diff.value, 2)} for ${gerund(low)} to ${score(high.diff.value, 2)} for ` +
		`${gerund(high)}.`
	);
}

/** "2000–2003 −1.2 · 2023–2024 −0.4 · small sample in 2023–2024": a row's values in brief. */
export function valuesText(row: ChangeRow): string {
	const small = smallText(row);
	return `2000–2003 ${score(row.older)} · 2023–2024 ${score(row.newer)}${small ? ` · ${small}` : ''}`;
}

/** The arrow chart's rows (decision 69): ● the 2023–2024 survey, ○ the 2000–2003 survey. */
export function arrowRows(rows: readonly ChangeRow[]): PairRow[] {
	return rows.map((row) => ({
		index: row.index,
		headline: row.headline,
		a: row.newer,
		b: row.older,
		gap: row.diff.value,
		direction: row.direction,
		small: { a: row.small.newer, b: row.small.older },
		text: rowText(row),
		values: valuesText(row)
	}));
}
