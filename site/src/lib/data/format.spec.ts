import { describe, expect, it } from 'vitest';
import {
	count,
	interval,
	ordinal,
	percent,
	place,
	respondentsIn,
	responseLabel,
	score,
	signed,
	spread
} from './format';

describe('§6.5: numbers', () => {
	it.each([
		[-1.234, '−1.2'],
		[1.25, '+1.3'],
		[0.04, '0.0'],
		[-0.04, '0.0'],
		[0, '0.0'],
		[2.5, '+2.5']
	])('score(%d) is %s, with one decimal and a true minus sign', (x, text) => {
		expect(score(x)).toBe(text);
	});

	it('formats intervals, spreads, shares, counts and offsets', () => {
		expect(interval(-1.32, -1.08)).toBe('−1.3 to −1.1');
		expect(spread(0.4)).toBe('0.40');
		expect(percent(12.4)).toBe('12%');
		expect(count(25422)).toBe('25,422');
		expect(signed(-0.256, 2)).toBe('−0.26');
	});

	it.each([
		[1, '1st'],
		[2, '2nd'],
		[3, '3rd'],
		[4, '4th'],
		[11, '11th'],
		[12, '12th'],
		[13, '13th'],
		[21, '21st'],
		[22, '22nd'],
		[111, '111th']
	])('ordinal(%i) is %s', (n, text) => {
		expect(ordinal(n)).toBe(text);
	});
});

describe('§4.3, §6.5: GSN response labels', () => {
	it.each([
		[-2.3, 'extremely inappropriate'],
		[-2, 'very inappropriate'],
		[-1.2, 'very inappropriate'],
		[-1, 'somewhat inappropriate'],
		[-0.3, 'somewhat inappropriate'],
		[0.3, 'somewhat appropriate'],
		[1.5, 'very appropriate'],
		[2.1, 'extremely appropriate']
	])('%d reads as %s', (x, label) => {
		expect(responseLabel(x)).toBe(label);
	});

	it('0 lies between the two middle answers', () => {
		expect(responseLabel(0)).toMatch(/^between somewhat inappropriate and somewhat appropriate$/);
	});
});

describe('FR-73, §6.5: respondents in a place, not nationals', () => {
	it('names respondents in a society, with "the" where English needs it', () => {
		expect(respondentsIn('CHL', 'Chile')).toBe('respondents in Chile');
		expect(respondentsIn('PHL', 'Philippines')).toBe('respondents in the Philippines');
		expect(place('TTO', 'Caribbean')).toBe('the Caribbean');
	});
});
