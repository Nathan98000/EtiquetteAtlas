// Checks the static artifact in build/ after `npm run build`, one line per problem:
// HR-1 base path, HR-2 index.html and 404.html at the root, HR-3 content-hashed JS, CSS and data,
// HR-4/NFR-5 size limits, HR-7/NFR-32 CSP meta tag, NFR-31 no third-party resources,
// NFR-40/AT-5 attribution footer on every page, FR-83 title, description and canonical URL, and
// NFR-1 first-load budgets per kind of route, which it also reports.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { basePath } from '../site.config.js';

const root = resolve(import.meta.dirname, '..', 'build');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SITE_BYTES = 60 * 1024 * 1024;
// HR-3 covers JavaScript, CSS and data files. SvelteKit's own version check reads the one
// unhashed file below; images such as share cards may keep stable names. Each route's
// __data.json holds only its prerendered title and summary strings, like its HTML, which is
// not hashed either (decision 28).
const MUST_BE_HASHED = /\.(js|css|json|csv|topojson)$/;
const UNHASHED_ALLOWED = new Set(['_app/version.json']);
const ROUTE_PAYLOAD = /(^|\/)__data\.json$/;
const MAX_ROUTE_PAYLOAD_BYTES = 2048;
// NFR-1, gzip. JS and CSS are the page itself (small stylesheets are inlined) and what its HTML
// preloads; the map's chunk loads later and is measured by e2e/budget.e2e.ts. Data are the files each kind of route fetches, with a society
// selected (the worst case), named by their prefix before the hash (src/lib/data/files.ts).
const JS_CSS_BUDGET = 200 * 1024;
const DATA_BUDGET = 300 * 1024;
const ROUTE_DATA = {
	home: [],
	explore: ['societies', 'global-all', 'cells-all'],
	cell: ['societies', 'global-all', 'cells-all', 'land-110m'],
	societies: ['societies'],
	society: ['societies', 'global-all', 'cells-all', 'similarity-all'],
	other: []
};
/** @param {string} file */
const kindOf = (file) =>
	file === 'index.html'
		? 'home'
		: file === 'explore/index.html'
			? 'explore'
			: /^explore\/[^/]+\/[^/]+\/index\.html$/.test(file)
				? 'cell'
				: file === 'societies/index.html'
					? 'societies'
					: /^societies\/[a-z]{3}\/index\.html$/.test(file)
						? 'society'
						: 'other';
const ATTRIBUTION = [
	'data-attribution',
	'Eriksson',
	'(2025)',
	'Everyday norms have become more permissive over time and vary across cultures',
	'https://doi.org/10.17605/OSF.IO/SH4RB',
	'CC BY 4.0',
	'https://creativecommons.org/licenses/by/4.0/',
	'aggregated and modelled by The Etiquette Atlas'
];

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

/**
 * @param {string} file
 * @param {string} html
 * @returns {string[]}
 */
function checkPage(file, html) {
	const problems = [];
	const csp = html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/i)?.[1];
	if (!csp) {
		problems.push(`HR-7: ${file} has no Content-Security-Policy meta tag`);
	} else {
		const scriptSrc = csp.match(/script-src ([^;]*)/)?.[1] ?? '';
		if (/unsafe-inline|unsafe-eval|https?:/.test(scriptSrc)) {
			problems.push(`NFR-32: ${file} allows inline, eval or third-party scripts: ${scriptSrc}`);
		}
	}
	for (const text of ATTRIBUTION) {
		if (!html.includes(text)) problems.push(`NFR-40: ${file} lacks attribution text ${text}`);
	}
	if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`FR-83: ${file} has no <title>`);
	if (file !== '404.html') {
		if (!/<meta name="description" content="[^"]+"/.test(html)) {
			problems.push(`FR-83: ${file} has no description`);
		}
		const noindex = html.includes('<meta name="robots" content="noindex"');
		if (!noindex && !/<link rel="canonical" href="https:\/\/[^"]+\/"/.test(html)) {
			problems.push(`FR-83: ${file} has no canonical URL`);
		}
	}
	const external = html.match(
		/<(?:script|img|iframe|source|audio|video)\b[^>]*\bsrc="https?:[^"]*"|<link\b(?=[^>]*\brel="(?:stylesheet|modulepreload|preload|icon)")[^>]*\bhref="https?:[^"]*"/g
	);
	for (const tag of external ?? [])
		problems.push(`NFR-31: ${file} loads a third-party resource: ${tag}`);
	for (const [, url] of html.matchAll(/\b(?:src|href)="(\/[^"]*)"/g)) {
		if (!url.startsWith(`${basePath}/`)) {
			problems.push(`HR-1: ${file} links ${url} outside the base path ${basePath}/`);
		}
	}
	return problems;
}

