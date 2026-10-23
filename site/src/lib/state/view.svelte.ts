import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import type { ResolvedPathname } from '$app/types';
import { slug, type Behavior } from '../data/grid';
import { inChangeSurvey } from '../data/model';
import {
	AUDIENCE_KEYS,
	AUDIENCES_KEYS,
	CHANGE_DEFAULTS,
	CHANGE_KEYS,
	CHANGE_ROUTE,
	CHANGE_SOCIETY_KEYS,
	CHANGE_SOCIETY_ROUTE,
	DEFAULT_VIEW,
	FINGERPRINT_KEYS,
	FINGERPRINT_ROUTE,
	SOCIETIES_KEYS,
	SOCIETIES_ROUTE,
	defaultsFor,
	keysFor,
	parseView,
	societyCode,
	viewSearch,
	type ViewKey,
	type ViewState
} from './url';

class View {
	// Prerendered pages cannot read their query string, so the server render and hydration use
	// the route's defaults; the URL's values take over once the app has mounted (decision 31). A
	// fingerprint's or change page's society is in its path, so it is known from the start
	// (decisions 44 and 67).
	#ready = $state(false);

	readonly state: ViewState = $derived.by(() => {
		const route = page.route.id;
		const query = this.#ready ? parseView(page.url.searchParams, route) : defaultsFor(route);
		return route === FINGERPRINT_ROUTE || route === CHANGE_SOCIETY_ROUTE
			? { ...query, society: societyCode(page.params.society) }
			: query;
	});

	get ready(): boolean {
		return this.#ready;
	}

	start(): void {
		this.#ready = true;
	}
}

export const view = new View();

/** A society's fingerprint, or the index when there is none (decision 44). */
export function societyPath(code: string | null): ResolvedPathname {
	return code ? resolve(`societies/${code.toLowerCase()}/`) : resolve('societies/');
}

/** A link to a society's fingerprint that keeps the sample and scale (FR-32, decision 44). */
export function societyHref(code: string | null, state: ViewState): ResolvedPathname {
	return withView(societyPath(code), state, SOCIETIES_KEYS);
}

/**
 * A behavior's audiences, or the small multiples without one, keeping the audiences' filters
 * (decision 57). The index's sort stays on the index.
 */
export function audiencesHref(behavior: Behavior | null, state: ViewState): ResolvedPathname {
	return behavior
		? withView(resolve(`audiences/${slug(behavior)}/`), state, AUDIENCE_KEYS)
		: withView(resolve('audiences/'), state, AUDIENCES_KEYS);
}

/**
 * A society's change page, or the overview for a society without 2000–2003 data or for none
 * (FR-53, decision 67). Links within the module keep its sort; links from elsewhere pass
 * `withSort` false and open on its default order.
 */
export function changeHref(
	code: string | null,
	state: ViewState,
	withSort = true
): ResolvedPathname {
	const next = withSort ? state : { ...state, sort: CHANGE_DEFAULTS.sort };
	return code && inChangeSurvey(code)
		? withView(resolve(`change/${code.toLowerCase()}/`), next, CHANGE_SOCIETY_KEYS, CHANGE_DEFAULTS)
		: withView(resolve('change/'), { ...next, society: code }, CHANGE_KEYS, CHANGE_DEFAULTS);
}

/** A fingerprint's own URL for a view, with its sort and comparison (FR-33). */
export function fingerprintHref(state: ViewState): ResolvedPathname {
	return withView(societyPath(state.society), state, FINGERPRINT_KEYS);
}

/**
 * Changes the view by navigating, so each state has its own history entry and back and forward
 * move between states (FR-80, FR-84, AT-11). Every linked view reads the same URL, so they
 * update together. On society routes the society is the path: choosing one opens its
 * fingerprint, and clearing it goes to the index (decision 44). On the change routes a society
 * in both surveys opens its change page, and any other stays on the overview (decision 67).
 */
export function setView(patch: Partial<ViewState>): Promise<void> {
	const next = { ...view.state, ...patch };
	if (next.compare === next.society) next.compare = null;
	const route = page.route.id;
	if (route === SOCIETIES_ROUTE || route === FINGERPRINT_ROUTE) {
		const keys = next.society ? FINGERPRINT_KEYS : SOCIETIES_KEYS;
		return goto(withView(societyPath(next.society), next, keys), { reset: false });
	}
	if (route === CHANGE_ROUTE || route === CHANGE_SOCIETY_ROUTE) {
		return goto(changeHref(next.society, next), { reset: false });
	}
	return goto(withView(page.url.pathname as ResolvedPathname, next, keysFor(route)), {
		reset: false
	});
}

/**
 * A resolved path with a view's query string. The path already carries the base path, so the
 * result is still a resolved pathname.
 */
export function withView(
	path: ResolvedPathname,
	state: ViewState,
	keys: readonly ViewKey[],
	defaults: Readonly<ViewState> = DEFAULT_VIEW
): ResolvedPathname {
	return `${path}${viewSearch(state, keys, defaults)}` as ResolvedPathname;
}
