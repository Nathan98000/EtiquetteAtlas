/**
 * FR-63, C-12, NFR-30: the quiz's answers live in page memory and in one sessionStorage key, so a
 * reload keeps them and a new tab starts empty. Nothing else reads them, and they never go into a
 * URL, a request, a log or an error message (decision 80). Storage can be missing or blocked, so
 * every access is guarded and the quiz still works for the page's life without it.
 */

import { isResponse, type Response } from './quiz-model';

export const STORE_KEY = 'etiquette-atlas:quiz';

/** Answers by item key ("eat/restaurant"). */
export type Answers = Readonly<Record<string, Response>>;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The tab's sessionStorage, or null where it is missing or blocked. */
export function sessionStore(): Store | null {
	try {
		return typeof window === 'undefined' ? null : window.sessionStorage;
	} catch {
		return null;
	}
}

/** The stored answers to these items; anything else in the key is ignored. */
export function readAnswers(store: Store | null, keys: readonly string[]): Answers {
	try {
		const raw = store?.getItem(STORE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const entries = Object.entries(parsed).filter(
			(entry): entry is [string, Response] => keys.includes(entry[0]) && isResponse(entry[1])
		);
		return Object.fromEntries(entries);
	} catch {
		return {};
	}
}

export function writeAnswers(store: Store | null, answers: Answers): void {
	try {
		if (Object.keys(answers).length) store?.setItem(STORE_KEY, JSON.stringify(answers));
		else store?.removeItem(STORE_KEY);
	} catch {
		// Storage is full or blocked: the answers last for this page only.
	}
}
