/**
 * Region shapes (§6.4: regions told apart by shape as well as colour). Each has about the area
 * of a circle of radius r, so no region looks bigger than another.
 */

import type { Shape } from './colors';

const f = (n: number) => Number(n.toFixed(2));

export function symbolPath(shape: Shape, r: number): string {
	switch (shape) {
		case 'circle':
			return `M${f(-r)},0a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0Z`;
		case 'square': {
			const a = r * 0.886; // half of √π·r
			return `M${f(-a)},${f(-a)}H${f(a)}V${f(a)}H${f(-a)}Z`;
		}
		case 'diamond': {
			const d = r * 1.253; // the square's half-diagonal
			return `M0,${f(-d)}L${f(d)},0L0,${f(d)}L${f(-d)},0Z`;
		}
		case 'triangle': {
			const s = r * 2.694; // side of an equilateral triangle of area πr²
			const h = s * 0.866;
			return `M0,${f((-2 * h) / 3)}L${f(s / 2)},${f(h / 3)}L${f(-s / 2)},${f(h / 3)}Z`;
		}
	}
}
