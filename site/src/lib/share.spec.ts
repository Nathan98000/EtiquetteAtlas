import { describe, expect, it } from 'vitest';
import { CHANGE_CARD, SHARE_ALT, shareCard } from './share';

describe('FR-82, FR-83: the share image each route points to (decision 89)', () => {
	it('gives the home page, each module, each cell and each society their own card', () => {
		expect(shareCard('/', {})).toBe('home');
		for (const module of ['explore', 'societies', 'story', 'method']) {
			expect(shareCard(`/${module}`, {})).toBe(module);
		}
		expect(shareCard('/audiences', {})).toBe('audiences');
		expect(shareCard('/change', {})).toBe(CHANGE_CARD);
		expect(
			shareCard('/explore/[behavior]/[situation]', { behavior: 'kiss', situation: 'job-interview' })
		).toBe('explore/kiss/job-interview');
		expect(shareCard('/societies/[society]', { society: 'chl' })).toBe('societies/chl');
	});

	it("shares the module's card on a behavior's and a society's change pages", () => {
		expect(shareCard('/audiences/[behavior]', { behavior: 'usemphone' })).toBe('audiences');
		expect(shareCard('/change/[society]', { society: 'jpn' })).toBe(CHANGE_CARD);
	});

	it('gives the 404 page and unknown routes none', () => {
		expect(shareCard('/404', {})).toBeNull();
		expect(shareCard(null, {})).toBeNull();
	});

	it('describes every module card for its alt text', () => {
		const modules = ['home', 'explore', 'societies', 'audiences', CHANGE_CARD, 'story', 'method'];
		expect(Object.keys(SHARE_ALT).sort()).toEqual([...modules].sort());
		for (const text of Object.values(SHARE_ALT)) expect(text.length).toBeGreaterThan(60);
	});
});
