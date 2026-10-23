/**
 * The guided story (FR-64): four to six steps that open with the paper's main finding, then the
 * most universal cell, the most culture-dependent cell, the audience effect and the largest
 * difference since the early 2000s, and hand over to the explorer. Each step's cell or behavior is
 * chosen from All data on the raw scale (decisions 82 and 83), so the story follows the data; the
 * change step exists only in a build with the change module (R-6, decision 75).
 */

import { audienceRows } from '../charts/audience-model';
import { globalChange } from '../charts/change-model';
import { extremes, largestFirst } from '../data/derive';
import { ALONE, MANAGEMENT } from '../data/grid';
import type { ChangeCells, ContextCells, GlobalCells, SocietyCells } from '../data/model';

/**
 * The paper's model (Eriksson et al. 2025), as SRS §4.8 states it: the standard deviation between
 * societies, between situated behaviors and of everything else (individual respondents and noise).
 * The atlas does not estimate these itself.
 */
export const PAPER_SD = { situations: 0.31, societies: 0.19, residual: 1.11 } as const;

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
	change: 'Two surveys, 20 years apart',
	explore: 'Explore for yourself'
};
