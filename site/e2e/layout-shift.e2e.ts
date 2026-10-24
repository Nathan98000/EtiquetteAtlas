import { expect, test, url } from './helpers';

// NFR-2: prerendered pages cannot read their query string, so a link that names a society, a
// sample or the centered scale used to move the page once the app applied it. app.html now marks
// such a link before the first paint and the pages reserve what will appear (the society's box and
// key, the sample's badge, the scale's notes, a longer lede, Then and now's notice), so these loads
// stay well under Lighthouse's 0.1.

const LINKS = [
	'explore/?society=chl&sample=paper',
	'explore/?scale=centered',
	'explore/usemphone/funeral/?society=chl',
	'explore/eat/bus/?society=jpn&scale=centered',
	'societies/usa/?compare=jpn',
	'audiences/?society=jpn',
	'audiences/usemphone/?society=chl',
	'audiences/kiss/?society=sau',
	'change/?society=chl',
	'change/jpn/?sample=attention'
];

// 412 × 823 is Lighthouse's mobile screen.
for (const [width, height] of [
	[375, 812],
	[412, 823],
	[1280, 800]
]) {
	test.describe(`at ${width} px`, () => {
		test.use({ viewport: { width, height } });

		for (const path of LINKS) {
			test(`NFR-2: /${path} does not shift as its query applies`, async ({ page }) => {
				await page.addInitScript(() => {
					const w = window as unknown as { shift: number };
					w.shift = 0;
					new PerformanceObserver((list) => {
						for (const entry of list.getEntries() as (PerformanceEntry & {
							value: number;
							hadRecentInput: boolean;
						})[]) {
							if (!entry.hadRecentInput) w.shift += entry.value;
						}
					}).observe({ type: 'layout-shift', buffered: true });
				});
				await page.goto(url(path));
				await page.waitForLoadState('networkidle');
				await page.waitForTimeout(500);
				const shift = await page.evaluate(() => (window as unknown as { shift: number }).shift);
				expect(shift, 'cumulative layout shift').toBeLessThan(0.05);
			});
		}
	});
}
