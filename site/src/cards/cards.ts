/**
 * What each share image shows (FR-82, §6.4; decisions 88 to 92, amended by decision 136, D-38):
 * the view's finding as the headline, taken from the same functions as the page's lede, one short
 * detail line, a simplified chart and, in the frame, the attribution (NFR-40). Every number
 * comes from data/derived/ through the decoders and the pages' own summary functions, from All data
 * on the raw scale, as the prerendered pages use. Wording follows §6.5: "respondents in Chile",
 * observations only (FR-73), and differences between two surveys, never change (FR-52).
 */

import { feature } from 'topojson-client';
import { geoEqualEarth, geoPath } from 'd3-geo';
import type { Topology } from 'topojson-specification';
import land from 'world-atlas/land-110m.json';
import { audienceRows } from '#lib/charts/audience-model.ts';
import { behaviorStrip, changeCounts, globalChange } from '#lib/charts/change-model.ts';
import { CHANGE_NAME } from '#lib/change-text.ts';
import { deviationScore, fill } from '#lib/charts/colors.ts';
import { drill } from '#lib/charts/drill-model.ts';
import {
	fingerprintCells,
	fingerprintCounts,
	fingerprintHeadline,
	fingerprintOther
} from '#lib/charts/fingerprint-model.ts';
import { dotSize } from '#lib/charts/matrix-model.ts';
import { cellDetail, cellHeadline, extremes } from '#lib/data/derive.ts';
import { count, respondentsIn, score } from '#lib/data/format.ts';
import {
	AUDIENCES,
	BEHAVIOR_TEXT,
	BEHAVIORS,
	CELLS,
	CONTEXT_TEXT,
	CONTEXTS,
	cellParams,
	headline,
	phrase,
	type Behavior
} from '#lib/data/grid.ts';
import { SAMPLE_LABEL, SAMPLES, type ChangeCells, type SampleId } from '#lib/data/model.ts';
import { cellsAll, contextsAll, globalAll, similarityAll, societies } from '#lib/server/derived.ts';
import { factsView } from '#lib/data/society.ts';
import { CHANGE_CARD } from '#lib/share.ts';
import { spreadNumbers, spreadSummary, storySpread } from '#lib/story/story-model.ts';
import type { CardData, GridCell } from './model';

const sampleTotal = (sample: SampleId) =>
	societies.list.reduce((sum, s) => sum + (societies.respondents(s.code, sample) ?? 0), 0);
const totalRespondents = () => sampleTotal('all');
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);

/** The 150 pairs' global means as fills, with or without disagreement circles and FR-16 rings. */
function matrixGrid(withDisagreement: boolean): GridCell[] {
	const { universal, dependent } = extremes(globalAll, 'raw');
	return CELLS.map((_, c) => {
		return {
			fill: fill(globalAll.mean(c, 'raw'), 'light'),
			dot: withDisagreement ? dotSize(globalAll.tau(c, 'raw')) : null,
			ring: !withDisagreement ? 0 : c === universal ? 1 : c === dependent ? 2 : 0,
			mark: ''
		};
	});
}

function homeCard(): CardData {
	return {
		card: 'home',
		kicker: 'A quiz and an atlas of everyday norms',
		headline: 'Is it fine to eat on a bus, or to use a phone at a funeral?',
		detail: [
			`See how ${count(totalRespondents())} respondents in ${societies.list.length} societies ` +
				'judged 15 everyday behaviors in 10 situations, and where your own answers fall.'
		],
		layout: 'side',
		comparisonCredit: false,
		chart: { kind: 'grid', legend: 'matrix', cells: matrixGrid(false) }
	};
}

function exploreCard(): CardData {
	const { universal, dependent } = extremes(globalAll, 'raw');
	const byMean = CELLS.map((_, c) => c).sort(
		(a, b) => globalAll.mean(a, 'raw') - globalAll.mean(b, 'raw')
	);
	const [low, high] = [byMean[0], byMean[byMean.length - 1]];
	const part = (c: number) => `${score(globalAll.mean(c, 'raw'))} for ${phrase(CELLS[c])}`;
	return {
		card: 'explore',
		kicker: 'Situations: 15 behaviors in 10 situations',
		headline:
			`Societies disagree most about ${phrase(CELLS[dependent])}, ` +
			`and least about ${phrase(CELLS[universal])}`,
		detail: [`Average answers run from ${part(low)} to ${part(high)}.`],
		layout: 'side',
		comparisonCredit: false,
		chart: { kind: 'grid', legend: 'matrix', cells: matrixGrid(true) }
	};
}

