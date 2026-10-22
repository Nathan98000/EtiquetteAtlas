// Lighthouse CI on seven representative routes, under Lighthouse's default mobile profile
// (simulated mid-range phone on a slow 4G connection): NFR-2 and AT-1. The pages are served from
// build/ the way GitHub Pages serves them, gzip included (scripts/serve-pages.js). PORT moves the
// server off 4173 when another preview holds it.
const port = Number(process.env.PORT ?? 4173);
const page = (path) => `http://localhost:${port}/EtiquetteAtlas/${path}`;

module.exports = {
	ci: {
		collect: {
			startServerCommand: 'node scripts/serve-pages.js',
			startServerReadyPattern: 'Serving build/',
			url: [
				page(''),
				page('explore/'),
				page('explore/?society=chl&sample=paper'),
				page('explore/usemphone/funeral/?society=chl'),
				page('societies/'),
				page('societies/chl/'),
				page('method/')
			],
			numberOfRuns: 3,
			settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }
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
