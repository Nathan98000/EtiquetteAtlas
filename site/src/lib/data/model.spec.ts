import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEHAVIORS, CELL_COUNT, CHANGE_CELLS, CONTEXTS } from './grid';
import {
	CHANGE_SOCIETIES,
	ChangeCells,
	ContextCells,
	DataError,
	Distributions,
	GlobalCells,
	Manifest,
	SAMPLES,
	Similarity,
	Societies,
	SocietyCells,
	Status,
	inChangeSurvey
} from './model';
import {
	cellsDoc,
	changeDoc,
	contextsDoc,
	distributionsDoc,
	globalDoc,
	similarityDoc,
	societiesDoc
} from './test-fixtures';

const derived = (name: string): unknown =>
	JSON.parse(readFileSync(new URL(`../../../../data/derived/${name}`, import.meta.url), 'utf8'));

describe('DR-4 to DR-11: society–cell estimates from the dense grid', () => {
	const cells = new SocietyCells(cellsDoc(), 'all');

	it('indexes row s × 150 + c as society s, cell c', () => {
		expect(cells.codes).toEqual(['AAA', 'BBB', 'CCC']);
		expect(cells.indexOf('BBB')).toBe(1);
		expect(cells.indexOf('ZZZ')).toBeUndefined();
		// Cell 10: global mean −1.8; BBB sits on it.
		expect(cells.estimate(1, 10, 'raw', 'raw')).toEqual({ value: -1.8, lo: -2, hi: -1.5 });
	});

	it('turns interval offsets into bounds for raw and shrunken estimates (FR-20, FR-22)', () => {
		expect(cells.estimate(0, 10, 'raw', 'raw')).toEqual({ value: -2.3, lo: -2.5, hi: -2 });
		expect(cells.estimate(0, 10, 'shrunk', 'raw')).toEqual({ value: -2.2, lo: -2.45, hi: -1.95 });
	});

	it('FR-5, DR-10: centered values subtract the matching offset from estimate and interval', () => {
		// AAA: raw offset −0.3, shrunken offset −0.2.
		expect(cells.estimate(0, 10, 'raw', 'centered')).toEqual({ value: -2, lo: -2.2, hi: -1.7 });
		expect(cells.estimate(0, 10, 'shrunk', 'centered')).toEqual({
			value: -2,
			lo: -2.25,
			hi: -1.75
		});
	});

	it('DR-9, FR-27: suppressed and not-asked cells have a status but no estimate', () => {
		expect(cells.status(2, 0)).toBe(Status.TooFew);
		expect(cells.status(2, 2)).toBe(Status.NotAsked);
		expect(cells.status(1, 1)).toBe(Status.Small);
		expect(cells.estimate(2, 0, 'shrunk', 'raw')).toBeNull();
		expect(cells.estimate(2, 2, 'raw', 'centered')).toBeNull();
		expect(cells.notable(2, 0, 'raw')).toBeNull();
	});

	it('FR-15, decision 24: notable flags follow the scale shown', () => {
		expect(cells.notable(0, 5, 'raw')).toBe(-1);
		expect(cells.notable(2, 5, 'raw')).toBe(1);
		expect(cells.notable(2, 5, 'centered')).toBe(0);
	});

	it('FR-30: returns one society’s 150 cells for its fingerprint', () => {
		const row = cells.row(2, 'shrunk', 'raw');
		expect(row).toHaveLength(CELL_COUNT);
		expect(row.map((c) => c.status).slice(0, 3)).toEqual([2, 0, 3]);
		expect(row[10]).toEqual({
			code: 'CCC',
			status: 0,
			n: 50,
			estimate: { value: -1.4, lo: -1.65, hi: -1.15 },
			share: 40,
			notable: 1
		});
	});

	it('returns a whole column for the beeswarm and map', () => {
		const column = cells.column(0, 'shrunk', 'raw');
		expect(column.map((c) => c.code)).toEqual(['AAA', 'BBB', 'CCC']);
		expect(column.map((c) => c.status)).toEqual([0, 0, 2]);
		expect(column[2].estimate).toBeNull();
		expect(column[1].n).toBe(50);
	});
});

