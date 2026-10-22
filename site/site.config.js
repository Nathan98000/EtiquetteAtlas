// Where the site is served (HR-1). GitHub Pages serves this repository at
// https://nathan98000.github.io/EtiquetteAtlas/ (the path is case-sensitive). A rename is a
// one-line change here, or set BASE_PATH and SITE_ORIGIN in the environment.

export const DEFAULT_BASE_PATH = '/EtiquetteAtlas';
export const DEFAULT_ORIGIN = 'https://nathan98000.github.io';

/**
 * SvelteKit wants a base path that starts but does not end with "/", or the empty string.
 * @param {string} value
 * @returns {'' | `/${string}`}
 */
export function normalizeBasePath(value) {
	const trimmed = value.trim().replace(/\/+$/, '');
	if (trimmed === '') return '';
	if (!trimmed.startsWith('/') || trimmed.startsWith('//') || /\s/.test(trimmed)) {
		throw new Error(`BASE_PATH must look like "/EtiquetteAtlas", got ${JSON.stringify(value)}`);
	}
	return /** @type {`/${string}`} */ (trimmed);
}

export const basePath = normalizeBasePath(process.env.BASE_PATH ?? DEFAULT_BASE_PATH);
export const origin = process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN;
