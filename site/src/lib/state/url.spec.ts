import { describe, expect, it } from 'vitest';
import {
	CELL_KEYS,
	DEFAULT_VIEW,
	FINGERPRINT_KEYS,
	FINGERPRINT_ROUTE,
	GLOBAL_KEYS,
	MATRIX_KEYS,
	SOCIETIES_KEYS,
	keysFor,
	parseView,
	societyCode,
	viewSearch,
	type ViewState
} from './url';

const parse = (search: string) => parseView(new URLSearchParams(search));

describe('FR-80: view state round-trips through the URL', () => {
	it('leaves the default view without a query string', () => {
		expect(viewSearch(DEFAULT_VIEW, CELL_KEYS)).toBe('');
		expect(parse('')).toEqual(DEFAULT_VIEW);
	});

	it('writes every non-default value in a fixed order, society in lower case', () => {
		const state: ViewState = {
			society: 'CHL',
			sample: 'paper',
			scale: 'centered',
			sort: 'disagreement',
			compare: 'JPN',
			estimate: 'raw',
			uncertainty: true
		};
		const all = [...new Set([...MATRIX_KEYS, ...CELL_KEYS, ...FINGERPRINT_KEYS])];
		const search = viewSearch(state, all);
		expect(search).toBe(
			'?society=chl&sample=paper&scale=centered&sort=disagreement&compare=jpn&estimate=raw' +
				'&uncertainty=on'
		);
		expect(parse(search)).toEqual(state);
	});

	it('keeps only the parameters of the route', () => {
		const state: ViewState = { ...DEFAULT_VIEW, society: 'USA', sort: 'mean', estimate: 'raw' };
		expect(viewSearch(state, GLOBAL_KEYS)).toBe('?society=usa');
		expect(viewSearch(state, MATRIX_KEYS)).toBe('?society=usa&sort=mean');
		expect(viewSearch(state, CELL_KEYS)).toBe('?society=usa&estimate=raw');
	});

	it('maps routes to their parameters', () => {
		expect(keysFor('/explore')).toBe(MATRIX_KEYS);
		expect(keysFor('/explore/[behavior]/[situation]')).toBe(CELL_KEYS);
		expect(keysFor('/method')).toBe(GLOBAL_KEYS);
		expect(keysFor(null)).toBe(GLOBAL_KEYS);
	});

	it('decision 44: society routes keep the society in the path, not the query', () => {
		expect(keysFor('/societies')).toBe(SOCIETIES_KEYS);
		expect(keysFor(FINGERPRINT_ROUTE)).toBe(FINGERPRINT_KEYS);
		const state: ViewState = { ...DEFAULT_VIEW, society: 'CHL', sample: 'attention', sort: 'name' };
		expect(viewSearch(state, SOCIETIES_KEYS)).toBe('?sample=attention');
		expect(viewSearch({ ...state, compare: 'URY' }, FINGERPRINT_KEYS)).toBe(
			'?sample=attention&sort=name&compare=ury'
		);
	});

	it('decision 45: only a fingerprint sorts by its own differences', () => {
		expect(parseView(new URLSearchParams('sort=difference'), FINGERPRINT_ROUTE).sort).toBe(
			'difference'
		);
		expect(parseView(new URLSearchParams('sort=difference'), '/explore').sort).toBe('paper');
		expect(parse('sort=difference').sort).toBe('paper');
	});
});

describe('§6.1: unknown or invalid values fall back to the defaults without an error', () => {
	it.each([
		'sample=everyone',
		'scale=log',
		'sort=random',
		'estimate=smoothed',
		'uncertainty=yes',
		'society=chile',
		'society=c1l',
		'compare=japan',
		'colour=blue'
	])('%s', (search) => {
		expect(parse(search)).toEqual(DEFAULT_VIEW);
	});

	it('accepts any letter case for the society code', () => {
		expect(parse('society=Chl').society).toBe('CHL');
		expect(parse('compare=jPn').compare).toBe('JPN');
		expect(societyCode('xkx')).toBe('XKX');
		expect(societyCode(undefined)).toBeNull();
	});
});