describe('DR-7, DR-8: global cells', () => {
	const global = new GlobalCells(globalDoc(), 'all');

	it('gives the global mean with its 95% interval and τ with its interval (FR-13)', () => {
		expect(global.mean(0, 'raw')).toBe(-2);
		expect(global.meanInterval(0, 'raw')).toEqual({ lo: -2.05, hi: -1.94 });
		expect(global.tau(3, 'raw')).toBe(0.23);
		expect(global.tauInterval(3, 'raw')).toEqual({ lo: 0.19, hi: 0.26 });
		expect(global.societies(0)).toBe(3);
		expect(global.respondents(0)).toBe(150);
		expect(global.share(20)).toBe(20);
	});

	it('decision 37: the centered mean reuses the raw interval offsets', () => {
		expect(global.mean(0, 'centered')).toBe(-1.99);
		expect(global.meanInterval(0, 'centered')).toEqual({ lo: -2.04, hi: -1.93 });
		expect(global.tau(0, 'centered')).toBe(global.tau(149, 'raw'));
		expect(global.tauInterval(0, 'centered')).toEqual({ lo: 0.67, hi: 0.71 });
	});
});

describe('DR-15: societies', () => {
	const societies = new Societies(societiesDoc());

	it('looks up names, regions and positions by code', () => {
		expect(societies.get('BBB')).toEqual({
			code: 'BBB',
			name: 'Philippines',
			region: 'Asia',
			lat: 20,
			lon: 120
		});
		expect(societies.get('ZZZ')).toBeUndefined();
		expect(societies.get(null)).toBeUndefined();
	});

	it('FR-4, §4.4: knows which societies each sample includes', () => {
		expect(societies.inSample('CCC', 'all')).toBe(true);
		expect(societies.inSample('CCC', 'paper')).toBe(false);
		expect(societies.respondents('AAA', 'paper')).toBe(280);
		expect(societies.count('attention')).toBe(2);
	});

	it('FR-34: gives the facts in a sample, or null outside it', () => {
		expect(societies.facts('BBB', 'paper')).toEqual({
			respondents: 100,
			studentShare: 60,
			studentUnknown: 5,
			firstMonth: '2023-10',
			lastMonth: '2024-01',
			languages: ['Spanish', 'English']
		});
		expect(societies.facts('BBB', 'attention')).toBeNull();
		expect(societies.facts('ZZZ', 'all')).toBeNull();
	});
});

describe('DR-14: similar societies', () => {
	const similarity = new Similarity(similarityDoc(), 'all');

	it('lists each society’s pairs by rank', () => {
		expect(similarity.pairs('AAA')).toEqual([
			{ other: 'BBB', rank: 1, r: 0.61, cells: 149 },
			{ other: 'CCC', rank: 2, r: -0.12, cells: 120 }
		]);
		expect(similarity.pairs('CCC')).toEqual([]);
	});

	it('rejects a file for another sample or with gaps', () => {
		expect(() => new Similarity(similarityDoc('paper'), 'all')).toThrow(DataError);
		const doc = similarityDoc();
		(doc.pairs.r as (number | null)[])[0] = null;
		expect(() => new Similarity(doc, 'all')).toThrow(/missing values/);
	});
});

