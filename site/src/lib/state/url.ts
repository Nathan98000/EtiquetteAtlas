/**
 * View state in the query string (FR-80, §6.1): `society` (lower-case ISO3), `sample`, `scale`,
 * `sort`, and for the drill-down `estimate` and `uncertainty` (decision 31). Defaults are left
 * out, so the plain route is the default view, and parameters are written in a fixed order so
 * one view has one URL. Unknown or invalid values fall back to the defaults without an error.
 */

import { SAMPLES, type EstimateKind, type SampleId, type Scale } from '../data/model';
import { SORT_KEYS, type SortKey } from '../data/derive';

export interface ViewState {
	/** Upper-case code as in the data files; checked against societies.json by the views. */
	society: string | null;
	sample: SampleId;
	scale: Scale;
	sort: SortKey;
	estimate: EstimateKind;
	uncertainty: boolean;
}

export type ViewKey = keyof ViewState;

export const DEFAULT_VIEW: Readonly<ViewState> = {
	society: null,
	sample: 'all',
	scale: 'raw',
	sort: 'paper',
	estimate: 'shrunk',
	uncertainty: false
};

/** The global controls, carried from route to route (FR-3 to FR-5). */
export const GLOBAL_KEYS: readonly ViewKey[] = ['society', 'sample', 'scale'];
/** The matrix adds its sort (FR-12). */
export const MATRIX_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, 'sort'];
/** The drill-down adds its two toggles (FR-20, FR-22). */
export const CELL_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, 'estimate', 'uncertainty'];

const ORDER: readonly ViewKey[] = ['society', 'sample', 'scale', 'sort', 'estimate', 'uncertainty'];

/** The parameters a route keeps in its URL. */
export function keysFor(routeId: string | null): readonly ViewKey[] {
	if (routeId === '/explore') return MATRIX_KEYS;
	if (routeId === '/explore/[behavior]/[situation]') return CELL_KEYS;
	return GLOBAL_KEYS;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseView(params: { get(name: string): string | null }): ViewState {
	const society = params.get('society');
	return {
		society: society && /^[a-z]{3}$/i.test(society) ? society.toUpperCase() : null,
		sample: oneOf(params.get('sample'), SAMPLES, DEFAULT_VIEW.sample),
		scale: oneOf(params.get('scale'), ['raw', 'centered'], DEFAULT_VIEW.scale),
		sort: oneOf(params.get('sort'), SORT_KEYS, DEFAULT_VIEW.sort),
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
		if (key === 'society') params.set(key, String(value).toLowerCase());
		else if (key === 'uncertainty') params.set(key, 'on');
		else params.set(key, String(value));
	}
	const search = params.toString();
	return search ? `?${search}` : '';
}
