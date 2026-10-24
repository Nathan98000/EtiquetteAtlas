/**
 * "Who's watching?" (FR-40 to FR-42): how respondents judged each behavior when alone, in front of
 * colleagues or classmates and in front of management or professors, for one society or for all
 * societies together. Two more contexts say who does the behavior, a woman or a man: they are the
 * actor's gender, never an audience. Women and men respondents are split for all societies only
 * (DR-12, §4.7). Values are raw means: the contexts file has no shrunken or centered one.
 *
 * The audience effect is alone minus management or professors, the two ends of the audiences'
 * order, signed so a reversal shows (decision 58). It has no interval of its own (decision 60).
 */

import {
	ACTORS,
	ALONE,
	AUDIENCES,
	BEHAVIOR_TEXT,
	BEHAVIORS,
	CONTEXT_TEXT,
	CONTEXTS,
	MANAGEMENT
} from '../data/grid';
import { cents, orderBy, type SortKey } from '../data/derive';
import { count, ordinal, percent, place, responseLabel, score } from '../data/format';
import {
	Status,
	missingText,
	type ContextCells,
	type ContextValue,
	type RespondentGender
} from '../data/model';
import { listText } from '../data/society';

/** Whose values a line shows. */
export type SeriesKind = 'main' | 'reference' | 'women' | 'men';

export interface Series {
	kind: SeriesKind;
	/** "Respondents in Chile", "All societies", "Women respondents", "Men respondents". */
	label: string;
	/** For a line's end: "Chile", "All societies", "Women", "Men". */
	short: string;
	/** One value per context, in CONTEXTS order: three audiences, then the actor's gender. */
	values: ContextValue[];
}

/** All societies together, or one society's respondents (FR-42). */
export type AudienceScope =
	{ kind: 'global' } | { kind: 'society'; index: number; code: string; name: string };

export interface AudienceView {
	scope: AudienceScope;
	/** Women and men respondents in place of all respondents; all societies only (DR-12). */
	split: boolean;
}

export interface BehaviorAudiences {
	/** Index into BEHAVIORS. */
	behavior: number;
	/** The view's own values, which the effect, order and sort use even when split on screen. */
	main: Series;
	/** The lines drawn, back to front (readingOrder lists them for text). */
	series: Series[];
	/** Alone minus management or professors (FR-41); null when either is missing. */
	effect: number | null;
	/** The audiences from most to least appropriate, when that is not their own order. */
	outOfOrder: number[] | null;
	/** Not asked in any audience (Kuwait: kissing, flirting; Saudi Arabia: kissing). */
	notAsked: boolean;
}

export const GLOBAL_LABEL = 'All societies';
export const SPLIT_LABEL: Record<RespondentGender, string> = {
	woman: 'Women respondents',
	man: 'Men respondents'
};
const SPLIT_SHORT: Record<RespondentGender, string> = { woman: 'Women', man: 'Men' };

const lower = (text: string) => text[0].toLowerCase() + text.slice(1);
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const gerund = (b: number) => BEHAVIOR_TEXT[BEHAVIORS[b]].gerund.toLowerCase();
const value = (v: ContextValue) => v.estimate?.value ?? null;
const contextPhrase = (k: number) => CONTEXT_TEXT[CONTEXTS[k]].phrase;
/** One decimal, unsigned: "3.0". */
const size = (x: number) => Math.abs(x).toFixed(1);

/** "Respondents in Chile", "Respondents in the Philippines". */
export function societyLabel(code: string, name: string): string {
	return `Respondents in ${place(code, name)}`;
}

function values(read: (context: number) => ContextValue): ContextValue[] {
	return CONTEXTS.map((_, k) => read(k));
}

/** Alone minus management or professors in hundredths, or null when either is missing. */
export function effectOf(series: readonly ContextValue[]): number | null {
	const alone = value(series[ALONE]);
	const management = value(series[MANAGEMENT]);
	return alone === null || management === null ? null : cents(alone - management) / 100;
}

