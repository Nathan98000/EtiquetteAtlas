/**
 * Direction A (decision 118): chart titles that state what the chart shows, FT-style, with the unit
 * and what is drawn in a subtitle. Each is an observation about the answers (§6.5): it names
 * respondents' averages, never a society's character or a cause. Pages build them at build time
 * from All data and again in the browser for the active sample and scale, as the summaries are
 * built, so a default view does not move when the data arrive (NFR-2).
 */

import { REGIONS, type Region } from '../data/model';
import { responseLabel } from '../data/format';
import { BEHAVIOR_TEXT, SITUATION_TEXT, phrase, type Behavior, type Cell } from '../data/grid';

/** The matrix: how many of the pairs lean inappropriate on average. */
export function pairsTitle(means: readonly number[]): string {
	const n = means.filter((m) => m < 0).length;
	const all = means.length;
	if (n === 0) return 'No pair is judged inappropriate on average';
	if (n === all) return `All ${all} pairs are judged inappropriate on average`;
	return `${n} of the ${all} pairs are judged inappropriate on average`;
}

/** Subtitles fit one line on a phone; the legends say the rest (D-23). */
export const PAIRS_SUBTITLE = 'Each behavior in each situation';

/** A beeswarm: how far the societies' averages run, in the response labels. */
export function rangeTitle(values: readonly number[]): string {
	if (!values.length) return 'No society has enough responses to show';
	const [lo, hi] = [responseLabel(Math.min(...values)), responseLabel(Math.max(...values))];
	return lo === hi
		? `Every society's average is ${lo}`
		: `Societies' averages run from ${lo} to ${hi}`;
}

/** A map: the GSN authors' regions with the highest and lowest average of their societies. */
export function regionTitle(points: readonly { region: Region; value: number }[]): string {
	const means = REGIONS.flatMap((region) => {
		const values = points.filter((p) => p.region === region).map((p) => p.value);
		return values.length
			? [{ region, mean: values.reduce((sum, v) => sum + v, 0) / values.length }]
			: [];
	});
	if (means.length < 2) return 'Each society where it is';
	const sorted = [...means].sort((a, b) => b.mean - a.mean);
	const name = (r: Region) => (r === 'West' ? 'the West' : r);
	return `Highest averages in ${name(sorted[0].region)}, lowest in ${name(sorted.at(-1)!.region)}`;
}

/** The strip: the situations where a behavior is most and least accepted. */
export function stripTitle(
	behavior: Behavior,
	values: readonly { cell: Cell; value: number }[]
): string {
	const sorted = [...values].sort((a, b) => b.value - a.value);
	const top = SITUATION_TEXT[sorted[0].cell.situation].item;
	const bottom = SITUATION_TEXT[sorted.at(-1)!.cell.situation].item;
	return `${BEHAVIOR_TEXT[behavior].gerund}: most accepted ${top}, least ${bottom}`;
}

/** A fingerprint: the pairs where the society's respondents were clearly looser or stricter. */
export function fingerprintTitle(counts: {
	shown: number;
	looser: number;
	stricter: number;
}): string {
	if (!counts.shown) return 'No pair has enough responses to show';
	if (!counts.looser && !counts.stricter) return 'Too close to call on every pair';
	const pairs = (n: number) => `${n} ${n === 1 ? 'pair' : 'pairs'}`;
	return `Clearly looser than the global average on ${pairs(counts.looser)}, clearly stricter on ${counts.stricter}`;
}

export const FINGERPRINT_SUBTITLE = 'Each behavior in each situation, against the global average';

/** A comparison: the pair with the largest gap between the two societies' respondents. */
export function compareTitle(largest: Cell | undefined): string {
	return largest ? `The largest gap: ${phrase(largest)}` : 'No pair both can show';
}

/** The audiences' panels: how many behaviors drop in front of management or professors. */
export function audiencesTitle(effects: readonly (number | null)[]): string {
	const shown = effects.filter((e): e is number => e !== null);
	const drop = shown.filter((e) => e > 0).length;
	if (!shown.length) return 'No behavior has enough responses to show';
	if (drop === shown.length) {
		return `${shown.length === 15 ? 'Every' : `All ${shown.length}`} ${
			shown.length === 15 ? 'behavior drops' : 'behaviors drop'
		} in front of management or professors`;
	}
	return `${drop} of the ${shown.length} behaviors drop in front of management or professors`;
}

export const AUDIENCES_SUBTITLE = "Each panel: one behavior's average answers";

/** A behavior's slopegraph: its answer alone and in front of management or professors. */
export function audienceTitle(
	behavior: Behavior,
	alone: number | null,
	management: number | null
): string {
	const label = BEHAVIOR_TEXT[behavior].label;
	if (alone === null || management === null) return `${label}, by audience`;
	return `${label}: ${responseLabel(alone)} alone, ${responseLabel(management)} in front of management or professors`;
}

/** The societies index's map: the region with the most societies in the atlas. */
export function placesTitle(regions: readonly Region[]): string {
	const counts = REGIONS.map((region) => ({
		region,
		n: regions.filter((r) => r === region).length
	})).sort((a, b) => b.n - a.n);
	const top = counts[0];
	const name = top.region === 'West' ? 'the West' : top.region;
	return `${top.n} of the ${regions.length} societies are in ${name}`;
}
