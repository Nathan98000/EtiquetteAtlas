// Checks the static artifact in build/ after `npm run build`, one line per problem:
// HR-1 base path, HR-2 index.html and 404.html at the root, HR-3 content-hashed JS, CSS and data,
// HR-4/NFR-5 size limits, HR-7/NFR-32 CSP meta tag, NFR-31 no third-party resources,
// NFR-40/AT-5 attribution footer on every page.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { basePath } from '../site.config.js';

const root = resolve(import.meta.dirname, '..', 'build');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SITE_BYTES = 60 * 1024 * 1024;
// HR-3 covers JavaScript, CSS and data files. SvelteKit's own version check reads the one
// unhashed file below; images such as share cards may keep stable names.
const MUST_BE_HASHED = /\.(js|css|json|csv|topojson)$/;
const UNHASHED_ALLOWED = new Set(['_app/version.json']);
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
	if (MUST_BE_HASHED.test(file) && !UNHASHED_ALLOWED.has(file)) {
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

if (problems.length) {
	for (const problem of problems) console.error(`FAIL ${problem}`);
	process.exit(1);
}
const megabytes = (total / 1024 / 1024).toFixed(2);
console.log(`check-build: ok, ${pages} pages and ${files.length} files, ${megabytes} MB in build/`);
