import { describe, expect, it } from 'vitest';
import {
	cellDetail,
	cellHeadline,
	cellSummary,
	disagreementRank,
	disagreementWords,
	extremes,
	listOrder,
	matrixOrder,
	matrixSummary,
	neighbours,
	rank,
	rankText,
	societiesSummary,
	stripSummary
} from './derive';
import { GlobalCells, Societies, SocietyCells } from './model';
import { cellsDoc, globalDoc, societiesDoc } from './test-fixtures';

const global = new GlobalCells(globalDoc(), 'all');

describe('FR-12: matrix sorting', () => {
	it('keeps paper order by default', () => {
		const { rows, columns } = matrixOrder(global, 'raw', 'paper');
		expect(rows).toEqual([...Array(15).keys()]);
		expect(columns).toEqual([...Array(10).keys()]);
	});

	it('sorts rows and columns by mean, most appropriate first', () => {
		const { rows, columns } = matrixOrder(global, 'raw', 'mean');
		expect(rows).toEqual([...Array(15).keys()].reverse());
		expect(columns).toEqual([...Array(10).keys()].reverse());
	});

	it('sorts by disagreement, keeping paper order among ties', () => {
		const { rows, columns } = matrixOrder(global, 'raw', 'disagreement');
		expect(rows).toEqual([4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11, 0, 5, 10]);
		expect(columns).toEqual([...Array(10).keys()].reverse());
	});

	it('sorts by the short labels', () => {
		const { rows, columns } = matrixOrder(global, 'raw', 'name');
		expect(rows.slice(0, 4)).toEqual([0, 9, 4, 2]); // Argue, Bargain, Cry, Curse or swear
		expect(columns.slice(0, 3)).toEqual([7, 0, 4]); // Bus, Funeral, Job interview
	});

	it('uses the centered values under the centered scale', () => {
		expect(matrixOrder(global, 'centered', 'disagreement').columns).toEqual([...Array(10).keys()]);
	});
});

describe('FR-17: list sorting', () => {
	it('orders all 150 cells', () => {
		expect(listOrder(global, 'raw', 'paper')).toEqual([...Array(150).keys()]);
		expect(listOrder(global, 'raw', 'mean').slice(0, 2)).toEqual([149, 148]);
		expect(listOrder(global, 'raw', 'disagreement').slice(0, 4)).toEqual([49, 99, 149, 48]);
		expect(listOrder(global, 'raw', 'name')[0]).toBe(7); // Argue, Bus
	});
});

describe('FR-16: most universal and most culture-dependent cells', () => {
	it('picks the lowest and highest τ, first in paper order among ties', () => {
		expect(extremes(global, 'raw')).toEqual({ universal: 0, dependent: 149 });
		expect(extremes(global, 'centered')).toEqual({ universal: 49, dependent: 100 });
	});
});

describe('FR-25: rank among the societies shown (decision 33)', () => {
	const values = [
		{ code: 'AAA', value: 1 },
		{ code: 'BBB', value: 2 },
		{ code: 'CCC', value: 2.0000001 },
		{ code: 'DDD', value: 0.5 }
	];

	it('ranks the highest estimate first and lets ties share a rank', () => {
		expect(rank(values, 'BBB')).toEqual({ rank: 1, strict: 3, tied: true, of: 4 });
		expect(rank(values, 'CCC')).toEqual({ rank: 1, strict: 3, tied: true, of: 4 });
		expect(rank(values, 'AAA')).toEqual({ rank: 3, strict: 2, tied: false, of: 4 });
		expect(rank(values, 'DDD')).toEqual({ rank: 4, strict: 1, tied: false, of: 4 });
		expect(rank(values, 'EEE')).toBeNull();
	});

	it('reads "12th most accepting of 90" in the upper half', () => {
		expect(rankText({ rank: 12, strict: 79, tied: false, of: 90 })).toBe(
			'12th most accepting of 90'
		);
		expect(rankText({ rank: 3, strict: 84, tied: true, of: 87 })).toBe(
			'tied 3rd most accepting of 87'
		);
		expect(rankText({ rank: 44, strict: 45, tied: false, of: 88 })).toBe(
			'44th most accepting of 88'
		);
	});

	it('D-27: reads "10th strictest of 88" in the lower half, from the nearer end', () => {
		expect(rankText({ rank: 79, strict: 10, tied: false, of: 88 })).toBe('10th strictest of 88');
		expect(rankText({ rank: 45, strict: 44, tied: false, of: 88 })).toBe('44th strictest of 88');
		expect(rankText({ rank: 80, strict: 7, tied: true, of: 87 })).toBe('tied 7th strictest of 87');
	});
});

