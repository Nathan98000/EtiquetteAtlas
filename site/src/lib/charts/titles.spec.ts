import { describe, expect, it } from 'vitest';
import { CELLS, cellIndex } from '../data/grid';
import {
	audienceTitle,
	audiencesTitle,
	compareTitle,
	fingerprintTitle,
	pairsTitle,
	placesTitle,
	rangeTitle,
	regionTitle,
	stripTitle
} from './titles';

describe('direction A: chart titles state what the chart shows', () => {
	it('counts the pairs that lean inappropriate', () => {
		expect(pairsTitle([-1, -0.2, 0.3])).toBe(
			'2 of the 3 pairs are judged inappropriate on average'
		);
		expect(pairsTitle([-1, -0.2])).toBe('All 2 pairs are judged inappropriate on average');
		expect(pairsTitle([0, 0.4])).toBe('No pair is judged inappropriate on average');
	});

	it('gives the societies’ range in the response labels', () => {
		expect(rangeTitle([-2.3, 1.2, 0])).toBe(
			"Societies' averages run from extremely inappropriate to very appropriate"
		);
		expect(rangeTitle([-1.6, -1.4])).toBe("Every society's average is very inappropriate");
		expect(rangeTitle([])).toBe('No society has enough responses to show');
	});

	it('names the regions with the highest and lowest averages', () => {
		expect(
			regionTitle([
				{ region: 'West', value: 0.5 },
				{ region: 'West', value: 0.1 },
				{ region: 'Africa', value: -1 },
				{ region: 'Asia', value: 0 }
			])
		).toBe('Highest averages in the West, lowest in Africa');
		expect(regionTitle([{ region: 'Asia', value: 0 }])).toBe('Each society where it is');
	});

	it('names where a behavior is most and least accepted', () => {
		const values = CELLS.filter((c) => c.behavior === 'eat').map((cell) => ({
			cell,
			value: cell.situation === 'restaurant' ? 2 : cell.situation === 'job_interview' ? -2 : 0
		}));
		expect(stripTitle('eat', values)).toBe(
			'Eating: most accepted in a restaurant, least in a job interview'
		);
	});

	it('counts a fingerprint’s clear differences', () => {
		expect(fingerprintTitle({ shown: 150, looser: 64, stricter: 35 })).toBe(
			'Clearly looser than the global average on 64 pairs, clearly stricter on 35'
		);
		expect(fingerprintTitle({ shown: 150, looser: 1, stricter: 0 })).toBe(
			'Clearly looser than the global average on 1 pair, clearly stricter on 0'
		);
		expect(fingerprintTitle({ shown: 150, looser: 0, stricter: 0 })).toBe(
			'Too close to call on every pair'
		);
		expect(fingerprintTitle({ shown: 0, looser: 0, stricter: 0 })).toBe(
			'No pair has enough responses to show'
		);
	});

	it('names the comparison’s largest gap', () => {
		expect(compareTitle(CELLS[cellIndex('eat', 'bus')])).toBe('The largest gap: eating on a bus');
		expect(compareTitle(undefined)).toBe('No pair both can show');
	});

	it('counts the behaviors that drop in front of management or professors', () => {
		expect(audiencesTitle(Array(15).fill(1))).toBe(
			'Every behavior drops in front of management or professors'
		);
		expect(audiencesTitle([1, 2, null, -0.5])).toBe(
			'2 of the 3 behaviors drop in front of management or professors'
		);
		expect(audiencesTitle([1, 2, null])).toBe(
			'All 2 behaviors drop in front of management or professors'
		);
	});

	it('gives a behavior’s answer alone and in front of management or professors', () => {
		expect(audienceTitle('listen', 1.6, -1.4)).toBe(
			'Music on headphones: very appropriate alone, very inappropriate in front of management or professors'
		);
		expect(audienceTitle('kiss', null, null)).toBe('Kiss on the mouth, by audience');
	});

	it('names the region with the most societies', () => {
		expect(placesTitle(['West', 'West', 'Asia'])).toBe('2 of the 3 societies are in the West');
	});
});
