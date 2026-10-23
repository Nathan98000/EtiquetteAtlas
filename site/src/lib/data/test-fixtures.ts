/**
 * Small documents in the data/derived/ layout for unit tests: three societies on the full
 * 15 × 10 grid (and 15 × 5 contexts), with known values, one small sample, one suppressed and one
 * not-asked cell.
 */

import { BEHAVIORS, CELL_COUNT, CHANGE_BEHAVIORS, CONTEXTS, SITUATIONS } from './grid';
import type {
	CellsDoc,
	ChangeDoc,
	ContextsDoc,
	GlobalDoc,
	SampleId,
	SimilarityDoc,
	SocietiesDoc
} from './model';

const grid = () => ({ behaviors: [...BEHAVIORS], situations: [...SITUATIONS] });
const cells = () => Array.from({ length: CELL_COUNT }, (_, c) => c);

/** Global mean of cell c: from −2.0 up in steps of 0.02 (cell 0 lowest, cell 149 highest). */
export const fixtureMean = (c: number) => Math.round((-2 + c * 0.02) * 100) / 100;
/** τ of cell c: 0.2 + 0.01 × (c mod 50), so cells 49, 99 and 149 tie for the most. */
export const fixtureTau = (c: number) => Math.round((0.2 + (c % 50) * 0.01) * 100) / 100;

export function globalDoc(sample: SampleId = 'all'): GlobalDoc {
	const c = cells();
	return {
		sample,
		grid: grid(),
		cells: {
			n_societies: c.map(() => 3),
			n: c.map(() => 150),
			mean: c.map(fixtureMean),
			mean_minus: c.map(() => 0.05),
			mean_plus: c.map(() => 0.06),
			share: c.map((i) => Math.min(100, i)),
			tau: c.map(fixtureTau),
			tau_minus: c.map(() => 0.04),
			tau_plus: c.map(() => 0.03),
			sd_between: c.map((i) => fixtureTau(i) + 0.05),
			centered_mean: c.map((i) => fixtureMean(i) + (i === 0 ? 0.01 : 0)),
			centered_tau: c.map((i) => fixtureTau(149 - i)),
			centered_tau_minus: c.map(() => 0.02),
			centered_tau_plus: c.map(() => 0.02),
			centered_sd_between: c.map(() => 0.3)
		}
	};
}

export const CODES = ['AAA', 'BBB', 'CCC'] as const;

/**
 * Society s, cell c: raw mean = global mean + (s − 1) × 0.5, shrunk = global mean + (s − 1) ×
 * 0.4. CCC has too few responses in cell 0 and was not asked cell 2; BBB is a small sample in
 * cell 1.
 */
export function cellsDoc(sample: SampleId = 'all'): CellsDoc {
	const rows = CODES.flatMap((_, s) => cells().map((c) => ({ s, c })));
	const status = ({ s, c }: { s: number; c: number }) =>
		s === 2 && c === 0 ? 2 : s === 2 && c === 2 ? 3 : s === 1 && c === 1 ? 1 : 0;
	const value = <T>(row: { s: number; c: number }, v: T): T | null => (status(row) >= 2 ? null : v);
	return {
		sample,
		grid: grid(),
		societies: { code: [...CODES], offset: [-0.3, 0, 0.25], offset_shrunk: [-0.2, 0, 0.2] },
		cells: {
			n: rows.map((r) => value(r, status(r) === 1 ? 12 : 50)),
			mean: rows.map((r) => value(r, Math.round((fixtureMean(r.c) + (r.s - 1) * 0.5) * 100) / 100)),
			mean_minus: rows.map((r) => value(r, 0.2)),
			mean_plus: rows.map((r) => value(r, 0.3)),
			shrunk: rows.map((r) =>
				value(r, Math.round((fixtureMean(r.c) + (r.s - 1) * 0.4) * 100) / 100)
			),
			shrunk_pm: rows.map((r) => value(r, 0.25)),
			share: rows.map((r) => value(r, 40)),
			status: rows.map(status),
			notable: rows.map((r) => value(r, r.s - 1)),
			notable_centered: rows.map((r) => value(r, 0))
		}
	};
}

/**
 * Facts as stored: BBB has some student status missing, CCC none recorded and no month with
 * 10 respondents starting; societies outside a sample have nulls.
 */
