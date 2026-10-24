/**
 * View state in the query string (FR-80, §6.1): `society` (lower-case ISO3), `sample`, `scale`,
 * `sort`, for the drill-down `estimate` and `uncertainty` (decision 31), for a fingerprint
 * `compare` (FR-33), and on the audiences routes `scope`, `actor` and `split` (FR-42, decision
 * 57). Fingerprints and the change pages name their society in the path instead (decisions 44
 * and 67). Defaults are left out, so the plain route is the default view, and parameters are
 * written in a fixed order so one view has one URL. Unknown or invalid values fall back to the
 * defaults without an error.
 */

import { SAMPLES, type EstimateKind, type SampleId, type Scale } from '../data/model';
import {
	AUDIENCE_SORT_KEYS,
	CHANGE_SORT_KEYS,
	FINGERPRINT_SORT_KEYS,
	SORT_KEYS,
	type SortKey
} from '../data/derive';

export interface ViewState {
	/** Upper-case code as in the data files; checked against societies.json by the views. */
	society: string | null;
	sample: SampleId;
	scale: Scale;
	sort: SortKey;
	/** The society a fingerprint is compared with (FR-33), upper case like `society`. */
	compare: string | null;
	/** Audiences (FR-42): the selected society's respondents, or all societies (`scope=global`). */
	scope: 'society' | 'global';
	/** Audiences: the behavior done by a woman and by a man (`actor=on`). */
	actor: boolean;
	/** Audiences: women and men respondents, for all societies only (`split=gender`, DR-12). */
	split: boolean;
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
	scope: 'society',
	actor: false,
	split: false,
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

/** The audiences' filters follow the reader between the module's two routes (decision 57). */
export const AUDIENCE_FILTER_KEYS: readonly ViewKey[] = ['scope', 'actor', 'split'];
/** A behavior's audiences (FR-40). */
export const AUDIENCE_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, ...AUDIENCE_FILTER_KEYS];
/** The small multiples add their sort (FR-41). */
export const AUDIENCES_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, 'sort', ...AUDIENCE_FILTER_KEYS];

/**
 * The change overview keeps a society in its query only when that society has no 2000–2003 data
 * (FR-53); its sort follows the reader between the module's two routes (decision 67).
 */
export const CHANGE_KEYS: readonly ViewKey[] = [...GLOBAL_KEYS, 'sort'];
/** A society's change page names the society in its path (decision 67). */
export const CHANGE_SOCIETY_KEYS: readonly ViewKey[] = ['sample', 'scale', 'sort'];

export const SOCIETIES_ROUTE = '/societies';
export const FINGERPRINT_ROUTE = '/societies/[society]';
export const AUDIENCES_ROUTE = '/audiences';
export const AUDIENCE_ROUTE = '/audiences/[behavior]';
export const CHANGE_ROUTE = '/change';
export const CHANGE_SOCIETY_ROUTE = '/change/[society]';

/** The change routes open on the largest differences, so that order is their default. */
export const CHANGE_DEFAULTS: Readonly<ViewState> = { ...DEFAULT_VIEW, sort: 'difference' };
/** Decision 8 (D-12): a fingerprint opens on its largest differences. */
export const FINGERPRINT_DEFAULTS: Readonly<ViewState> = { ...DEFAULT_VIEW, sort: 'difference' };
/** Decision 8 (D-12): the small multiples open on the largest drop. */
export const AUDIENCES_DEFAULTS: Readonly<ViewState> = { ...DEFAULT_VIEW, sort: 'effect' };

/**
 * The view a route shows when its URL has no query string: most telling first where a route has
 * its own order (decision 8, amending decision 31); paper order stays one choice away.
 */
export function defaultsFor(routeId: string | null): Readonly<ViewState> {
	if (routeId === CHANGE_ROUTE || routeId === CHANGE_SOCIETY_ROUTE) return CHANGE_DEFAULTS;
	if (routeId === FINGERPRINT_ROUTE) return FINGERPRINT_DEFAULTS;
	if (routeId === AUDIENCES_ROUTE) return AUDIENCES_DEFAULTS;
	return DEFAULT_VIEW;
}

const ORDER: readonly ViewKey[] = [
	'society',
	'sample',
	'scale',
	'sort',
	'compare',
	'scope',
	'actor',
	'split',
	'estimate',
	'uncertainty'
];

/** The parameters a route keeps in its URL. */
export function keysFor(routeId: string | null): readonly ViewKey[] {
	if (routeId === '/explore') return MATRIX_KEYS;
	if (routeId === '/explore/[behavior]/[situation]') return CELL_KEYS;
	if (routeId === SOCIETIES_ROUTE) return SOCIETIES_KEYS;
	if (routeId === FINGERPRINT_ROUTE) return FINGERPRINT_KEYS;
	if (routeId === AUDIENCES_ROUTE) return AUDIENCES_KEYS;
	if (routeId === AUDIENCE_ROUTE) return AUDIENCE_KEYS;
	if (routeId === CHANGE_ROUTE) return CHANGE_KEYS;
	if (routeId === CHANGE_SOCIETY_ROUTE) return CHANGE_SOCIETY_KEYS;
	return GLOBAL_KEYS;
}

/**
 * The sort orders a route offers: a fingerprint adds "largest difference first" (decision 45);
 * the small multiples sort by the audience effect instead of a cell's mean (FR-41); the change
 * routes by the difference between the surveys (decision 67).
 */
export function sortKeysFor(routeId: string | null): readonly SortKey[] {
	if (routeId === FINGERPRINT_ROUTE) return FINGERPRINT_SORT_KEYS;
	if (routeId === AUDIENCES_ROUTE) return AUDIENCE_SORT_KEYS;
	if (routeId === CHANGE_ROUTE || routeId === CHANGE_SOCIETY_ROUTE) return CHANGE_SORT_KEYS;
	return SORT_KEYS;
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
		sort: oneOf(params.get('sort'), sortKeysFor(routeId), defaultsFor(routeId).sort),
		compare: societyCode(params.get('compare')),
		scope: params.get('scope') === 'global' ? 'global' : 'society',
		actor: params.get('actor') === 'on',
		split: params.get('split') === 'gender',
		estimate: oneOf(params.get('estimate'), ['shrunk', 'raw'], DEFAULT_VIEW.estimate),
		uncertainty: params.get('uncertainty') === 'on'
	};
}

/**
 * Parameters that change nothing in this view, so one view keeps one URL (decision 57): `scope`
 * needs a society to step back from, and `split` needs the view of all societies.
 */
function idle(state: ViewState, key: ViewKey): boolean {
	if (key === 'scope') return state.society === null;
	if (key === 'split') return state.society !== null && state.scope !== 'global';
	return false;
}

/**
 * The query string for a view, "" for the default view or "?society=chl&sample=paper". `defaults`
 * are the target route's (defaultsFor), whose values are left out.
 */
export function viewSearch(
	state: ViewState,
	keys: readonly ViewKey[] = GLOBAL_KEYS,
	defaults: Readonly<ViewState> = DEFAULT_VIEW
): string {
	const params = new URLSearchParams();
	for (const key of ORDER) {
		if (!keys.includes(key) || state[key] === defaults[key] || idle(state, key)) continue;
		const value = state[key];
		if (key === 'society' || key === 'compare') params.set(key, String(value).toLowerCase());
		else if (key === 'uncertainty' || key === 'actor') params.set(key, 'on');
		else if (key === 'split') params.set(key, 'gender');
		else params.set(key, String(value));
	}
	const search = params.toString();
	return search ? `?${search}` : '';
}
