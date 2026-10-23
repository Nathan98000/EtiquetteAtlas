// What the share images are made from (R-9, decision 90): the data, the card templates and the
// site code they import, the stylesheet, the locked dependencies and the build settings. The
// manifest records their hash, so check-build.js can warn when the images are older than their
// inputs. The images job in .github/workflows/ci.yml keys its cache on the same files: keep the
// two lists in step.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const site = resolve(import.meta.dirname, '..');

/** Folders and files, relative to site/. */
export const SHARE_INPUTS = [
	'../data/derived',
	'src/cards',
	'src/lib',
	'src/app.css',
	'package-lock.json',
	'vite.config.ts',
	'site.config.js',
	'scripts/share-images.js',
	'scripts/share-inputs.js',
	'scripts/png.js',
	'e2e/fonts.conf'
];

/** @param {string} path @returns {string[]} */
function files(path) {
	try {
		return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
			files(join(path, entry.name))
		);
	} catch {
		return [path];
	}
}

/** A SHA-256 over every input file's path and content, in a fixed order. */
export function shareInputsHash() {
	const hash = createHash('sha256');
	const all = SHARE_INPUTS.flatMap((input) => files(resolve(site, input)))
		.map((file) => relative(site, file).split(sep).join('/'))
		.filter((file) => !file.endsWith('.DS_Store'))
		.sort();
	for (const file of all) {
		hash.update(`${file}\n`);
		hash.update(readFileSync(resolve(site, file)));
	}
	return hash.digest('hex');
}
