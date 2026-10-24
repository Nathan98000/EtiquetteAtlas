import { expect, matrixReady, pickSample, sampleRadio, swarmReady, test, url } from './helpers';

test('AT-11: society, sample and scale update every view and the URL; back and forward restore them', async ({
	page
}) => {
	await page.goto(url('explore/usemphone/funeral/'));
	await swarmReady(page);

	// FR-3: type-ahead picks a society.
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.fill('chil');
	await expect(page.getByRole('listbox', { name: 'Societies' }).getByRole('option')).toHaveCount(1);
	await box.press('Enter');
	await expect(page).toHaveURL(/\?society=chl$/);
	await expect(box).toHaveValue('Chile');
	await expect(page.locator('.society-box')).toContainText(/^Respondents in Chile: /);
	await expect(page.locator('.beeswarm [aria-pressed="true"]')).toHaveAttribute('data-code', 'CHL');
	await expect(page.locator('.strip .mark').first()).toBeVisible();
	// Decision 44: the Societies link opens the selected society's fingerprint.
	await expect(page.getByRole('link', { name: 'Societies' })).toHaveAttribute(
		'href',
		/societies\/chl\/$/
	);

	// FR-4: the sample changes every view and shows its badge.
	const before = await page.locator('#swarm-summary').textContent();
	await pickSample(page, 'Passed the attention check');
	await expect(page).toHaveURL(/\?society=chl&sample=attention$/);
	await expect(page.locator('.badge')).toHaveText(/Passed the attention check: 80 societies/);
	await expect(page.locator('#swarm-summary')).not.toHaveText(before ?? '');

	// FR-5: the scale changes every view.
	await page.getByRole('radio', { name: "Relative to each society's average" }).check();
	await expect(page).toHaveURL(/\?society=chl&sample=attention&scale=centered$/);
	await expect(page.getByRole('heading', { name: "Every society's average answer" })).toBeVisible();
	// D-3: every centered chart says so beside its title, the first one with what centering does.
	await expect(page.locator('.scale-chip')).toHaveCount(3);
	await expect(page.locator('.scale-chip').first()).toContainText(
		"Relative to each society's own average. Each society's answers are shifted"
	);

	// FR-84: back and forward step through the states.
	await page.goBack();
	await expect(page).toHaveURL(/\?society=chl&sample=attention$/);
	await expect(page.getByRole('radio', { name: 'As answered' })).toBeChecked();
	await expect(page.getByRole('heading', { name: "Every society's average answer" })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\?society=chl$/);
	await expect(sampleRadio(page, 'All respondents')).toBeChecked();
	await expect(page.locator('.badge')).toHaveText('');
	await page.goBack();
	await expect(box).toHaveValue('');
	await page.goForward();
	await page.goForward();
	await expect(page).toHaveURL(/\?society=chl&sample=attention$/);
	await expect(sampleRadio(page, 'Passed the attention check')).toBeChecked();
	await expect(box).toHaveValue('Chile');
});

test('AT-11: the matrix follows the same controls', async ({ page }) => {
	await page.goto(url('explore/'));
	await matrixReady(page);
	await page.getByRole('combobox', { name: 'Society' }).fill('Japan');
	await page.getByRole('option', { name: /^Japan/ }).click();
	await expect(page).toHaveURL(/\?society=jpn$/);
	await expect(
		page
			.getByRole('grid')
			.getByRole('link', { name: /respondents in Japan/ })
			.first()
	).toBeVisible();
	await page.getByRole('radio', { name: "Relative to each society's average" }).check();
	await expect(page).toHaveURL(/\?society=jpn&scale=centered$/);
	await expect(page.locator('#matrix-summary')).toBeVisible();
	// D-3: the matrix barely changes when centered, and says so.
	const chip = page.locator('.scale-chip');
	await expect(chip).toContainText(/The global averages move by (0\.01 at most|less than 0\.01)/);
	await expect(chip.getByRole('link', { name: "society's fingerprint" })).toHaveAttribute(
		'href',
		/societies\/jpn\//
	);
	await chip.getByRole('button', { name: 'Show as answered' }).click();
	await expect(page).toHaveURL(/\?society=jpn$/);
	await expect(chip).toBeHidden();
	await page.goBack();
	await expect(
		page.getByRole('radio', { name: "Relative to each society's average" })
	).toBeChecked();
	await page.goBack();
	await expect(page.getByRole('radio', { name: 'As answered' })).toBeChecked();
});

