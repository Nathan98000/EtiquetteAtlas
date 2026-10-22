/**
 * A society's facts (FR-34) and its most similar societies (FR-32), in the words the panels and
 * the prerendered pages use. Both are built by the same functions at build time (All data) and
 * in the browser (the active sample), so the two always agree. Similarity describes how alike
 * two societies' answers are, never how related their cultures are (FR-73).
 */

import { signed } from './format';
import {
	SAMPLE_LABEL,
	SAMPLES,
	type Region,
	type SampleId,
	type Similarity,
	type Societies
} from './model';

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** "2023-11" → "November 2023". */
export function monthLabel(month: string): string {
	const [year, m] = month.split('-');
	return `${MONTHS[Number(m) - 1]} ${year}`;
}

/** The fieldwork period: "November 2023", "September to December 2023", "December 2023 to May 2024". */
export function period(first: string | null, last: string | null): string | null {
	if (!first || !last) return null;
	if (first === last) return monthLabel(first);
	const [y1] = first.split('-');
	const [y2] = last.split('-');
	const start = y1 === y2 ? MONTHS[Number(first.split('-')[1]) - 1] : monthLabel(first);
	return `${start} to ${monthLabel(last)}`;
}

/** "Spanish", "Spanish and English", "Dutch, French and German". */
export function listText(items: readonly string[]): string {
	if (items.length <= 1) return items[0] ?? '';
	return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/**
 * The share flagged as students, as stored (decision 11). Student status was recorded by the
 * collection sites, and some recorded none.
 */
export function studentText(share: number, unknown: number): string {
	if (unknown >= 100) return 'not recorded';
	if (unknown === 0) return `${share}%`;
	return `${share}%, with no status recorded for ${unknown}%`;
}

/** No month had 10 respondents starting, so none is shown (decision 17). */
export const NO_PERIOD = 'not shown: fewer than 10 respondents started in any one month';

export interface FactsView {
	sample: SampleId;
	/** The facts in the sample, or null when the society is not in it (§4.4). */
	inSample: {
		respondents: string;
		students: string;
		languages: string;
		period: string;
	} | null;
	region: Region;
	/** Respondents in each sample, null when the society is not in it. */
	bySample: { sample: SampleId; label: string; respondents: string | null }[];
}

/** FR-34: respondents, student share, interface languages, fieldwork period and region. */
export function factsView(societies: Societies, code: string, sample: SampleId): FactsView | null {
	const society = societies.get(code);
	if (!society) return null;
	const facts = societies.facts(code, sample);
	return {
		sample,
		inSample: facts && {
			respondents: facts.respondents.toLocaleString('en-US'),
			students: studentText(facts.studentShare, facts.studentUnknown),
			languages: listText(facts.languages),
			period: period(facts.firstMonth, facts.lastMonth) ?? NO_PERIOD
		},
		region: society.region,
		bySample: SAMPLES.map((s) => {
			const n = societies.respondents(code, s);
			return { sample: s, label: SAMPLE_LABEL[s], respondents: n?.toLocaleString('en-US') ?? null };
		})
	};
}

export interface SimilarView {
	code: string;
	name: string;
	rank: number;
	/** The correlation with two decimals and a true minus sign: "0.78". */
	r: string;
	/** For the bar: the correlation, floored at 0. */
	width: number;
	cells: number;
}

/** FR-32: the five most similar societies, most similar first; empty when there are none. */
export function similarView(
	similarity: Similarity,
	societies: Societies,
	code: string
): SimilarView[] {
	return similarity.pairs(code).flatMap((pair) => {
		const other = societies.get(pair.other);
		if (!other) return [];
		return [
			{
				code: other.code,
				name: other.name,
				rank: pair.rank,
				r: signed(pair.r, 2),
				width: Math.max(0, Math.min(1, pair.r)),
				cells: pair.cells
			}
		];
	});
}
