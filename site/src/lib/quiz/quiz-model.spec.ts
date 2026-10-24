import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { drill } from '../charts/drill-model';
import { Distributions, GlobalCells, SAMPLES, Societies, SocietyCells } from '../data/model';
import { cellsDoc, distributionsDoc, globalDoc, societiesDoc } from '../data/test-fixtures';
import { QUIZ_ITEMS } from './items';
import {
	distributionSummary,
	placement,
	placementText,
	quizQuestions,
	responseText,
	scoreOf,
	shares,
	societyAnswer,
	societyText
} from './quiz-model';

const societies = new Societies(societiesDoc());
const cells = new SocietyCells(cellsDoc(), 'all');
const global = new GlobalCells(globalDoc(), 'all');
const counts = new Distributions(distributionsDoc(), 'all');
// Cell 5: shrunken estimates AAA −2.3, BBB −1.9, CCC −1.5.
const cell5 = drill(cells, societies, global, 5, 'shrunk', 'raw');

describe('FR-60: the quiz items come from one configuration file', () => {
	it('asks three different cells, in the atlas’s words for the GSN items', () => {
		const questions = quizQuestions(QUIZ_ITEMS);
		expect(questions.map((q) => q.question)).toEqual([
			'How appropriate is it to eat in a restaurant?',
			'How appropriate is it to sing at a funeral ceremony?',
			'How appropriate is it to listen to music on headphones in the library?'
		]);
		expect(questions.map((q) => q.key)).toEqual([
			'eat/restaurant',
			'sing/funeral',
			'listen/library'
		]);
		expect(questions[1].index).toBe(50);
	});

	it('refuses two items in one cell, unknown IDs or another number of items', () => {
		const eat = { behavior: 'eat', situation: 'restaurant' } as const;
		expect(() => quizQuestions([eat, eat, QUIZ_ITEMS[1]])).toThrow(/different cells/);
		expect(() => quizQuestions(QUIZ_ITEMS.slice(0, 2))).toThrow(/three items/);
		expect(() =>
			quizQuestions([...QUIZ_ITEMS.slice(0, 2), { behavior: 'dance', situation: 'bus' } as never])
		).toThrow(/Unknown quiz item/);
	});

	it('§4.3: puts response k at k − 3.5 with the GSN label', () => {
		expect(scoreOf(1)).toBe(-2.5);
		expect(scoreOf(4)).toBe(0.5);
		expect(responseText(5)).toBe('very appropriate');
	});
});

describe('FR-61: where an answer falls among the societies’ estimates', () => {
	it('counts the societies whose average answer is below, above or the same', () => {
		expect(placement(cell5, 2)).toEqual({
			above: 2,
			below: 0,
			same: 1,
			of: 3,
			tooFew: 0,
			notAsked: 0
		});
		expect(placement(cell5, 1)).toMatchObject({ above: 0, below: 3 });
	});

	it('compares the answer with average answers, never with a society itself (decision 79)', () => {
		expect(placementText(placement(cell5, 2), 2, 'all')).toBe(
			"You said very inappropriate. In 2 of 3 societies, respondents' average answer was less " +
				'approving than that; in 1 it was the same.'
		);
		const mixed = { above: 4, below: 83, same: 0, of: 87, tooFew: 0, notAsked: 0 };
		expect(placementText(mixed, 5, 'all')).toBe(
			"You said very appropriate. In 83 of 87 societies, respondents' average answer was more " +
				'approving than that; in 4 it was less.'
		);
		const below = { above: 0, below: 2, same: 1, of: 3, tooFew: 0, notAsked: 0 };
		expect(placementText(below, 3, 'all')).toBe(
			"You said somewhat inappropriate. In 2 of 3 societies, respondents' average answer was " +
				'more approving than that; in 1 it was the same.'
		);
		expect(placementText(placement(cell5, 6), 6, 'paper')).toBe(
			"You said extremely appropriate. In all 3 societies in the Paper's sample, respondents' " +
				'average answer was less approving than that.'
		);
	});

	it('FR-27: leaves out societies with too few responses or not asked, and says so', () => {
		const cell0 = drill(cells, societies, global, 0, 'shrunk', 'raw');
		const p = placement(cell0, 1);
		expect(p).toMatchObject({ of: 2, tooFew: 1, notAsked: 0 });
		expect(placementText(p, 1, 'all')).toBe(
			"You said extremely inappropriate. In all 2 societies, respondents' average answer was " +
				'more approving than that. (1 society had too few responses or was not asked.)'
		);
	});
});