describe('NFR-11, FR-87, D-5 to D-7: one-sentence summaries, findings first in words', () => {
	it('summarises the matrix in response labels', () => {
		expect(matrixSummary(global, 'raw')).toBe(
			'Using a mobile phone at a party is judged the most appropriate on average (somewhat ' +
				'appropriate) and arguing at a funeral ceremony the least (very inappropriate); ' +
				'societies disagree most about using a mobile phone at a party and least about arguing ' +
				'at a funeral ceremony.'
		);
	});

	it('leads a cell with its disagreement in words, then its response label and share', () => {
		expect(cellSummary(global, 0, 'raw')).toBe(
			'Societies disagree about arguing at a funeral ceremony less than about any other pair ' +
				'of a behavior and a situation. Respondents in 3 societies judged it very inappropriate ' +
				'on average, and 0% chose an appropriate answer.'
		);
		expect(cellSummary(global, 48, 'raw')).toMatch(
			/^Societies disagree about .+ more than about almost any other pair of a behavior and a situation \(4th most of 150\)\./
		);
	});

	it('D-38, decision 136: gives the share card the lede’s two sentences, the first in brief', () => {
		expect(cellHeadline(global, 0, 'raw', true)).toBe(
			'Societies disagree about arguing at a funeral ceremony less than about any other pair'
		);
		expect(cellHeadline(global, 48, 'raw', true)).toMatch(
			/^Societies disagree about .+ more than about almost any other pair$/
		);
		expect(cellDetail(global, 0, 'raw')).toBe(
			'Respondents in 3 societies judged it very inappropriate on average, and 0% chose an ' +
				'appropriate answer.'
		);
		expect(cellSummary(global, 0, 'raw')).toBe(
			`${cellHeadline(global, 0, 'raw')}. ${cellDetail(global, 0, 'raw')}`
		);
	});

	it('D-7: says disagreement as a rank in words, from the top and bottom ten and by thirds', () => {
		const of = 150;
		const words = (top: number, bottom: number) => disagreementWords({ top, bottom, of });
		expect(words(1, 150)).toBe('more than about any other pair of a behavior and a situation');
		expect(words(150, 1)).toBe('less than about any other pair of a behavior and a situation');
		expect(words(3, 148)).toMatch(/almost any other .* \(3rd most of 150\)$/);
		expect(words(147, 4)).toMatch(/almost any other .* \(4th least of 150\)$/);
		expect(words(40, 111)).toBe(
			'more than about most pairs of a behavior and a situation (40th of 150)'
		);
		expect(words(70, 81)).toBe(
			'about as much as about a typical pair of a behavior and a situation (70th of 150)'
		);
		expect(words(120, 31)).toBe(
			'less than about most pairs of a behavior and a situation (120th of 150)'
		);
		expect(disagreementRank(global, 0, 'raw')).toMatchObject({ bottom: 1, of: 150 });
	});

	it('summarises the beeswarm in response labels, counting hidden societies', () => {
		const cells = new SocietyCells(cellsDoc(), 'all');
		const societies = new Societies(societiesDoc());
		const text = societiesSummary(cells.column(0, 'raw', 'raw'), (c) => societies.get(c), 0);
		expect(text).toBe(
			'Average answers about arguing at a funeral ceremony run from extremely inappropriate ' +
				'among respondents in Alpha to very inappropriate among respondents in Philippines; 1 ' +
				'society has too few responses or was not asked.'
		);
	});

	it('summarises the behavior strip in response labels', () => {
		expect(stripSummary(global, 'argue', 'raw')).toBe(
			'Judgments of arguing are very inappropriate in every situation, highest at a party and ' +
				'lowest at a funeral ceremony.'
		);
	});
});

describe('FR-26: previous and next cells (decision 39)', () => {
	it('moves in paper order and wraps around', () => {
		expect(neighbours(0)).toEqual({ previous: 149, next: 1 });
		expect(neighbours(149)).toEqual({ previous: 148, next: 0 });
	});
});
