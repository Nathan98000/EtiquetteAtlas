import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CELLS, BEHAVIORS } from '../data/grid';
import { ChangeCells, ContextCells, GlobalCells, SocietyCells } from '../data/model';
import { cellsDoc, changeDoc, contextsDoc, globalDoc } from '../data/test-fixtures';
import { PAPER_SD, STEP_TITLE, storyNumbers, storySteps } from './story-model';

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
	});
});