function cellCard(behavior: string, situation: string): CardData | null {
	const cell = CELLS.findIndex((c) => {
		const p = cellParams(c);
		return p.behavior === behavior && p.situation === situation;
	});
	if (cell < 0) return null;
	const d = drill(cellsAll, societies, globalAll, cell, 'shrunk', 'raw');
	const sorted = [...d.plotted].sort((a, b) => a.estimate!.value - b.estimate!.value);
	const [lowest, highest] = [sorted[0], sorted[sorted.length - 1]];
	const missing = d.tooFew.length + d.notAsked.length;
	return {
		card: `explore/${behavior}/${situation}`,
		kicker: `Situations: ${headline(CELLS[cell]).toLowerCase()}`,
		headline: cellHeadline(globalAll, cell, 'raw', true),
		detail: [cellDetail(globalAll, cell, 'raw')],
		layout: 'stack',
		comparisonCredit: false,
		chart: {
			kind: 'swarm',
			dots: d.plotted.map((p) => ({
				code: p.code,
				value: p.estimate!.value,
				fill: fill(p.estimate!.value, 'light'),
				small: p.status === 1
			})),
			mean: d.mean,
			low: `${lowest.name} ${score(lowest.estimate!.value)}`,
			high: `${highest.name} ${score(highest.estimate!.value)}`,
			note:
				`One dot per society: ${d.plotted.length} societies` +
				(missing ? `; ${missing} with too few responses or not asked are left out` : '')
		}
	};
}

function societyCard(code: string): CardData | null {
	const society = societies.get(code.toUpperCase());
	if (!society || code !== society.code.toLowerCase()) return null;
	const who = respondentsIn(society.code, society.name);
	const cells = fingerprintCells(globalAll, cellsAll, cellsAll.indexOf(society.code)!, 'raw');
	const counts = fingerprintCounts(cells);
	const facts = factsView(societies, society.code, 'all')!.inSample!;
	const [closest] = similarityAll.pairs(society.code);
	const like = closest
		? `answers most like those of ${respondentsIn(closest.other, societies.get(closest.other)!.name)}`
		: null;
	// Decision 136: one short detail line.
	const detail =
		counts.shown === 0
			? `${facts.respondents} respondents, too few for any one pair`
			: `${fingerprintOther(counts)}${like ? `; ${like}` : ''}.`;
	return {
		card: `societies/${code}`,
		kicker: `Societies: ${society.name}`,
		headline: fingerprintHeadline(who, counts),
		detail: [detail],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'grid',
			legend: 'fingerprint',
			cells: cells.map((c) => {
				return {
					fill: c.deviation === null ? null : fill(deviationScore(c.deviation), 'light'),
					dot: null,
					ring: 0,
					mark: c.mark === 'looser' ? '▲' : c.mark === 'stricter' ? '▼' : ''
				};
			})
		}
	};
}

const NORTH = 75;
const SOUTH = -50;
const MAP_WIDTH = 570;

function societiesCard(): CardData {
	const sizes = societies.list.map((s) => societies.respondents(s.code, 'all') ?? 0);
	// Cropped to 75° N–50° S, as on the drill-down's map (decision 36).
	const projection = geoEqualEarth().fitWidth(MAP_WIDTH, { type: 'Sphere' });
	const [tx, ty] = projection.translate();
	projection.translate([tx, ty - projection([0, NORTH])![1]]);
	const height = projection([0, SOUTH])![1];
	const topology = land as unknown as Topology;
	const outline = geoPath(projection).digits(1)(feature(topology, topology.objects.land)) ?? '';
	// Decision 136: the societies whose respondents were clearly looser, and clearly stricter, than
	// the global average on the most pairs.
	const counts = societies.list.map((s) => ({
		society: s,
		...fingerprintCounts(fingerprintCells(globalAll, cellsAll, cellsAll.indexOf(s.code)!, 'raw'))
	}));
	const most = (key: 'looser' | 'stricter') =>
		counts.reduce((a, b) => (b[key] > a[key] ? b : a)).society;
	const [looser, stricter] = [most('looser'), most('stricter')];
	return {
		card: 'societies',
		kicker: 'Societies: 90 fingerprints',
		headline:
			`${capital(respondentsIn(looser.code, looser.name))} were clearly looser than the global ` +
			`average on the most pairs, ${respondentsIn(stricter.code, stricter.name)} clearly stricter`,
		detail: [
			`From ${count(Math.min(...sizes))} to ${count(Math.max(...sizes))} respondents in each ` +
				`society; shapes mark the GSN authors' four regions.`
		],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'map',
			land: outline,
			width: MAP_WIDTH,
			height,
			dots: societies.list.map((s) => {
				const [x, y] = projection([s.lon, s.lat])!;
				return { x, y, region: s.region };
			})
		}
	};
}

