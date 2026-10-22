import { describe, expect, it } from 'vitest';
import { GlobalCells, SocietyCells } from '../data/model';
import { cellsDoc, globalDoc } from '../data/test-fixtures';
import { comparison, comparisonSummary, pairWho } from './compare-model';

const global = new GlobalCells(globalDoc(), 'all');
const cells = new SocietyCells(cellsDoc(), 'all');
const names: [string, string] = ['Alpha', 'Gamma'];

describe('FR-33: two societies cell by cell (decision 49)', () => {
	it('pairs both shrunken estimates and their gap, largest first, ties in paper order', () => {
		// AAA sits 0.4 below the global mean everywhere, CCC 0.4 above.
		const result = comparison(global, cells, 0, 2, 'raw', names);
		expect(result.pairs).toHaveLength(148);
		expect(result.pairs[0]).toMatchObject({
			index: 1,
			headline: 'Arguing on a city sidewalk',
			a: { value: -2.38 },
			b: { value: -1.58 },
			gap: -0.8,
			global: -1.98
		});
		expect(result.pairs.map((p) => p.index).slice(0, 3)).toEqual([1, 3, 4]);
	});

	it('orders by the size of the gap', () => {
		const doc = cellsDoc();
		doc.cells.shrunk[2 * 150 + 77] = 1.5; // CCC far above AAA in cell 77
		const result = comparison(global, new SocietyCells(doc, 'all'), 0, 2, 'raw', names);
		expect(result.pairs[0].index).toBe(77);
	});

	it('sets apart the pairs either society cannot show, saying which and why', () => {
		const result = comparison(global, cells, 0, 2, 'raw', names);
		expect(result.unmatched).toEqual([
			{
				index: 0,
				behavior: 'argue',
				situation: 'funeral',
				headline: 'Arguing at a funeral ceremony',
				reason: 'Gamma: too few responses'
			},
			{
				index: 2,
				behavior: 'argue',
				situation: 'library',
				headline: 'Arguing in the library',
				reason: 'Gamma: not asked'
			}
		]);
	});

	it('uses centered estimates under the centered scale', () => {
		// Shrunken offsets −0.2 (AAA) and +0.2 (CCC) narrow the gap from 0.8 to 0.4.
		const result = comparison(global, cells, 0, 2, 'centered', names);
		expect(result.pairs[0].gap).toBe(-0.4);
	});

	it('NFR-11: sums up the comparison in one sentence', () => {
		const who = pairWho('Alpha', 'Gamma');
		expect(who).toBe('respondents in Alpha and in Gamma');
		expect(comparisonSummary(who, comparison(global, cells, 0, 2, 'raw', names), 'raw')).toBe(
			'Across the 148 pairs both can show, respondents in Alpha and in Gamma differ by 0.8 on ' +
				'average, most of all about arguing on a city sidewalk (−2.4 against −1.6).'
		);
		expect(comparisonSummary(who, { pairs: [], unmatched: [] }, 'raw')).toBe(
			'Respondents in Alpha and in Gamma have no pair that both can show.'
		);
	});
});
