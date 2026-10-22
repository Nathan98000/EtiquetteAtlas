import { describe, expect, it } from 'vitest';
import { Similarity, Societies } from './model';
import {
	NO_PERIOD,
	byRegion,
	factsView,
	indexSummary,
	listText,
	monthLabel,
	period,
	similarView,
	studentText
} from './society';
import { similarityDoc, societiesDoc } from './test-fixtures';

const societies = new Societies(societiesDoc());

describe('FR-34: society facts in words', () => {
	it('names months and fieldwork periods (decision 17)', () => {
		expect(monthLabel('2023-11')).toBe('November 2023');
		expect(period('2023-11', '2023-11')).toBe('November 2023');
		expect(period('2023-09', '2023-12')).toBe('September to December 2023');
		expect(period('2023-12', '2024-02')).toBe('December 2023 to February 2024');
		expect(period(null, null)).toBeNull();
	});

	it('lists languages most used first (decision 10)', () => {
		expect(listText(['Spanish'])).toBe('Spanish');
		expect(listText(['Spanish', 'English'])).toBe('Spanish and English');
		expect(listText(['Dutch', 'French', 'German'])).toBe('Dutch, French and German');
	});

	it('gives the student share as stored, with the share unknown (decision 11)', () => {
		expect(studentText(55, 0)).toBe('55%');
		expect(studentText(60, 5)).toBe('60%, with no status recorded for 5%');
		expect(studentText(0, 100)).toBe('not recorded');
	});

	it('builds the panel for the active sample, with respondents in every sample', () => {
		expect(factsView(societies, 'BBB', 'all')).toEqual({
			sample: 'all',
			inSample: {
				respondents: '120',
				students: '60%, with no status recorded for 5%',
				languages: 'Spanish and English',
				period: 'October 2023 to January 2024'
			},
			region: 'Asia',
			bySample: [
				{ sample: 'all', label: 'All data', respondents: '120' },
				{ sample: 'paper', label: "Paper's sample", respondents: '100' },
				{ sample: 'attention', label: 'Attention check', respondents: null }
			]
		});
		expect(factsView(societies, 'AAA', 'all')?.inSample?.period).toBe('September 2023');
	});

	it('reads missing status and months plainly, and knows who is outside the sample', () => {
		expect(factsView(societies, 'CCC', 'all')?.inSample).toEqual({
			respondents: '40',
			students: 'not recorded',
			languages: 'French',
			period: NO_PERIOD
		});
		expect(factsView(societies, 'CCC', 'paper')?.inSample).toBeNull();
		expect(factsView(societies, 'ZZZ', 'all')).toBeNull();
	});
});

describe('FR-32: the most similar societies', () => {
	const similarity = new Similarity(similarityDoc(), 'all');

	it('lists them most similar first, with the score to two decimals', () => {
		expect(similarView(similarity, societies, 'AAA')).toEqual([
			{ code: 'BBB', name: 'Philippines', rank: 1, r: '0.61', width: 0.61, cells: 149 },
			{ code: 'CCC', name: 'Gamma', rank: 2, r: '−0.12', width: 0, cells: 120 }
		]);
	});

	it('is empty for a society with too few publishable pairs (decision 7)', () => {
		expect(similarView(similarity, societies, 'CCC')).toEqual([]);
	});
});

describe('decision 52: the index of societies', () => {
	it('sums up the active sample in one sentence', () => {
		expect(indexSummary(societies, 'all')).toBe(
			'Respondents in 3 societies took part, from 40 to 300 in each, listed here by the GSN ' +
				"authors' four regions."
		);
		expect(indexSummary(societies, 'paper')).toBe(
			"2 of the 3 societies are in this sample (Paper's sample), with 100 to 280 respondents " +
				"in each, listed here by the GSN authors' four regions."
		);
	});

	it('groups societies by the authors’ regions, by name within each', () => {
		expect(byRegion(societies).map((g) => [g.region, g.members.map((s) => s.code)])).toEqual([
			['Africa', ['CCC']],
			['Asia', ['BBB']],
			['Latin America', []],
			['West', ['AAA']]
		]);
	});
});