/** Done by a woman minus done by a man (FR-42), or null when either is missing. */
export function actorGap(series: readonly ContextValue[]): number | null {
	const woman = value(series[ACTORS[0]]);
	const man = value(series[ACTORS[1]]);
	return woman === null || man === null ? null : cents(woman - man) / 100;
}

/** The highest minus the lowest of the three audiences, or null when any is missing. */
export function audienceRange(series: readonly ContextValue[]): number | null {
	const shown = AUDIENCES.map((k) => value(series[k]));
	if (shown.some((v) => v === null)) return null;
	const numbers = shown as number[];
	return cents(Math.max(...numbers) - Math.min(...numbers)) / 100;
}

/**
 * The audiences from most to least appropriate when that differs from their own order (talking:
 * colleagues or classmates first). Ties keep the audiences' order; null when in order or when an
 * audience is missing.
 */
export function outOfOrder(series: readonly ContextValue[]): number[] | null {
	if (AUDIENCES.some((k) => value(series[k]) === null)) return null;
	const order = orderBy(AUDIENCES.length, (k) => cents(value(series[k])!), true);
	return order.every((k, i) => k === i) ? null : order;
}

/** One behavior in the view (FR-40, FR-42). */
export function behaviorAudiences(
	file: ContextCells,
	behavior: number,
	view: AudienceView
): BehaviorAudiences {
	const global: Series = {
		kind: view.scope.kind === 'society' ? 'reference' : 'main',
		label: GLOBAL_LABEL,
		short: GLOBAL_LABEL,
		values: values((k) => file.global(behavior, k))
	};
	let main = global;
	let series: Series[] = [global];
	if (view.scope.kind === 'society') {
		const { index, code, name } = view.scope;
		main = {
			kind: 'main',
			label: societyLabel(code, name),
			short: capital(place(code, name)),
			values: values((k) => file.society(index, behavior, k))
		};
		series = [global, main];
	} else if (view.split) {
		series = (['woman', 'man'] as const).map((gender) => ({
			kind: gender === 'woman' ? 'women' : 'men',
			label: SPLIT_LABEL[gender],
			short: SPLIT_SHORT[gender],
			values: values((k) => file.byGender(gender, behavior, k))
		}));
	}
	return {
		behavior,
		main,
		series,
		effect: effectOf(main.values),
		outOfOrder: outOfOrder(main.values),
		notAsked: AUDIENCES.every((k) => main.values[k].status === Status.NotAsked)
	};
}

const READING: SeriesKind[] = ['main', 'women', 'men', 'reference'];

/** Lines in reading order for keys, text and tables: the view's own first, women before men. */
export function readingOrder(series: readonly Series[]): Series[] {
	return [...series].sort((a, b) => READING.indexOf(a.kind) - READING.indexOf(b.kind));
}

/** All 15 behaviors in paper order (FR-41). */
export function audienceRows(file: ContextCells, view: AudienceView): BehaviorAudiences[] {
	return BEHAVIORS.map((_, b) => behaviorAudiences(file, b, view));
}

/**
 * FR-41: the small multiples' order. "effect" puts the largest drop first, then reversals, then
 * behaviors with no effect; ties keep paper order.
 */
export function audienceOrder(rows: readonly BehaviorAudiences[], sort: SortKey): number[] {
	switch (sort) {
		case 'effect':
			return orderBy(
				rows.length,
				(i) => (rows[i].effect === null ? Number.NEGATIVE_INFINITY : cents(rows[i].effect!)),
				true
			);
		case 'name':
			return orderBy(rows.length, (i) => BEHAVIOR_TEXT[BEHAVIORS[rows[i].behavior]].label, false);
		default:
			return rows.map((_, i) => i);
	}
}

