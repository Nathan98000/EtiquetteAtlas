// Serves build/ the way GitHub Pages serves a project site, so previews and end-to-end tests run
// against the deployed artifact (HR-1, HR-2, FR-85):
// - the site lives under the base path, e.g. http://localhost:4173/EtiquetteAtlas/;
// - a folder URL without its trailing slash gets a 301 to the slashed URL;
// - /page also serves /page.html;
// - anything missing gets the root 404.html with status 404.
// No dependencies; `npm run preview` after `npm run build`.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { basePath } from '../site.config.js';

const root = resolve(import.meta.dirname, '..', 'build');
const port = Number(process.env.PORT ?? 4173);
const notFoundPage = join(root, '404.html');

/** @type {Record<string, string>} */
const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.csv': 'text/csv; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml',
	'.webmanifest': 'application/manifest+json',
	'.woff2': 'font/woff2'
};

/** @param {string} path */
function stat(path) {
	try {
		return statSync(path);
	} catch {
		return undefined;
	}
}

if (!stat(notFoundPage)?.isFile()) {
	console.error('build/404.html not found: run `npm run build` first.');
	process.exit(1);
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {string} file
 */
function send(res, status, file) {
	res.writeHead(status, {
		'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
		'cache-control': 'max-age=600' // what GitHub Pages sends (HR-3)
	});
	createReadStream(file).pipe(res);
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} location
 */
function redirect(res, location) {
	res.writeHead(301, { location });
	res.end();
}

createServer((req, res) => {
	const url = new URL(req.url ?? '/', 'http://localhost');
	let pathname = url.pathname;
	try {
		pathname = decodeURIComponent(pathname);
	} catch {
		// keep the raw path; it will not match a file
	}
	if (basePath && pathname === basePath) return redirect(res, `${basePath}/${url.search}`);
	if (!pathname.startsWith(`${basePath}/`)) return send(res, 404, notFoundPage);

	const target = normalize(join(root, pathname.slice(basePath.length)));
	if (target !== root && !target.startsWith(root + sep)) return send(res, 404, notFoundPage);

	const found = stat(target);
	if (found?.isDirectory()) {
		if (!pathname.endsWith('/')) return redirect(res, `${url.pathname}/${url.search}`);
		const index = join(target, 'index.html');
		return send(res, stat(index)?.isFile() ? 200 : 404, stat(index) ? index : notFoundPage);
	}
	if (found?.isFile()) return send(res, 200, target);
	if (stat(`${target}.html`)?.isFile()) return send(res, 200, `${target}.html`);
	return send(res, 404, notFoundPage);
}).listen(port, () => {
	console.log(`Serving build/ like GitHub Pages at http://localhost:${port}${basePath}/`);
});
