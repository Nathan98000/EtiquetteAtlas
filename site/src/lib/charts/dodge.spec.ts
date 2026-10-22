import { describe, expect, it } from 'vitest';
import { dodge, extent } from './dodge';
import { symbolPath } from './symbols';

const items = Array.from({ length: 40 }, (_, i) => ({ code: `S${i}`, v: (i * 7) % 13 }));

describe('FR-20, decision 35: deterministic beeswarm layout', () => {
	const placed = dodge(
		items,
		(d) => d.v * 3,
		(d) => d.code,
		10
	);

	it('keeps every dot at its exact x', () => {
		for (const p of placed) expect(p.x).toBe(p.item.v * 3);
	});

	it('never overlaps two dots', () => {
		let overlaps = 0;
		for (const a of placed) {
			for (const b of placed) {
				if (a !== b && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 99.999) overlaps += 1;
			}
		}
		expect(overlaps).toBe(0);
	});

	it('gives the same layout whatever the input order', () => {
		const again = dodge(
			[...items].reverse(),
			(d) => d.v * 3,
			(d) => d.code,
			10
		);
		const byCode = (list: typeof placed) =>
			Object.fromEntries(list.map((p) => [p.item.code, [p.x, p.y]]));
		expect(byCode(again)).toEqual(byCode(placed));
	});

	it('puts isolated dots on the axis and reports the spread', () => {
		const spread = dodge(
			[{ code: 'A' }, { code: 'B' }],
			(d) => (d.code === 'A' ? 0 : 50),
			(d) => d.code,
			10
		);
		expect(spread.map((p) => p.y)).toEqual([0, 0]);
		expect(extent(placed)).toBeGreaterThan(0);
	});
});

describe('§6.4: region symbols', () => {
	it.each(['circle', 'square', 'diamond', 'triangle'] as const)('draws a closed %s', (shape) => {
		expect(symbolPath(shape, 5)).toMatch(/^M.*Z$/);
	});
});
