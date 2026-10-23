// Checks the static artifact in build/ after `npm run build`, one line per problem:
// HR-1 base path, HR-2 index.html and 404.html at the root, HR-3 content-hashed JS, CSS and data,
// HR-4/NFR-5 size limits, HR-7/NFR-32 CSP meta tag, NFR-31 no third-party resources,
// NFR-40/AT-5 attribution footer on every page, FR-83 title, description and canonical URL,
// NFR-1 first-load budgets per kind of route, which it also reports, AT-4/C-6 aggregates only for
// the 2000–2003 comparison, and R-6: with CHANGE_MODULE=off, nothing of the change module.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { basePath, changeModule } from '../site.config.js';

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
// preloads; the map's chunk loads later and is measured by e2e/budget.e2e.ts. Data are the files
// each kind of route fetches, with a society selected (the worst case), named by their prefix
// before the hash (src/lib/data/files.ts).
const JS_CSS_BUDGET = 200 * 1024;
const DATA_BUDGET = 300 * 1024;
// The quiz and the story load more as the reader goes on (decisions 80 and 81): e2e/budget.e2e.ts
// measures that; here the home page counts the picker's societies and the story the files its
// first steps fetch.
const ROUTE_DATA = {
	home: ['societies'],
	story: ['global-all', 'cells-all', 'societies'],
	explore: ['societies', 'global-all', 'cells-all'],
	cell: ['societies', 'global-all', 'cells-all', 'land-110m'],
	societies: ['societies'],
	society: ['societies', 'global-all', 'cells-all', 'similarity-all'],
	audiences: ['societies', 'contexts-all'],
	audience: ['societies', 'contexts-all'],
	change: ['societies', 'change-all'],
	'change-society': ['societies', 'change-all'],
	other: []
};
/** @param {string} file */
const kindOf = (file) =>
	file === 'index.html'
		? 'home'
		: file === 'story/index.html'
			? 'story'
			: file === 'explore/index.html'
				? 'explore'
				: /^explore\/[^/]+\/[^/]+\/index\.html$/.test(file)
					? 'cell'
					: file === 'societies/index.html'
						? 'societies'
						: /^societies\/[a-z]{3}\/index\.html$/.test(file)
							? 'society'
							: file === 'audiences/index.html'
								? 'audiences'
								: /^audiences\/[a-z]+\/index\.html$/.test(file)
									? 'audience'
									: file === 'change/index.html'
										? 'change'
										: /^change\/[a-z]{3}\/index\.html$/.test(file)
											? 'change-society'
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

// AT-4, C-6, DR-16: the 2000–2003 survey reaches the site only as the change files' society × pair
// aggregates. These are the keys those files may hold; field names are compared as the privacy
// gate compares them (pipeline/privacy.py), with the 2000–2003 file's respondent-level columns
// added to DR-16's.
const CHANGE_KEYS = {
	'': ['behaviors', 'cells', 'global', 'grid', 'sample', 'societies', 'source'],
	grid: ['behaviors', 'situations'],
	cells: ['diff', 'diff_minus', 'diff_plus', 'mean0', 'mean1', 'n0', 'n1', 'sd0', 'sd1'],
	societies: ['code', 'diff', 'diff_minus', 'diff_plus', 'n0', 'n_cells'],
	global: ['diff', 'diff_minus', 'diff_plus', 'mean0', 'mean1', 'n_societies'],
	behaviors: ['behavior', 'increased', 'mean', 'mean_minus', 'mean_plus', 'n_societies', 'sd']
};
const OLDER_SURVEY_KEYS = new Set(['n0', 'mean0', 'sd0']);
const FORBIDDEN_FIELDS = new Set([
	'responseid',
	'startdate',
	'enddate',
	'duration',
	'durationinseconds',
	'progress',
	'beliefgodorig',
	'site',
	'countrycarib',
	'age',
	'agesc',
	'ridincountry',
	'rating'
]);
const RESPONSE_ID = /(?<![A-Za-z0-9])R_[A-Za-z0-9]{15}(?![A-Za-z0-9])/;
const normalize = (/** @type {string} */ name) => name.replace(/[\s_-]/g, '').toLowerCase();
// FR-52, NFR-41: what every change page must say, and whom it credits.
const PROVENANCE = [
	'data-provenance',
	'not a change in anyone',
	'Only summaries of the 2000–2003 survey are shown',
	'Gelfand et al. (2011)',
	'https://doi.org/10.1126/science.1197754',
	'shared by the GSN authors',
	'https://doi.org/10.17605/OSF.IO/SH4RB'
];
const CHANGE_SOCIETY_PAGES = 26;

/**
 * Every key of a JSON value, at any depth.
 * @param {unknown} value
 * @param {Set<string>} keys
 * @returns {Set<string>}
 */
function keysOf(value, keys = new Set()) {
	if (Array.isArray(value)) for (const item of value) keysOf(item, keys);
	else if (value && typeof value === 'object') {
		for (const [key, item] of Object.entries(value)) {
			keys.add(key);
			keysOf(item, keys);
		}
	}
	return keys;
}

/**
 * AT-4: a change file holds only the aggregate tables, no array longer than societies × 120 and
 * no group of fewer than 10 (DR-9). Problems name the field, never a value.
 * @param {string} file
 * @param {any} doc
 * @returns {string[]}
 */
