import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ChangeCells, Societies } from '../data/model';
import { changeDoc } from '../data/test-fixtures';
import {
	arrowsTitle,
	behaviorStripTitle,
	societyStripTitle,
	ARROWS_NOTE,
	CLEARLY,
	behaviorStrip,
	behaviorStripSummary,
	changeChartSummary,
	changeCounts,
	changeOrder,
	changeSummary,
	changeTable,
	direction,
	directionText,
	globalChange,
	rowText,
	societiesSummary,
	societyChange,
	societyStrip,
	societyArrows,
	valuesText,
	type ChangeScope
} from './change-model';

const file = new ChangeCells(changeDoc(), 'all');
const gbr = societyChange(file, 0);
const jpn = societyChange(file, 1);
const japan: ChangeScope = { kind: 'society', code: 'JPN', name: 'Japan' };
const names: Record<string, string> = { GBR: 'United Kingdom', JPN: 'Japan' };

describe('FR-51, decision 68: beyond the interval', () => {
	it('counts a difference only when its 95% interval excludes 0', () => {
		expect(direction({ value: 0.2, lo: 0.01, hi: 0.4 })).toBe(1);
		expect(direction({ value: -0.2, lo: -0.4, hi: -0.01 })).toBe(-1);
		expect(direction({ value: 0.1, lo: 0, hi: 0.2 })).toBe(0);
		expect(direction({ value: -0.1, lo: -0.2, hi: 0 })).toBe(0);
	});

	it('counts the pairs judged more and less appropriate in 2023–2024', () => {
		// GBR pair 2's interval ends at exactly 0.00, so 40 are within.
		expect(changeCounts(gbr.rows)).toEqual({ higher: 40, lower: 40, within: 40, shown: 120 });
		expect(changeCounts(jpn.rows)).toEqual({ higher: 118, lower: 1, within: 0, shown: 119 });
		expect(changeCounts(globalChange(file).rows)).toEqual({
			higher: 60,
			lower: 59,
			within: 1,
			shown: 120
		});
	});
});

describe('FR-50: one society’s pairs', () => {
	it('gives both surveys’ means, the difference and the respondents behind them', () => {
		const row = gbr.rows[12];
		expect(row).toMatchObject({
			index: 12,
			behavior: 'laugh',
			situation: 'library',
			headline: 'Laughing out loud in the library',
			older: -1.76,
			newer: -1.26,
			direction: 1,
			n: { older: 150, newer: 50 },
			societies: null,
			small: { older: false, newer: false }
		});
	});

	it('DR-9: flags a small sample and sets a missing pair apart', () => {
		expect(jpn.rows.find((r) => r.index === 5)?.small).toEqual({ older: false, newer: true });
		expect(jpn.missing).toEqual([
			{
				index: 19,
				behavior: 'laugh',
				situation: 'party',
				headline: 'Laughing out loud at a party',
				reason: 'not in both surveys’ data'
			}
		]);
		expect(gbr.missing).toEqual([]);
	});

	it('words a row for screen readers and the details', () => {
		expect(rowText(jpn.rows.find((r) => r.index === 5)!)).toBe(
			'2000–2003 −1.9, 2023–2024 −1.7, difference +0.2 (95% interval +0.1 to +0.3), clearly ' +
				'higher in 2023–2024; small sample in 2023–2024'
		);
		expect(rowText(gbr.rows[2])).toMatch(/too close to call$/);
	});

	it('D-4: says how sure in words, with what "clearly" means', () => {
		expect([directionText(1), directionText(-1), directionText(0)]).toEqual([
			'clearly higher in 2023–2024',
			'clearly lower in 2023–2024',
			'too close to call'
		]);
		expect(valuesText(jpn.rows.find((r) => r.index === 5)!)).toBe(
			'clearly higher · 2000–2003 −1.9 · 2023–2024 −1.7 · small sample in 2023–2024'
		);
		expect(ARROWS_NOTE).toContain(CLEARLY);
		expect(CLEARLY).toMatch(/margin of error \(a 95% interval\)/);
	});
});

describe('FR-53: the societies in both surveys together', () => {
	it('averages each pair over the societies that have it', () => {
		const view = globalChange(file);
		expect(view.rows).toHaveLength(120);
		expect(view.rows[19]).toMatchObject({ societies: 1, n: null, older: -1.62 });
		expect(view.missing).toEqual([]);
	});
});

describe('decision 67: orders', () => {
	it('puts the largest difference first, ties in paper order', () => {
		const order = changeOrder(jpn.rows, 'difference');
		expect(order[0].index).toBe(0);
		expect(order.slice(1, 4).map((r) => r.index)).toEqual([1, 2, 3]);
	});

	it('keeps paper order, or sorts by behavior and situation name', () => {
		expect(changeOrder(gbr.rows, 'paper').map((r) => r.index)).toEqual(
			gbr.rows.map((r) => r.index)
		);
		const byName = changeOrder(gbr.rows, 'name');
		// "Argue Bus" comes first, "Talk Workplace" last of the 12 behaviors' labels.
		expect(byName[0].headline).toBe('Arguing on a bus');
		expect(byName.at(-1)?.headline).toBe('Talking at the workplace');
	});
});

