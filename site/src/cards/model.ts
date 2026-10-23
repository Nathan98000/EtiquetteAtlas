/**
 * The shapes of the share images' content (decision 91), shared by the card builders in cards.ts,
 * which run at build time, and the card components that draw them.
 */

import { BEHAVIOR_TEXT, BEHAVIORS, SITUATION_TEXT, SITUATIONS } from '#lib/data/grid.ts';
import type { Region } from '#lib/data/model.ts';

export type Layout = 'side' | 'stack';

/** One cell of a 15 × 10 grid, in paper order. */
export interface GridCell {
	/** Null for a pair with nothing to show: no fill, a dashed outline and a dash. */
	fill: string | null;
	ink: string;
	/** Disagreement circle's size, 0 to 1 (FR-11); null for none. */
	dot: number | null;
	/** FR-16: 1 the most universal pair, 2 the most culture-dependent. */
	ring: 0 | 1 | 2;
	/** ▲ notably looser, ▼ notably stricter (FR-31), or empty. */
	mark: string;
}

export interface SwarmDot {
	code: string;
	value: number;
	fill: string;
	/** 10 to 29 respondents: drawn hollow, as in the beeswarm (decision 32). */
	small: boolean;
}

export interface SlopeLine {
	label: string;
	/** Alone, colleagues or classmates, management or professors. */
	values: (number | null)[];
	highlight: boolean;
}

/** A behavior's mean difference between the two surveys, with its 95% interval (decision 73). */
export interface StripRow {
	label: string;
	diff: number;
	lo: number;
	hi: number;
	/** 1 judged more appropriate in 2023–2024, −1 less, beyond the interval; 0 within it. */
	direction: 1 | -1 | 0;
	text: string;
}

export interface Bar {
	label: string;
	value: number;
	text: string;
}

export interface MapDot {
	x: number;
	y: number;
	region: Region;
}

export type CardChart =
	| { kind: 'grid'; legend: 'matrix' | 'fingerprint'; cells: GridCell[] }
	| { kind: 'swarm'; dots: SwarmDot[]; mean: number; low: string; high: string; note: string }
	| { kind: 'slopes'; columns: string[]; lines: SlopeLine[] }
	| { kind: 'strip'; rows: StripRow[]; caption: string }
	| { kind: 'bars'; bars: Bar[]; max: number; caption: string }
	| { kind: 'map'; land: string; width: number; height: number; dots: MapDot[] };

export interface CardData {
	/** The card's path below share/, without .png. */
	card: string;
	kicker: string;
	headline: string;
	detail: string[];
	layout: Layout;
	/** The change module's card also credits the 2000–2003 survey (NFR-41). */
	comparisonCredit: boolean;
	chart: CardChart;
}

export const ROW_LABELS = BEHAVIORS.map((b) => BEHAVIOR_TEXT[b].label);
export const COLUMN_LABELS = SITUATIONS.map((s) => SITUATION_TEXT[s].label);