describe('DR-12: contexts by society, for all societies and by respondent gender', () => {
	const contexts = new ContextCells(contextsDoc(), 'all');

	it('indexes row s × 75 + b × 5 + k as society s, behavior b, context k', () => {
		expect(contexts.codes).toEqual(['AAA', 'BBB', 'CCC']);
		expect(contexts.indexOf('CCC')).toBe(2);
		expect(contexts.indexOf('ZZZ')).toBeUndefined();
		// Behavior 14 in front of management: all societies 1 − 1.5, CCC 0.5 above.
		expect(contexts.society(2, 14, 2)).toEqual({
			status: Status.Ok,
			n: 50,
			estimate: { value: 0, lo: -0.2, hi: 0.3 },
			share: 60,
			societies: null
		});
	});

	it('DR-9, FR-27: small, too few and not asked keep their status; only small has a value', () => {
		expect(contexts.society(1, 1, 1)).toMatchObject({ status: Status.Small, n: 12 });
		expect(contexts.society(1, 1, 1).estimate).not.toBeNull();
		expect(contexts.society(2, 0, 2)).toEqual({
			status: Status.TooFew,
			n: null,
			estimate: null,
			share: null,
			societies: null
		});
		expect(CONTEXTS.map((_, k) => contexts.society(2, 3, k).status)).toEqual([3, 3, 3, 3, 3]);
	});

	it('gives all societies’ values with their interval and society count (DR-7)', () => {
		expect(contexts.global(6, 1)).toEqual({
			status: Status.Ok,
			n: 150,
			estimate: { value: 1.2, lo: 1.15, hi: 1.26 },
			share: 55,
			societies: 3
		});
		expect(contexts.global(3, 0).societies).toBe(2);
	});

	it('decision 18: women and men respondents, all societies only', () => {
		expect(contexts.byGender('woman', 0, 0)).toMatchObject({
			n: 80,
			estimate: { value: 1.1, lo: 1.03, hi: 1.18 },
			share: 57
		});
		expect(contexts.byGender('man', 14, 4).estimate?.value).toBe(0.4);
	});

	it('FR-86: refuses another context order, a short table or mixed gender rows', () => {
		const order = contextsDoc();
		order.grid.contexts.reverse();
		expect(() => new ContextCells(order, 'all')).toThrow(/behavior or context order/);
		const short = contextsDoc();
		short.cells.status.pop();
		expect(() => new ContextCells(short, 'all')).toThrow(/cells\.status has/);
		const mixed = contextsDoc();
		mixed.by_gender.gender[3] = 'Man';
		expect(() => new ContextCells(mixed, 'all')).toThrow(/women's rows then men's/);
		const gap = contextsDoc();
		gap.global.mean[0] = null;
		expect(() => new ContextCells(gap, 'all')).toThrow(/missing values/);
		expect(() => new ContextCells(contextsDoc('paper'), 'all')).toThrow(DataError);
	});
});

describe('DR-13, C-6: the two surveys, as society × pair aggregates', () => {
	const change = new ChangeCells(changeDoc(), 'all');

	it('maps the 120 pairs to the 150-cell grid by their IDs (decision 67)', () => {
		expect(change.cells).toEqual(CHANGE_CELLS);
		expect(change.cells[119]).toEqual({ index: 119, behavior: 'eat', situation: 'party' });
		expect(change.codes).toEqual(['GBR', 'JPN']);
		expect(change.indexOf('JPN')).toBe(1);
		expect(change.indexOf('CHL')).toBeUndefined();
		expect(change.source).toMatch(/aggregates only/);
	});

	it('gives each survey’s n, mean and SD and the difference with its interval', () => {
		expect(change.pair(0, 12)).toEqual({
			older: { n: 150, mean: -1.76, sd: 1 },
			newer: { n: 50, mean: -1.26, sd: 1.1 },
			diff: { value: 0.5, lo: 0.4, hi: 0.6 }
		});
		expect(change.pair(1, 5).newer?.n).toBe(12);
		expect(change.row(0)).toHaveLength(120);
	});

	it('leaves a pair either survey lacks empty (Israel: laughing out loud at a party)', () => {
		expect(change.pair(1, 19)).toEqual({ older: null, newer: null, diff: null });
	});

	it('FR-53: averages the societies in both surveys, per pair', () => {
		expect(change.global(0)).toEqual({
			societies: 2,
			older: -2,
			newer: -1.7,
			diff: { value: 0.3, lo: 0.25, hi: 0.35 }
		});
		expect(change.global(19).societies).toBe(1);
	});

	it('gives each society’s mean difference and each behavior’s, as in Table 1', () => {
		expect(change.societies()[1]).toEqual({
			code: 'JPN',
			respondents: 180,
			diff: { value: 0.19, lo: 0.1, hi: 0.28 },
			cells: 119
		});
		expect(change.behaviors).toHaveLength(12);
		expect(change.behaviors[0]).toEqual({
			behavior: 'argue',
			societies: 2,
			diff: { value: -0.5, lo: -0.53, hi: -0.47 },
			sd: 0.3,
			increased: 0
		});
	});

	it('FR-86: refuses the 15-behavior grid, another order, a society not in both surveys', () => {
		const grid = changeDoc();
		grid.grid.behaviors = [...BEHAVIORS];
		expect(() => new ChangeCells(grid, 'all')).toThrow(/behavior or situation order/);
		const order = changeDoc();
		order.behaviors.behavior.reverse();
		expect(() => new ChangeCells(order, 'all')).toThrow(/another order/);
		const stranger = changeDoc();
		stranger.societies.code[0] = 'CHL';
		expect(() => new ChangeCells(stranger, 'all')).toThrow(/not in both surveys/);
		const short = changeDoc();
		short.cells.diff.pop();
		expect(() => new ChangeCells(short, 'all')).toThrow(/cells\.diff has/);
		expect(() => new ChangeCells(changeDoc('paper'), 'all')).toThrow(DataError);
	});

	it('knows which societies have change pages', () => {
		expect(inChangeSurvey('JPN')).toBe(true);
		expect(inChangeSurvey('CHL')).toBe(false);
		expect(inChangeSurvey(null)).toBe(false);
	});
});