describe('FR-51, FR-52, FR-73: summaries', () => {
	it('counts one society’s pairs as differences between surveys', () => {
		expect(changeSummary(japan, jpn, 2)).toBe(
			'Of the 119 pairs of a behavior and a situation that both surveys asked, respondents in ' +
				'Japan in 2023–2024 judged 118 clearly more appropriate than respondents there in ' +
				'2000–2003 and 1 clearly less; 0 were too close to call.'
		);
	});

	it('names the societies in both surveys, never all societies', () => {
		const text = changeSummary({ kind: 'global' }, globalChange(file), 2);
		expect(text).toBe(
			'Averaged over the 2 societies in both surveys, 60 of the 120 pairs of a behavior and a ' +
				'situation were judged clearly more appropriate in 2023–2024 than in 2000–2003 and 59 ' +
				'clearly less; 1 was too close to call.'
		);
		expect(text).not.toMatch(/all societies|became|because|changed/i);
	});

	it('NFR-11: says what the arrows show and names the largest difference', () => {
		expect(changeChartSummary(japan, jpn, 2)).toBe(
			'Each arrow runs from the 2000–2003 average to the 2023–2024 average for respondents in ' +
				'Japan; the largest difference is for arguing at a funeral ceremony, from −2.0 to −3.5 ' +
				'(−1.5).'
		);
	});
});

describe('direction A: the charts’ titles count what is clearly higher or lower', () => {
	it('counts the pairs, societies and behaviors', () => {
		expect(arrowsTitle({ higher: 47, lower: 38, within: 35, shown: 120 })).toBe(
			'47 of the 120 pairs are clearly higher in 2023–2024, 38 clearly lower'
		);
		expect(arrowsTitle({ higher: 0, lower: 0, within: 3, shown: 3 })).toBe(
			'Too close to call on every pair'
		);
		expect(arrowsTitle({ higher: 0, lower: 0, within: 0, shown: 0 })).toBe(
			'No pair both surveys can show'
		);
		const strip = [
			{ direction: 1 },
			{ direction: 1 },
			{ direction: 0 },
			{ direction: -1 }
		] as const;
		expect(societyStripTitle(strip)).toBe(
			'Clearly higher in 2023–2024 on average for respondents in 2 of the 4 societies'
		);
		expect(behaviorStripTitle(strip)).toBe(
			'2 of the 4 behaviors are clearly higher in 2023–2024 on average'
		);
	});
});

describe('NFR-11: the strips and table', () => {
	it('orders societies by their mean difference and counts them (FR-51)', () => {
		const strip = societyStrip(file, (code) => names[code]);
		expect(strip.map((r) => r.label)).toEqual(['Japan', 'United Kingdom']);
		expect(strip[0]).toMatchObject({ direction: 1, note: '119 pairs' });
		expect(strip[1]).toMatchObject({ direction: 0, note: '' });
		expect(societiesSummary(strip)).toBe(
			'On average over their pairs, respondents in 1 of the 2 societies judged the pairs clearly ' +
				'more appropriate in 2023–2024 and in 0 clearly less; 1 was too close to call.'
		);
		expect(societiesSummary([])).toBe('No society is in both surveys in this sample.');
	});

	it('orders behaviors by their mean difference, with societies above 0', () => {
		const strip = behaviorStrip(file);
		expect(strip[0]).toMatchObject({ key: 'eat', note: 'higher in 2 of 2 societies' });
		expect(strip.at(-1)?.key).toBe('argue');
		expect(behaviorStripSummary(strip, 2)).toBe(
			'Averaged over the 2 societies and the 10 situations, differences run from −0.5 for ' +
				'arguing to +0.6 for eating.'
		);
	});

	it('lists each row’s values, with ratings, respondents and small samples', () => {
		const [row] = changeTable(jpn.rows.filter((r) => r.index === 5));
		expect(row).toEqual({
			key: 5,
			behavior: 'Argue',
			situation: 'Restaurant',
			older: '−1.9',
			newer: '−1.7',
			diff: '+0.2',
			interval: '+0.1 to +0.3',
			direction: 'Clearly higher',
			n: '150 ratings; 12 respondents (small sample in 2023–2024)'
		});
		expect(changeTable(globalChange(file).rows)[19].n).toBe('1 societies');
	});
});

describe('FR-64: one pair across the societies, for the story', () => {
	it('gives a row per society with the pair, largest difference first', () => {
		const rows = societyArrows(file, 0, (code) => names[code]);
		// Pair 0: GBR +0.5, JPN −1.5.
		expect(rows.map((r) => [r.index, r.headline, r.gap])).toEqual([
			[1, 'Japan', -1.5],
			[0, 'United Kingdom', 0.5]
		]);
		expect(societyArrows(file, 19, (code) => names[code]).map((r) => r.headline)).toEqual([
			'United Kingdom'
		]);
	});
});

describe('§4.6: the committed change files', () => {
	const derived = (name: string): unknown =>
		JSON.parse(readFileSync(new URL(`../../../../data/derived/${name}`, import.meta.url), 'utf8'));
	const all = new ChangeCells(derived('change-all.json'), 'all');
	const societies = new Societies(derived('societies.json'));

	it('reproduces the M5 brief’s counts under All data (FR-51)', () => {
		const japanRows = societyChange(all, all.indexOf('JPN')!);
		expect(changeCounts(japanRows.rows)).toEqual({ higher: 22, lower: 38, within: 60, shown: 120 });
		let higher = 0;
		let lower = 0;
		let within = 0;
		for (let s = 0; s < all.codes.length; s++) {
			const c = changeCounts(societyChange(all, s).rows);
			higher += c.higher;
			lower += c.lower;
			within += c.within;
		}
		expect([higher, lower, within]).toEqual([980, 747, 1392]);
		expect(changeCounts(globalChange(all).rows)).toMatchObject({
			higher: 63,
			lower: 46,
			within: 11
		});
		const strip = societyStrip(all, (code) => societies.get(code)!.name);
		expect(changeCounts(strip)).toMatchObject({ higher: 13, lower: 6, within: 7 });
		expect(strip[0].label).toBe('Malaysia');
		expect(strip.at(-1)?.label).toBe('Australia');
	});
});
