import { defineConfig, devices } from '@playwright/test';
import { basePath } from './site.config.js';

// PORT moves the test server off 4173 when another preview server holds it; with
// reuseExistingServer, Playwright would otherwise test whatever answers there.
const port = Number(process.env.PORT ?? 4173);
// DEPLOYED_ORIGIN runs the tests against the deployed site instead of build/ (npm run
// test:deployed, after a push: AT-9).
const deployed = process.env.DEPLOYED_ORIGIN;
// VISUAL=1 runs the visual regression screenshots, whose baselines come from the Playwright Linux
// image (npm run test:visual; decisions 41 and 97). Other machines render text differently.
const visual = process.env.VISUAL === '1';
// SKIP_BUILD=1 serves the build/ already there, as when the build ran outside the container.
const command =
	process.env.SKIP_BUILD === '1' ? 'npm run preview' : 'npm run build && npm run preview';

/** NFR-20, decision 98: the other browsers run the tests tagged @compat. */
const compat = { grep: /@compat/, testIgnore: /visual\.e2e\.ts/ };

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL: deployed ?? `http://localhost:${port}` },
	projects: visual
		? [
				{
					name: 'visual',
					testMatch: /visual\.e2e\.ts/,
					use: { ...devices['Desktop Chrome'] },
					snapshotPathTemplate: '{testDir}/visual-baselines/{arg}{ext}'
				}
			]
		: [
				{
					name: 'chromium',
					testIgnore: /visual\.e2e\.ts/,
					use: { ...devices['Desktop Chrome'] }
				},
				{ name: 'firefox', ...compat, use: { ...devices['Desktop Firefox'] } },
				{ name: 'webkit', ...compat, use: { ...devices['Desktop Safari'] } },
				// Safari on iOS and Chrome on Android (§2.4).
				{ name: 'iphone', ...compat, use: { ...devices['iPhone 15'] } },
				{ name: 'pixel', ...compat, use: { ...devices['Pixel 7'] } }
			],
	expect: {
		// Visual regression: small enough to catch a moved chart or a changed colour, large enough
		// to ignore antialiasing (decision 97).
		toHaveScreenshot: { maxDiffPixelRatio: 0.002, threshold: 0.2, animations: 'disabled' }
	},
	// Tests run against build/ served the way GitHub Pages serves it (scripts/serve-pages.js).
	webServer: deployed
		? undefined
		: {
				command,
				env: { PORT: String(port) },
				url: `http://localhost:${port}${basePath}/`,
				reuseExistingServer: !process.env.CI
			}
});
