import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPARISON_FILE, dateLabel, sampleEffects, studentShares, versionsView } from './method';
import { GlobalCells, Manifest, Societies, type SampleId } from './model';

const derived = (name: string): unknown =>
	JSON.parse(readFileSync(new URL(`../../../../data/derived/${name}`, import.meta.url), 'utf8'));

const societies = new Societies(derived('societies.json'));
const global = Object.fromEntries(
	(['all', 'paper', 'attention'] as SampleId[]).map((s) => [
		s,
		new GlobalCells(derived(`global-${s}.json`), s)
	])
) as Record<SampleId, GlobalCells>;

describe('FR-71: what each sample toggle changes', () => {
	const [all, paper, attention] = sampleEffects(societies, global);

	it('gives each sample its respondents and societies', () => {
		expect([all.respondents, all.societies]).toEqual(['25,422', 90]);
		expect([paper.respondents, paper.societies]).toEqual(['18,656', 71]);
		expect([attention.respondents, attention.societies]).toEqual(['15,599', 80]);
	});

	it('names the societies each sample leaves out', () => {
		expect(all.leftOut).toEqual([]);
		expect(paper.leftOut).toHaveLength(19);
		expect(paper.leftOut).toContain('Kuwait');
		expect(attention.leftOut).toHaveLength(10);
		expect(attention.leftOut).toContain('Benin');
	});

	it('says how far the global averages move from All data', () => {
		expect(all.shift).toBeNull();
		expect(paper.shift).toEqual({ mean: '0.06', max: '0.18' });
		expect(attention.shift).toEqual({ mean: '0.10', max: '0.29' });
	});
});

describe('§4.8: the student share over all respondents', () => {
	it('is about 55%, with no status for about 22%', () => {
		expect(studentShares(societies, 'all')).toEqual({ students: 55, unknown: 22 });
	});
});

describe('FR-72: versions, checksums and the build date', () => {
	const manifest = new Manifest(derived('manifest.json'));

	it('lists the five OSF files with the change module and four without (R-6)', () => {
		const withChange = versionsView(manifest, true);
		expect(withChange.files).toHaveLength(5);
		expect(withChange.files.map((f) => f.name)).toContain(COMPARISON_FILE);
		expect(versionsView(manifest, false).files.map((f) => f.name)).not.toContain(COMPARISON_FILE);
		expect(withChange.replicates).toBe('2,000');
	});

	it('writes the build date in words', () => {
		expect(dateLabel('2026-10-22')).toBe('22 October 2026');
		expect(dateLabel('2027-01-05')).toBe('5 January 2027');
	});
});