/** "3.0 lower in front of management or professors than when alone". */
export function effectText(effect: number | null): string {
	if (effect === null) return 'no comparison: too few responses';
	if (Math.abs(effect) < 0.05) {
		return 'about the same when alone and in front of management or professors';
	}
	return `${size(effect)} ${effect > 0 ? 'lower' : 'higher'} in front of management or professors than when alone`;
}

/** For a small panel: "3.0 lower with management", "About the same". */
export function effectShort(effect: number | null): string {
	if (effect === null) return 'Too few responses to compare';
	if (Math.abs(effect) < 0.05) return 'About the same with management';
	return `${size(effect)} ${effect > 0 ? 'lower' : 'higher'} with management`;
}

/** "Done by a woman: 0.6 higher than done by a man". */
export function actorText(gap: number | null): string {
	if (gap === null) return 'no comparison: too few responses';
	if (Math.abs(gap) < 0.05) return 'about the same done by a woman and done by a man';
	return `${size(gap)} ${gap > 0 ? 'higher' : 'lower'} done by a woman than done by a man`;
}

/** "Not in the audiences' order: most appropriate in front of colleagues or classmates …". */
export function orderNote(row: BehaviorAudiences): string | null {
	if (!row.outOfOrder) return null;
	const parts = row.outOfOrder.map(
		(k) => `${contextPhrase(k)} (${score(value(row.main.values[k])!)})`
	);
	const range = audienceRange(row.main.values)!;
	return (
		`Not in the audiences' order: judged most appropriate ${parts[0]}, then ${parts[1]}, then ` +
		`${parts[2]}. The difference between when alone and in front of management or professors ` +
		`(${size(row.effect!)}) is smaller than the range across the three audiences (${size(range)}).`
	);
}

/** The sentences' subject for a view: "Respondents in Chile judged", or the average of all. */
export function subjectOf(scope: AudienceScope, societies: number): string {
	return scope.kind === 'society'
		? `${societyLabel(scope.code, scope.name)} judged`
		: `On average across the ${societies} societies, respondents judged`;
}

/**
 * NFR-11, FR-87: the small multiples in one sentence. `subject` comes from subjectOf. States what
 * respondents judged, never why (FR-73).
 */
export function audiencesSummary(rows: readonly BehaviorAudiences[], subject: string): string {
	const compared = rows.filter((r) => r.effect !== null);
	if (!compared.length) {
		return `${subject.replace(/ judged$/, '')}: no behavior has enough responses both when alone and in front of management or professors.`;
	}
	const dropped = compared.filter((r) => cents(r.effect!) > 0);
	const rose = compared.filter((r) => cents(r.effect!) < 0);
	const all = compared.length === BEHAVIORS.length;
	const among = `${compared.length} behaviors${all ? '' : ' with enough responses'}`;
	const howMany =
		dropped.length === compared.length
			? `every one of the ${among}`
			: `${dropped.length} of the ${among}`;
	let text = `${subject} ${howMany} less appropriate in front of management or professors than when alone`;
	if (rose.length) {
		text +=
			rose.length === 1
				? `, and ${gerund(rose[0].behavior)} more appropriate (${size(rose[0].effect!)} higher)`
				: `, and ${rose.length} more appropriate`;
	}
	if (dropped.length) {
		const byEffect = [...dropped].sort((a, b) => cents(b.effect!) - cents(a.effect!));
		const top = byEffect[0];
		const bottom = byEffect[byEffect.length - 1];
		text +=
			dropped.length === 1
				? `; the drop is ${size(top.effect!)}, for ${gerund(top.behavior)}`
				: `; the drop is largest for ${gerund(top.behavior)} (${size(top.effect!)}) and ` +
					`smallest for ${gerund(bottom.behavior)} (${size(bottom.effect!)})`;
	}
	return `${text}.`;
}

/**
 * Where a behavior's drop ranks, in words, counted from the nearer end (section 5 of the design
 * review): "Only two of the 15 behaviors drop more.", "No other behavior drops less.", "6 of the 15
 * behaviors drop more."
 */
