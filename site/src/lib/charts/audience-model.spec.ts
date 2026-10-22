import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AUDIENCES, BEHAVIORS } from '../data/grid';
import { ContextCells, SAMPLES, Status } from '../data/model';
import { contextsDoc, fixtureEffect } from '../data/test-fixtures';
import {
	actorGap,
	actorText,
	audienceOrder,
	audienceRows,
	audiencesSummary,
	behaviorSummary,
	columnLabel,
	effectShort,
	effectText,
	multiplesTable,
	orderNote,
	panelLabel,
	respondentsText,
	slopeSummary,
	slopeTable,
	subjectOf,
	type AudienceScope
} from './audience-model';

const file = new ContextCells(contextsDoc(), 'all');
const GLOBAL: AudienceScope = { kind: 'global' };
const society = (index: number, name: string): AudienceScope => ({
	kind: 'society',
	index,
	code: file.codes[index],
	name
});
const ALPHA = society(0, 'Alpha');
const GAMMA = society(2, 'Gamma');

describe('FR-40, FR-42: each behavior across the three audiences', () => {
	it('shows all societies on their own when no society is in view', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(rows).toHaveLength(BEHAVIORS.length);
		expect(rows[14].series.map((s) => [s.kind, s.label])).toEqual([['main', 'All societies']]);
		expect(rows.map((r) => r.effect)).toEqual(BEHAVIORS.map((_, b) => fixtureEffect(b)));
	});

	it('draws one society over all societies as a reference', () => {
		const row = audienceRows(file, { scope: GAMMA, split: false })[14];
		expect(row.series.map((s) => [s.kind, s.label])).toEqual([
			['reference', 'All societies'],
			['main', 'Respondents in Gamma']
		]);
		expect(row.main.values.map((v) => v.estimate?.value)).toEqual([1.5, 0.75, 0, 1.28, 1]);
		expect(row.effect).toBe(1.5);
	});

	it('DR-12, decision 18: splits women and men respondents for all societies only', () => {
		const row = audienceRows(file, { scope: GLOBAL, split: true })[0];
		expect(row.series.map((s) => s.label)).toEqual(['Women respondents', 'Men respondents']);
		expect(row.series[0].values[0].estimate?.value).toBe(1.1);
		// The effect stays that of all respondents.
		expect(row.main.label).toBe('All societies');
		expect(row.effect).toBe(0.1);
		// A society in view has no split, whatever the view asks.
		const kept = audienceRows(file, { scope: GAMMA, split: true })[0];
		expect(kept.series.map((s) => s.kind)).toEqual(['reference', 'main']);
	});

	it('DR-9, FR-27: no effect without both ends; a behavior never asked says so', () => {
		const rows = audienceRows(file, { scope: GAMMA, split: false });
		expect(rows[0].effect).toBeNull();
		expect(rows[0].main.values[2].status).toBe(Status.TooFew);
		expect(rows[3].notAsked).toBe(true);
		expect(rows[3].effect).toBeNull();
		expect(rows[1].notAsked).toBe(false);
	});

	it('decision 58: the effect is signed, so a reversal shows', () => {
		expect(audienceRows(file, { scope: ALPHA, split: false })[2].effect).toBe(-0.3);
		expect(effectText(-0.3)).toBe(
			'0.3 higher in front of management or professors than when alone'
		);
		expect(effectText(1.5)).toBe('1.5 lower in front of management or professors than when alone');
		expect(effectText(0.04)).toBe(
			'about the same when alone and in front of management or professors'
		);
		expect(effectShort(2.97)).toBe('3.0 lower with management');
		expect(effectShort(null)).toBe('Too few responses to compare');
	});

	it('FR-42: the actor’s gender is a gap between who does it, not an audience', () => {
		const row = audienceRows(file, { scope: GLOBAL, split: false })[13];
		expect(actorGap(row.main.values)).toBe(0.26);
		expect(actorText(0.26)).toBe('0.3 higher done by a woman than done by a man');
		expect(actorText(0)).toBe('about the same done by a woman and done by a man');
	});

	it('decision 58: notes a behavior whose audiences are out of order, with its range', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(rows.filter((r) => r.outOfOrder).map((r) => r.behavior)).toEqual([6]);
		expect(rows[6].outOfOrder).toEqual([1, 0, 2]);
		expect(orderNote(rows[6])).toBe(
			"Not in the audiences' order: judged most appropriate in front of colleagues or " +
				'classmates (+1.2), then when alone (+1.0), then in front of management or professors ' +
				'(+0.3). The difference between when alone and in front of management or professors ' +
				'(0.7) is smaller than the range across the three audiences (0.9).'
		);
		expect(orderNote(rows[5])).toBeNull();
		// An audience with too few responses leaves the order unknown.
		expect(audienceRows(file, { scope: GAMMA, split: false })[0].outOfOrder).toBeNull();
	});
});

