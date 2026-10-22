/**
 * Small documents in the data/derived/ layout for unit tests: three societies on the full
 * 15 × 10 grid, with known values, one small sample, one suppressed and one not-asked cell.
 */

import { BEHAVIORS, CELL_COUNT, SITUATIONS } from './grid';
import type { CellsDoc, GlobalDoc, SampleId, SimilarityDoc, SocietiesDoc } from './model';

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