function dropRank(rows: readonly BehaviorAudiences[], row: BehaviorAudiences): string {
	const effects = rows.filter((r) => r.effect !== null).map((r) => cents(r.effect!));
	const mine = cents(row.effect!);
	const above = effects.filter((e) => e > mine).length;
	const below = effects.filter((e) => e < mine).length;
	const of =
		effects.length === BEHAVIORS.length
			? `the ${BEHAVIORS.length} behaviors`
			: `the ${effects.length} behaviors with enough responses`;
	const [n, more] = above <= below ? [above, 'more'] : [below, 'less'];
	if (n === 0) return `No other behavior drops ${more}.`;
	if (n === 1) return `Only one of ${of} drops ${more}.`;
	if (n === 2) return `Only two of ${of} drop ${more}.`;
	return `${n} of ${of} drop ${more}.`;
}

/**
 * NFR-11, FR-87: one behavior across the three audiences, in response labels, then where its drop
 * ranks (section 5 of the design review): "On average across the 90 societies, respondents judged
 * using a mobile phone very appropriate when alone, somewhat appropriate in front of colleagues or
 * classmates and somewhat inappropriate in front of management or professors. Only two of the 15
 * behaviors drop more." The scores and the drop are on the chart and in the details.
 */
export function behaviorSummary(
	rows: readonly BehaviorAudiences[],
	behavior: number,
	subject: string
): string {
	const row = rows[behavior];
	const what = gerund(behavior);
	if (row.notAsked) {
		return `${subject.replace(/ judged$/, '').replace(/^On average across/, 'Across')} were not asked about ${what}.`;
	}
	const shown: string[] = [];
	const missing: string[] = [];
	for (const k of AUDIENCES) {
		const v = row.main.values[k];
		if (v.estimate) shown.push(`${responseLabel(v.estimate.value)} ${contextPhrase(k)}`);
		else missing.push(`${missingText(v.status)} ${contextPhrase(k)}`);
	}
	if (!shown.length) {
		const who = lower(subject.replace(/ judged$/, '').replace(/^On average across the/, 'In'));
		return `Fewer than 10 ${who} rated ${what} in each audience, so none is shown.`;
	}
	let text = `${subject} ${what} ${listText(shown)}`;
	if (missing.length) text += `, with ${listText(missing)}`;
	if (row.effect === null) return `${text}.`;
	if (cents(row.effect) > 0) return `${text}. ${dropRank(rows, row)}`;
	return `${text}: ${effectText(row.effect)}.`;
}

const valueList = (series: Series, contexts: readonly number[]) =>
	contexts.map((k) => {
		const v = series.values[k];
		return v.estimate ? score(v.estimate.value) : missingText(v.status);
	});

/**
 * NFR-11: the focused slopegraph in one sentence: every line's values in the audiences' order,
 * and with the actor's gender, each line's values done by a woman and by a man.
 */
export function slopeSummary(row: BehaviorAudiences, actor: boolean): string {
	const lines = readingOrder(row.series);
	const audiences = lines
		.map((s) => `${lower(s.label)} ${valueList(s, AUDIENCES).join(', ')}`)
		.join('; ');
	let text = `When alone, in front of colleagues or classmates and in front of management or professors: ${audiences}.`;
	if (actor) {
		const actors = lines
			.map((s) => `${lower(s.label)} ${valueList(s, ACTORS).join(' and ')}`)
			.join('; ');
		text += ` Done by a woman and by a man: ${actors}.`;
	}
	return text;
}

/** One value in words for details and tables: "+1.8, very appropriate". */
export function valueText(v: ContextValue): string {
	if (!v.estimate) return missingText(v.status);
	return `${score(v.estimate.value)}, ${responseLabel(v.estimate.value)}`;
}

