// Lighthouse CI on twelve representative routes, under Lighthouse's default mobile profile
// (simulated mid-range phone on a slow 4G connection): NFR-2 and AT-1. The pages are served from
// build/ the way GitHub Pages serves them, gzip included (scripts/serve-pages.js). PORT moves the
// server off 4173 when another preview holds it. The analytics beacon is blocked.
const port = Number(process.env.PORT ?? 4173);
// LHCI_DEPLOYED=1 measures the deployed site instead, beacon included (launch checklist, §9.4).
const deployed = process.env.LHCI_DEPLOYED === '1';
const origin = deployed ? 'https://nathan98000.github.io' : `http://localhost:${port}`;
const page = (path) => `${origin}/EtiquetteAtlas/${path}`;

module.exports = {
	ci: {
		collect: {
			...(deployed
				? {}
				: {
						startServerCommand: 'node scripts/serve-pages.js',
						startServerReadyPattern: 'Serving build/'
					}),
			url: [
				page(''),
				page('explore/'),
				page('explore/?society=chl&sample=paper'),
				page('explore/usemphone/funeral/?society=chl'),
				page('societies/'),
				page('societies/chl/'),
				page('audiences/'),
				page('audiences/usemphone/?society=chl'),
				page('change/'),
				page('change/jpn/?sample=attention'),
				page('story/'),
				page('method/')
			],
			numberOfRuns: 3,
			settings: {
				onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
				// Test runs send no page views (decision 87); the beacon's cost is measured once on
				// the deployed site (LHCI_DEPLOYED below).
				...(deployed ? {} : { blockedUrlPatterns: ['*cloudflareinsights.com*'] })
			}
		},
		assert: {
			assertions: {
				'largest-contentful-paint': [
					'error',
					{ maxNumericValue: 2500, aggregationMethod: 'median' }
				],
				'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
				'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }]
			}
		},
		upload: { target: 'filesystem', outputDir: '.lighthouseci' }
	}
};
