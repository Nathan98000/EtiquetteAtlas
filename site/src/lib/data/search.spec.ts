import { describe, expect, it } from 'vitest';
import { cellIndex, headline } from './grid';
import { fold, matchPairs, matchSocieties } from './search';

const SOCIETIES = [
	{ code: 'CHL', name: 'Chile' },
	{ code: 'CHN', name: 'China' },
	{ code: 'CIV', name: "Côte d'Ivoire" },
	{ code: 'MEX', name: 'Mexico' },
	{ code: 'NZL', name: 'New Zealand' }
];

describe('decision 11: one search for societies and behaviors in situations', () => {
	it('folds accents and case', () => {
		expect(fold("Côte d'Ivoire")).toBe("cote d'ivoire");
	});

	it('FR-3: finds societies by the start of the name or the code first, then inside the name', () => {
		expect(matchSocieties(SOCIETIES, 'chi').map((s) => s.code)).toEqual(['CHL', 'CHN']);
		expect(matchSocieties(SOCIETIES, 'cote').map((s) => s.code)).toEqual(['CIV']);
		expect(matchSocieties(SOCIETIES, 'nzl').map((s) => s.code)).toEqual(['NZL']);
		expect(matchSocieties(SOCIETIES, 'co').map((s) => s.code)).toEqual(['CIV', 'MEX']);
		expect(matchSocieties(SOCIETIES, '  ')).toHaveLength(5);
	});

	it('finds pairs by either word, in grid order', () => {
		const bus = matchPairs('bus');
		expect(bus).toHaveLength(15);
		expect(bus.every((cell) => cell.situation === 'bus')).toBe(true);
		expect(matchPairs('eat')).toHaveLength(10);
		expect(matchPairs('eat bus').map(headline)).toEqual(['Eating on a bus']);
		expect(matchPairs('Bus eating').map((cell) => cell.index)).toEqual([cellIndex('eat', 'bus')]);
	});

	it('matches the short labels and the item wording', () => {
		expect(matchPairs('phone funeral').map(headline)).toEqual([
			'Using a mobile phone at a funeral ceremony'
		]);
		expect(matchPairs('headphones library').map(headline)).toEqual([
			'Listening to music on headphones in the library'
		]);
		expect(matchPairs('swear interview')).toHaveLength(1);
		expect(matchPairs('use phone')).toHaveLength(10);
	});

	it('finds nothing for empty text or unknown words', () => {
		expect(matchPairs('')).toEqual([]);
		expect(matchPairs('japan')).toEqual([]);
	});
});
