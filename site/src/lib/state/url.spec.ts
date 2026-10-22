import { describe, expect, it } from 'vitest';
import {
	CELL_KEYS,
	DEFAULT_VIEW,
	GLOBAL_KEYS,
	MATRIX_KEYS,
	keysFor,
	parseView,
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
			estimate: 'raw',
			uncertainty: true
		};
		const all = [...new Set([...MATRIX_KEYS, ...CELL_KEYS])];
		const search = viewSearch(state, all);
		expect(search).toBe(
			'?society=chl&sample=paper&scale=centered&sort=disagreement&estimate=raw&uncertainty=on'
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
		'colour=blue'
	])('%s', (search) => {
		expect(parse(search)).toEqual(DEFAULT_VIEW);
	});

	it('accepts any letter case for the society code', () => {
		expect(parse('society=Chl').society).toBe('CHL');
	});
});
