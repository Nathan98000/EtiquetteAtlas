// NFR-60: the pages worth indexing, on the free subdomain (decision 40). Placeholder pages and the
// 404 page stay out. GitHub Pages serves a project site below the account's root, so a
// robots.txt here would never be read; crawlers find this file through the canonical URLs.

import { resolve } from '$app/paths';
import { CELLS, cellParams } from '#lib/data/grid.ts';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = ({ url }) => {
	const paths = [
		resolve('/'),
		resolve('explore/'),
		...CELLS.map((cell) => {
			const { behavior, situation } = cellParams(cell);
			return resolve(`explore/${behavior}/${situation}/`);
		}),
		resolve('method/')
	];
	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...paths.map((path) => `<url><loc>${new URL(path, url.origin).href}</loc></url>`),
		'</urlset>',
		''
	].join('\n');
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