function checkChangeFile(file, doc) {
	const problems = [];
	for (const [table, allowed] of Object.entries(CHANGE_KEYS)) {
		const value = table ? doc[table] : doc;
		const keys = value && typeof value === 'object' ? Object.keys(value).sort() : [];
		if (JSON.stringify(keys) !== JSON.stringify(allowed)) {
			problems.push(`AT-4: ${file} ${table || 'top level'} has keys ${keys.join(', ')}`);
		}
	}
	const societies = doc.societies?.code?.length ?? 0;
	const limit = societies * 120;
	for (const table of ['cells', 'societies', 'global', 'behaviors']) {
		for (const [key, column] of Object.entries(doc[table] ?? {})) {
			if (!Array.isArray(column) || column.length > limit) {
				problems.push(`AT-4: ${file} ${table}.${key} is longer than societies × 120 pairs`);
			}
		}
	}
	for (const [table, key] of [
		['cells', 'n0'],
		['cells', 'n1'],
		['societies', 'n0']
	]) {
		const small = (doc[table]?.[key] ?? []).filter(
			(/** @type {unknown} */ n) => n !== null && !(typeof n === 'number' && n >= 10)
		).length;
		if (small) problems.push(`DR-9: ${file} ${table}.${key} has ${small} values below 10`);
	}
	return problems;
}

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

// AT-4, C-6, DR-16: no built data file carries a respondent-level field or response ID, and only
// the three change files carry 2000–2003 values (decision 76).
const olderSurveyFiles = [];
for (const file of files.filter((f) => f.endsWith('.json'))) {
	const text = readFileSync(join(root, file), 'utf8');
	const doc = JSON.parse(text);
	const keys = keysOf(doc);
	for (const key of keys) {
		if (FORBIDDEN_FIELDS.has(normalize(key))) {
			problems.push(`DR-16: ${file} has a respondent-level field ${key}`);
		}
	}
	if (RESPONSE_ID.test(text)) problems.push(`DR-16: ${file} holds something like a response ID`);
	if ([...keys].some((key) => OLDER_SURVEY_KEYS.has(key))) {
		olderSurveyFiles.push(file);
		problems.push(...checkChangeFile(file, doc));
	}
}
const changeFiles = files.filter((f) =>
	/^_app\/immutable\/assets\/change-(all|paper|attention)\.[^.]+\.json$/.test(f)
);
const sitemap = files.includes('sitemap.xml')
	? readFileSync(join(root, 'sitemap.xml'), 'utf8')
	: '';
const changePages = files.filter((f) => /^change\/([a-z]{3}\/)?index\.html$/.test(f));
// The story's change step carries the provenance note too (FR-52, FR-64; decision 70).
const provenancePages = [...changePages, ...files.filter((f) => f === 'story/index.html')];
if (changeModule) {
	if (changeFiles.length !== 3) {
		problems.push(`AT-4: expected the three change files, found ${changeFiles.length}`);
	}
	for (const file of olderSurveyFiles.filter((f) => !changeFiles.includes(f))) {
		problems.push(`AT-4, C-6: ${file} holds 2000–2003 values but is not a change file`);
	}
	if (changePages.length !== CHANGE_SOCIETY_PAGES + 1) {
		problems.push(`FR-50: expected /change/ and 26 society pages, found ${changePages.length}`);
	}
	if (!provenancePages.includes('story/index.html'))
		problems.push('FR-64: story/index.html is missing');
	for (const file of provenancePages) {
		const html = readFileSync(join(root, file), 'utf8');
		for (const text of PROVENANCE) {
			if (!html.includes(text)) problems.push(`FR-52, NFR-41: ${file} lacks ${text}`);
		}
	}
	if ((sitemap.match(/\/change\//g) ?? []).length !== CHANGE_SOCIETY_PAGES + 1) {
		problems.push('NFR-60: the sitemap does not list /change/ and the 26 society pages');
	}
} else {
	// R-6 (decision 75): a build without the change module leaves no trace of it.
	for (const file of [...changePages, ...changeFiles, ...olderSurveyFiles]) {
		problems.push(`R-6: ${file} is in a build without the change module`);
	}
	if (sitemap.includes('/change/')) problems.push('R-6: the sitemap lists the change pages');
	for (const file of files.filter((f) => /\.(html|js)$/.test(f))) {
		const text = readFileSync(join(root, file), 'utf8');
		if (text.includes('data-provenance')) problems.push(`R-6: ${file} holds the change module`);
		if (file.endsWith('.html')) {
			if (text.includes(`href="${basePath}/change/`)) {
				problems.push(`R-6: ${file} links to the change module`);
			}
			if (text.includes('2000–2003 comparison data')) {
				problems.push(`R-6: ${file} credits the 2000–2003 data`);
			}
		}
	}
}

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
console.log(
	`check-build: ok, ${pages} pages and ${files.length} files, ${megabytes} MB in build/` +
		(changeModule
			? `; the 2000–2003 survey only in ${changeFiles.length} change files (AT-4)`
			: '; no change module (R-6)')
);
console.log('NFR-1 first load, gzip (largest page of each kind):');
for (const [kind, { page, code, data }] of Object.entries(worst)) {
	console.log(
		`  ${kind.padEnd(14)} ${page.padEnd(37)} JS+CSS ${kb(code).padStart(9)} of 200 KB` +
			`   data ${kb(data).padStart(9)} of 300 KB`
	);
}
