/**
 * Every society's value for one cell, split the way the drill-down shows them (FR-20 to
 * FR-27): plotted estimates, societies with too few responses or not asked (listed, never
 * plotted or ranked), and societies outside the sample (§4.4).
 */

import { rank, rankText, type Rank } from '../data/derive';
import { score } from '../data/format';
import {
	REGIONS,
	Status,
	type Estimate,
	type EstimateKind,
	type GlobalCells,
	type Notable,
	type Region,
	type Scale,
	type Societies,
	type Society,
	type SocietyCells,
	type StatusCode
} from '../data/model';

export interface SocietyPoint extends Society {
	status: StatusCode;
	n: number | null;
	estimate: Estimate | null;
	share: number | null;
	notable: Notable | null;
}

export interface Drill {
	/** Societies with an estimate, by code. */
	plotted: SocietyPoint[];
	tooFew: SocietyPoint[];
	notAsked: SocietyPoint[];
	notInSample: Society[];
	mean: number;
	meanLo: number;
	meanHi: number;
	tau: number;
	tauLo: number;
	tauHi: number;
	/** FR-23: the band where societies typically fall, mean ± τ (decision 38). */
	band: [number, number];
}

export function drill(
	cells: SocietyCells,
	societies: Societies,
	global: GlobalCells,
	cell: number,
	kind: EstimateKind,
	scale: Scale
): Drill {
	const points: SocietyPoint[] = [];
	for (const value of cells.column(cell, kind, scale)) {
		const society = societies.get(value.code);
		if (society) points.push({ ...society, ...value });
	}
	const inSample = new Set(cells.codes);
	const mean = global.mean(cell, scale);
	const tau = global.tau(cell, scale);
	const { lo: meanLo, hi: meanHi } = global.meanInterval(cell, scale);
	const { lo: tauLo, hi: tauHi } = global.tauInterval(cell, scale);
	return {
		plotted: points.filter((p) => p.estimate !== null),
		tooFew: points.filter((p) => p.status === Status.TooFew),
		notAsked: points.filter((p) => p.status === Status.NotAsked),
		notInSample: societies.list.filter((s) => !inSample.has(s.code)),
		mean,
		meanLo,
		meanHi,
		tau,
		tauLo,
		tauHi,
		band: [mean - tau, mean + tau]
	};
}

/** FR-25: the society's rank among the plotted societies, or null when it is not plotted. */
export function societyRank(d: Drill, code: string): Rank | null {
	return rank(
		d.plotted.map((p) => ({ code: p.code, value: p.estimate!.value })),
		code
	);
}

export type Standing =
	| { kind: 'plotted'; point: SocietyPoint; rank: Rank; text: string }
	| { kind: 'too-few' | 'not-asked'; point: SocietyPoint }
	| { kind: 'not-in-sample'; society: Society }
	| { kind: 'unknown' };

/** Where the selected society stands in this cell (FR-25, FR-27, §4.4). */
export function standing(d: Drill, code: string | null): Standing {
	if (!code) return { kind: 'unknown' };
	const point = d.plotted.find((p) => p.code === code);
	if (point) {
		const r = societyRank(d, code)!;
		return { kind: 'plotted', point, rank: r, text: rankText(r) };
	}
	const tooFew = d.tooFew.find((p) => p.code === code);
	if (tooFew) return { kind: 'too-few', point: tooFew };
	const notAsked = d.notAsked.find((p) => p.code === code);
	if (notAsked) return { kind: 'not-asked', point: notAsked };
	const outside = d.notInSample.find((s) => s.code === code);
	if (outside) return { kind: 'not-in-sample', society: outside };
	return { kind: 'unknown' };
}

/** NFR-11: the map in one sentence, as averages of the plotted estimates by region. */
export function regionSummary(points: readonly SocietyPoint[]): string {
	const parts = REGIONS.flatMap((region) => {
		const values = points.filter((p) => p.region === region).map((p) => p.estimate!.value);
		if (!values.length) return [];
		const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
		const label = region === 'West' ? 'the West' : region;
		return [`${label} ${score(mean)} (${values.length})`];
	});
	if (!parts.length) return 'No society has enough responses to show on the map.';
	const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
	return `Averaged by the GSN authors' regions, estimates are ${list}, with the number of societies in brackets.`;
}

/** Plotted societies by region, for summaries and legends. */
export function countByRegion(points: readonly SocietyPoint[]): Record<Region, number> {
	const counts: Record<Region, number> = { Africa: 0, Asia: 0, 'Latin America': 0, West: 0 };
	for (const p of points) counts[p.region] += 1;
	return counts;
}