describe('FR-61, FR-62: within a chosen society’s answers', () => {
	it('gives the share choosing the same answer and the society’s average', () => {
		const answer = societyAnswer(cell5, 'BBB', counts.counts(1, 5));
		expect(answer).toMatchObject({ kind: 'counts', average: -1.9, small: false });
		expect(shares(counts.counts(1, 5)!)).toEqual([10, 20, 20, 20, 20, 10]);
		expect(societyText(answer, 'BBB', 'Philippines', cell5Cell(), 2, 'all')).toBe(
			'20% of respondents in Philippines chose very inappropriate, as you did; their ' +
				'average answer is −1.9, very inappropriate.'
		);
	});

	it('DR-9: names a small sample, too few responses, not asked and outside the sample', () => {
		const cell1 = drill(cells, societies, global, 1, 'shrunk', 'raw');
		const small = societyAnswer(cell1, 'BBB', counts.counts(1, 1));
		expect(societyText(small, 'BBB', 'Philippines', cell1Cell(), 3, 'all')).toMatch(
			/^25% of respondents in Philippines \(a small sample of 12\) chose/
		);
		const cell0 = drill(cells, societies, global, 0, 'shrunk', 'raw');
		expect(societyAnswer(cell0, 'CCC', null)).toEqual({ kind: 'too-few' });
		const cell2 = drill(cells, societies, global, 2, 'shrunk', 'raw');
		expect(societyAnswer(cell2, 'CCC', null)).toEqual({ kind: 'not-asked' });
		expect(societyText({ kind: 'not-asked' }, 'CCC', 'Gamma', cell2Cell(), 3, 'all')).toBe(
			'Respondents in Gamma were not asked about arguing in the library.'
		);
		expect(societyAnswer(cell5, 'ZZZ', null)).toEqual({ kind: 'not-in-sample' });
	});

	it('says so when no respondent gave the reader’s answer', () => {
		const answer = societyAnswer(cell5, 'CCC', counts.counts(2, 5));
		const none = {
			...answer,
			counts: { n: 50, sd: 1, counts: [0, 0, 5, 10, 15, 20] as const }
		} as typeof answer;
		expect(societyText(none, 'CCC', 'Gamma', cell5Cell(), 1, 'all')).toBe(
			'None of the respondents in Gamma chose extremely inappropriate, your answer; their ' +
				'average answer is −1.5, very inappropriate.'
		);
	});

	it('NFR-11: sums up a society’s answers in one sentence', () => {
		expect(distributionSummary(counts.counts(2, 5)!, 'CCC', 'Gamma', cell5Cell())).toBe(
			'Of 50 respondents in Gamma who rated arguing in a restaurant, 90% chose an appropriate ' +
				'answer; the most common was extremely appropriate (40%).'
		);
	});
});

describe('§4.6: the configured items in the committed files', () => {
	const derived = (name: string): unknown =>
		JSON.parse(readFileSync(new URL(`../../../../data/derived/${name}`, import.meta.url), 'utf8'));
	const all = new Societies(derived('societies.json'));

	it.each(SAMPLES)('every item has estimates and counts for most societies in %s', (sample) => {
		const c = new SocietyCells(derived(`cells-${sample}.json`), sample);
		const g = new GlobalCells(derived(`global-${sample}.json`), sample);
		const d = new Distributions(derived(`distributions-${sample}.json`), sample);
		for (const q of quizQuestions(QUIZ_ITEMS)) {
			const column = drill(c, all, g, q.index, 'shrunk', 'raw');
			expect(column.plotted.length).toBeGreaterThan(c.codes.length * 0.9);
			const withCounts = c.codes.filter((_, s) => d.counts(s, q.index) !== null);
			expect(withCounts.length).toBe(column.plotted.length);
		}
	});

	it('eating in a restaurant: the top answer is above every society’s average (All data)', () => {
		const c = new SocietyCells(derived('cells-all.json'), 'all');
		const g = new GlobalCells(derived('global-all.json'), 'all');
		const q = quizQuestions(QUIZ_ITEMS)[0];
		expect(placement(drill(c, all, g, q.index, 'shrunk', 'raw'), 6)).toMatchObject({
			above: 87,
			of: 87
		});
	});
});

function cell1Cell() {
	return { index: 1, behavior: 'argue', situation: 'sidewalk' } as const;
}
function cell2Cell() {
	return { index: 2, behavior: 'argue', situation: 'library' } as const;
}
function cell5Cell() {
	return { index: 5, behavior: 'argue', situation: 'restaurant' } as const;
}
