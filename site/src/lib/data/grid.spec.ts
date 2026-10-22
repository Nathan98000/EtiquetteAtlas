import { describe, expect, it } from 'vitest';
import {
	BEHAVIOR_TEXT,
	BEHAVIORS,
	CELL_COUNT,
	CELLS,
	SITUATION_TEXT,
	SITUATIONS,
	behaviorFromSlug,
	cellIndex,
	cellParams,
	headline,
	phrase,
	situationFromSlug,
	slug
} from './grid';

describe('§4.2: the 15 × 10 grid', () => {
	it('has 150 cells, behavior-major in SRS order', () => {
		expect(BEHAVIORS).toHaveLength(15);
		expect(SITUATIONS).toHaveLength(10);
		expect(CELL_COUNT).toBe(150);
		expect(CELLS[0]).toEqual({ index: 0, behavior: 'argue', situation: 'funeral' });
		expect(CELLS[149]).toEqual({ index: 149, behavior: 'usemphone', situation: 'party' });
		expect(cellIndex('usemphone', 'funeral')).toBe(140);
		expect(cellIndex('kiss', 'job_interview')).toBe(34);
	});

	it('has text for every behavior and situation', () => {
		expect(Object.keys(BEHAVIOR_TEXT).sort()).toEqual([...BEHAVIORS].sort());
		expect(Object.keys(SITUATION_TEXT).sort()).toEqual([...SITUATIONS].sort());
	});

	it('writes headlines from the item wording', () => {
		expect(headline(CELLS[140])).toBe('Using a mobile phone at a funeral ceremony');
		expect(phrase(CELLS[34])).toBe('kissing on the mouth in a job interview');
	});
});

describe('§4.2, FR-80: URL slugs use the IDs with hyphens', () => {
	it('maps job_interview to job-interview and back', () => {
		expect(slug('job_interview')).toBe('job-interview');
		expect(cellParams(CELLS[34])).toEqual({ behavior: 'kiss', situation: 'job-interview' });
		expect(situationFromSlug('job-interview')).toBe('job_interview');
		expect(behaviorFromSlug('usemphone')).toBe('usemphone');
	});

	it('round-trips every cell and refuses unknown slugs', () => {
		for (const cell of CELLS) {
			const params = cellParams(cell);
			expect(behaviorFromSlug(params.behavior)).toBe(cell.behavior);
			expect(situationFromSlug(params.situation)).toBe(cell.situation);
		}
		expect(situationFromSlug('job_interview')).toBeUndefined();
		expect(behaviorFromSlug('dance')).toBeUndefined();
	});
});