export function societiesDoc(): SocietiesDoc {
	const facts = (n: (number | null)[]) => {
		const only = <T>(values: T[]) => values.map((v, i) => (n[i] === null ? null : v));
		return {
			code: [...CODES],
			n,
			student_share: only([50, 60, 0]),
			student_unknown: only([0, 5, 100]),
			first_month: only(['2023-09', '2023-10', null]),
			last_month: only(['2023-09', '2024-01', null]),
			languages: only([['English'], ['Spanish', 'English'], ['French']])
		};
	};
	return {
		societies: {
			code: [...CODES],
			name: ['Alpha', 'Philippines', 'Gamma'],
			region: ['West', 'Asia', 'Africa'],
			lat: [10, 20, -5],
			lon: [30, 120, 15]
		},
		samples: {
			all: facts([300, 120, 40]),
			paper: facts([280, 100, null]),
			attention: facts([200, null, 30])
		}
	};
}

/**
 * AAA and BBB are each other's closest match; CCC has too few publishable cells for any pair
 * (decision 7). Rows are written out of rank order to check the decoder sorts them.
 */
export function similarityDoc(sample: SampleId = 'all'): SimilarityDoc {
	return {
		sample,
		pairs: {
			code: ['AAA', 'AAA', 'BBB'],
			rank: [2, 1, 1],
			other: ['CCC', 'BBB', 'AAA'],
			r: [-0.12, 0.61, 0.61],
			n_cells: [120, 149, 149]
		}
	};
}

const round = (x: number) => Math.round(x * 100) / 100;

/** Alone minus management of behavior b for all societies: 0.1 × (b + 1), but 3 and 4 tie at 0.4. */
export const fixtureEffect = (b: number) => (b === 4 ? 0.4 : round((b + 1) * 0.1));

/**
 * All societies' mean for behavior b in context k: 1.0 alone, then down by half the effect and by
 * the whole effect, except that talking (6) peaks in front of colleagues (1.2), out of order.
 * Done by a woman 0.5 + 0.02 × b, done by a man 0.5. Women respondents sit 0.1 above all
 * respondents and men 0.1 below.
 */
export function fixtureContext(b: number, k: number): number {
	const e = fixtureEffect(b);
	return round([1, b === 6 ? 1.2 : 1 - e / 2, 1 - e, 0.5 + 0.02 * b, 0.5][k]);
}

/**
 * Society s: all societies' mean + (s − 1) × 0.5, except that AAA judges cursing (2) more
 * appropriate in front of management than alone (0.8 against 0.5). CCC was not asked about
 * kissing (3), has too few responses for arguing (0) in front of management and for singing (5)
 * anywhere; BBB is a small sample for laughing (1) in front of colleagues.
 */
export function contextsDoc(sample: SampleId = 'all'): ContextsDoc {
	const rows = CODES.flatMap((_, s) =>
		BEHAVIORS.flatMap((_, b) => CONTEXTS.map((_, k) => ({ s, b, k })))
	);
	type Row = { s: number; b: number; k: number };
	const status = ({ s, b, k }: Row) =>
		s === 2 && b === 3
			? 3
			: s === 2 && ((b === 0 && k === 2) || b === 5)
				? 2
				: s === 1 && b === 1 && k === 1
					? 1
					: 0;
	const value = <T>(row: Row, v: T): T | null => (status(row) >= 2 ? null : v);
	const mean = ({ s, b, k }: Row) =>
		s === 0 && b === 2 && k === 2 ? 0.8 : round(fixtureContext(b, k) + (s - 1) * 0.5);
	const global = BEHAVIORS.flatMap((_, b) => CONTEXTS.map((_, k) => ({ b, k })));
	const genders = (['Woman', 'Man'] as const).flatMap((gender) =>
		global.map((row) => ({ ...row, gender }))
	);
	return {
		sample,
		grid: { behaviors: [...BEHAVIORS], contexts: [...CONTEXTS] },
		societies: { code: [...CODES] },
		cells: {
			n: rows.map((r) => value(r, status(r) === 1 ? 12 : 50)),
			mean: rows.map((r) => value(r, mean(r))),
			mean_minus: rows.map((r) => value(r, 0.2)),
			mean_plus: rows.map((r) => value(r, 0.3)),
			share: rows.map((r) => value(r, 60)),
			status: rows.map(status)
		},
		global: {
			n_societies: global.map(({ b }) => (b === 3 ? 2 : 3)),
			n: global.map(() => 150),
			mean: global.map(({ b, k }) => fixtureContext(b, k)),
			mean_minus: global.map(() => 0.05),
			mean_plus: global.map(() => 0.06),
			share: global.map(() => 55)
		},
		by_gender: {
			gender: genders.map((r) => r.gender),
			n_societies: genders.map(() => 3),
			n: genders.map((r) => (r.gender === 'Woman' ? 80 : 70)),
			mean: genders.map(({ b, k, gender }) =>
				round(fixtureContext(b, k) + (gender === 'Woman' ? 0.1 : -0.1))
			),
			mean_minus: genders.map(() => 0.07),
			mean_plus: genders.map(() => 0.08),
			share: genders.map((r) => (r.gender === 'Woman' ? 57 : 53))
		}
	};
}