describe('FR-41: the small multiples’ order', () => {
	it('puts the largest drop first, ties in paper order', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(audienceOrder(rows, 'effect')).toEqual([
			14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 3, 4, 2, 1, 0
		]);
		expect(audienceOrder(rows, 'paper')).toEqual(BEHAVIORS.map((_, b) => b));
	});

	it('puts reversals after drops and behaviors with no effect last', () => {
		expect(audienceOrder(audienceRows(file, { scope: ALPHA, split: false }), 'effect').at(-1)).toBe(
			2
		);
		expect(
			audienceOrder(audienceRows(file, { scope: GAMMA, split: false }), 'effect').slice(-2)
		).toEqual([0, 3]);
	});

	it('sorts by the behaviors’ names', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(audienceOrder(rows, 'name').slice(0, 4)).toEqual([0, 9, 4, 2]);
	});
});

describe('NFR-11, FR-87: summaries say what respondents judged, never why (FR-73)', () => {
	it('sums up all societies', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(audiencesSummary(rows, subjectOf(GLOBAL, 3))).toBe(
			'On average across the 3 societies, respondents judged every one of the 15 behaviors less ' +
				'appropriate in front of management or professors than when alone; the drop is largest ' +
				'for using a mobile phone (1.5) and smallest for arguing (0.1).'
		);
	});

	it('names a reversal and counts only the behaviors with enough responses', () => {
		const alpha = audienceRows(file, { scope: ALPHA, split: false });
		expect(audiencesSummary(alpha, subjectOf(ALPHA, 3))).toBe(
			'Respondents in Alpha judged 14 of the 15 behaviors less appropriate in front of ' +
				'management or professors than when alone, and cursing or swearing more appropriate ' +
				'(0.3 higher); the drop is largest for using a mobile phone (1.5) and smallest for ' +
				'arguing (0.1).'
		);
		const gamma = audienceRows(file, { scope: GAMMA, split: false });
		expect(audiencesSummary(gamma, subjectOf(GAMMA, 3))).toMatch(
			/^Respondents in Gamma judged every one of the 13 behaviors with enough responses less/
		);
	});

	it('sums up one behavior with its rank among the drops', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(behaviorSummary(rows, 14, subjectOf(GLOBAL, 3))).toBe(
			'On average across the 3 societies, respondents judged using a mobile phone somewhat ' +
				'appropriate when alone (+1.0), somewhat appropriate in front of colleagues or classmates ' +
				'(+0.3) and somewhat inappropriate in front of management or professors (−0.5): 1.5 lower ' +
				'in front of management or professors than when alone, the largest drop of the 15 ' +
				'behaviors.'
		);
		expect(behaviorSummary(rows, 3, subjectOf(GLOBAL, 3))).toMatch(
			/, tied 4th smallest drop of the 15 behaviors\.$/
		);
		expect(behaviorSummary(rows, 0, subjectOf(GLOBAL, 3))).toMatch(
			/, the smallest drop of the 15 behaviors\.$/
		);
		expect(behaviorSummary(rows, 12, subjectOf(GLOBAL, 3))).toMatch(
			/, the 3rd largest drop of the 15 behaviors\.$/
		);
	});

	it('says what is missing and what was not asked', () => {
		const rows = audienceRows(file, { scope: GAMMA, split: false });
		expect(behaviorSummary(rows, 0, subjectOf(GAMMA, 3))).toBe(
			'Respondents in Gamma judged arguing very appropriate when alone (+1.5) and very ' +
				'appropriate in front of colleagues or classmates (+1.4), with too few responses in ' +
				'front of management or professors.'
		);
		expect(behaviorSummary(rows, 3, subjectOf(GAMMA, 3))).toBe(
			'Respondents in Gamma were not asked about kissing on the mouth.'
		);
		const alpha = audienceRows(file, { scope: ALPHA, split: false });
		expect(behaviorSummary(alpha, 2, subjectOf(ALPHA, 3))).toMatch(
			/: 0\.3 higher in front of management or professors than when alone\.$/
		);
	});

	it('describes every line of the focused slopegraph, and the actor pair when shown', () => {
		const row = audienceRows(file, { scope: GAMMA, split: false })[14];
		expect(slopeSummary(row, false)).toBe(
			'When alone, in front of colleagues or classmates and in front of management or ' +
				'professors: respondents in Gamma +1.5, +0.8, 0.0; all societies +1.0, +0.3, −0.5.'
		);
		expect(slopeSummary(row, true)).toMatch(
			/ Done by a woman and by a man: respondents in Gamma \+1\.3 and \+1\.0; all societies \+0\.8 and \+0\.5\.$/
		);
		const missing = audienceRows(file, { scope: GAMMA, split: false })[0];
		expect(slopeSummary(missing, false)).toContain(
			'respondents in Gamma +1.5, +1.4, too few responses'
		);
	});
});

