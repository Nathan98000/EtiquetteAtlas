// Photographs the share-image cards (FR-82; decisions 88 to 92). `npm run cards` first builds the
// card pages in src/cards/ into .cards/ (CARDS=on vite build); this script opens each one at
// 1200 × 630 in Playwright's Chromium, checks it, and writes its PNG to share-images/ with a
// manifest. Each card must carry the NFR-40 attribution inside the frame (AT-5, C-7), and nothing on
// it may spill outside its area or the image; any failure stops the run. Each PNG is rewritten with
// a 256-colour palette (scripts/png.js), a third of the size (NFR-5). The build then publishes
// the images under build/share/ (vite.config.ts) and check-build.js checks them (AT-7).

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { attribution } from '../src/lib/attribution.ts';
import { quantize } from './png.js';
import { SHARE_HEIGHT, SHARE_SOURCE, SHARE_WIDTH } from '../src/lib/share.ts';
import { shareInputsHash } from './share-inputs.js';

const site = resolve(import.meta.dirname, '..');
const cards = join(site, '.cards');
const out = join(site, SHARE_SOURCE);
// About 50 KB is typical; the cap keeps 247 images well inside NFR-5's 60 MB (decision 92).
const MAX_BYTES = 100 * 1024;
const PAGES = 4;

/** NFR-40 on an image: authors, year, title, the OSF link, the licence and its link, the note. */
const CREDIT = [
	'Eriksson',
	`(${attribution.year})`,
	attribution.title,
	attribution.dataUrl.replace('https://', ''),
	attribution.license,
	attribution.licenseUrl.replace('https://', '').replace(/\/$/, ''),
	'aggregated and modelled by The Etiquette Atlas'
];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

/** A PNG's width and height, from its header. @param {Buffer} png */
function pngSize(png) {
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const pages = walk(cards)
	.filter((file) => file.endsWith(`${sep}index.html`) && !file.includes(`${sep}_app${sep}`))
	.map((file) => relative(cards, dirname(file)).split(sep).join('/'))
	.sort();
if (pages.length === 0) {
	console.error('No cards in .cards/: run `npm run cards`, which builds them first.');
	process.exit(1);
}

rmSync(out, { recursive: true, force: true });
const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: SHARE_WIDTH, height: SHARE_HEIGHT },
	deviceScaleFactor: 1,
	colorScheme: 'light',
	reducedMotion: 'reduce'
});
/** @type {{ path: string, bytes: number, sha256: string, headline: string }[]} */
const images = [];
/** @type {string[]} */
const problems = [];

/** @param {import('@playwright/test').Page} page @param {string} card */
async function shoot(page, card) {
	await page.goto(pathToFileURL(join(cards, card, 'index.html')).href);
	await page.evaluate(() => document.fonts.ready);
	const result = await page.evaluate(
		({ width, height }) => {
			const root = document.querySelector('[data-card]');
			const credit = document.querySelector('[data-attribution]');
			const body = root?.querySelector('.body');
			if (!root || !credit || !body) return { error: 'no card, body or attribution' };
			const issues = [];
			const doc = document.documentElement;
			if (doc.scrollWidth > width || doc.scrollHeight > height) issues.push('the page scrolls');
			const box = credit.getBoundingClientRect();
			if (box.top < 0 || box.bottom > height + 0.5 || box.right > width + 0.5) {
				issues.push('the attribution is outside the frame');
			}
			// Everything in the text and chart area stays between the header and the attribution,
			// inside the side margins.
			const header = root.querySelector('header')?.getBoundingClientRect();
			for (const el of body.querySelectorAll('*')) {
				const r = el.getBoundingClientRect();
				if (r.width === 0 && r.height === 0) continue;
				if (
					r.left < 40 ||
					r.right > width - 40 ||
					r.bottom > box.top + 0.5 ||
					r.top < (header?.bottom ?? 0) - 0.5
				) {
					const what = el.tagName.toLowerCase() + (el.textContent?.trim().slice(0, 40) ?? '');
					issues.push(`${what} spills outside its area`);
					break;
				}
			}
			return {
				issues,
				credit: credit.textContent?.replace(/\s+/g, ' ') ?? '',
				headline: root.querySelector('[data-headline]')?.textContent?.trim() ?? ''
			};
		},
		{ width: SHARE_WIDTH, height: SHARE_HEIGHT }
	);
	if ('error' in result) {
		problems.push(`${card}: ${result.error}`);
		return;
	}
	for (const issue of result.issues) problems.push(`${card}: ${issue}`);
	for (const text of CREDIT) {
		if (!result.credit.includes(text)) problems.push(`${card}: the attribution lacks ${text}`);
	}
	const { png, worst, shifted } = quantize(
		await page.screenshot({ type: 'png', animations: 'disabled' })
	);
	// Edge shades may move a little; flat colours never do (scripts/png.js).
	if (worst > 64 || shifted > 0.002) {
		problems.push(`${card}: the palette moves colours too far (${worst}, ${shifted})`);
	}
	const { width, height } = pngSize(png);
	if (width !== SHARE_WIDTH || height !== SHARE_HEIGHT) {
		problems.push(`${card}: the image is ${width} × ${height}`);
	}
	if (png.length > MAX_BYTES) problems.push(`${card}: the image is ${png.length} bytes`);
	const path = `${card}.png`;
	mkdirSync(dirname(join(out, path)), { recursive: true });
	writeFileSync(join(out, path), png);
	images.push({
		path,
		bytes: png.length,
		sha256: createHash('sha256').update(png).digest('hex'),
		headline: result.headline
	});
}

const started = Date.now();
const queue = [...pages];
await Promise.all(
	Array.from({ length: PAGES }, async () => {
		const page = await context.newPage();
		for (let card = queue.shift(); card !== undefined; card = queue.shift()) {
			await shoot(page, card);
		}
	})
);
await browser.close();

if (problems.length) {
	for (const problem of problems) console.error(`FAIL ${problem}`);
	process.exit(1);
}
images.sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
	inputs: shareInputsHash(),
	width: SHARE_WIDTH,
	height: SHARE_HEIGHT,
	images
};
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
const total = images.reduce((sum, image) => sum + image.bytes, 0);
const largest = images.reduce((a, b) => (b.bytes > a.bytes ? b : a));
console.log(
	`share-images: ${images.length} cards in ${((Date.now() - started) / 1000).toFixed(1)} s, ` +
		`${(total / 1024 / 1024).toFixed(2)} MB (average ${(total / images.length / 1024).toFixed(1)} KB, ` +
		`largest ${largest.path} ${(largest.bytes / 1024).toFixed(1)} KB)`
);
