import { expect, test, url } from './helpers';

// D-23 (design review), decision 138: on a phone, every module route shows the top of its
// main chart on the first screen, and no lede runs past 45 words. The chart's box is its reserved
// space, so it counts before the data arrive.

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

const ROUTES = [
	'story/',
	'explore/',
	'explore/?society=jpn',
	'explore/eat/bus/?society=jpn',
	'explore/sing/funeral/',
	// The longest title, over three lines on a phone.
	'explore/listen/job-interview/?society=jpn',
	'societies/',
	'societies/usa/',
	'societies/usa/?compare=jpn',
	'audiences/',
	'audiences/?society=jpn',
	'audiences/usemphone/',
	'audiences/usemphone/?society=jpn',
	'audiences/usemphone/?split=gender',
	'change/',
	'change/jpn/',
	'change/?society=chl'
];

for (const path of ROUTES) {
	test(`D-23: /${path} starts its chart on the first phone screen`, async ({ page }) => {
		await page.goto(url(path));
		const top = await page.evaluate(() => {
			const body = [...document.querySelectorAll<HTMLElement>('.chart-frame .body')].find(
				(el) => !el.hidden && el.getBoundingClientRect().height > 0
			);
			return body ? body.getBoundingClientRect().top + window.scrollY : null;
		});
		expect(top, 'a chart on the page').not.toBeNull();
		expect(top!, "the chart's top, in px from the page's top").toBeLessThan(812);
		const ledes = await page
			.locator('.lede')
			.evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim().split(/\s+/).length));
		for (const words of ledes) expect(words, 'words in the lede').toBeLessThanOrEqual(45);
	});
}
