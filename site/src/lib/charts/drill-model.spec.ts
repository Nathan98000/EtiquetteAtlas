import { describe, expect, it } from 'vitest';
import { GlobalCells, Societies, SocietyCells } from '../data/model';
import { cellsDoc, globalDoc, societiesDoc } from '../data/test-fixtures';
import {
	countByRegion,
	drill,
	regionSummary,
	smallSampleText,
	societyBox,
	standing,
	versusGlobal
} from './drill-model';

const global = new GlobalCells(globalDoc(), 'all');
const cells = new SocietyCells(cellsDoc(), 'all');
const societies = new Societies(societiesDoc());

describe('FR-20 to FR-27: one cell, every society', () => {
	it('plots societies with an estimate and lists the rest (FR-27)', () => {
		const d = drill(cells, societies, global, 0, 'shrunk', 'raw');
		expect(d.plotted.map((p) => p.code)).toEqual(['AAA', 'BBB']);
		expect(d.tooFew.map((p) => p.code)).toEqual(['CCC']);
		expect(d.notAsked).toEqual([]);
		expect(drill(cells, societies, global, 2, 'shrunk', 'raw').notAsked.map((p) => p.code)).toEqual(
			['CCC']
		);
	});

	it('FR-23, decision 38: draws the global mean with a band of ± τ', () => {
		const d = drill(cells, societies, global, 10, 'raw', 'raw');
		expect(d.mean).toBe(-1.8);
		expect(d.tau).toBe(0.3);
		expect(d.band[0]).toBeCloseTo(-2.1);
		expect(d.band[1]).toBeCloseTo(-1.5);
	});

	it('FR-22: switches between shrunken and raw estimates', () => {
		const shrunk = drill(cells, societies, global, 10, 'shrunk', 'raw').plotted[0].estimate;
		const raw = drill(cells, societies, global, 10, 'raw', 'raw').plotted[0].estimate;
		expect([shrunk?.value, raw?.value]).toEqual([-2.2, -2.3]);
	});

	it('§4.4: lists societies outside the sample', () => {
		const paper = new SocietyCells({ ...cellsDoc('paper') }, 'paper');
		expect(drill(paper, societies, global, 0, 'shrunk', 'raw').notInSample).toEqual([]);
		const one = cellsDoc('paper');
		one.societies = { code: ['AAA'], offset: [0], offset_shrunk: [0] };
		one.cells = Object.fromEntries(
			Object.entries(one.cells).map(([k, v]) => [k, (v as unknown[]).slice(0, 150)])
		) as typeof one.cells;
		const d = drill(new SocietyCells(one, 'paper'), societies, global, 0, 'shrunk', 'raw');
		expect(d.notInSample.map((s) => s.code)).toEqual(['BBB', 'CCC']);
	});
});

describe('FR-25: the selected society', () => {
	const d = drill(cells, societies, global, 10, 'shrunk', 'raw');

	it('is ranked among the plotted societies', () => {
		expect(standing(d, 'CCC')).toMatchObject({ kind: 'plotted', text: '1st most accepting of 3' });
		expect(standing(d, 'BBB')).toMatchObject({ kind: 'plotted', text: '2nd most accepting of 3' });
		expect(standing(d, 'AAA')).toMatchObject({ kind: 'plotted', text: '1st strictest of 3' });
	});

	it('reads too few responses, not asked or not in this sample instead of a rank (FR-27)', () => {
		expect(standing(drill(cells, societies, global, 0, 'shrunk', 'raw'), 'CCC').kind).toBe(
			'too-few'
		);
		expect(standing(drill(cells, societies, global, 2, 'shrunk', 'raw'), 'CCC').kind).toBe(
			'not-asked'
		);
		expect(standing(d, null).kind).toBe('unknown');
		expect(standing(d, 'ZZZ').kind).toBe('unknown');
	});

	it('counts plotted societies by region', () => {
		expect(countByRegion(d.plotted)).toEqual({ Africa: 1, Asia: 1, 'Latin America': 0, West: 1 });
	});

	it('NFR-11: summarises the map by region', () => {
		expect(regionSummary(d.plotted)).toBe(
			"Averaged by the GSN authors' regions, estimates are Africa −1.4 (1), Asia −1.8 (1) and " +
				'the West −2.2 (1), with the number of societies in brackets.'
		);
		expect(regionSummary([])).toMatch(/^No society/);
	});
});

describe('D-1, D-15, FR-25: the society box and small samples in words', () => {
	const d = drill(cells, societies, global, 10, 'shrunk', 'raw');
	const aaa = societies.get('AAA')!;

	it('invites a pick without a society, and names it while the files load', () => {
		expect(societyBox({ kind: 'unknown' }, undefined, d, 'all').lead).toBe(
			'Pick a society to see where it stands.'
		);
		expect(societyBox({ kind: 'unknown' }, aaa, undefined, 'all').note).toBe('Loading…');
	});

	it('leads with the response label, how sure and the rank from the nearer end', () => {
		const box = societyBox(standing(d, 'AAA'), aaa, d, 'all');
		expect(box.lead).toBe(
			'Respondents in Alpha: extremely inappropriate (−2.2), clearly stricter than the global ' +
				'average; 1st strictest of 3.'
		);
		expect(box.note).toMatch(/^95% interval .+ respondents.* · adjusted for small samples$/);
	});

	it('gives a centered score without a response label, which would not apply', () => {
		const centered = drill(cells, societies, global, 10, 'shrunk', 'centered');
		expect(societyBox(standing(centered, 'AAA'), aaa, centered, 'all').lead).toMatch(
			/−\d\.\d \(relative to each society's average\)/
		);
	});

	it('says "clearly" only when the interval decides (§6.5, decision 2)', () => {
		expect(versusGlobal(-1)).toBe('clearly stricter than the global average');
		expect(versusGlobal(1)).toBe('clearly looser than the global average');
		expect(versusGlobal(0)).toBe('too close to call against the global average');
	});

	it('says what few respondents do to an estimate, adjusted or not', () => {
		const point = { ...d.plotted[0], n: 18, estimate: { value: -1.2, lo: -1.6, hi: -0.8 } };
		expect(smallSampleText(point, 'shrunk')).toBe(
			'Only 18 respondents: this estimate is pulled toward the global average, and the true ' +
				'average could be anywhere from −1.6 to −0.8.'
		);
		expect(smallSampleText(point, 'raw')).toBe(
			'Only 18 respondents: the true average could be anywhere from −1.6 to −0.8.'
		);
	});
});
