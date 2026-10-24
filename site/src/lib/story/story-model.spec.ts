import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CELLS, BEHAVIORS } from '../data/grid';
import { ChangeCells, ContextCells, GlobalCells, SocietyCells } from '../data/model';
import { cellsDoc, changeDoc, contextsDoc, globalDoc } from '../data/test-fixtures';
import {
	PAPER_SD,
	STEP_TITLE,
	spreadSummary,
	storyNumbers,
	storySpread,
	storySteps
} from './story-model';

describe('FR-64: the story’s steps and their numbers', () => {
	const global = new GlobalCells(globalDoc(), 'all');
	const cells = new SocietyCells(cellsDoc(), 'all');
	const contexts = new ContextCells(contextsDoc(), 'all');
	const change = new ChangeCells(changeDoc(), 'all');

	it('picks the cells with the least and most disagreement (FR-16)', () => {
		const n = storyNumbers(global, cells, contexts, change);
		// τ ties at 0.20 (cells 0, 50, 100) and at 0.69 (49, 99, 149): paper order breaks them.
		// Cell 0: CCC has too few responses, so the range covers AAA and BBB only.
		expect(n.universal).toEqual({
			cell: 0,
			tau: 0.2,
			mean: -2,
			share: 0,
			societies: 3,
			range: [-2.4, -2]
		});
		expect(n.dependent.cell).toBe(149);
	});

	it('picks the largest audience effect and the largest difference between the surveys', () => {
		const n = storyNumbers(global, cells, contexts, change);
		expect(n.audience).toEqual({ behavior: 14, alone: 1, management: -0.5, effect: 1.5 });
		expect(n.change).toEqual({ cell: 0, older: -2, newer: -1.7, diff: 0.3, societies: 2 });
	});

	it('R-6: has no change step without the change module', () => {
		expect(storyNumbers(global, cells, contexts, null).change).toBeNull();
		expect(storySteps(true)).toHaveLength(6);
		expect(storySteps(false)).toEqual(['finding', 'universal', 'dependent', 'audience', 'explore']);
		expect(Object.keys(STEP_TITLE)).toHaveLength(6);
	});

	it('decision 3: the 150 pairs’ averages and each society’s average over its pairs', () => {
		const s = storySpread(global, cells);
		expect(s.pairs).toHaveLength(150);
		expect(s.pairs[0]).toEqual({ cell: 0, value: global.mean(0, 'raw') });
		const grand = s.pairs.reduce((sum, p) => sum + p.value, 0) / 150;
		// Offsets −0.3, 0 and 0.25 around the mean of the global averages.
		expect(s.societies.map((p) => p.code)).toEqual(['AAA', 'BBB', 'CCC']);
		expect(s.societies[0].value).toBeCloseTo(grand - 0.3, 2);
		expect(s.societies[2].value).toBeCloseTo(grand + 0.25, 2);
		expect(s.without).toEqual([]);
	});

	it('§4.8: quotes the paper’s standard deviations as the SRS states them', () => {
		expect(PAPER_SD).toEqual({ situations: 0.31, societies: 0.19, residual: 1.11 });
	});
});

describe('§4.6: the story from the committed All data files', () => {
	const derived = (name: string): unknown =>
		JSON.parse(readFileSync(new URL(`../../../../data/derived/${name}`, import.meta.url), 'utf8'));

	it('opens on the cells, behavior and pair the M6 brief names', () => {
		const n = storyNumbers(
			new GlobalCells(derived('global-all.json'), 'all'),
			new SocietyCells(derived('cells-all.json'), 'all'),
			new ContextCells(derived('contexts-all.json'), 'all'),
			new ChangeCells(derived('change-all.json'), 'all')
		);
		expect(CELLS[n.universal.cell]).toMatchObject({
			behavior: 'shout',
			situation: 'job_interview'
		});
		expect(n.universal.tau).toBe(0.16);
		expect(CELLS[n.dependent.cell]).toMatchObject({ behavior: 'sing', situation: 'funeral' });
		expect(n.dependent.tau).toBe(0.89);
		expect(n.dependent.range).toEqual([-2.31, 1.19]);
		expect(BEHAVIORS[n.audience.behavior]).toBe('listen');
		expect(n.audience.effect).toBe(2.97);
		expect(CELLS[n.change!.cell]).toMatchObject({ behavior: 'listen', situation: 'library' });
		expect(n.change).toMatchObject({ older: 0.03, newer: 1.36, diff: 1.33, societies: 26 });
		// Decision 3: the pairs spread over most of the scale, the societies' averages much less;
		// Mongolia and Namibia have no pair with 10 or more respondents.
		expect(n.spread).toEqual({
			pairs: [-1.99, 2.06],
			societies: [-1.03, 0.44],
			shown: 88,
			without: ['MNG', 'NAM']
		});
		expect(spreadSummary(n.spread, ['Mongolia', 'Namibia'])).toBe(
			"The 150 pairs' averages run from −2.0 to +2.1; the 88 societies' averages over all the " +
				'pairs, from −1.0 to +0.4. Mongolia and Namibia are left out: none of their pairs had 10 ' +
				'or more respondents.'
		);
	});
});
