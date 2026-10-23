// AT-10 and the HTTP side of AT-9 on the deployed site, after a push (decision 102): fetches every
// file of the local build/ (built from the deployed commit) from GitHub Pages, uncompressed, and
// reports the deployed site's total size against NFR-5's 60 MB, its largest file against 5 MB, any
// file missing, and any Set-Cookie header (C-11). The browser side of AT-9 is
// `npm run test:deployed`. Run with `npm run check:deployed`; DEPLOYED_ORIGIN overrides the origin.

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { basePath, origin as defaultOrigin } from '../site.config.js';

const root = resolve(import.meta.dirname, '..', 'build');
const origin = process.env.DEPLOYED_ORIGIN ?? defaultOrigin;
const MAX_SITE_BYTES = 60 * 1024 * 1024;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const CONCURRENCY = 8;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

const files = walk(root)
	.map((path) => relative(root, path).split(sep).join('/'))
	.filter((file) => file !== '.nojekyll');
const problems = [];
let total = 0;
let largest = { file: '', bytes: 0 };
let differing = 0;
const queue = [...files];

async function fetchOne(/** @type {string} */ file) {
	// Folders are served from their index.html, as readers reach them.
	const path = file.endsWith('/index.html') ? file.slice(0, -'index.html'.length) : file;
	const response = await fetch(`${origin}${basePath}/${path === 'index.html' ? '' : path}`, {
		headers: { 'accept-encoding': 'identity' },
		redirect: 'manual'
	});
	if (response.status !== 200) {
		problems.push(`AT-10: ${file} answers ${response.status}`);
		return;
	}
	if (response.headers.has('set-cookie')) problems.push(`AT-9, C-11: ${file} sets a cookie`);
	const bytes = (await response.arrayBuffer()).byteLength;
	total += bytes;
	if (bytes > largest.bytes) largest = { file, bytes };
	if (bytes > MAX_FILE_BYTES) problems.push(`AT-10: ${file} is over 5 MB`);
	if (bytes !== statSync(join(root, file)).size) differing += 1;
}

await Promise.all(
	Array.from({ length: CONCURRENCY }, async () => {
		for (let file = queue.shift(); file !== undefined; file = queue.shift()) await fetchOne(file);
	})
);

const mb = (/** @type {number} */ n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
if (total > MAX_SITE_BYTES) problems.push(`AT-10: the deployed site is ${mb(total)}, over 60 MB`);
if (problems.length) {
	for (const problem of problems) console.error(`FAIL ${problem}`);
	process.exit(1);
}
console.log(
	`check-deployed: ok, ${files.length} files at ${origin}${basePath}/, ${mb(total)} of 60 MB; ` +
		`largest ${largest.file} ${mb(largest.bytes)} of 5 MB; no cookies (AT-9, AT-10)` +
		(differing
			? `; ${differing} files differ in size from build/: rebuild from the deployed commit`
			: '')
);
