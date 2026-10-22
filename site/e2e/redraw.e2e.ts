import { expect, test, type Page } from '@playwright/test';
import { matrixReady, swarmReady, url } from './helpers';

// NFR-4: changing the society, sample or scale redraws every visible view within 100 ms on a
// laptop and 300 ms on a mid-range phone, approximated here by slowing the CPU four times.
// Timed in the page, from the control's click to the frame after the chart changed, with the
// data files already loaded (their download time is a network matter, NFR-1).

async function redraw(page: Page, chart: string, click: string): Promise<number> {
	return page.evaluate(
		([chartSelector, clickSelector]) =>
			new Promise<number>((done) => {
				const target = document.querySelector(chartSelector)!;
				const start = performance.now();
				const observer = new MutationObserver(() => {
					observer.disconnect();
					requestAnimationFrame(() => done(performance.now() - start));
				});
				observer.observe(target, { subtree: true, childList: true, attributes: true });
				const control = document.querySelector(clickSelector)!;
				if (control instanceof HTMLElement) control.click();
				else control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			}),
		[chart, click]
	);
}

async function warm(page: Page) {
	for (const sample of ['paper', 'attention', 'all']) {
		await page.locator(`input[name="sample"][value="${sample}"]`).check();
		await expect(page).toHaveURL(
			sample === 'all' ? /^(?!.*sample=)/ : new RegExp(`sample=${sample}`)
		);
		await page.waitForLoadState('networkidle');
	}
}

for (const [label, rate, limit] of [
	['a laptop', 1, 100],
	['a mid-range phone (CPU ÷ 4)', 4, 300]
] as const) {
	test(`NFR-4: the drill-down redraws within ${limit} ms on ${label}`, async ({
		page
	}, testInfo) => {
		await page.goto(url('explore/usemphone/funeral/?society=chl'));
		await swarmReady(page);
		await warm(page);
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate });
		const times = {
			sample: await redraw(page, '.beeswarm', 'input[name="sample"][value="paper"]'),
			scale: await redraw(page, '.beeswarm', 'input[name="scale"][value="centered"]'),
			society: await redraw(page, '.beeswarm', '.beeswarm [data-code="JPN"]')
		};
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
		const line = Object.entries(times)
			.map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
			.join(', ');
		console.log(`NFR-4 drill-down on ${label}: ${line}`);
		await testInfo.attach('redraw', { body: line, contentType: 'text/plain' });
		for (const time of Object.values(times)) expect(time).toBeLessThan(limit);
	});

	test(`NFR-4: a fingerprint redraws within ${limit} ms on ${label}`, async ({
		page
	}, testInfo) => {
		// Japan has similar societies in every sample, so the link exists after the sample switch.
		await page.goto(url('societies/jpn/'));
		await matrixReady(page);
		await warm(page);
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate });
		const times = {
			sample: await redraw(page, '.grid-view', 'input[name="sample"][value="attention"]'),
			scale: await redraw(page, '.grid-view', 'input[name="scale"][value="centered"]'),
			// The society is the path: a similar society's link opens its fingerprint.
			society: await redraw(page, '.grid-view', '[aria-labelledby="similar-title"] li a.name')
		};
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
		const line = Object.entries(times)
			.map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
			.join(', ');
		console.log(`NFR-4 fingerprint on ${label}: ${line}`);
		await testInfo.attach('redraw', { body: line, contentType: 'text/plain' });
		for (const time of Object.values(times)) expect(time).toBeLessThan(limit);
	});

	test(`NFR-4: the matrix redraws within ${limit} ms on ${label}`, async ({ page }, testInfo) => {
		await page.goto(url('explore/?society=chl'));
		await matrixReady(page);
		await warm(page);
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate });
		const times = {
			sample: await redraw(page, '.grid-view', 'input[name="sample"][value="attention"]'),
			scale: await redraw(page, '.grid-view', 'input[name="scale"][value="centered"]')
		};
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
		const line = Object.entries(times)
			.map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
			.join(', ');
		console.log(`NFR-4 matrix on ${label}: ${line}`);
		await testInfo.attach('redraw', { body: line, contentType: 'text/plain' });
		for (const time of Object.values(times)) expect(time).toBeLessThan(limit);
	});
}
