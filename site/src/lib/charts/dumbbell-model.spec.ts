import { describe, expect, it } from 'vitest';
import { ARROW_DOT, HEAD, RING, arrow, xOf } from './dumbbell-model';

describe('FR-33, FR-50: two values per row', () => {
	it('places scores on the fixed −2.5 to +2.5 track, clamped at its ends', () => {
		expect(xOf(-2.5, 400)).toBe(0);
		expect(xOf(0, 400)).toBe(200);
		expect(xOf(2.5, 400)).toBe(400);
		expect(xOf(3, 400)).toBe(400);
	});

	it('decision 69: runs the arrow from ○’s edge to a head that stops short of ●', () => {
		const right = arrow(100, 200, 10)!;
		expect(right.x1).toBe(100 + RING + 1);
		const tip = 200 - (ARROW_DOT + 1.5);
		expect(right.x2).toBe(tip - HEAD.length);
		expect(right.head).toBe(`M${tip},10 L${tip - HEAD.length},5.5 L${tip - HEAD.length},14.5 Z`);
		const left = arrow(200, 100, 10)!;
		expect(left.x1).toBe(200 - RING - 1);
		expect(left.x2).toBeGreaterThan(100);
	});

	it('draws no arrow when ○ and ● are too close for a head (◉)', () => {
		expect(arrow(100, 100, 10)).toBeNull();
		expect(arrow(100, 115, 10)).toBeNull();
		expect(arrow(100, 125, 10)).not.toBeNull();
	});
});