test('AT-11: on a fingerprint, society, sample and scale update every view and the URL; back and forward restore them', async ({
	page
}) => {
	await page.goto(url('societies/chl/'));
	await matrixReady(page);
	const box = page.getByRole('combobox', { name: 'Society' });
	const facts = page.locator('details.facts');
	const similar = page.getByRole('region', { name: 'Most similar answers' });
	const lede = page.locator('.lede');
	await expect(box).toHaveValue('Chile');
	const chileSimilar = await similar.getByRole('listitem').allTextContents();

	// FR-3: the picker moves between fingerprints (decision 44).
	await box.fill('Japan');
	await page.getByRole('option', { name: /^Japan/ }).click();
	await expect(page).toHaveURL(/\/societies\/jpn\/$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respondents in Japan');
	await expect(page.getByRole('grid', { name: /^Respondents in Japan compared/ })).toBeVisible();
	await matrixReady(page);
	await expect(lede).toHaveText(/^Respondents in Japan were clearly/);
	await expect(similar.getByRole('listitem')).not.toHaveText(chileSimilar);
	await expect(facts).toContainText('Japanese');

	// FR-4: the sample changes the grid, summary, facts and similar societies.
	const before = await lede.textContent();
	await pickSample(page, 'Passed the attention check');
	await expect(page).toHaveURL(/\/societies\/jpn\/\?sample=attention$/);
	await expect(page.locator('.badge')).toHaveText(/Passed the attention check: 80 societies/);
	await expect(facts).toContainText('Respondents (the attention-check sample)');
	await expect(lede).not.toHaveText(before ?? '');

	// FR-5: the scale changes the grid's colours, marks and summary.
	const fills = () =>
		page
			.locator('.grid-view a[data-cell]')
			.evaluateAll((links) => links.map((a) => getComputedStyle(a).backgroundColor).join());
	const rawFills = await fills();
	await page.getByRole('radio', { name: "Relative to each society's average" }).check();
	await expect(page).toHaveURL(/\/societies\/jpn\/\?sample=attention&scale=centered$/);
	await expect(lede).toHaveText(/^Relative to each society's average, respondents in Japan/);
	expect(await fills()).not.toBe(rawFills);

	// FR-84: back and forward step through the states, the society included.
	await page.goBack();
	await expect(page.getByRole('radio', { name: 'As answered' })).toBeChecked();
	await expect(lede).toHaveText(/^Respondents in Japan/);
	await page.goBack();
	await expect(page).toHaveURL(/\/societies\/jpn\/$/);
	await expect(sampleRadio(page, 'All respondents')).toBeChecked();
	await page.goBack();
	await expect(page).toHaveURL(/\/societies\/chl\/$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respondents in Chile');
	await expect(box).toHaveValue('Chile');
	await page.goForward();
	await page.goForward();
	await expect(page).toHaveURL(/\/societies\/jpn\/\?sample=attention$/);
	await expect(box).toHaveValue('Japan');
	await expect(facts).toContainText('Respondents (the attention-check sample)');
});

test('NFR-13: by keyboard alone, pick a society, read its fingerprint and open a similar one', async ({
	page
}) => {
	await page.goto(url('societies/'));
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.focus();
	await page.keyboard.type('urug');
	await expect(page.getByRole('option', { name: /^Uruguay/ })).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/societies\/ury\/$/);
	await matrixReady(page);
	// Tab from the picker to the grid's one tab stop, then read a cell's details.
	let inGrid = false;
	for (let i = 0; i < 40 && !inGrid; i++) {
		await page.keyboard.press('Tab');
		inGrid = await page.evaluate(() => document.activeElement?.getAttribute('data-cell') !== null);
	}
	expect(inGrid, 'Tab reaches the grid').toBe(true);
	await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('complementary')).toContainText('Difference from the global average');
	// Tab on to the similar societies, which come after the fingerprint (D-20).
	let onSimilar = false;
	for (let i = 0; i < 20 && !onSimilar; i++) {
		await page.keyboard.press('Tab');
		onSimilar = await page.evaluate(
			() => !!document.activeElement?.closest('[aria-labelledby="similar-title"] li a.name')
		);
	}
	expect(onSimilar, 'Tab reaches a similar society').toBe(true);
	const name = (await page.locator(':focus').textContent())!.trim();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`${name}$`));
});

test('§4.4: a society outside the sample reads "not in this sample"', async ({ page }) => {
	await page.goto(url('explore/argue/funeral/?society=kwt&sample=paper'));
	await swarmReady(page);
	await expect(page.getByRole('complementary')).toContainText('Not in this sample');
});

test('§6.1: invalid query values fall back to the defaults', async ({ page }) => {
	await page.goto(url('explore/?society=zzz&sample=everyone&scale=log&sort=random'));
	await matrixReady(page);
	await expect(sampleRadio(page, 'All respondents')).toBeChecked();
	await expect(page.getByRole('radio', { name: 'As answered' })).toBeChecked();
	await expect(page.getByLabel('Sort')).toHaveValue('paper');
	await expect(page.getByRole('combobox', { name: 'Society' })).toHaveValue('');
});

