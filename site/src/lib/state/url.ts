/**
 * View state in the query string (FR-80, §6.1): `society` (lower-case ISO3), `sample`, `scale`,
 * `sort`, for the drill-down `estimate` and `uncertainty` (decision 31), and for a fingerprint
 * `compare` (FR-33). Fingerprints name their society in the path instead (decision 44). Defaults
 * are left out, so the plain route is the default view, and parameters are written in a fixed
 * order so one view has one URL. Unknown or invalid values fall back to the defaults without an
 * error.
 */

import { SAMPLES, type EstimateKind, type SampleId, type Scale } from '../data/model';
import { FINGERPRINT_SORT_KEYS, SORT_KEYS, type SortKey } from '../data/derive';

export interface ViewState {
	/** Upper-case code as in the data files; checked against societies.json by the views. */
	society: string | null;
	sample: SampleId;
	scale: Scale;
	sort: SortKey;
	/** The society a fingerprint is compared with (FR-33), upper case like `society`. */
	compare: string | null;
	estimate: EstimateKind;
	uncertainty: boolean;
}

export type ViewKey = keyof ViewState;

export const DEFAULT_VIEW: Readonly<ViewState> = {
	society: null,
	sample: 'all',
	scale: 'raw',
	sort: 'paper',
	compare: null,
	estimate: 'shrunk',
	uncertainty: false
};

/** The global controls, carried from route to route (FR-3 to FR-5). */
export const GLOBAL_KEYS: readonly ViewKey[] = ['society', 'sample', 'scale'];
/** The matrix adds its sort (FR-12). */
export const MATRIX_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, 'sort'];
/** The drill-down adds its two toggles (FR-20, FR-22). */
export const CELL_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, 'estimate', 'uncertainty'];
/** Society routes carry the society in their path, or none on the index (decision 44). */
export const SOCIETIES_KEYS: readonly ViewKey[] = ['sample', 'scale'];
/** A fingerprint adds its sort (decision 45) and the society it is compared with (FR-33). */
export const FINGERPRINT_KEYS: readonly ViewKey[] = [...SOCIETIES_KEYS, 'sort', 'compare'];

export const SOCIETIES_ROUTE = '/societies';
export const FINGERPRINT_ROUTE = '/societies/[society]';

const ORDER: readonly ViewKey[] = [
	'society',
	'sample',
	'scale',
	'sort',
	'compare',
	'estimate',
	'uncertainty'
];

/** The parameters a route keeps in its URL. */
export function keysFor(routeId: string | null): readonly ViewKey[] {
	if (routeId === '/explore') return MATRIX_KEYS;
	if (routeId === '/explore/[behavior]/[situation]') return CELL_KEYS;
	if (routeId === SOCIETIES_ROUTE) return SOCIETIES_KEYS;
	if (routeId === FINGERPRINT_ROUTE) return FINGERPRINT_KEYS;
	return GLOBAL_KEYS;
}

/** The sort orders a route offers: a fingerprint adds "largest difference first" (decision 45). */
export function sortKeysFor(routeId: string | null): readonly SortKey[] {
	return routeId === FINGERPRINT_ROUTE ? FINGERPRINT_SORT_KEYS : SORT_KEYS;
}

/** A society code from a URL, upper case as in the data files, or null if malformed. */
export function societyCode(value: string | null | undefined): string | null {
	return value && /^[a-z]{3}$/i.test(value) ? value.toUpperCase() : null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseView(
	params: { get(name: string): string | null },
	routeId: string | null = null
): ViewState {
	return {
		society: societyCode(params.get('society')),
		sample: oneOf(params.get('sample'), SAMPLES, DEFAULT_VIEW.sample),
		scale: oneOf(params.get('scale'), ['raw', 'centered'], DEFAULT_VIEW.scale),
		sort: oneOf(params.get('sort'), sortKeysFor(routeId), DEFAULT_VIEW.sort),
		compare: societyCode(params.get('compare')),
		estimate: oneOf(params.get('estimate'), ['shrunk', 'raw'], DEFAULT_VIEW.estimate),
		uncertainty: params.get('uncertainty') === 'on'
	};
}

/** The query string for a view, "" for the default view or "?society=chl&sample=paper". */
export function viewSearch(state: ViewState, keys: readonly ViewKey[] = GLOBAL_KEYS): string {
	const params = new URLSearchParams();
	for (const key of ORDER) {
		if (!keys.includes(key) || state[key] === DEFAULT_VIEW[key]) continue;
		const value = state[key];
		if (key === 'society' || key === 'compare') params.set(key, String(value).toLowerCase());
		else if (key === 'uncertainty') params.set(key, 'on');
		else params.set(key, String(value));
	}
	const search = params.toString();
	return search ? `?${search}` : '';
}
