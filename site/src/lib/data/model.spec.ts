import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CELL_COUNT } from './grid';
import { DataError, GlobalCells, Societies, SocietyCells, Status, SAMPLES } from './model';
import { cellsDoc, globalDoc, societiesDoc } from './test-fixtures';

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

	it('societies.json', () => {
		const societies = new Societies(derived('societies.json'));
		expect(societies.list).toHaveLength(90);
		expect(SAMPLES.map((s) => societies.count(s))).toEqual([90, 71, 80]);
	});
});
