/**
 * Two values per row on the −2.5 to +2.5 scale, as compare mode (FR-33, decision 49) and the
 * change routes (FR-50, decision 69) draw them: ● the page's own value, ○ the value it is compared
 * with, both in the text colour, so shape rather than hue tells them apart (blue and orange mean
 * appropriateness, the region colours regions). The change routes add an arrow from ○ to ●.
 */

import type { Direction } from './change-model';

export interface PairRow {
	/** The cell's index in the 150-cell grid: the row's key and its drill-down. */
	index: number;
	headline: string;
	/** ● the page's own value: its society (compare mode) or the 2023–2024 survey (change). */
	a: number;
	/** ○ the value compared with: the other society, or the 2000–2003 survey. */
	b: number;
	/** a − b, shown after the track. */
	gap: number;
	/** A tick for a reference value, such as the global mean. */
	reference?: number;
	/** Change: the arrow's colour and ▲ or ▼ (decision 69). */
	direction?: Direction;
	/** Rests on 10 to 29 ratings or respondents: a dashed ring around the point (DR-9). */
	small?: { a: boolean; b: boolean };
	/** The row in words, for screen readers. */
	text: string;
	/** Change: the values under the track where there is no details panel (below 1024 px). */
	values?: string;
}

export interface Unpaired {
	index: number;
	headline: string;
	reason: string;
}

export const SCALE_MAX = 2.5;
/** ○'s radius (with a 2 px stroke), and ●'s: smaller with an arrow, so ● sits inside ○ (◉). */
export const RING = 6;
export const DOT = 6;
export const ARROW_DOT = 4.5;
/** The arrowhead's length and half-width. */
export const HEAD = { length: 7, half: 4.5 };

/** A score's x on a track `width` px wide; scores beyond ±2.5 sit at the ends. */
export function xOf(value: number, width: number): number {
	const v = Math.max(-SCALE_MAX, Math.min(SCALE_MAX, value));
	return ((v + SCALE_MAX) / (2 * SCALE_MAX)) * width;
}

export interface Arrow {
	/** The shaft, from ○'s edge to the head's base. */
	x1: number;
	x2: number;
	/** The head, a triangle whose tip stops just short of ●. */
	head: string;
}

/**
 * The arrow from ○ at `xb` to ● at `xa`, both in px, on a row whose centre line is `y`; null when
 * the two are too close for a head, where ● inside ○ and the signed gap say it instead.
 */
export function arrow(xb: number, xa: number, y: number): Arrow | null {
	const sign = Math.sign(xa - xb);
	const room = Math.abs(xa - xb) - (RING + 1) - (ARROW_DOT + 1.5);
	if (sign === 0 || room < HEAD.length + 2) return null;
	const tip = xa - sign * (ARROW_DOT + 1.5);
	const base = tip - sign * HEAD.length;
	const r = (x: number) => Math.round(x * 10) / 10;
	return {
		x1: r(xb + sign * (RING + 1)),
		x2: r(base),
		head: `M${r(tip)},${y} L${r(base)},${y - HEAD.half} L${r(base)},${y + HEAD.half} Z`
	};
}