/** Respondents behind a value: "48 respondents (small sample)", "5,558 respondents in 90 societies". */
export function respondentsText(v: ContextValue): string {
	if (v.n === null) return 'fewer than 10 respondents';
	const small = v.status === Status.Small ? ' (small sample)' : '';
	const where = v.societies === null ? '' : ` in ${v.societies} societies`;
	return `${count(v.n)} respondents${where}${small}`;
}

export function shareText(v: ContextValue): string {
	return v.share === null ? '' : `${percent(v.share)} chose an appropriate answer`;
}

export interface SlopeTableRow {
	key: string;
	series: string;
	context: string;
	value: string;
	interval: string;
	respondents: string;
	share: string;
}

/** NFR-11: the focused slopegraph as table rows, one per line and context. */
export function slopeTable(row: BehaviorAudiences, actor: boolean): SlopeTableRow[] {
	const contexts = actor ? [...AUDIENCES, ...ACTORS] : [...AUDIENCES];
	return readingOrder(row.series).flatMap((s) =>
		contexts.map((k) => {
			const v = s.values[k];
			return {
				key: `${s.kind}-${k}`,
				series: s.label,
				context: CONTEXT_TEXT[CONTEXTS[k]].label,
				value: valueText(v),
				interval: v.estimate ? `${score(v.estimate.lo)} to ${score(v.estimate.hi)}` : '',
				respondents: respondentsText(v),
				share: v.share === null ? '' : percent(v.share)
			};
		})
	);
}

export interface MultipleTableRow {
	key: string;
	behavior: string;
	series: string;
	/** Text per context, in CONTEXTS order. */
	values: string[];
	effect: string;
	actorGap: string;
}

/** NFR-11: the small multiples as table rows, one per behavior and line, in the sort order. */
export function multiplesTable(
	rows: readonly BehaviorAudiences[],
	order: readonly number[]
): MultipleTableRow[] {
	return order.flatMap((i) => {
		const row = rows[i];
		return readingOrder(row.series).map((s) => {
			const effect = effectOf(s.values);
			const gap = actorGap(s.values);
			return {
				key: `${row.behavior}-${s.kind}`,
				behavior: BEHAVIOR_TEXT[BEHAVIORS[row.behavior]].label,
				series: s.label,
				values: s.values.map((v) =>
					v.estimate
						? `${score(v.estimate.value)}${v.status === Status.Small ? ' (small sample)' : ''}`
						: missingText(v.status)
				),
				effect: effect === null ? '–' : score(effect),
				actorGap: gap === null ? '–' : score(gap)
			};
		});
	});
}

/**
 * A column's accessible name on the focused slopegraph: the context, then each line's value with
 * its interval and respondents, in reading order.
 */
export function columnLabel(row: BehaviorAudiences, context: number): string {
	const lines = readingOrder(row.series).map((s) => {
		const v = s.values[context];
		if (!v.estimate) return `${lower(s.label)} ${missingText(v.status)}`;
		return (
			`${lower(s.label)} ${score(v.estimate.value)} (95% interval ${score(v.estimate.lo)} to ` +
			`${score(v.estimate.hi)}; ${respondentsText(v)})`
		);
	});
	return `${CONTEXT_TEXT[CONTEXTS[context]].label}: ${lines.join(', ')}`;
}

/**
 * What a panel's link adds, for assistive technology, after its visible name and effect: the
 * effect in full and every line's values. The visible text starts the link's name (WCAG 2.5.3).
 */
export function panelDetails(row: BehaviorAudiences, actor: boolean): string {
	if (row.notAsked) return '';
	const contexts = actor ? [...AUDIENCES, ...ACTORS] : [...AUDIENCES];
	const lines = readingOrder(row.series).map(
		(s) =>
			`${s.label}: ${contexts
				.map((k) => `${lower(CONTEXT_TEXT[CONTEXTS[k]].label)} ${valueList(s, [k])[0]}`)
				.join(', ')}`
	);
	return `${capital(effectText(row.effect))}. ${lines.join('. ')}.`;
}
