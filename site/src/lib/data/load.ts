/**
 * Loads each data file once per page session and keeps the decoded result in memory
 * (decision 27). A failed load is forgotten, so a retry fetches it again (FR-86).
 */

import type { Topology } from 'topojson-specification';
import { CHANGE_FILES } from './change-files';
import { FILES } from './files';
import {
	ChangeCells,
	ContextCells,
	DataError,
	GlobalCells,
	Similarity,
	Societies,
	SocietyCells,
	type SampleId
} from './model';

const cache = new Map<string, Promise<unknown>>();

function cached<T>(url: string, decode: (json: unknown) => T): Promise<T> {
	let promise = cache.get(url) as Promise<T> | undefined;
	if (!promise) {
		promise = fetch(url)
			.then((response) => {
				if (!response.ok) throw new DataError(`The server answered ${response.status}.`);
				return response.json() as Promise<unknown>;
			})
			.then(decode);
		cache.set(url, promise);
		promise.catch(() => cache.delete(url));
	}
	return promise;
}

export function loadSocieties(): Promise<Societies> {
	return cached(FILES.societies, (json) => new Societies(json));
}

export function loadGlobal(sample: SampleId): Promise<GlobalCells> {
	return cached(FILES.global[sample], (json) => new GlobalCells(json, sample));
}

export function loadCells(sample: SampleId): Promise<SocietyCells> {
	return cached(FILES.cells[sample], (json) => new SocietyCells(json, sample));
}

export function loadSimilarity(sample: SampleId): Promise<Similarity> {
	return cached(FILES.similarity[sample], (json) => new Similarity(json, sample));
}

/** Audiences and actor gender (DR-12; NFR-3: only on the audiences routes). */
export function loadContexts(sample: SampleId): Promise<ContextCells> {
	return cached(FILES.contexts[sample], (json) => new ContextCells(json, sample));
}

/** The 2000–2003 comparison (DR-13; NFR-3: only on the change routes). */
export function loadChange(sample: SampleId): Promise<ChangeCells> {
	if (!CHANGE_FILES) return Promise.reject(new DataError('This build has no change module.'));
	return cached(CHANGE_FILES[sample], (json) => new ChangeCells(json, sample));
}

/** Map outlines (NFR-3: only when the map is shown). The map module decodes them. */
export function loadLand(): Promise<Topology> {
	return cached(FILES.land, (json) => {
		if (typeof json !== 'object' || json === null || !('objects' in json)) {
			throw new DataError('The map outlines are not TopoJSON.');
		}
		return json as Topology;
	});
}

/** Starts loads in the background, for instance on hover; errors surface when used. */
export function preload(...loads: (() => Promise<unknown>)[]): void {
	for (const load of loads) load().catch(() => {});
}

/** For tests. */
export function clearCache(): void {
	cache.clear();
}
