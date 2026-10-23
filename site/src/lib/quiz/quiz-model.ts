/**
 * The quiz (FR-60 to FR-63): the reader rates three situated behaviors on the GSN's six responses
 * (§4.3), and each answer is shown among the societies' estimates and, with a society chosen,
 * within that society's response counts (FR-61). An answer is one person's rating and an estimate
 * a society's average, so the text compares the answer with "the average answer of respondents in"
 * a society, never with the society or its people (FR-73, §6.5; decision 79).
 */

import { cents } from '../data/derive';
import { RESPONSES, count, percent, place, responseLabel, score } from '../data/format';
import {
	BEHAVIORS,
	BEHAVIOR_TEXT,
	SITUATIONS,
	SITUATION_TEXT,
	cellIndex,
	headline,
	phrase,
	type Cell
} from '../data/grid';
import { Status, type ResponseCounts, type SampleId, SAMPLE_LABEL } from '../data/model';
import type { Drill } from '../charts/drill-model';
import type { QuizItem } from './items';

/** A response on the GSN's 1–6 scale: 1 extremely inappropriate to 6 extremely appropriate. */
export type Response = 1 | 2 | 3 | 4 | 5 | 6;
export const RESPONSE_VALUES: readonly Response[] = [1, 2, 3, 4, 5, 6];

export interface QuizQuestion extends Cell {
	/** "eat/restaurant": the item's key in storage and tests. */
	key: string;
	headline: string;
	/** "How appropriate is it to eat in a restaurant?" (the atlas's wording of the GSN item). */
	question: string;
}

/** FR-60: the configured items as questions; throws unless they are three different cells. */
export function quizQuestions(items: readonly QuizItem[]): QuizQuestion[] {
	if (items.length !== 3) throw new Error(`The quiz needs three items, not ${items.length}`);
	const questions = items.map(({ behavior, situation }) => {
		if (!BEHAVIORS.includes(behavior) || !SITUATIONS.includes(situation)) {
			throw new Error(`Unknown quiz item ${behavior}/${situation}`);
		}
		const cell: Cell = { index: cellIndex(behavior, situation), behavior, situation };
		return {
			...cell,
			key: `${behavior}/${situation}`,
			headline: headline(cell),
			question: `How appropriate is it to ${BEHAVIOR_TEXT[behavior].item.replace(/ \(.*\)$/, '')} ${
				SITUATION_TEXT[situation].item
			}?`
		};
	});
	if (new Set(questions.map((q) => q.index)).size !== questions.length) {
		throw new Error('The quiz items must be three different cells');
	}
	return questions;
}

/** A response on the −2.5 to +2.5 scale (§4.3): response k sits at k − 3.5. */
export function scoreOf(response: Response): number {
	return response - 3.5;
}

/** "very appropriate". */
export function responseText(response: Response): string {
	return RESPONSES[response - 1];
}

export function isResponse(value: unknown): value is Response {
	return typeof value === 'number' && RESPONSE_VALUES.includes(value as Response);
}

/** Where an answer falls among the societies' estimates (FR-61). */
export interface Placement {
	/** Societies whose average answer is below the reader's answer. */
	above: number;
	below: number;
	same: number;
	/** Societies with an estimate. */
	of: number;
	tooFew: number;
	notAsked: number;
}

/** Compared in hundredths, the data's precision, as ranks are (decision 33). */
export function placement(drill: Drill, response: Response): Placement {
	const mine = cents(scoreOf(response));
	const p = { above: 0, below: 0, same: 0, of: drill.plotted.length };
	for (const point of drill.plotted) {
		const value = cents(point.estimate!.value);
		if (value < mine) p.above += 1;
		else if (value > mine) p.below += 1;
		else p.same += 1;
	}
	return { ...p, tooFew: drill.tooFew.length, notAsked: drill.notAsked.length };
}

/** " in the Paper's sample" for a sample other than All data. */
function inSample(sample: SampleId): string {
	return sample === 'all' ? '' : ` in the ${SAMPLE_LABEL[sample]}`;
}

/**
 * FR-61: "Your answer, very appropriate (+1.5), is above the average answer of respondents in 58
 * of 87 societies and below it in 29."
 */
