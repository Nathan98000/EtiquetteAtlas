// Checks the static artifact in build/ after `npm run build`, one line per problem:
// HR-1 base path, HR-2 index.html and 404.html at the root, HR-3 content-hashed JS, CSS and data,
// HR-4/NFR-5 size limits, HR-7/NFR-32 CSP meta tag, NFR-31 no third-party resources but the
// analytics beacon, FR-90 the beacon on every page,
// NFR-40/AT-5 attribution footer on every page, FR-83 title, description and canonical URL,
// NFR-1 first-load budgets per kind of route, which it also reports, AT-4/C-6 aggregates only for
// the 2000–2003 comparison, AT-7/FR-82/FR-83 a share image behind every route's meta tags, and
// R-6: with CHANGE_MODULE=off, nothing of the change module.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { analytics, basePath, changeModule, origin } from '../site.config.js';
import {
	CHANGE_CARD,
	SHARE_DIR,
	SHARE_HEIGHT,
	SHARE_SOURCE,
	SHARE_WIDTH
} from '../src/lib/share.ts';
import { shareInputsHash } from './share-inputs.js';

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
// FR-90: the snippet in src/app.html, as SvelteKit writes it into each page (whitespace collapsed).
const BEACON_TAG =
	`<script type="module" src="${analytics.script}" ` +
	`data-cf-beacon='{"token": "${analytics.token}"}'>`;

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
		// NFR-32: this origin, hashed inline scripts and the beacon's script host; connections to
		// this origin and the beacon's reporting host. Nothing broader.
		const directive = (/** @type {string} */ name) =>
			(csp.match(new RegExp(`(?:^|;)\\s*${name} ([^;]*)`))?.[1] ?? '').trim().split(/\s+/);
		const scripts = directive('script-src');
		const thirdParty = scripts.filter((s) => s !== "'self'" && !/^'sha256-[^']+'$/.test(s));
		if (thirdParty.join(' ') !== analytics.scriptOrigin || scripts[0] !== "'self'") {
			problems.push(`NFR-32: ${file} allows scripts from ${scripts.join(' ')}`);
		}
		const connect = directive('connect-src').join(' ');
		if (connect !== `'self' ${analytics.reportOrigin}`) {
			problems.push(`NFR-32: ${file} allows connections to ${connect}`);
		}
	}
	// FR-90: the beacon on every page, the 404 page included, exactly as Cloudflare gave it.
	const beacons = (html.match(/<script\b[^>]*\bsrc="https:[^"]*"[^>]*>/g) ?? []).filter(
		(tag) => tag.replace(/\s+/g, ' ').replace(' >', '>') === BEACON_TAG
	);
	if (beacons.length !== 1) {
		problems.push(`FR-90: ${file} does not load the analytics beacon exactly once`);
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
	const external = html
		.replace(beacons[0] ?? BEACON_TAG, '')
		.match(
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

// AT-7, FR-82, FR-83: every prerendered route but the 404 page and placeholders points to its
// share image, absolute, with its size and alt text, and the image exists at 1200 × 630. The home
// page, the six modules, the 150 cells and the 90 societies each have one (246 without the change
// module, R-6), every one is used, and each is the image `npm run cards` checked (AT-5): its hash
// is in the manifest, which records the attribution check.
const SHARE_PREFIX = `${origin}${basePath}/${SHARE_DIR}/`;
const SHARE_COUNT = changeModule ? 247 : 246;
const MAX_SHARE_BYTES = 100 * 1024;
const shared = new Set();
let shareBytes = 0;
const meta = (/** @type {string} */ html, /** @type {string} */ key) =>
	html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];
for (const file of files.filter((f) => f.endsWith('.html') && f !== '404.html')) {
	const html = readFileSync(join(root, file), 'utf8');
	if (html.includes('<meta name="robots" content="noindex"')) continue;
	const image = meta(html, 'og:image');
	if (!image?.startsWith(SHARE_PREFIX) || !image.endsWith('.png')) {
		problems.push(`AT-7: ${file} has no share image under ${SHARE_PREFIX}`);
		continue;
	}
	const path = `${SHARE_DIR}/${image.slice(SHARE_PREFIX.length)}`;
	shared.add(path);
	if (!files.includes(path)) problems.push(`AT-7: ${file} points to ${path}, which is missing`);
	const expected = {
		'og:image:type': 'image/png',
		'og:image:width': String(SHARE_WIDTH),
		'og:image:height': String(SHARE_HEIGHT),
		'twitter:card': 'summary_large_image'
	};
	for (const [key, value] of Object.entries(expected)) {
		if (meta(html, key) !== value) problems.push(`FR-83: ${file} lacks ${key} ${value}`);
	}
	for (const key of ['og:image:alt', 'twitter:image:alt']) {
		if ((meta(html, key) ?? '').length < 40) problems.push(`FR-83: ${file} has no ${key}`);
	}
}
const images = files.filter((f) => f.startsWith(`${SHARE_DIR}/`));
const manifestPath = resolve(root, '..', SHARE_SOURCE, 'manifest.json');
/** @type {{ inputs: string, images: { path: string, sha256: string }[] } | null} */
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const hashes = new Map(manifest?.images.map((i) => [`${SHARE_DIR}/${i.path}`, i.sha256]) ?? []);
if (!manifest) problems.push(`AT-7: no ${SHARE_SOURCE}/manifest.json: run \`npm run cards\``);
if (images.length !== SHARE_COUNT) {
	problems.push(`AT-7: expected ${SHARE_COUNT} share images, found ${images.length}`);
}
for (const path of images) {
	const png = readFileSync(join(root, path));
	shareBytes += png.length;
	if (!shared.has(path)) problems.push(`AT-7: ${path} is not used by any page`);
	if (png.readUInt32BE(16) !== SHARE_WIDTH || png.readUInt32BE(20) !== SHARE_HEIGHT) {
		problems.push(`AT-7: ${path} is not ${SHARE_WIDTH} × ${SHARE_HEIGHT}`);
	}
	if (png.length > MAX_SHARE_BYTES) problems.push(`NFR-5: ${path} is over 100 KB`);
	if (manifest && hashes.get(path) !== createHash('sha256').update(png).digest('hex')) {
		problems.push(`AT-5: ${path} is not an image npm run cards checked`);
	}
}
if (!changeModule && files.includes(`${SHARE_DIR}/${CHANGE_CARD}.png`)) {
	problems.push(`R-6: ${SHARE_DIR}/${CHANGE_CARD}.png is in a build without the change module`);
}
const staleImages = manifest !== null && manifest.inputs !== shareInputsHash();

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
console.log(
	`AT-7: ${images.length} share images behind every route's meta tags, ` +
		`${(shareBytes / 1024 / 1024).toFixed(2)} MB (NFR-5: the site is ${megabytes} MB of 60 MB)`
);
// CI builds the images from the same commit; a local build may be ahead of them.
if (staleImages) {
	console.warn(`WARN share images are older than their inputs: rerun \`npm run cards\``);
}
console.log('NFR-1 first load, gzip (largest page of each kind):');
for (const [kind, { page, code, data }] of Object.entries(worst)) {
	console.log(
		`  ${kind.padEnd(14)} ${page.padEnd(37)} JS+CSS ${kb(code).padStart(9)} of 200 KB` +
			`   data ${kb(data).padStart(9)} of 300 KB`
	);
}