describe('DR-4, FR-61: response counts for the quiz', () => {
	const d = new Distributions(distributionsDoc(), 'all');

	it('gives a society’s six response counts for a cell, or null without enough responses', () => {
		expect(d.codes).toEqual(['AAA', 'BBB', 'CCC']);
		expect(d.counts(0, 5)).toEqual({ n: 50, sd: 1.2, counts: [20, 15, 10, 3, 1, 1] });
		expect(d.counts(1, 1)?.n).toBe(12);
		expect(d.counts(2, 0)).toBeNull();
		expect(d.counts(2, 2)).toBeNull();
		expect(d.indexOf('CCC')).toBe(2);
	});

	it('FR-86: refuses counts that do not add up, or a short table', () => {
		const sum = distributionsDoc();
		sum.cells.c6[3] = 2;
		expect(() => new Distributions(sum, 'all')).toThrow(/do not add up/);
		const short = distributionsDoc();
		short.cells.c3.pop();
		expect(() => new Distributions(short, 'all')).toThrow(/cells\.c3 has/);
		expect(() => new Distributions(distributionsDoc('paper'), 'all')).toThrow(DataError);
	});
});

describe('FR-86: malformed files are refused with a DataError', () => {
	it('rejects another grid order', () => {
		const doc = globalDoc();
		doc.grid.situations.reverse();
		expect(() => new GlobalCells(doc, 'all')).toThrow(/behavior or situation order/);
	});

	it('rejects a file for another sample', () => {
		expect(() => new SocietyCells(cellsDoc('paper'), 'all')).toThrow(DataError);
	});

	it('rejects columns of the wrong length', () => {
		const doc = cellsDoc();
		doc.cells.mean.pop();
		expect(() => new SocietyCells(doc, 'all')).toThrow(/cells\.mean has/);
	});

	it('rejects missing global values and non-objects', () => {
		const doc = globalDoc();
		doc.cells.tau[4] = null;
		expect(() => new GlobalCells(doc, 'all')).toThrow(/missing values/);
		expect(() => new Societies([])).toThrow(DataError);
	});
});