test('FR-81: Copy link copies the permalink', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto(url('explore/?society=chl&sort=mean'));
	await matrixReady(page);
	await page.getByRole('button', { name: 'Copy link' }).click();
	await expect(page.getByText('Link copied')).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
});

test('FR-86: a failed data file shows a plain message and a retry control', async ({ page }) => {
	let failures = 1;
	await page.route(/global-all\.[^/]*\.json$/, async (route) => {
		if (failures-- > 0) await route.abort();
		else await route.continue();
	});
	await page.goto(url('explore/'));
	const alert = page.getByRole('alert');
	await expect(alert).toContainText('could not be loaded');
	await alert.getByRole('button', { name: 'Try again' }).click();
	await matrixReady(page);
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('FR-83: each route has its own title, description and canonical URL in the HTML', async ({
	request
}) => {
	for (const [path, title] of [
		['explore/', 'Explore 150 behaviors and situations · The Etiquette Atlas'],
		[
			'explore/kiss/job-interview/',
			'Kissing on the mouth in a job interview · The Etiquette Atlas'
		],
		['method/', 'Method · The Etiquette Atlas']
	]) {
		const html = await (await request.get(url(path))).text();
		expect(html).toContain(`<title>${title}</title>`);
		expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
		expect(html).toContain(
			`<link rel="canonical" href="https://nathan98000.github.io/EtiquetteAtlas/${path}"`
		);
	}
});

test.describe('FR-87: without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('each route shows its text summary and says the charts need JavaScript', async ({
		page
	}) => {
		await page.goto(url('explore/'));
		await expect(page.locator('#matrix-summary')).toHaveText(
			/is judged the most appropriate on average/
		);
		// Playwright's text engine skips <noscript>, so the note is located by element.
		await expect(page.locator('main noscript p')).toContainText(
			'The interactive matrix needs JavaScript.'
		);
		await expect(page.getByRole('grid')).toBeHidden();
		await page.goto(url('explore/eat/bus/'));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eating on a bus');
		await expect(
			page.getByText(
				/^Societies disagree about eating on a bus about as much as about a typical pair/
			)
		).toBeVisible();
		await expect(page.locator('main noscript p')).toContainText(
			'The charts for this pair need JavaScript.'
		);
	});
});

test('NFR-30, §6.4: the theme follows the system, and a manual choice is the only thing stored', async ({
	page,
	context
}) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto(url(''));
	const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	expect(await background()).toBe('rgb(20, 24, 28)');
	await page.getByLabel('Theme').selectOption('light');
	expect(await background()).toBe('rgb(255, 255, 255)');
	await page.reload();
	expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
	expect(await background()).toBe('rgb(255, 255, 255)');
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['theme']);
	// SvelteKit's router keeps scroll positions per history entry in sessionStorage; nothing
	// else is stored there unless the reader takes the quiz (decisions 43 and 80).
	const session = await page.evaluate(() => Object.keys(sessionStorage));
	expect(session.filter((key) => !key.startsWith('sveltekit:'))).toEqual([]);
	expect(await context.cookies()).toEqual([]);
});

// Decision 96 (closing decision 67's gap): a sample in the URL is the first whose files load; All
// data's are never fetched first. (Explore and fingerprints warm every sample's small global and
// similarity files once the page is idle, so those may follow.)
const SAMPLE_ROUTES: [string, string, string[]][] = [
	['explore/?society=chl&sample=paper', 'paper', ['global', 'cells']],
	['explore/usemphone/funeral/?sample=paper', 'paper', ['global', 'cells']],
	['societies/chl/?sample=attention', 'attention', ['global', 'cells', 'similarity']],
	['audiences/?sample=paper', 'paper', ['contexts']],
	['audiences/usemphone/?sample=attention', 'attention', ['contexts']]
];

for (const [path, sample, prefixes] of SAMPLE_ROUTES) {
	test(`FR-4, NFR-3: /${path} fetches only the ${sample} files`, async ({ page }) => {
		const files: string[] = [];
		page.on('request', (request) => {
			const name = new URL(request.url()).pathname.split('/').pop() ?? '';
			if (name.endsWith('.json')) files.push(name);
		});
		await page.goto(url(path), { waitUntil: 'networkidle' });
		for (const prefix of prefixes) {
			const first = files.find(
				(f) => /^[a-z]+-(all|paper|attention)\./.test(f) && f.startsWith(`${prefix}-`)
			);
			expect(first, `the first ${prefix} file`).toMatch(new RegExp(`^${prefix}-${sample}\\.`));
			const idle = prefix === 'global' || prefix === 'similarity';
			if (!idle) expect(files.filter((f) => f.startsWith(`${prefix}-all.`))).toEqual([]);
		}
	});
}
