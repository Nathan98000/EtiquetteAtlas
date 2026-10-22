import { goto } from '$app/navigation';
import { page } from '$app/state';
import type { ResolvedPathname } from '$app/types';
import { DEFAULT_VIEW, keysFor, parseView, viewSearch, type ViewKey, type ViewState } from './url';

class View {
	// Prerendered pages cannot read their query string, so the server render and hydration use
	// the defaults; the URL's values take over once the app has mounted (decision 31).
	#ready = $state(false);

	readonly state: ViewState = $derived(
		this.#ready ? parseView(page.url.searchParams) : DEFAULT_VIEW
	);

	get ready(): boolean {
		return this.#ready;
	}

	start(): void {
		this.#ready = true;
	}
}

export const view = new View();

/**
 * Changes the view by navigating, so each state has its own history entry and back and forward
 * move between states (FR-80, FR-84, AT-11). Every linked view reads the same URL, so they
 * update together.
 */
export function setView(patch: Partial<ViewState>): Promise<void> {
	const next = { ...view.state, ...patch };
	return goto(withView(page.url.pathname as ResolvedPathname, next, keysFor(page.route.id)), {
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
	keys: readonly ViewKey[]
): ResolvedPathname {
	return `${path}${viewSearch(state, keys)}` as ResolvedPathname;
}
