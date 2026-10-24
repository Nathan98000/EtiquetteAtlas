import type { Page } from '@playwright/test';
import {
	arrowsReady,
	audiencesReady,
	expect,
	matrixReady,
	slopeReady,
	swarmReady,
	test,
	url
} from './helpers';

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
	// Decision 120: the sample waits under Options.
	if (!(await page.locator('input[name="sample"]').first().isVisible())) {
		await page.getByRole('button', { name: 'Options' }).click();
	}
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

	// The audiences show raw scores whatever the scale, so a scale change redraws only the note
	// beside them (decision 60); the page is the view timed.
	for (const [route, ready, view] of [
		['audiences/?society=jpn', audiencesReady, '.audiences-page'],
		['audiences/listen/?society=jpn', slopeReady, '.audience-page']
	] as const) {
		test(`NFR-4: /${route.replace(/\?.*$/, '')} redraws within ${limit} ms on ${label}`, async ({
			page
		}, testInfo) => {
			await page.goto(url(route));
			await ready(page);
			await warm(page);
			// The picker lists its societies before the timed click on one of them.
			await page.getByRole('combobox', { name: 'Society' }).fill('Brazil');
			await expect(page.getByRole('option', { name: /^Brazil/ })).toBeVisible();
			const cdp = await page.context().newCDPSession(page);
			await cdp.send('Emulation.setCPUThrottlingRate', { rate });
			const times = {
				society: await redraw(page, view, '[role="option"]'),
				sample: await redraw(page, view, 'input[name="sample"][value="attention"]'),
				scale: await redraw(page, view, 'input[name="scale"][value="centered"]'),
				scope: await redraw(page, view, 'input[name="scope"][value="global"]')
			};
			await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
			const line = Object.entries(times)
				.map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
				.join(', ');
			console.log(`NFR-4 /${route} on ${label}: ${line}`);
			await testInfo.attach('redraw', { body: line, contentType: 'text/plain' });
			for (const time of Object.values(times)) expect(time).toBeLessThan(limit);
		});
	}

	// The change routes show raw scores whatever the scale, so a scale change redraws only the
	// note above the chart (decision 72); a society in both surveys is the path, so picking one
	// moves to its page (decision 67). The page is the view timed.
	test(`NFR-4: a society's change page redraws within ${limit} ms on ${label}`, async ({
		page
	}, testInfo) => {
		await page.goto(url('change/jpn/'));
		await arrowsReady(page);
		await warm(page);
		await page.getByRole('combobox', { name: 'Society' }).fill('Brazil');
		await expect(page.getByRole('option', { name: /^Brazil/ })).toBeVisible();
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate });
		const times = {
			society: await redraw(page, '.change-page', '[role="option"]'),
			sample: await redraw(page, '.change-page', 'input[name="sample"][value="attention"]'),
			scale: await redraw(page, '.change-page', 'input[name="scale"][value="centered"]')
		};
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
		const line = Object.entries(times)
			.map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
			.join(', ');
		console.log(`NFR-4 change page on ${label}: ${line}`);
		await testInfo.attach('redraw', { body: line, contentType: 'text/plain' });
		for (const time of Object.values(times)) expect(time).toBeLessThan(limit);
	});

	test(`NFR-4: the change overview redraws within ${limit} ms on ${label}`, async ({
		page
	}, testInfo) => {
		await page.goto(url('change/'));
		await arrowsReady(page);
		await warm(page);
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate });
		const times = {
			sample: await redraw(page, '.change-page', 'input[name="sample"][value="paper"]'),
			scale: await redraw(page, '.change-page', 'input[name="scale"][value="centered"]')
		};
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
		const line = Object.entries(times)
			.map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
			.join(', ');
		console.log(`NFR-4 change overview on ${label}: ${line}`);
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
