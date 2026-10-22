/**
 * Typed views of the pipeline's outputs (data/derived/README.md). Each decoder checks a
 * document's shape and grid order before anything is drawn from it, and the classes hide the
 * columnar, society-major layout: row `s × 150 + c` is society `s` and cell `c`.
 *
 * - Intervals are stored as offsets from their estimate and returned here as bounds.
 * - The centered scale (FR-5, DR-10) subtracts the society's offset from an estimate and its
 *   interval; the global centered mean reuses the raw mean's interval offsets, as the two means
 *   differ by at most 0.01 (decision 37).
 * - Rows below 10 respondents carry only a status (DR-9, FR-27): they have no estimate here.
 */

import { BEHAVIORS, CELL_COUNT, SITUATIONS } from './grid';

export type SampleId = 'all' | 'paper' | 'attention';
export const SAMPLES: readonly SampleId[] = ['all', 'paper', 'attention'];
export const SAMPLE_LABEL: Record<SampleId, string> = {
	all: 'All data',
	paper: "Paper's sample",
	attention: 'Attention check'
};

export type Scale = 'raw' | 'centered';
/** Which society–cell estimate to show: shrunken by default (FR-22, DR-6). */
export type EstimateKind = 'shrunk' | 'raw';

/** Society–cell status codes (data/derived/README.md). */
export const Status = { Ok: 0, Small: 1, TooFew: 2, NotAsked: 3 } as const;
export type StatusCode = (typeof Status)[keyof typeof Status];

export const REGIONS = ['Africa', 'Asia', 'Latin America', 'West'] as const;
export type Region = (typeof REGIONS)[number];

/** FR-15, FR-31: +1 notably looser, −1 notably stricter, 0 neither. */
export type Notable = -1 | 0 | 1;

export interface Estimate {
	value: number;
	lo: number;
	hi: number;
}

type Num = number | null;

interface GridDoc {
	behaviors: string[];
	situations: string[];
}

export interface CellsDoc {
	sample: string;
	grid: GridDoc;
	societies: { code: string[]; offset: Num[]; offset_shrunk: Num[] };
	cells: {
		n: Num[];
		mean: Num[];
		mean_minus: Num[];
		mean_plus: Num[];
		shrunk: Num[];
		shrunk_pm: Num[];
		share: Num[];
		status: number[];
		notable: Num[];
		notable_centered: Num[];
	};
}

export interface GlobalDoc {
	sample: string;
	grid: GridDoc;
	cells: {
		n_societies: Num[];
		n: Num[];
		mean: Num[];
		mean_minus: Num[];
		mean_plus: Num[];
		share: Num[];
		tau: Num[];
		tau_minus: Num[];
		tau_plus: Num[];
		sd_between: Num[];
		centered_mean: Num[];
		centered_tau: Num[];
		centered_tau_minus: Num[];
		centered_tau_plus: Num[];
		centered_sd_between: Num[];
	};
}

interface SampleFacts {
	code: string[];
	n: Num[];
	student_share: Num[];
	student_unknown: Num[];
	first_month: (string | null)[];
	last_month: (string | null)[];
	languages: string[][];
}

export interface SocietiesDoc {
	societies: { code: string[]; name: string[]; region: string[]; lat: Num[]; lon: Num[] };
	samples: Record<SampleId, SampleFacts>;
}

/** A data file that is missing, unreadable or not in the expected shape (FR-86). */
export class DataError extends Error {
	override name = 'DataError';
}

