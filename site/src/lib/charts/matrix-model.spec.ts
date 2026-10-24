import { describe, expect, it } from 'vitest';
import { GlobalCells, SocietyCells, Status } from '../data/model';
import { cellsDoc, globalDoc } from '../data/test-fixtures';
import {
	cellLabel,
	centeringShift,
	dotSize,
	markOf,
	matrixCells,
	societyPhrase
} from './matrix-model';

const global = new GlobalCells(globalDoc(), 'all');
const cells = new SocietyCells(cellsDoc(), 'all');

describe('FR-11: disagreement as circle area', () => {
	it('grows the diameter with the square root of τ, so area tracks τ', () => {
		expect(dotSize(0)).toBe(0);
		expect(dotSize(0.25)).toBeCloseTo(0.5);
		expect(dotSize(1)).toBe(1);
		expect(dotSize(4)).toBe(1);
		expect(dotSize(0.64) ** 2 / dotSize(0.16) ** 2).toBeCloseTo(4);
	});
});

describe('FR-10 to FR-16: matrix cells', () => {
	it('carries the global values on the scale shown', () => {
		const model = matrixCells(global, 'raw');
		expect(model).toHaveLength(150);
		expect(model[0]).toMatchObject({
			headline: 'Arguing at a funeral ceremony',
			mean: -2,
			meanLo: -2.05,
			meanHi: -1.94,
			tau: 0.2,
			societies: 3,
			respondents: 150,
			society: undefined,
			mark: undefined
		});
		expect(model[0].style).toMatch(/^--fill-light:#/);
		expect(matrixCells(global, 'centered')[0].mean).toBe(-1.99);
	});

	it('FR-16: flags exactly one most universal and one most culture-dependent cell', () => {
		const model = matrixCells(global, 'raw');
		expect(model.filter((c) => c.universal).map((c) => c.index)).toEqual([0]);
		expect(model.filter((c) => c.dependent).map((c) => c.index)).toEqual([149]);
	});

	it('FR-15: marks the selected society as stricter, looser, close or missing', () => {
		const pick = (code: string, index: number) => ({ code, name: code, inSample: true, index });
		expect(matrixCells(global, 'raw', cells, pick('AAA', 0))[5].mark).toBe('stricter');
		expect(matrixCells(global, 'raw', cells, pick('CCC', 2))[5].mark).toBe('looser');
		expect(matrixCells(global, 'centered', cells, pick('CCC', 2))[5].mark).toBe('close');
		const ccc = matrixCells(global, 'raw', cells, pick('CCC', 2));
		expect(ccc[0].mark).toBe('missing');
		expect(ccc[2].society?.status).toBe(Status.NotAsked);
	});
});

describe('FR-15, FR-27: the society in words', () => {
	it('reads suppressed cells as too few responses or not asked', () => {
		expect(markOf(undefined)).toBeUndefined();
		expect(societyPhrase({ status: Status.TooFew, estimate: null, notable: null })).toBe(
			'too few responses'
		);
		expect(societyPhrase({ status: Status.NotAsked, estimate: null, notable: null })).toBe(
			'not asked'
		);
		expect(
			societyPhrase({
				status: Status.Small,
				estimate: { value: -1.2, lo: -1.6, hi: -0.8 },
				notable: -1
			})
		).toBe('−1.2, stricter than the global mean, small sample');
	});

	it('names the cell, its mean, disagreement and the society in one accessible label', () => {
		const society = { code: 'PHL', name: 'Philippines', inSample: true, index: 1 };
		const [cell] = matrixCells(global, 'raw', cells, society);
		expect(cellLabel(cell, society)).toBe(
			'Arguing at a funeral ceremony: −2.0, very inappropriate; disagreement 0.20; the most ' +
				'universal pair; respondents in the Philippines: −2.0, close to the global mean'
		);
	});
});

describe('D-3, decision 37: centering barely moves the global means', () => {
	it('gives the largest move between the raw and centered means', () => {
		// The fixture moves cell 0 alone, by 0.01.
		expect(centeringShift(global)).toBeCloseTo(0.01);
	});
});
