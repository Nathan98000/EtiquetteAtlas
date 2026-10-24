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
import { Status, type ResponseCounts, type SampleId, SAMPLE_PHRASE } from '../data/model';
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

/** " in the paper's sample" for a sample other than all respondents. */
function inSample(sample: SampleId): string {
	return sample === 'all' ? '' : ` in ${SAMPLE_PHRASE[sample]}`;
}

/**
 * FR-61, D-9: "You said very appropriate. In 83 of 87 societies, respondents' average answer was
 * more approving than that; in 4 it was less. (3 societies had too few responses or were not
 * asked.)" It reads without turning "below" round, and still compares the answer with average
 * answers, never with a society or its people (decision 79).
 */
export function placementText(p: Placement, response: Response, sample: SampleId): string {
	const start = `You said ${responseText(response)}.`;
	const where = inSample(sample);
	let middle: string;
	if (p.of === 0) middle = ` No society${where} has enough responses to compare with.`;
	else {
		// The first part names the comparison in full; the others refer back to it.
		const parts = (
			[
				['more approving than that', 'more', p.below],
				['less approving than that', 'less', p.above],
				['the same as yours', 'the same', p.same]
			] as const
		).filter(([, , n]) => n > 0);
		const [[full, , n], ...rest] = parts;
		const lead = n === p.of ? `In all ${p.of} societies` : `In ${n} of ${p.of} societies`;
		const others = rest.map(([, short, k]) => `; in ${k} it was ${short}`).join('');
		middle = ` ${lead}${where}, respondents' average answer was ${full}${others}.`;
	}
	const missing = p.tooFew + p.notAsked;
	const tail = missing
		? ` (${missing} ${missing === 1 ? 'society' : 'societies'} had too few responses or ${
				missing === 1 ? 'was' : 'were'
			} not asked.)`
		: '';
	return `${start}${middle}${tail}`;
}

/** D-10: which way most societies' average answers lean from the reader's answer. */
export type Lean = 'more' | 'less' | 'middle';

export function lean(p: Placement): Lean | null {
	if (p.of === 0) return null;
	if (p.below > p.of / 2) return 'more';
	if (p.above > p.of / 2) return 'less';
	return 'middle';
}

/**
 * D-10: the summary's one takeaway: "On 2 of 3 questions, most societies' average answers were
 * more approving than yours." Answers are compared with average answers only (decision 79).
 */
export function takeaway(placements: readonly (Placement | null)[]): string {
	const leans = placements.flatMap((p) => {
		const l = p ? lean(p) : null;
		return l ? [l] : [];
	});
	const k = leans.length;
	if (!k) return 'None of your answers has societies to compare with.';
	const all =
		k === 1 ? 'On the one question' : k === 2 ? 'On both questions' : `On all ${k} questions`;
	const on = (n: number) => (n === k ? all : `On ${n} of ${k} questions`);
	const more = leans.filter((l) => l === 'more').length;
	const less = leans.filter((l) => l === 'less').length;
	const most = "most societies' average answers were";
	if (more && less) return `${on(more)}, ${most} more approving than yours; on ${less}, less.`;
	if (more) return `${on(more)}, ${most} more approving than yours.`;
	if (less) return `${on(less)}, ${most} less approving than yours.`;
	return `${all}, your answer fell among the societies' average answers.`;
}

/** D-10: one answer in a line: "You said very appropriate; 83 of 87 … more approving." */
export function summaryLine(p: Placement, response: Response): string {
	const said = `You said ${responseText(response)}`;
	if (p.of === 0) return `${said}; no society has enough responses to compare with.`;
	if (p.same === p.of) return `${said}, the same as every society's average answer.`;
	const [n, way] = p.below >= p.above ? [p.below, 'more'] : [p.above, 'less'];
	const which = n === p.of ? `all ${p.of}` : `${n} of ${p.of}`;
	return `${said}; ${which} societies' average answers were ${way} approving.`;
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
			return `${Who} are not in ${SAMPLE_PHRASE[sample]}.`;
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

/** D-10: the chosen society on one answer: "8% of respondents in Japan chose very appropriate too." */
export function societyShareText(
	answer: SocietyAnswer,
	code: string,
	name: string,
	cell: Cell,
	response: Response,
	sample: SampleId
): string {
	if (answer.kind !== 'counts') return societyText(answer, code, name, cell, response, sample);
	const who = `respondents in ${place(code, name)}`;
	const small = answer.small ? ` (a small sample of ${count(answer.counts.n)})` : '';
	return answer.counts.counts[response - 1] === 0
		? `None of the ${who}${small} chose ${responseText(response)}.`
		: `${percent(shares(answer.counts)[response - 1])} of ${who}${small} chose ${responseText(response)} too.`;
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