const files = walk(root).map((path) => relative(root, path).split(sep).join('/'));
const problems = [];
for (const required of ['index.html', '404.html']) {
	if (!files.includes(required)) problems.push(`HR-2: build/${required} is missing`);
}

let total = 0;
let pages = 0;
for (const file of files) {
	const size = statSync(join(root, file)).size;
	total += size;
	if (size > MAX_FILE_BYTES) problems.push(`HR-4: ${file} is over 5 MB`);
	if (ROUTE_PAYLOAD.test(file)) {
		if (size > MAX_ROUTE_PAYLOAD_BYTES) {
			problems.push(`HR-3: ${file} is ${size} bytes: route payloads must not carry datasets`);
		}
	} else if (MUST_BE_HASHED.test(file) && !UNHASHED_ALLOWED.has(file)) {
		if (!file.startsWith('_app/immutable/')) {
			problems.push(`HR-3: ${file} is not a content-hashed file under _app/immutable/`);
		}
	}
	if (file.endsWith('.html')) {
		pages += 1;
		problems.push(...checkPage(file, readFileSync(join(root, file), 'utf8')));
	}
}
if (total > MAX_SITE_BYTES) problems.push(`NFR-5: the site is over 60 MB`);

/** @type {Map<string, number>} */
const gzipped = new Map();
/** @param {string} file */
const gzipSize = (file) => {
	if (!gzipped.has(file)) gzipped.set(file, gzipSync(readFileSync(join(root, file))).length);
	return /** @type {number} */ (gzipped.get(file));
};
const kb = (/** @type {number} */ bytes) => `${(bytes / 1024).toFixed(1)} KB`;
/** @type {Record<string, { page: string, code: number, data: number }>} */
const worst = {};
for (const file of files.filter((f) => f.endsWith('.html'))) {
	const html = readFileSync(join(root, file), 'utf8');
	const assets = (html.match(/<link\b[^>]*>/g) ?? [])
		.filter((tag) => /\brel="(?:modulepreload|stylesheet)"/.test(tag))
		.map((tag) => (tag.match(/\bhref="([^"]+)"/)?.[1] ?? '').slice(basePath.length + 1));
	const code = [...new Set(assets)].reduce((sum, asset) => sum + gzipSize(asset), gzipSize(file));
	const kind = kindOf(file);
	const data = ROUTE_DATA[kind].reduce((sum, name) => {
		const match = files.find((f) => f.startsWith(`_app/immutable/assets/${name}.`));
		if (!match) problems.push(`NFR-1: no data file ${name} for ${file}`);
		return sum + (match ? gzipSize(match) : 0);
	}, 0);
	if (code > JS_CSS_BUDGET) problems.push(`NFR-1: ${file} preloads ${kb(code)} of JS and CSS`);
	if (data > DATA_BUDGET) problems.push(`NFR-1: ${file} needs ${kb(data)} of data`);
	if (!worst[kind] || code + data > worst[kind].code + worst[kind].data) {
		worst[kind] = { page: file, code, data };
	}
}

if (problems.length) {
	for (const problem of problems) console.error(`FAIL ${problem}`);
	process.exit(1);
}
const megabytes = (total / 1024 / 1024).toFixed(2);
console.log(`check-build: ok, ${pages} pages and ${files.length} files, ${megabytes} MB in build/`);
console.log('NFR-1 first load, gzip (largest page of each kind):');
for (const [kind, { page, code, data }] of Object.entries(worst)) {
	console.log(
		`  ${kind.padEnd(9)} ${page.padEnd(37)} JS+CSS ${kb(code).padStart(9)} of 200 KB` +
			`   data ${kb(data).padStart(9)} of 300 KB`
	);
}