export function placementText(p: Placement, response: Response, sample: SampleId): string {
	const start = `Your answer, ${responseText(response)} (${score(scoreOf(response))}), is`;
	const where = inSample(sample);
	let middle: string;
	if (p.of === 0) middle = ` not comparable: no society has enough responses${where}`;
	else if (p.above === p.of) {
		middle = ` above the average answer of respondents in all ${p.of} societies${where}`;
	} else if (p.below === p.of) {
		middle = ` below the average answer of respondents in all ${p.of} societies${where}`;
	} else {
		// The first part names the comparison in full; the others refer back to it.
		const parts = [
			p.above ? (['above', p.above] as const) : null,
			p.below ? (['below', p.below] as const) : null,
			p.same ? (['the same as', p.same] as const) : null
		].filter((part) => part !== null);
		const [[word, n], ...rest] = parts;
		const others = rest.map(
			([w, k]) => ` and ${w === 'the same as' ? 'the same' : `${w} it`} in ${k}`
		);
		middle = ` ${word} the average answer of respondents in ${n} of ${p.of} societies${where}${others.join('')}`;
	}
	const missing = p.tooFew + p.notAsked;
	const tail = missing
		? `; ${missing} ${missing === 1 ? 'society has' : 'societies have'} too few responses or ${
				missing === 1 ? 'was' : 'were'
			} not asked`
		: '';
	return `${start}${middle}${tail}.`;
}

/** Whole percents of a society's respondents choosing each response. */
export function shares(counts: ResponseCounts): number[] {
	return counts.counts.map((c) => (c / counts.n) * 100);
}

/** Where the chosen society stands (FR-61, FR-62): its counts, or why there are none. */
export type SocietyAnswer =
	| {
			kind: 'counts';
			counts: ResponseCounts;
			/** The society's shrunken estimate for the cell (decision 32). */
			average: number;
			small: boolean;
	  }
	| { kind: 'too-few' | 'not-asked' | 'not-in-sample' };

/**
 * FR-61: "23% of respondents in Chile chose very appropriate, as you did; their average answer is
 * +0.4, somewhat appropriate."
 */
export function societyText(
	answer: SocietyAnswer,
	code: string,
	name: string,
	cell: Cell,
	response: Response,
	sample: SampleId
): string {
	const who = `respondents in ${place(code, name)}`;
	const Who = who[0].toUpperCase() + who.slice(1);
	switch (answer.kind) {
		case 'not-in-sample':
			return `${Who} are not in this sample (${SAMPLE_LABEL[sample]}).`;
		case 'not-asked':
			return `${Who} were not asked about ${phrase(cell)}.`;
		case 'too-few':
			return `Fewer than 10 ${who} rated ${phrase(cell)}, so their answers are not shown.`;
		case 'counts': {
			const share = shares(answer.counts)[response - 1];
			const small = answer.small ? ` (a small sample of ${count(answer.counts.n)})` : '';
			const average = `their average answer is ${score(answer.average)}, ${responseLabel(answer.average)}`;
			return answer.counts.counts[response - 1] === 0
				? `None of the ${who}${small} chose ${responseText(response)}, your answer; ${average}.`
				: `${percent(share)} of ${who}${small} chose ${responseText(response)}, as you did; ${average}.`;
		}
	}
}

/** The chosen society's standing in the drill-down's terms, with its counts when it has them. */
export function societyAnswer(
	drill: Drill,
	code: string,
	counts: ResponseCounts | null
): SocietyAnswer {
	const point = drill.plotted.find((p) => p.code === code);
	if (point && counts) {
		return {
			kind: 'counts',
			counts,
			average: point.estimate!.value,
			small: point.status === Status.Small
		};
	}
	if (drill.notAsked.some((p) => p.code === code)) return { kind: 'not-asked' };
	if (drill.tooFew.some((p) => p.code === code)) return { kind: 'too-few' };
	return { kind: 'not-in-sample' };
}

/** NFR-11: the response bars in one sentence. */
export function distributionSummary(
	counts: ResponseCounts,
	code: string,
	name: string,
	cell: Cell
): string {
	const s = shares(counts);
	const appropriate = s[3] + s[4] + s[5];
	const top: number = s.indexOf(Math.max(...s));
	return (
		`Of ${count(counts.n)} respondents in ${place(code, name)} who rated ${phrase(cell)}, ` +
		`${percent(appropriate)} chose an appropriate answer; the most common was ` +
		`${RESPONSES[top]} (${percent(s[top])}).`
	);
}
