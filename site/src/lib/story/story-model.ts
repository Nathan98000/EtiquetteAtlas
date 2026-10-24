/**
 * The guided story (FR-64): four to six steps that open with one of the paper's conclusions, then the
 * most universal cell, the most culture-dependent cell, the audience effect and the largest
 * difference since the early 2000s, and hand over to the explorer. Each step's cell or behavior is
 * chosen from All data on the raw scale (decisions 82 and 83), so the story follows the data; the
 * change step exists only in a build with the change module (R-6, decision 75).
 */

import { audienceRows } from '../charts/audience-model';
import { STORY_CHANGE_TITLE } from '../change-text';
import { globalChange } from '../charts/change-model';
import { extremes, largestFirst } from '../data/derive';
import { score } from '../data/format';
import { ALONE, CELL_COUNT, MANAGEMENT } from '../data/grid';
import {
	Status,
	type ChangeCells,
	type ContextCells,
	type GlobalCells,
	type SocietyCells
} from '../data/model';
import { listText } from '../data/society';

/**
 * The paper's model (Eriksson et al. 2025), as SRS §4.8 states it: the standard deviation between
 * societies, between situated behaviors and of single ratings beyond what the model explains (its
 * Supplementary Table 9: the residual SD, apart from respondents' own 0.50 and behaviors' 0.36).
 * The atlas does not estimate these itself.
 */
export const PAPER_SD = { situations: 0.31, societies: 0.19, residual: 1.11 } as const;

/**
 * Decision 133 (D-2): step 1's picture, from All data on the raw scale. Each of the 150 pairs'
 * global average, and each society's average over all the pairs: its offset (DR-10, its mean
 * deviation from the global averages over the pairs it has) added to the mean of the 150 global
 * averages. A society with no pair of 10 or more respondents has nothing to show (DR-9).
 */
export interface Spread {
	pairs: { cell: number; value: number }[];
	societies: { code: string; value: number }[];
	/** Codes of the societies left out. */
	without: string[];
}

export function storySpread(global: GlobalCells, cells: SocietyCells): Spread {
	const pairs = Array.from({ length: CELL_COUNT }, (_, cell) => ({
		cell,
		value: global.mean(cell, 'raw')
	}));
	const grand = pairs.reduce((sum, p) => sum + p.value, 0) / pairs.length;
	const societies: Spread['societies'] = [];
	const without: string[] = [];
	cells.codes.forEach((code, s) => {
		const offset = cells.offset(s, 'raw');
		const shown = Array.from({ length: CELL_COUNT }, (_, c) => cells.status(s, c)).some(
			(status) => status === Status.Ok || status === Status.Small
		);
		if (offset === null || !shown) without.push(code);
		else societies.push({ code, value: Math.round((grand + offset) * 100) / 100 });
	});
	return { pairs, societies, without };
}

/** The picture's ranges for the prerendered page (FR-87): only numbers and codes. */
export interface SpreadNumbers {
	pairs: [number, number];
	societies: [number, number];
	/** How many societies are shown. */
	shown: number;
	without: string[];
}

export function spreadNumbers(s: Spread): SpreadNumbers {
	const range = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];
	return {
		pairs: range(s.pairs.map((p) => p.value)),
		societies: range(s.societies.map((p) => p.value)),
		shown: s.societies.length,
		without: s.without
	};
}

/** NFR-11, FR-87: step 1's picture in one sentence; `without` names the societies left out. */
export function spreadSummary(n: SpreadNumbers, without: readonly string[]): string {
	const pairs = `The 150 pairs' averages run from ${score(n.pairs[0])} to ${score(n.pairs[1])}`;
	const societies = `the ${n.shown} societies' averages over all the pairs, from ${score(
		n.societies[0]
	)} to ${score(n.societies[1])}`;
	const left = without.length
		? without.length === 1
			? ` ${without[0]} is left out: none of its pairs had 10 or more respondents.`
			: ` ${listText(without)} are left out: none of their pairs had 10 or more respondents.`
		: '';
	return `${pairs}; ${societies}.${left}`;
}

export interface CellStep {
	/** Index into the 150-cell grid. */
	cell: number;
	tau: number;
	mean: number;
	/** Mean of society shares choosing an appropriate answer (DR-11). */
	share: number;
	societies: number;
	/** The lowest and highest society estimates (shrunken, raw scale; decision 32). */
	range: [number, number];
}

export interface StoryNumbers {
	spread: SpreadNumbers;
	universal: CellStep;
	dependent: CellStep;
	/** The behavior with the largest drop from alone to management or professors (decision 58). */
	audience: { behavior: number; alone: number; management: number; effect: number };
	/** The largest difference averaged over the societies in both surveys; null without them. */
	change: { cell: number; older: number; newer: number; diff: number; societies: number } | null;
}

function cellStep(global: GlobalCells, cells: SocietyCells, cell: number): CellStep {
	const values = cells
		.column(cell, 'shrunk', 'raw')
		.flatMap((c) => (c.estimate ? [c.estimate.value] : []));
	return {
		cell,
		tau: global.tau(cell, 'raw'),
		mean: global.mean(cell, 'raw'),
		share: global.share(cell),
		societies: global.societies(cell),
		range: [Math.min(...values), Math.max(...values)]
	};
}

/** The story's numbers from All data (FR-64), computed at build time (decision 83). */
export function storyNumbers(
	global: GlobalCells,
	cells: SocietyCells,
	contexts: ContextCells,
	change: ChangeCells | null
): StoryNumbers {
	const { universal, dependent } = extremes(global, 'raw');
	const rows = audienceRows(contexts, { scope: { kind: 'global' }, split: false });
	const [top] = largestFirst(
		rows.filter((r) => r.effect !== null && r.effect > 0),
		(r) => r.effect!
	);
	const value = (k: number) => top.main.values[k].estimate!.value;
	let changeStep: StoryNumbers['change'] = null;
	if (change) {
		const [row] = largestFirst(globalChange(change).rows, (r) => r.diff.value);
		changeStep = {
			cell: row.index,
			older: row.older,
			newer: row.newer,
			diff: row.diff.value,
			societies: row.societies!
		};
	}
	return {
		spread: spreadNumbers(storySpread(global, cells)),
		universal: cellStep(global, cells, universal),
		dependent: cellStep(global, cells, dependent),
		audience: {
			behavior: top.behavior,
			alone: value(ALONE),
			management: value(MANAGEMENT),
			effect: top.effect!
		},
		change: changeStep
	};
}

export type StepId = 'finding' | 'universal' | 'dependent' | 'audience' | 'change' | 'explore';

/** The steps in order (FR-64): five without the change module, six with it. */
export function storySteps(withChange: boolean): StepId[] {
	const steps: StepId[] = ['finding', 'universal', 'dependent', 'audience', 'change', 'explore'];
	return withChange ? steps : steps.filter((s) => s !== 'change');
}

export const STEP_TITLE: Record<StepId, string> = {
	finding: 'Situations matter more than societies',
	universal: 'Where societies agree',
	dependent: 'Where societies disagree most',
	audience: 'Who is watching',
	change: STORY_CHANGE_TITLE,
	explore: 'Explore for yourself'
};
