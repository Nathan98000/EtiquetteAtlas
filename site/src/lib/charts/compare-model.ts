/**
 * Two societies cell by cell (FR-33, decision 49): both shrunken estimates on the scale shown and
 * the gap between them, largest gaps first, with the pairs either society cannot show set apart.
 */

import { CELLS, headline, phrase, type Cell } from '../data/grid';
import { cents, orderBy } from '../data/derive';
import { score } from '../data/format';
import {
	missingText,
	type Estimate,
	type GlobalCells,
	type Scale,
	type SocietyCells
} from '../data/model';

export interface ComparePair extends Cell {
	headline: string;
	a: Estimate;
	b: Estimate;
	/** a − b in hundredths: positive when the page's society judged the pair more appropriate. */
	gap: number;
	global: number;
}

export interface Unmatched extends Cell {
	headline: string;
	/** Why the pair is not compared, naming the society that lacks it. */
	reason: string;
}

export interface Comparison {
	/** Pairs both societies can show, largest gap first, ties in paper order. */
	pairs: ComparePair[];
	unmatched: Unmatched[];
}

/** `a` and `b` are rows in the sample's cells file; `names` say who lacks a pair. */
export function comparison(
	global: GlobalCells,
	cells: SocietyCells,
	a: number,
	b: number,
	scale: Scale,
	names: [string, string]
): Comparison {
	const shown: ComparePair[] = [];
	const unmatched: Unmatched[] = [];
	for (const cell of CELLS) {
		const c = cell.index;
		const ea = cells.estimate(a, c, 'shrunk', scale);
		const eb = cells.estimate(b, c, 'shrunk', scale);
		if (ea && eb) {
			shown.push({
				...cell,
				headline: headline(cell),
				a: ea,
				b: eb,
				gap: cents(ea.value - eb.value) / 100,
				global: global.mean(c, scale)
			});
		} else {
			const reasons = [
				ea ? null : `${names[0]}: ${missingText(cells.status(a, c))}`,
				eb ? null : `${names[1]}: ${missingText(cells.status(b, c))}`
			].filter(Boolean);
			unmatched.push({ ...cell, headline: headline(cell), reason: reasons.join('; ') });
		}
	}
	const order = orderBy(shown.length, (i) => cents(Math.abs(shown[i].gap)), true);
	return { pairs: order.map((i) => shown[i]), unmatched };
}

/**
 * NFR-11: the comparison in one sentence. `who` is "respondents in Chile and in Japan".
 */
export function comparisonSummary(who: string, result: Comparison, scale: Scale): string {
	const capital = who[0].toUpperCase() + who.slice(1);
	if (!result.pairs.length) return `${capital} have no pair that both can show.`;
	const n = result.pairs.length;
	const average = result.pairs.reduce((sum, p) => sum + Math.abs(p.gap), 0) / n;
	const top = result.pairs[0];
	const on = scale === 'centered' ? ' on the centered scale' : '';
	return (
		`Across the ${n} pairs both can show, ${who} differ by ${average.toFixed(1)} on average` +
		`${on}, most of all about ${phrase(top)} (${score(top.a.value)} against ` +
		`${score(top.b.value)}).`
	);
}

/** "respondents in Chile and in the Philippines". */
export function pairWho(a: string, b: string): string {
	return `respondents in ${a} and in ${b}`;
}
