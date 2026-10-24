/**
 * What the matrix, its list, table and details show for each of the 150 cells (FR-10 to
 * FR-17), computed once per sample, scale and society so the views agree.
 */

import { CELLS, CELL_COUNT, headline, type Cell } from '../data/grid';
import { extremes } from '../data/derive';
import { respondentsIn, responseLabel, score, spread } from '../data/format';
import {
	Status,
	type Estimate,
	type GlobalCells,
	type Notable,
	type Scale,
	type SocietyCells,
	type StatusCode
} from '../data/model';
import { scoreStyle } from './colors';

/** τ at which the disagreement ring reaches its full size; published τ stay below 0.9. */
export const TAU_MAX = 1;

/**
 * D-3, decision 37: the largest move of a global mean between the raw and centered scales, which
 * is why centering leaves the matrix almost unchanged.
 */
export function centeringShift(global: GlobalCells): number {
	let most = 0;
	for (let c = 0; c < CELL_COUNT; c++) {
		most = Math.max(most, Math.abs(global.mean(c, 'centered') - global.mean(c, 'raw')));
	}
	return most;
}

/** FR-11: the circle's area grows with τ, so its diameter grows with √τ (decision 34). */
export function dotSize(tau: number): number {
	return Math.sqrt(Math.max(0, Math.min(tau, TAU_MAX)) / TAU_MAX);
}

export interface SelectedSociety {
	code: string;
	name: string;
	/** False when the society is not in the active sample (§4.4). */
	inSample: boolean;
	/** The society's row in the sample's cells file, once that file has loaded. */
	index: number | undefined;
}

export interface SocietyValue {
	status: StatusCode;
	/** Shrunken estimate on the scale shown (decision 32); null when suppressed. */
	estimate: Estimate | null;
	notable: Notable | null;
}

export type Mark = 'looser' | 'stricter' | 'close' | 'missing';

export interface MatrixCell extends Cell {
	headline: string;
	mean: number;
	meanLo: number;
	meanHi: number;
	tau: number;
	tauLo: number;
	tauHi: number;
	share: number;
	societies: number;
	respondents: number;
	/** Disagreement circle diameter as a share of its maximum (FR-11). */
	dot: number;
	/** Fill and ink for both themes (FR-10). */
	style: string;
	universal: boolean;
	dependent: boolean;
	/** The selected society's value, when one is selected and in the sample (FR-15). */
	society: SocietyValue | undefined;
	mark: Mark | undefined;
}

export function markOf(value: SocietyValue | undefined): Mark | undefined {
	if (!value) return undefined;
	if (value.status >= Status.TooFew || value.notable === null) return 'missing';
	return value.notable > 0 ? 'looser' : value.notable < 0 ? 'stricter' : 'close';
}

export const MARK_GLYPH: Record<Mark, string> = {
	looser: '▲',
	stricter: '▼',
	close: '',
	missing: '–'
};

export function matrixCells(
	global: GlobalCells,
	scale: Scale,
	cells?: SocietyCells,
	society?: SelectedSociety
): MatrixCell[] {
	const { universal, dependent } = extremes(global, scale);
	return CELLS.map((cell) => {
		const c = cell.index;
		const mean = global.mean(c, scale);
		const { lo: meanLo, hi: meanHi } = global.meanInterval(c, scale);
		const tau = global.tau(c, scale);
		const { lo: tauLo, hi: tauHi } = global.tauInterval(c, scale);
		const s = society?.index;
		const value: SocietyValue | undefined =
			cells && s !== undefined
				? {
						status: cells.status(s, c),
						estimate: cells.estimate(s, c, 'shrunk', scale),
						notable: cells.notable(s, c, scale)
					}
				: undefined;
		return {
			...cell,
			headline: headline(cell),
			mean,
			meanLo,
			meanHi,
			tau,
			tauLo,
			tauHi,
			share: global.share(c),
			societies: global.societies(c),
			respondents: global.respondents(c),
			dot: dotSize(tau),
			style: scoreStyle(mean),
			universal: c === universal,
			dependent: c === dependent,
			society: value,
			mark: markOf(value)
		};
	});
}

/** How the selected society compares, in words (FR-15, FR-27). */
export function societyPhrase(value: SocietyValue): string {
	if (value.status === Status.NotAsked) return 'not asked';
	if (value.status === Status.TooFew || !value.estimate) return 'too few responses';
	// §6.5, decision 2: "clearly" only when the interval decides (FR-31).
	const comparison =
		value.notable === 1
			? 'clearly looser than the global average'
			: value.notable === -1
				? 'clearly stricter than the global average'
				: 'too close to call against the global average';
	const small = value.status === Status.Small ? ', small sample' : '';
	return `${score(value.estimate.value)}, ${comparison}${small}`;
}

/** The accessible name of a matrix cell: the essentials, with details in the tooltip. */
export function cellLabel(cell: MatrixCell, society?: SelectedSociety): string {
	const parts = [
		`${cell.headline}: ${score(cell.mean)}, ${responseLabel(cell.mean)}`,
		`disagreement ${spread(cell.tau)}`
	];
	if (cell.universal) parts.push('the most universal pair');
	if (cell.dependent) parts.push('the most culture-dependent pair');
	if (society && cell.society) {
		parts.push(`${respondentsIn(society.code, society.name)}: ${societyPhrase(cell.society)}`);
	}
	return parts.join('; ');
}