function check(condition: unknown, message: string): asserts condition {
	if (!condition) throw new DataError(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function table(
	value: unknown,
	where: string,
	keys: readonly string[],
	length: number
): Record<string, unknown[]> {
	check(isObject(value), `${where} is not a table`);
	for (const key of keys) {
		const column = value[key];
		check(Array.isArray(column), `${where}.${key} is missing`);
		check(column.length === length, `${where}.${key} has ${column.length} rows, not ${length}`);
	}
	return value as Record<string, unknown[]>;
}

/** The row count of a table, from its `code` column; −1 makes `table` reject it. */
function rows(value: unknown): number {
	return isObject(value) && Array.isArray(value.code) ? value.code.length : -1;
}

function checkGrid(doc: Record<string, unknown>, where: string) {
	check(isObject(doc.grid), `${where} has no grid`);
	const { behaviors, situations } = doc.grid;
	check(
		JSON.stringify(behaviors) === JSON.stringify(BEHAVIORS) &&
			JSON.stringify(situations) === JSON.stringify(SITUATIONS),
		`${where} has a different behavior or situation order`
	);
}

function checkSample(doc: Record<string, unknown>, sample: SampleId, where: string) {
	check(doc.sample === sample, `${where} holds sample ${String(doc.sample)}, not ${sample}`);
}

/** Values that may not be null, such as global means: every cell has societies. */
function numbers(column: Num[], where: string): number[] {
	check(
		column.every((v) => typeof v === 'number'),
		`${where} has missing values`
	);
	return column as number[];
}

const round2 = (x: number) => Math.round(x * 100) / 100;

const GLOBAL_KEYS = [
	'n_societies',
	'n',
	'mean',
	'mean_minus',
	'mean_plus',
	'share',
	'tau',
	'tau_minus',
	'tau_plus',
	'sd_between',
	'centered_mean',
	'centered_tau',
	'centered_tau_minus',
	'centered_tau_plus',
	'centered_sd_between'
] as const;

type GlobalColumns = Record<(typeof GLOBAL_KEYS)[number], number[]>;

/** `global-<sample>.json`: one row per cell (DR-7, DR-8, DR-10, DR-11). */
export class GlobalCells {
	readonly sample: SampleId;
	readonly #c: GlobalColumns;

	constructor(json: unknown, sample: SampleId) {
		const where = `global-${sample}.json`;
		check(isObject(json), `${where} is not an object`);
		checkSample(json, sample, where);
		checkGrid(json, where);
		const cells = table(json.cells, `${where} cells`, GLOBAL_KEYS, CELL_COUNT);
		this.sample = sample;
		this.#c = Object.fromEntries(
			GLOBAL_KEYS.map((k) => [k, numbers(cells[k] as Num[], `${where} cells.${k}`)])
		) as GlobalColumns;
	}

	mean(cell: number, scale: Scale): number {
		return scale === 'centered' ? this.#c.centered_mean[cell] : this.#c.mean[cell];
	}

	/** 95% interval of the global mean (DR-7); the centered scale reuses its offsets. */
	meanInterval(cell: number, scale: Scale): { lo: number; hi: number } {
		const mean = this.mean(cell, scale);
		return {
			lo: round2(mean - this.#c.mean_minus[cell]),
			hi: round2(mean + this.#c.mean_plus[cell])
		};
	}

	/** Disagreement τ (DR-8). */
	tau(cell: number, scale: Scale): number {
		return scale === 'centered' ? this.#c.centered_tau[cell] : this.#c.tau[cell];
	}

	tauInterval(cell: number, scale: Scale): { lo: number; hi: number } {
		const c = this.#c;
		const [tau, minus, plus] =
			scale === 'centered'
				? [c.centered_tau[cell], c.centered_tau_minus[cell], c.centered_tau_plus[cell]]
				: [c.tau[cell], c.tau_minus[cell], c.tau_plus[cell]];
		return { lo: round2(tau - minus), hi: round2(tau + plus) };
	}

	/** Mean of society shares choosing 4–6, as a whole percent (DR-11). */
	share(cell: number): number {
		return this.#c.share[cell];
	}

	/** Respondents who rated the cell, over all societies. */
	respondents(cell: number): number {
		return this.#c.n[cell];
	}

	societies(cell: number): number {
		return this.#c.n_societies[cell];
	}
}

const CELL_KEYS = [
	'n',
	'mean',
	'mean_minus',
	'mean_plus',
	'shrunk',
	'shrunk_pm',
	'share',
	'status',
	'notable',
	'notable_centered'
] as const;

/** One society's values for one cell, as the beeswarm, map and tables need them. */
export interface SocietyCell {
	code: string;
	status: StatusCode;
	n: number | null;
	/** Null when the cell is suppressed (status 2 or 3). */
	estimate: Estimate | null;
	share: number | null;
	notable: Notable | null;
}

/** `cells-<sample>.json`: society × cell estimates (DR-4 to DR-6, DR-9 to DR-11, FR-31). */
export class SocietyCells {
	readonly sample: SampleId;
	readonly codes: readonly string[];
	readonly #index: Map<string, number>;
	readonly #offset: Num[];
	readonly #offsetShrunk: Num[];
	readonly #c: CellsDoc['cells'];

	constructor(json: unknown, sample: SampleId) {
		const where = `cells-${sample}.json`;
		check(isObject(json), `${where} is not an object`);
		checkSample(json, sample, where);
		checkGrid(json, where);
		const societies = table(
			json.societies,
			`${where} societies`,
			['code', 'offset', 'offset_shrunk'],
			rows(json.societies)
		);
		const codes = societies.code as string[];
		this.#c = table(
			json.cells,
			`${where} cells`,
			CELL_KEYS,
			codes.length * CELL_COUNT
		) as unknown as CellsDoc['cells'];
		this.sample = sample;
		this.codes = codes;
		this.#index = new Map(codes.map((code, i) => [code, i]));
		this.#offset = societies.offset as Num[];
		this.#offsetShrunk = societies.offset_shrunk as Num[];
	}

	/** The society's row in this sample, or undefined when it is not in the sample. */
	indexOf(code: string): number | undefined {
		return this.#index.get(code);
	}

	status(society: number, cell: number): StatusCode {
		return this.#c.status[society * CELL_COUNT + cell] as StatusCode;
	}

	/** The society–cell estimate with its 95% interval, or null when suppressed. */
	estimate(society: number, cell: number, kind: EstimateKind, scale: Scale): Estimate | null {
		const i = society * CELL_COUNT + cell;
		const c = this.#c;
		let value: Num, lo: number, hi: number;
		if (kind === 'shrunk') {
			value = c.shrunk[i];
			if (value === null) return null;
			lo = value - (c.shrunk_pm[i] ?? 0);
			hi = value + (c.shrunk_pm[i] ?? 0);
		} else {
			value = c.mean[i];
			if (value === null) return null;
			lo = value - (c.mean_minus[i] ?? 0);
			hi = value + (c.mean_plus[i] ?? 0);
		}
		const offset =
			scale === 'centered'
				? ((kind === 'shrunk' ? this.#offsetShrunk : this.#offset)[society] ?? 0)
				: 0;
		return { value: round2(value - offset), lo: round2(lo - offset), hi: round2(hi - offset) };
	}

	/** FR-15: stricter, looser or close to the global mean, tested on the scale shown. */
	notable(society: number, cell: number, scale: Scale): Notable | null {
		const i = society * CELL_COUNT + cell;
		return (
			scale === 'centered' ? this.#c.notable_centered[i] : this.#c.notable[i]
		) as Notable | null;
	}

	/** Every society in the sample for one cell, in file order (by code). */
	column(cell: number, kind: EstimateKind, scale: Scale): SocietyCell[] {
		return this.codes.map((code, s) => {
			const i = s * CELL_COUNT + cell;
			return {
				code,
				status: this.status(s, cell),
				n: this.#c.n[i],
				estimate: this.estimate(s, cell, kind, scale),
				share: this.#c.share[i],
				notable: this.notable(s, cell, scale)
			};
		});
	}
}

export interface Society {
	code: string;
	name: string;
	region: Region;
	lat: number;
	lon: number;
}

/** `societies.json`: names, regions, positions and per-sample facts (DR-15). */
export class Societies {
	readonly list: readonly Society[];
	readonly #index: Map<string, number>;
	readonly #samples: Record<SampleId, SampleFacts>;

	constructor(json: unknown) {
		const where = 'societies.json';
		check(isObject(json), `${where} is not an object`);
		const length = rows(json.societies);
		const s = table(
			json.societies,
			`${where} societies`,
			['code', 'name', 'region', 'lat', 'lon'],
			length
		);
		check(isObject(json.samples), `${where} has no samples`);
		const samples = json.samples;
		for (const sample of SAMPLES) {
			const facts = table(
				samples[sample],
				`${where} samples.${sample}`,
				['code', 'n', 'languages'],
				length
			);
			check(
				JSON.stringify(facts.code) === JSON.stringify(s.code),
				`${where} samples.${sample} lists societies in another order`
			);
		}
		this.#samples = samples as unknown as Record<SampleId, SampleFacts>;
		this.list = (s.code as string[]).map((code, i) => {
			const region = s.region[i] as Region;
			check(REGIONS.includes(region), `${where} has an unknown region`);
			const lat = s.lat[i];
			const lon = s.lon[i];
			check(typeof lat === 'number' && typeof lon === 'number', `${where} lacks a position`);
			return { code, name: s.name[i] as string, region, lat, lon };
		});
		this.#index = new Map(this.list.map((society, i) => [society.code, i]));
	}

	get(code: string | null | undefined): Society | undefined {
		const i = code ? this.#index.get(code) : undefined;
		return i === undefined ? undefined : this.list[i];
	}

	/** Respondents in the sample, or null when the society is not in it (§4.4). */
	respondents(code: string, sample: SampleId): number | null {
		const i = this.#index.get(code);
		return i === undefined ? null : this.#samples[sample].n[i];
	}

	inSample(code: string, sample: SampleId): boolean {
		return this.respondents(code, sample) !== null;
	}

	/** Societies in the sample. */
	count(sample: SampleId): number {
		return this.#samples[sample].n.filter((n) => n !== null).length;
	}
}
