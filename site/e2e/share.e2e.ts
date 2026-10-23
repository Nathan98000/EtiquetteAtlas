import { origin } from '../site.config.js';
import { expect, test, url } from './helpers';

// AT-7, FR-82, FR-83: each route's prerendered HTML, read without JavaScript, points to its share
// image, which the server sends as a 1200 × 630 PNG. scripts/check-build.js checks every route;
// this samples one of each kind as GitHub Pages would serve them.

const ROUTES: [string, string][] = [
	['', 'home'],
	['explore/', 'explore'],
	['explore/kiss/job-interview/', 'explore/kiss/job-interview'],
	['societies/', 'societies'],
	['societies/chl/', 'societies/chl'],
	['audiences/', 'audiences'],
	['audiences/usemphone/', 'audiences'],
	['change/', 'change'],
	['change/jpn/', 'change'],
	['story/', 'story'],
	['method/', 'method']
];

const meta = (html: string, key: string) =>
	html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];

for (const [path, card] of ROUTES) {
	test(`AT-7, FR-83: /${path} shares ${card}.png, a 1200 × 630 PNG`, async ({ request }) => {
		const html = await (await request.get(url(path))).text();
		const image = meta(html, 'og:image');
		expect(image).toBe(`${origin}${url(`share/${card}.png`)}`);
		expect(meta(html, 'twitter:card')).toBe('summary_large_image');
		expect(meta(html, 'og:image:width')).toBe('1200');
		expect(meta(html, 'og:image:height')).toBe('630');
		expect(meta(html, 'og:image:alt')?.length).toBeGreaterThan(60);

		const response = await request.get(new URL(image!).pathname);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe('image/png');
		const png = await response.body();
		expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
	});
}

test('FR-83, decision 89: the 404 page has no share image', async ({ request }) => {
	const html = await (await request.get(url('no/such/page/'))).text();
	expect(meta(html, 'og:image')).toBeUndefined();
});
