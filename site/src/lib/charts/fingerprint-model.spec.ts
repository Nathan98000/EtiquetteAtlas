import { describe, expect, it } from 'vitest';
import { CELL_COUNT } from '../data/grid';
import { GlobalCells, SocietyCells, Status } from '../data/model';
import { cellsDoc, fixtureMean, globalDoc } from '../data/test-fixtures';
import { deviationStyle } from './colors';
import {
	emptySummary,
	fingerprintCells,
	fingerprintChartSummary,
	fingerprintCounts,
	fingerprintLabel,
	fingerprintListOrder,
	fingerprintOrder,
	fingerprintHeadline,
	fingerprintOther,
	fingerprintSummary
} from './fingerprint-model';

const global = new GlobalCells(globalDoc(), 'all');
const cells = new SocietyCells(cellsDoc(), 'all');
// Shrunken estimates sit 0.4 below the global mean (AAA), on it (BBB) or 0.4 above it (CCC).
const [aaa, bbb, ccc] = [0, 1, 2].map((s) => fingerprintCells(global, cells, s, 'raw'));

/** AAA with one row 1.0 below the global mean and one cell 1.2 above it, beyond ±1.5 nowhere. */
function uneven() {
	const doc = cellsDoc();
	for (let c = 140; c < 150; c++)
		doc.cells.shrunk[c] = Math.round((fixtureMean(c) - 1) * 100) / 100;
	doc.cells.shrunk[5] = Math.round((fixtureMean(5) + 1.2) * 100) / 100;
	return fingerprintCells(global, new SocietyCells(doc, 'all'), 0, 'raw');
}

describe('FR-30: each cell’s difference from the global mean (decision 46)', () => {
	it('is the shrunken estimate minus the global mean, on the diverging scale', () => {
		expect(aaa).toHaveLength(CELL_COUNT);
		expect(aaa[10]).toMatchObject({
			headline: 'Laughing out loud at a funeral ceremony',
			deviation: -0.4,
			global: -1.8,
			globalShare: 10,
			estimate: { value: -2.2, lo: -2.45, hi: -1.95 },
			clamped: false
		});
		expect(aaa[10].style).toBe(deviationStyle(-0.4));
		expect(ccc[10].deviation).toBe(0.4);
		expect(bbb[10].deviation).toBe(0);
	});

	it('FR-5: uses centered estimates and the centered global mean under the centered scale', () => {
		const centered = fingerprintCells(global, cells, 0, 'centered');
		// AAA's shrunken offset is −0.2; the fixture's centered mean adds 0.01 in cell 0.
		expect(centered[10].deviation).toBe(-0.2);
		expect(centered[0].deviation).toBe(-0.21);
		expect(centered[10].mark).toBe('close');
	});

	it('DR-9, FR-27: leaves suppressed and not-asked cells unfilled', () => {
		expect(ccc[0]).toMatchObject({ status: Status.TooFew, deviation: null, mark: 'missing' });
		expect(ccc[0].style).toBeUndefined();
		expect(ccc[2]).toMatchObject({ status: Status.NotAsked, deviation: null, mark: 'missing' });
	});

	it('flags differences beyond the colour scale', () => {
		const doc = cellsDoc();
		doc.cells.shrunk[3] = Math.round((fixtureMean(3) + 2) * 100) / 100;
		const model = fingerprintCells(global, new SocietyCells(doc, 'all'), 0, 'raw');
		expect(model[3]).toMatchObject({ deviation: 2, clamped: true });
		expect(model[3].style).toBe(deviationStyle(1.5));
	});
});

describe('FR-31: notable cells and their counts', () => {
	it('marks each cell stricter, looser or neither from the pipeline’s test', () => {
		expect(aaa[10].mark).toBe('stricter');
		expect(ccc[10].mark).toBe('looser');
		expect(bbb[10].mark).toBe('close');
	});

	it('counts the marks and the cells with nothing to show', () => {
		expect(fingerprintCounts(aaa)).toEqual({
			shown: 150,
			stricter: 150,
			looser: 0,
			close: 0,
			tooFew: 0,
			notAsked: 0
		});
		expect(fingerprintCounts(ccc)).toEqual({
			shown: 148,
			stricter: 0,
			looser: 148,
			close: 0,
			tooFew: 1,
			notAsked: 1
		});
	});

	it('names each cell for screen readers', () => {
		expect(fingerprintLabel(aaa[0])).toBe(
			'Arguing at a funeral ceremony: −0.4, clearly stricter than the global average'
		);
		expect(fingerprintLabel(bbb[1])).toBe(
			'Arguing on a city sidewalk: 0.0, too close to call against the global average, small sample'
		);
		expect(fingerprintLabel(ccc[0])).toBe('Arguing at a funeral ceremony: too few responses');
		expect(fingerprintLabel(ccc[2])).toBe('Arguing in the library: not asked');
	});
});