/** The change fixture's societies: real codes, since the decoder checks them (decision 67). */
export const CHANGE_CODES = ['GBR', 'JPN'] as const;

/**
 * Two societies × 120 pairs (DR-13). Pair k's 2000–2003 mean is fixtureMean(k) and every interval
 * offset is 0.1 unless said otherwise.
 *
 * - GBR: +0.5 where k mod 3 is 0 (40 higher), −0.4 where it is 1 (40 lower), +0.05 where it is 2
 *   (40 within), except pair 2: +0.1 with an interval from exactly 0.00 (within).
 * - JPN: +0.2 everywhere (higher), except pair 0: −1.5 (lower, the largest), pair 5: 12
 *   respondents (small sample), and pair 19 (laughing out loud at a party), in neither survey.
 * - Together: +0.3 for pairs 0–59, −0.3 for 60–119, except pair 100: 0.0 (within); pair 19 rests
 *   on one society.
 */
export function changeDoc(sample: SampleId = 'all'): ChangeDoc {
	const pairs = Array.from({ length: CHANGE_BEHAVIORS.length * SITUATIONS.length }, (_, k) => k);
	const rows = CHANGE_CODES.flatMap((_, s) => pairs.map((k) => ({ s, k })));
	const missing = ({ s, k }: { s: number; k: number }) => s === 1 && k === 19;
	const diff = ({ s, k }: { s: number; k: number }) =>
		s === 0 ? (k === 2 ? 0.1 : [0.5, -0.4, 0.05][k % 3]) : k === 0 ? -1.5 : 0.2;
	const value = <T>(row: { s: number; k: number }, v: T): T | null => (missing(row) ? null : v);
	const globalDiff = (k: number) => (k === 100 ? 0 : k < 60 ? 0.3 : -0.3);
	return {
		sample,
		source: '2000–2003: Gelfand et al. (2011); society–cell aggregates only',
		grid: { behaviors: [...CHANGE_BEHAVIORS], situations: [...SITUATIONS] },
		societies: {
			code: [...CHANGE_CODES],
			n0: [200, 180],
			diff: [0.05, 0.19],
			diff_minus: [0.07, 0.09],
			diff_plus: [0.07, 0.09],
			n_cells: [120, 119]
		},
		cells: {
			n0: rows.map((r) => value(r, 150)),
			mean0: rows.map((r) => value(r, fixtureMean(r.k))),
			sd0: rows.map((r) => value(r, 1)),
			n1: rows.map((r) => value(r, r.s === 1 && r.k === 5 ? 12 : 50)),
			mean1: rows.map((r) => value(r, round(fixtureMean(r.k) + diff(r)))),
			sd1: rows.map((r) => value(r, 1.1)),
			diff: rows.map((r) => value(r, diff(r))),
			diff_minus: rows.map((r) => value(r, 0.1)),
			diff_plus: rows.map((r) => value(r, 0.1))
		},
		global: {
			n_societies: pairs.map((k) => (k === 19 ? 1 : 2)),
			mean0: pairs.map(fixtureMean),
			mean1: pairs.map((k) => round(fixtureMean(k) + globalDiff(k))),
			diff: pairs.map(globalDiff),
			diff_minus: pairs.map(() => 0.05),
			diff_plus: pairs.map(() => 0.05)
		},
		behaviors: {
			behavior: [...CHANGE_BEHAVIORS],
			n_societies: CHANGE_BEHAVIORS.map(() => 2),
			mean: CHANGE_BEHAVIORS.map((_, b) => round((b - 5) * 0.1)),
			mean_minus: CHANGE_BEHAVIORS.map(() => 0.03),
			mean_plus: CHANGE_BEHAVIORS.map(() => 0.03),
			sd: CHANGE_BEHAVIORS.map(() => 0.3),
			increased: CHANGE_BEHAVIORS.map((_, b) => b % 3)
		}
	};
}
