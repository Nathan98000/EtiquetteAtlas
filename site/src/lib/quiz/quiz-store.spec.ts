import { describe, expect, it } from 'vitest';
import { STORE_KEY, readAnswers, writeAnswers } from './quiz-store';

const KEYS = ['eat/restaurant', 'sing/funeral', 'listen/library'];

function memory(): Storage {
	const map = new Map<string, string>();
	return {
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k),
		clear: () => map.clear(),
		key: () => null,
		get length() {
			return map.size;
		}
	};
}

const blocked = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('blocked');
	},
	removeItem: () => {
		throw new Error('blocked');
	}
};

describe('FR-63, NFR-30: answers in one sessionStorage key', () => {
	it('round-trips the answers and removes the key when they are cleared', () => {
		const store = memory();
		writeAnswers(store, { 'eat/restaurant': 6, 'sing/funeral': 2 });
		expect(store.getItem(STORE_KEY)).toBe('{"eat/restaurant":6,"sing/funeral":2}');
		expect(readAnswers(store, KEYS)).toEqual({ 'eat/restaurant': 6, 'sing/funeral': 2 });
		writeAnswers(store, {});
		expect(store.getItem(STORE_KEY)).toBeNull();
		expect(store.length).toBe(0);
	});

	it('ignores unknown items, values off the scale and anything unreadable', () => {
		const store = memory();
		store.setItem(STORE_KEY, '{"eat/restaurant":7,"sing/funeral":3,"kiss/bus":2,"x":"4"}');
		expect(readAnswers(store, KEYS)).toEqual({ 'sing/funeral': 3 });
		store.setItem(STORE_KEY, 'not json');
		expect(readAnswers(store, KEYS)).toEqual({});
		store.setItem(STORE_KEY, '[1,2,3]');
		expect(readAnswers(store, KEYS)).toEqual({});
	});

	it('keeps working when storage is missing or blocked', () => {
		expect(readAnswers(null, KEYS)).toEqual({});
		expect(readAnswers(blocked, KEYS)).toEqual({});
		expect(() => writeAnswers(blocked, { 'eat/restaurant': 1 })).not.toThrow();
		expect(() => writeAnswers(null, { 'eat/restaurant': 1 })).not.toThrow();
	});
});