describe('FR-72: the manifest', () => {
	it('gives the pipeline version, the build date and each OSF file with its version and MD5', () => {
		const manifest = new Manifest(derived('manifest.json'));
		expect(manifest.pipelineVersion).toMatch(/^\d+\.\d+\.\d+$/);
		expect(manifest.buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(manifest.replicates).toBe(2000);
		expect(manifest.intervalLevel).toBe(95);
		expect(manifest.minGroupSize).toBe(10);
		expect(manifest.samples.all).toEqual({ respondents: 25422, societies: 90 });
		expect(manifest.samples.paper).toEqual({ respondents: 18656, societies: 71 });
		expect(manifest.samples.attention).toEqual({ respondents: 15599, societies: 80 });
		expect(manifest.sources.map((s) => s.name)).toContain('gsn-situations-clean-long.csv');
		for (const source of manifest.sources) {
			expect(source.md5).toMatch(/^[0-9a-f]{32}$/);
			expect(source.url).toMatch(/^https:\/\/osf\.io\/download\//);
		}
	});

	it('refuses a manifest without checksums', () => {
		const doc = derived('manifest.json') as { sources: { md5: string }[] };
		doc.sources[0].md5 = 'abc';
		expect(() => new Manifest(doc)).toThrow(/sources\[0\] is incomplete/);
		expect(() => new Manifest({})).toThrow(DataError);
	});
});

describe('§4.6: the committed data/derived files decode', () => {
	it.each(SAMPLES)('%s sample', (sample) => {
		const global = new GlobalCells(derived(`global-${sample}.json`), sample);
		const cells = new SocietyCells(derived(`cells-${sample}.json`), sample);
		expect(global.societies(0)).toBe(cells.codes.length);
		expect(cells.codes.length).toBe({ all: 90, paper: 71, attention: 80 }[sample]);
		let mismatches = 0;
		for (let s = 0; s < cells.codes.length; s++) {
			for (let c = 0; c < CELL_COUNT; c++) {
				const shown = cells.estimate(s, c, 'shrunk', 'raw') !== null;
				if (shown !== cells.status(s, c) <= Status.Small) mismatches += 1;
			}
		}
		expect(mismatches).toBe(0);
	});

	it.each(SAMPLES)('contexts-%s.json: a value exactly where the status allows one', (sample) => {
		const contexts = new ContextCells(derived(`contexts-${sample}.json`), sample);
		expect(contexts.codes.length).toBe({ all: 90, paper: 71, attention: 80 }[sample]);
		const statuses = [0, 0, 0, 0];
		let mismatches = 0;
		for (let s = 0; s < contexts.codes.length; s++) {
			for (let b = 0; b < BEHAVIORS.length; b++) {
				for (let k = 0; k < CONTEXTS.length; k++) {
					const value = contexts.society(s, b, k);
					statuses[value.status] += 1;
					const shown = value.estimate !== null && value.n !== null && value.n >= 10;
					if (shown !== value.status <= Status.Small) mismatches += 1;
				}
			}
		}
		expect(mismatches).toBe(0);
		if (sample === 'all') expect(statuses).toEqual([5724, 829, 182, 15]);
		expect(contexts.global(0, 0).societies).toBeGreaterThan(0);
		expect(contexts.byGender('man', 14, 4).n).toBeGreaterThanOrEqual(10);
	});

	it.each(SAMPLES)('change-%s.json: the societies in both surveys and their pairs', (sample) => {
		const change = new ChangeCells(derived(`change-${sample}.json`), sample);
		expect(change.codes.length).toBe({ all: 26, paper: 22, attention: 26 }[sample]);
		if (sample !== 'paper') expect(change.codes).toEqual([...CHANGE_SOCIETIES]);
		let shown = 0;
		let below10 = 0;
		for (let s = 0; s < change.codes.length; s++) {
			for (const pair of change.row(s)) {
				if (!pair.diff) continue;
				shown += 1;
				if (pair.older!.n < 10 || pair.newer!.n < 10) below10 += 1;
			}
		}
		// Israel lacks one pair in the 2000–2003 data.
		expect(shown).toBe(change.codes.length * 120 - 1);
		expect(below10).toBe(0);
	});

	it.each(SAMPLES)(
		'distributions-%s.json: counts exactly where the cells file has a value',
		(sample) => {
			const d = new Distributions(derived(`distributions-${sample}.json`), sample);
			const cells = new SocietyCells(derived(`cells-${sample}.json`), sample);
			expect(d.codes).toEqual(cells.codes);
			let mismatches = 0;
			for (let s = 0; s < d.codes.length; s++) {
				for (let c = 0; c < CELL_COUNT; c++) {
					if ((d.counts(s, c) !== null) !== cells.status(s, c) <= Status.Small) mismatches += 1;
				}
			}
			expect(mismatches).toBe(0);
		}
	);

	it('societies.json', () => {
		const societies = new Societies(derived('societies.json'));
		expect(societies.list).toHaveLength(90);
		expect(SAMPLES.map((s) => societies.count(s))).toEqual([90, 71, 80]);
		const all = societies.list.map((s) => societies.facts(s.code, 'all')!);
		expect(all.filter((f) => f.studentUnknown >= 100)).toHaveLength(19);
		expect(all.filter((f) => f.languages.length === 0)).toHaveLength(0);
	});

	it.each(SAMPLES)('similarity-%s.json lists up to five pairs per society (DR-14)', (sample) => {
		const similarity = new Similarity(derived(`similarity-${sample}.json`), sample);
		const cells = new SocietyCells(derived(`cells-${sample}.json`), sample);
		const listed = cells.codes.filter((code) => similarity.pairs(code).length > 0);
		expect(listed).toHaveLength({ all: 87, paper: 66, attention: 75 }[sample]);
		for (const code of listed) {
			const pairs = similarity.pairs(code);
			expect(pairs.length).toBe(5);
			expect(pairs.every((p) => p.cells >= 120 && p.other !== code)).toBe(true);
		}
	});
});