describe('FR-12, FR-17, decision 45: orders', () => {
	it('follows the matrix’s orders, so the two views line up', () => {
		expect(fingerprintOrder(global, 'raw', 'mean', aaa)).toEqual({
			rows: [...Array(15).keys()].reverse(),
			columns: [...Array(10).keys()].reverse()
		});
		expect(fingerprintListOrder(global, 'raw', 'paper', aaa)).toEqual([...Array(150).keys()]);
	});

	it('puts the largest differences first, ties in paper order and missing cells last', () => {
		const model = uneven();
		const { rows, columns } = fingerprintOrder(global, 'raw', 'difference', model);
		expect(rows).toEqual([14, 0, ...Array.from({ length: 13 }, (_, i) => i + 1)]);
		expect(columns).toEqual([5, 0, 1, 2, 3, 4, 6, 7, 8, 9]);
		const list = fingerprintListOrder(global, 'raw', 'difference', model);
		expect(list.slice(0, 12)).toEqual([5, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 0]);
		expect(fingerprintListOrder(global, 'raw', 'difference', ccc).slice(-2)).toEqual([0, 2]);
	});
});

describe('FR-87, NFR-11: the fingerprint in one sentence', () => {
	it('gives the counts and the most similar society', () => {
		expect(
			fingerprintSummary(
				'respondents in Alpha',
				fingerprintCounts(aaa),
				'raw',
				'respondents in the Philippines'
			)
		).toBe(
			'Respondents in Alpha were clearly stricter than the global average on 150 of the 150 ' +
				'pairs of a behavior and a situation and clearly looser on none, and their answers are ' +
				'most like those of respondents ' +
				'in the Philippines.'
		);
	});

	it('D-38, decision 12: heads a society’s share card with its larger count', () => {
		expect(fingerprintHeadline('respondents in Alpha', fingerprintCounts(aaa))).toBe(
			'Respondents in Alpha were clearly stricter than the global average on 150 of the 150 pairs'
		);
		expect(fingerprintOther(fingerprintCounts(aaa))).toBe('Clearly looser on none');
		expect(fingerprintHeadline('respondents in Gamma', fingerprintCounts(ccc))).toBe(
			'Respondents in Gamma were clearly looser than the global average on 148 of the 148 pairs ' +
				'with enough responses'
		);
		expect(
			fingerprintHeadline('respondents in Delta', {
				shown: 0,
				stricter: 0,
				looser: 0,
				close: 0,
				tooFew: 150,
				notAsked: 0
			})
		).toBe('No pair was rated by 10 or more respondents in Delta');
	});

	it('says when pairs are missing and when no similar society can be named', () => {
		expect(fingerprintSummary('respondents in Gamma', fingerprintCounts(ccc), 'raw', null)).toBe(
			'Respondents in Gamma were clearly stricter than the global average on none of the 148 ' +
				'pairs of a behavior and a situation with enough responses and clearly looser on 148; ' +
				'too few of their pairs have ' +
				'enough responses to compare them with other societies.'
		);
	});

	it('names the centered scale', () => {
		const centered = fingerprintCells(global, cells, 0, 'centered');
		expect(
			fingerprintSummary(
				'respondents in Alpha',
				fingerprintCounts(centered),
				'centered',
				null,
				false
			)
		).toBe(
			"Relative to each society's average, respondents in Alpha were clearly stricter than the global " +
				'average on none of the 150 pairs of a behavior and a situation and clearly looser on none.'
		);
	});

	it('decision 53: says when no pair can be shown', () => {
		const empty = ccc.map((c) => ({ ...c, deviation: null, mark: 'missing' as const }));
		expect(fingerprintSummary('respondents in Gamma', fingerprintCounts(empty), 'raw', null)).toBe(
			emptySummary('respondents in Gamma')
		);
		expect(emptySummary('respondents in Gamma')).toBe(
			'No pair was rated by 10 or more respondents in Gamma, so none can be shown.'
		);
	});

	it('names the largest differences either way for the chart', () => {
		expect(fingerprintChartSummary('respondents in Alpha', uneven(), 'raw')).toBe(
			'Respondents in Alpha were clearly stricter than the global average on 150 of the 150 ' +
				'pairs and clearly looser on none; the largest differences are for arguing in a ' +
				'restaurant (+1.2) and using a mobile phone at a funeral ceremony (−1.0).'
		);
		expect(fingerprintChartSummary('respondents in Gamma', ccc, 'raw')).toMatch(
			/; the largest difference is for arguing on a city sidewalk \(\+0\.4\)\.$/
		);
	});
});
