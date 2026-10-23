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

/**
 * R-6: `CHANGE_MODULE=off` builds the site without the change module, so it can be removed in one
 * build if the 2000–2003 comparison raises a provenance or permission concern (decision 75).
 * Unset, empty or `on` keeps it.
 * @param {string | undefined} value
 * @returns {boolean}
 */
export function parseSwitch(value) {
	const v = (value ?? '').trim().toLowerCase();
	if (v === '' || v === 'on') return true;
	if (v === 'off') return false;
	throw new Error(`CHANGE_MODULE must be "on" or "off", got ${JSON.stringify(value)}`);
}

export const changeModule = parseSwitch(process.env.CHANGE_MODULE);

/**
 * FR-90, NFR-31, NFR-32: the Cloudflare Web Analytics beacon, the one third party the site
 * contacts. `src/app.html` carries the snippet on every page; the CSP in vite.config.ts allows
 * exactly these two origins, and check-build.js and the end-to-end tests compare against them.
 * The token ships in every page, so it is public (docs/SETUP.md).
 * @type {{ script: string, scriptOrigin: `https://${string}.${string}`, reportOrigin: `https://${string}.${string}`, token: string }}
 */
export const analytics = {
	script: 'https://static.cloudflareinsights.com/beacon.min.js',
	scriptOrigin: 'https://static.cloudflareinsights.com',
	reportOrigin: 'https://cloudflareinsights.com',
	token: '58ded44fdb764340973b62e1e32f48a6'
};
