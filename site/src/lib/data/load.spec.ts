import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache, loadGlobal, loadSocieties } from './load';
import { DataError } from './model';
import { globalDoc, societiesDoc } from './test-fixtures';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('decision 27, FR-86: loading data files', () => {
	beforeEach(() => clearCache());
	afterEach(() => vi.unstubAllGlobals());

	it('fetches each file once and keeps the decoded result', async () => {
		const fetch = vi.fn(async () => ok(societiesDoc()));
		vi.stubGlobal('fetch', fetch);
		const [a, b] = await Promise.all([loadSocieties(), loadSocieties()]);
		expect(a).toBe(b);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('fetches the file for the requested sample from a hashed asset URL', async () => {
		const fetch = vi.fn(async (url: string) => (url ? ok(globalDoc('paper')) : ok(null)));
		vi.stubGlobal('fetch', fetch);
		const global = await loadGlobal('paper');
		expect(global.sample).toBe('paper');
		expect(String(fetch.mock.calls[0][0])).toMatch(/global-paper\.json/);
	});

	it('forgets a failed load so a retry fetches again', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(ok(societiesDoc()));
		vi.stubGlobal('fetch', fetch);
		await expect(loadSocieties()).rejects.toBeInstanceOf(DataError);
		await expect(loadSocieties()).resolves.toBeDefined();
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('refuses a file of the wrong shape', async () => {
		vi.stubGlobal('fetch', async () => ok({ sample: 'all' }));
		await expect(loadGlobal('all')).rejects.toThrow(/grid/);
	});
});