function audiencesCard(): CardData {
	const rows = audienceRows(contextsAll, { scope: { kind: 'global' }, split: false });
	const ranked = rows.filter((r) => r.effect !== null).sort((a, b) => b.effect! - a.effect!);
	const [largest, smallest] = [ranked[0], ranked[ranked.length - 1]];
	const drops = ranked.filter((r) => r.effect! > 0).length;
	const name = (r: (typeof rows)[number]) =>
		BEHAVIOR_TEXT[BEHAVIORS[r.behavior] as Behavior].gerund.toLowerCase();
	const subject =
		drops === BEHAVIORS.length
			? `Every one of the ${drops} behaviors was`
			: `${drops} of the 15 behaviors were`;
	return {
		card: 'audiences',
		kicker: "Who's watching",
		headline: `${subject} judged less appropriate in front of management or professors than when alone`,
		detail: [
			`Averages of ${contextsAll.codes.length} societies. The drop is largest for ` +
				`${name(largest)} (${largest.effect!.toFixed(1)}) and smallest for ${name(smallest)} ` +
				`(${smallest.effect!.toFixed(1)}).`
		],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'slopes',
			columns: AUDIENCES.map((k) => CONTEXT_TEXT[CONTEXTS[k]].short),
			lines: rows.map((r) => ({
				label: BEHAVIOR_TEXT[BEHAVIORS[r.behavior] as Behavior].label,
				values: AUDIENCES.map((k) => r.main.values[k].estimate?.value ?? null),
				highlight: r === largest || r === smallest
			}))
		}
	};
}

function changeCard(change: ChangeCells): CardData {
	const counts = changeCounts(globalChange(change).rows);
	const n = change.codes.length;
	return {
		card: CHANGE_CARD,
		kicker: `${CHANGE_NAME}: two surveys about 20 years apart`,
		headline: `${counts.higher} of the ${counts.shown} pairs are clearly higher in 2023–2024 than in 2000–2003`,
		detail: [
			`${counts.lower} clearly lower and ${counts.within} too close to call, over the ${n} ` +
				`societies in both surveys: a difference between two surveys, not a change in anyone's views.`
		],
		layout: 'side',
		comparisonCredit: true,
		chart: {
			kind: 'strip',
			rows: behaviorStrip(change).map((s) => ({
				label: s.label,
				diff: s.diff.value,
				lo: s.diff.lo,
				hi: s.diff.hi,
				direction: s.direction,
				text: score(s.diff.value)
			})),
			caption:
				'Each behavior in 2023–2024 minus 2000–2003, averaged over its situations and the societies in both surveys; ▲ ▼ clearly higher or lower'
		}
	};
}

function storyCard(): CardData {
	// Decisions 133 and 136: step 1's picture, the pairs' and the societies' averages.
	const spread = storySpread(globalAll, cellsAll);
	const dot = (key: string, value: number) => ({ key, value, fill: fill(value, 'light') });
	return {
		card: 'story',
		kicker: 'The tour',
		headline: 'Behaviors in their situations vary more than societies',
		detail: [spreadSummary(spreadNumbers(spread), [])],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'spread',
			pairs: spread.pairs.map((p) => dot(String(p.cell), p.value)),
			societies: spread.societies.map((p) => dot(p.code, p.value)),
			labels: [
				`The ${spread.pairs.length} pairs' averages`,
				`The ${spread.societies.length} societies' averages`
			],
			caption: 'Average answers of all respondents, on the −2.5 to +2.5 scale'
		}
	};
}

function methodCard(): CardData {
	return {
		card: 'method',
		kicker: 'Method',
		headline:
			`Three samples: all ${count(sampleTotal('all'))} respondents, the paper's ` +
			`${count(sampleTotal('paper'))} or the ${count(sampleTotal('attention'))} who passed the ` +
			'attention check',
		detail: [
			'Plain-language notes on the samples, the scale, the adjustment for small samples, ' +
				'uncertainty and the limits of convenience samples.'
		],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'bars',
			bars: SAMPLES.map((sample) => {
				const n = sampleTotal(sample);
				return {
					label: SAMPLE_LABEL[sample],
					value: n,
					text: `${count(n)} respondents in ${societies.count(sample)} societies`
				};
			}),
			max: totalRespondents(),
			caption: 'The three samples you can switch between'
		}
	};
}

/** Every card's path, in a build with or without the change module (R-6). */
export function cardPaths(withChange: boolean): string[] {
	return [
		'home',
		'explore',
		...CELLS.map((c) => {
			const { behavior, situation } = cellParams(c);
			return `explore/${behavior}/${situation}`;
		}),
		'societies',
		...societies.list.map((s) => `societies/${s.code.toLowerCase()}`),
		'audiences',
		...(withChange ? [CHANGE_CARD] : []),
		'story',
		'method'
	];
}

/** A card's content, or null for a path that has none. */
export function cardFor(path: string, change: ChangeCells | null): CardData | null {
	const [first, second, third] = path.split('/');
	switch (first) {
		case 'home':
			return second ? null : homeCard();
		case 'explore':
			return !second ? exploreCard() : third ? cellCard(second, third) : null;
		case 'societies':
			return second ? societyCard(second) : societiesCard();
		case 'audiences':
			return second ? null : audiencesCard();
		case CHANGE_CARD:
			return second || !change ? null : changeCard(change);
		case 'story':
			return second ? null : storyCard();
		case 'method':
			return second ? null : methodCard();
		default:
			return null;
	}
}
