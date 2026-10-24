import { describe, expect, it } from 'vitest';
import {
	AUDIENCE_KEYS,
	AUDIENCE_ROUTE,
	AUDIENCES_DEFAULTS,
	AUDIENCES_KEYS,
	AUDIENCES_ROUTE,
	CELL_KEYS,
	CHANGE_DEFAULTS,
	CHANGE_KEYS,
	CHANGE_ROUTE,
	CHANGE_SOCIETY_KEYS,
	CHANGE_SOCIETY_ROUTE,
	DEFAULT_VIEW,
	FINGERPRINT_DEFAULTS,
	FINGERPRINT_KEYS,
	FINGERPRINT_ROUTE,
	GLOBAL_KEYS,
	MATRIX_KEYS,
	SOCIETIES_KEYS,
	defaultsFor,
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
			scope: 'global',
			actor: true,
			split: true,
			estimate: 'raw',
			uncertainty: true
		};
		const all = [
			...new Set([...MATRIX_KEYS, ...CELL_KEYS, ...FINGERPRINT_KEYS, ...AUDIENCES_KEYS])
		];
		const search = viewSearch(state, all);
		expect(search).toBe(
			'?society=chl&sample=paper&scale=centered&sort=disagreement&compare=jpn&scope=global' +
				'&actor=on&split=gender&estimate=raw&uncertainty=on'
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

	it('decision 57: the audiences routes keep their filters, and only the index its sort', () => {
		expect(keysFor(AUDIENCES_ROUTE)).toBe(AUDIENCES_KEYS);
		expect(keysFor(AUDIENCE_ROUTE)).toBe(AUDIENCE_KEYS);
		const state: ViewState = { ...DEFAULT_VIEW, sort: 'effect', actor: true, split: true };
		expect(viewSearch(state, AUDIENCES_KEYS)).toBe('?sort=effect&actor=on&split=gender');
		expect(viewSearch(state, AUDIENCE_KEYS)).toBe('?actor=on&split=gender');
		expect(viewSearch(state, GLOBAL_KEYS)).toBe('');
		expect(parseView(new URLSearchParams('sort=effect'), AUDIENCES_ROUTE).sort).toBe('effect');
		expect(parseView(new URLSearchParams('sort=effect'), '/explore').sort).toBe('paper');
		// An order the route does not offer falls back to its own default (decision 8).
		expect(parseView(new URLSearchParams('sort=mean'), AUDIENCES_ROUTE).sort).toBe('effect');
	});

	it('decision 57: scope and split appear only where they change the view', () => {
		const global: ViewState = { ...DEFAULT_VIEW, scope: 'global', split: true };
		// No society: "all societies" is the only view, and the split applies.
		expect(viewSearch(global, AUDIENCE_KEYS)).toBe('?split=gender');
		// A society in view: no split (DR-12).
		const chile: ViewState = { ...DEFAULT_VIEW, society: 'CHL', split: true };
		expect(viewSearch(chile, AUDIENCE_KEYS)).toBe('?society=chl');
		expect(viewSearch({ ...chile, scope: 'global' }, AUDIENCE_KEYS)).toBe(
			'?society=chl&scope=global&split=gender'
		);
	});

	it('decision 67: the change routes open on the largest differences, the society in the path', () => {
		expect(keysFor(CHANGE_ROUTE)).toBe(CHANGE_KEYS);
		expect(keysFor(CHANGE_SOCIETY_ROUTE)).toBe(CHANGE_SOCIETY_KEYS);
		expect(defaultsFor(CHANGE_ROUTE)).toBe(CHANGE_DEFAULTS);
		expect(defaultsFor('/explore')).toBe(DEFAULT_VIEW);
		expect(parseView(new URLSearchParams(''), CHANGE_ROUTE).sort).toBe('difference');
		expect(parseView(new URLSearchParams('sort=paper'), CHANGE_SOCIETY_ROUTE).sort).toBe('paper');
		expect(parseView(new URLSearchParams('sort=mean'), CHANGE_ROUTE).sort).toBe('difference');
		const state: ViewState = { ...CHANGE_DEFAULTS, society: 'CHL', sample: 'paper' };
		expect(viewSearch(state, CHANGE_KEYS, CHANGE_DEFAULTS)).toBe('?society=chl&sample=paper');
		expect(viewSearch({ ...state, sort: 'paper' }, CHANGE_SOCIETY_KEYS, CHANGE_DEFAULTS)).toBe(
			'?sample=paper&sort=paper'
		);
		// Elsewhere paper order is the default.
		expect(viewSearch({ ...state, sort: 'paper' }, MATRIX_KEYS)).toBe('?society=chl&sample=paper');
	});

	it('decision 8: fingerprints open on their largest differences, the audiences on the largest effect', () => {
		expect(defaultsFor(FINGERPRINT_ROUTE)).toBe(FINGERPRINT_DEFAULTS);
		expect(defaultsFor(AUDIENCES_ROUTE)).toBe(AUDIENCES_DEFAULTS);
		expect(defaultsFor(AUDIENCE_ROUTE)).toBe(DEFAULT_VIEW);
		expect(parseView(new URLSearchParams(''), FINGERPRINT_ROUTE).sort).toBe('difference');
		expect(parseView(new URLSearchParams(''), AUDIENCES_ROUTE).sort).toBe('effect');
		expect(parseView(new URLSearchParams('sort=paper'), FINGERPRINT_ROUTE).sort).toBe('paper');
		const state: ViewState = { ...FINGERPRINT_DEFAULTS, sample: 'paper' };
		expect(viewSearch(state, FINGERPRINT_KEYS, FINGERPRINT_DEFAULTS)).toBe('?sample=paper');
		expect(viewSearch({ ...state, sort: 'paper' }, FINGERPRINT_KEYS, FINGERPRINT_DEFAULTS)).toBe(
			'?sample=paper&sort=paper'
		);
		expect(viewSearch({ ...AUDIENCES_DEFAULTS }, AUDIENCES_KEYS, AUDIENCES_DEFAULTS)).toBe('');
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
		'scope=chile',
		'actor=yes',
		'split=age',
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
