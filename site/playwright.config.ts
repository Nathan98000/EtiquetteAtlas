import { defineConfig, devices } from '@playwright/test';
import { basePath } from './site.config.js';

// PORT moves the test server off 4173 when another preview server holds it; with
// reuseExistingServer, Playwright would otherwise test whatever answers there.
const port = Number(process.env.PORT ?? 4173);
// DEPLOYED_ORIGIN runs the tests against the deployed site instead of build/ (npm run
// test:deployed, after a push: AT-9).
const deployed = process.env.DEPLOYED_ORIGIN;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL: deployed ?? `http://localhost:${port}` },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Tests run against build/ served the way GitHub Pages serves it (scripts/serve-pages.js).
	webServer: deployed
		? undefined
		: {
				command: 'npm run build && npm run preview',
				env: { PORT: String(port) },
				url: `http://localhost:${port}${basePath}/`,
				reuseExistingServer: !process.env.CI
			}
});
