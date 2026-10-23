/**
 * What each share image shows (FR-82, §6.4; decisions 88 to 92): the view's headline finding in a
 * sentence or two, a simplified chart and, in the frame, the attribution (NFR-40). Every number
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
import { deviationScore, fill, ink } from '#lib/charts/colors.ts';
import { drill } from '#lib/charts/drill-model.ts';
import { fingerprintCells, fingerprintCounts } from '#lib/charts/fingerprint-model.ts';
import { dotSize } from '#lib/charts/matrix-model.ts';
import { cellSummary, extremes } from '#lib/data/derive.ts';
import { count, respondentsIn, score, spread } from '#lib/data/format.ts';
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
import { SAMPLE_LABEL, SAMPLES, type ChangeCells } from '#lib/data/model.ts';
import { cellsAll, contextsAll, globalAll, similarityAll, societies } from '#lib/server/derived.ts';
import { factsView } from '#lib/data/society.ts';
import { CHANGE_CARD } from '#lib/share.ts';
import { PAPER_SD } from '#lib/story/story-model.ts';
import type { CardData, GridCell } from './model';

const totalRespondents = () =>
	societies.list.reduce((sum, s) => sum + (societies.respondents(s.code, 'all') ?? 0), 0);

/** The 150 pairs' global means as fills, with or without disagreement circles and FR-16 rings. */
function matrixGrid(withDisagreement: boolean): GridCell[] {
	const { universal, dependent } = extremes(globalAll, 'raw');
	return CELLS.map((_, c) => {
		const background = fill(globalAll.mean(c, 'raw'), 'light');
		return {
			fill: background,
			ink: ink(background, 'light'),
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
		kicker: 'Explore: 15 behaviors in 10 situations',
		headline:
			`Societies disagree most about ${phrase(CELLS[dependent])}, ` +
			`and least about ${phrase(CELLS[universal])}`,
		detail: [`Average judgments run from ${part(low)} to ${part(high)}.`],
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
		kicker: 'Explore: one behavior in one situation',
		headline: headline(CELLS[cell]),
		detail: [cellSummary(globalAll, cell, 'raw')],
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
	const detail =
		counts.shown === 0
			? [`No pair was rated by 10 or more ${who}, so none can be compared with the global average.`]
			: [
					`Notably stricter than the global average in ${counts.stricter} of the 150 pairs (▼) ` +
						`and notably looser in ${counts.looser} (▲).`,
					...(closest
						? [
								`Answers most like those of ${respondentsIn(closest.other, societies.get(closest.other)!.name)}.`
							]
						: [])
				];
	return {
		card: `societies/${code}`,
		kicker: 'Societies: a fingerprint against the global average',
		headline: who[0].toUpperCase() + who.slice(1),
		detail: [...detail, `${facts.respondents} respondents · ${facts.languages} · ${facts.period}`],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'grid',
			legend: 'fingerprint',
			cells: cells.map((c) => {
				const background = c.deviation === null ? null : fill(deviationScore(c.deviation), 'light');
				return {
					fill: background,
					ink: background ? ink(background, 'light') : '#4d5864',
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
	return {
		card: 'societies',
		kicker: 'Societies: 90 fingerprints',
		headline: 'How respondents in each of 90 societies differ from the global average',
		detail: [
			`From ${count(Math.min(...sizes))} to ${count(Math.max(...sizes))} respondents in each ` +
				`society, ${count(totalRespondents())} in all. Shapes mark the GSN authors' four regions.`
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
		kicker: "Who's watching? Audiences",
		headline: `${subject} judged less appropriate in front of management or professors than when alone`,
		detail: [
			`Averages of ${contextsAll.codes.length} societies. The drop is largest for ` +
				`${name(largest)} (${spread(largest.effect!)}) and smallest for ${name(smallest)} ` +
				`(${spread(smallest.effect!)}).`
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
		kicker: 'Change since the early 2000s',
		headline: `${counts.higher} of ${counts.shown} pairs were judged more appropriate in 2023–2024 than in 2000–2003`,
		detail: [
			`${counts.lower} were judged less appropriate and ${counts.within} are within their 95% ` +
				`intervals, averaging the ${n} societies in both surveys.`,
			"Two surveys about 20 years apart, with different respondents: differences between surveys, not change in anyone's views."
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
				'Each behavior in 2023–2024 minus 2000–2003, averaged over its situations and the societies in both surveys; ▲ ▼ beyond its 95% interval'
		}
	};
}

function storyCard(): CardData {
	return {
		card: 'story',
		kicker: 'The guided story',
		headline: 'Norms vary far more across situations than across societies',
		detail: [
			'A conclusion of the GSN paper, and the first step of a short tour: where societies ' +
				'agree, where they disagree most, and who is watching.'
		],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'bars',
			bars: [
				{
					label: 'Between situated behaviors',
					value: PAPER_SD.situations,
					text: spread(PAPER_SD.situations)
				},
				{ label: 'Between societies', value: PAPER_SD.societies, text: spread(PAPER_SD.societies) }
			],
			max: 0.4,
			caption:
				"Standard deviations in the GSN paper's model, on the −2.5 to +2.5 scale (Eriksson et al. 2025)"
		}
	};
}

function methodCard(): CardData {
	return {
		card: 'method',
		kicker: 'Method',
		headline: 'How the atlas turns survey answers into scores, intervals and disagreement',
		detail: [
			'Plain-language notes on the samples, the scale, shrinkage, uncertainty and the limits of ' +
				'convenience samples.'
		],
		layout: 'side',
		comparisonCredit: false,
		chart: {
			kind: 'bars',
			bars: SAMPLES.map((sample) => {
				const n = societies.list.reduce(
					(sum, s) => sum + (societies.respondents(s.code, sample) ?? 0),
					0
				);
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