describe('NFR-11: tables and accessible names', () => {
	it('lists each line and context of the focused slopegraph', () => {
		const row = audienceRows(file, { scope: society(1, 'Beta'), split: false })[1];
		const table = slopeTable(row, true);
		expect(table).toHaveLength(10);
		expect(table[1]).toEqual({
			key: 'main-1',
			series: 'Respondents in Beta',
			context: 'In front of colleagues or classmates',
			value: '+0.9, somewhat appropriate',
			interval: '+0.7 to +1.2',
			respondents: '12 respondents (small sample)',
			share: '60%'
		});
		expect(table[5].series).toBe('All societies');
		expect(table[5].respondents).toBe('150 respondents in 3 societies');
	});

	it('lists the small multiples in their order, a row per line', () => {
		const rows = audienceRows(file, { scope: GAMMA, split: false });
		const table = multiplesTable(rows, audienceOrder(rows, 'effect'));
		expect(table).toHaveLength(30);
		expect(table[0]).toMatchObject({
			behavior: 'Use a mobile phone',
			series: 'Respondents in Gamma'
		});
		expect(table.at(-2)).toMatchObject({
			behavior: 'Kiss on the mouth',
			values: ['not asked', 'not asked', 'not asked', 'not asked', 'not asked'],
			effect: '–'
		});
	});

	it('names a panel by its values and effect', () => {
		const rows = audienceRows(file, { scope: GLOBAL, split: false });
		expect(panelLabel(rows[14], false)).toBe(
			'Use a mobile phone. 1.5 lower in front of management or professors than when alone. ' +
				'All societies: alone +1.0, in front of colleagues or classmates +0.3, in front of ' +
				'management or professors −0.5.'
		);
		expect(panelLabel(rows[14], true)).toContain('done by a woman +0.8, done by a man +0.5');
		expect(panelLabel(audienceRows(file, { scope: GAMMA, split: false })[3], false)).toBe(
			'Kiss on the mouth: not asked'
		);
	});

	it('names a column of the focused slopegraph by every line’s value', () => {
		const row = audienceRows(file, { scope: GAMMA, split: false })[0];
		expect(columnLabel(row, 0)).toBe(
			'Alone: respondents in Gamma +1.5 (95% interval +1.3 to +1.8; 50 respondents), all ' +
				'societies +1.0 (95% interval +0.9 to +1.1; 150 respondents in 3 societies)'
		);
		expect(columnLabel(row, 2)).toMatch(
			/^In front of management or professors: respondents in Gamma too few responses, /
		);
		expect(row.series.map((s) => s.short)).toEqual(['All societies', 'Gamma']);
	});

	it('names who a value rests on', () => {
		const rows = audienceRows(file, { scope: GAMMA, split: false });
		expect(respondentsText(rows[0].main.values[2])).toBe('fewer than 10 respondents');
		expect(respondentsText(rows[0].main.values[0])).toBe('50 respondents');
	});
});

describe('§4.6: the committed contexts files', () => {
	const derived = (sample: string) =>
		new ContextCells(
			JSON.parse(
				readFileSync(
					new URL(`../../../../data/derived/contexts-${sample}.json`, import.meta.url),
					'utf8'
				)
			),
			sample as (typeof SAMPLES)[number]
		);

	it.each(SAMPLES)(
		'%s: every behavior drops in front of management for all societies',
		(sample) => {
			const rows = audienceRows(derived(sample), { scope: GLOBAL, split: false });
			expect(rows.filter((r) => r.effect !== null && r.effect > 0)).toHaveLength(15);
			// Talking alone is out of order, so its effect and its range differ.
			expect(rows.filter((r) => r.outOfOrder).map((r) => BEHAVIORS[r.behavior])).toEqual(['talk']);
		}
	);

	// The effect needs only its two ends: 1,306 society–behaviors, 3 more than have all three
	// audiences (decision 58).
	it('All data: 1,306 society–behaviors compare, 8 reversed; 83 societies show all 15', () => {
		const contexts = derived('all');
		let compared = 0;
		let reversed = 0;
		let complete = 0;
		contexts.codes.forEach((code, index) => {
			const rows = audienceRows(contexts, {
				scope: { kind: 'society', index, code, name: code },
				split: false
			});
			compared += rows.filter((r) => r.effect !== null).length;
			reversed += rows.filter((r) => r.effect !== null && r.effect < 0).length;
			if (rows.every((r) => AUDIENCES.every((k) => r.main.values[k].estimate))) complete += 1;
		});
		expect([compared, reversed, complete]).toEqual([1306, 8, 83]);
	});
});
