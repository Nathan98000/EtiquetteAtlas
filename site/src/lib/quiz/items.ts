import type { Behavior, Situation } from '../data/grid';

export interface QuizItem {
	behavior: Behavior;
	situation: Situation;
}

/**
 * FR-60: the quiz's three items, asked in this order (decision 78): one most societies agree on,
 * one that divides them most, and one with the largest difference since the early 2000s. To
 * change them, edit this list with behavior and situation IDs from SRS §4.2 (`src/lib/data/grid.ts`).
 * The tests check that there are three different cells; the README's "Changing the quiz items"
 * says more.
 */
export const QUIZ_ITEMS: readonly QuizItem[] = [
	{ behavior: 'eat', situation: 'restaurant' },
	{ behavior: 'sing', situation: 'funeral' },
	{ behavior: 'listen', situation: 'library' }
];
