import { describe, expect, it } from 'vitest';
import {
	cellSummary,
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
		expect(rank(values, 'BBB')).toEqual({ rank: 1, tied: true, of: 4 });
		expect(rank(values, 'CCC')).toEqual({ rank: 1, tied: true, of: 4 });
		expect(rank(values, 'AAA')).toEqual({ rank: 3, tied: false, of: 4 });
		expect(rank(values, 'DDD')).toEqual({ rank: 4, tied: false, of: 4 });
		expect(rank(values, 'EEE')).toBeNull();
	});

	it('reads "12th most accepting of 90"', () => {
		expect(rankText({ rank: 12, tied: false, of: 90 })).toBe('12th most accepting of 90');
		expect(rankText({ rank: 3, tied: true, of: 87 })).toBe('tied 3rd most accepting of 87');
	});
});

describe('NFR-11, FR-87: one-sentence summaries', () => {
	it('summarises the matrix', () => {
		expect(matrixSummary(global, 'raw')).toBe(
			'Average judgments run from −2.0 for arguing at a funeral ceremony to +1.0 for using a ' +
				'mobile phone at a party, and societies disagree most about using a mobile phone at a ' +
				'party and least about arguing at a funeral ceremony.'
		);
	});

	it('summarises a cell with its response label, share and disagreement', () => {
		expect(cellSummary(global, 0, 'raw')).toBe(
			'On average, respondents in 3 societies judged arguing at a funeral ceremony very ' +
				'inappropriate (−2.0; 0% chose an appropriate answer), and disagreement between ' +
				'societies is 0.20, the lowest of the 150 pairs.'
		);
		expect(cellSummary(global, 48, 'raw')).toMatch(/is 0\.68, the 4th highest of the 150 pairs\.$/);
	});

	it('summarises the beeswarm with respondents in each place, counting hidden societies', () => {
		const cells = new SocietyCells(cellsDoc(), 'all');
		const societies = new Societies(societiesDoc());
		const text = societiesSummary(cells.column(0, 'raw', 'raw'), (c) => societies.get(c), 0);
		expect(text).toBe(
			'Estimates for arguing at a funeral ceremony run from −2.5 among respondents in Alpha ' +
				'to −2.0 among respondents in Philippines; 1 society has too few responses or was not ' +
				'asked.'
		);
	});

	it('summarises the behavior strip', () => {
		expect(stripSummary(global, 'argue', 'raw')).toBe(
			'Across the 10 situations, arguing scores highest at a party (−1.8) and lowest at a ' +
				'funeral ceremony (−2.0).'
		);
	});
});

describe('FR-26: previous and next cells (decision 39)', () => {
	it('moves in paper order and wraps around', () => {
		expect(neighbours(0)).toEqual({ previous: 149, next: 1 });
		expect(neighbours(149)).toEqual({ previous: 148, next: 0 });
	});
});
