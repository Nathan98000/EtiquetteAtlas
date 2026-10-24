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

import {
	BEHAVIORS,
	CELL_COUNT,
	CHANGE_BEHAVIORS,
	CHANGE_CELLS,
	CONTEXTS,
	SITUATIONS,
	cellIndex,
	type Behavior,
	type Cell,
	type Situation
} from './grid';

export type SampleId = 'all' | 'paper' | 'attention';
export const SAMPLES: readonly SampleId[] = ['all', 'paper', 'attention'];
/** The samples' names on the toggle and the badge, in plain words (decision 111, D-8). */
export const SAMPLE_LABEL: Record<SampleId, string> = {
	all: 'All respondents',
	paper: "The paper's sample",
	attention: 'Passed the attention check'
};
/** The same inside a sentence: "Respondents in Kuwait are not in the paper's sample." */
export const SAMPLE_PHRASE: Record<SampleId, string> = {
	all: 'all respondents',
	paper: "the paper's sample",
	attention: 'the attention-check sample'
};

export type Scale = 'raw' | 'centered';
/** Which society–cell estimate to show: shrunken by default (FR-22, DR-6). */
export type EstimateKind = 'shrunk' | 'raw';

/** Society–cell status codes (data/derived/README.md). */
export const Status = { Ok: 0, Small: 1, TooFew: 2, NotAsked: 3 } as const;
export type StatusCode = (typeof Status)[keyof typeof Status];

/** Why nothing is shown (FR-27, decision 8): "not asked" or "too few responses". */
export function missingText(status: StatusCode): string {
	return status === Status.NotAsked ? 'not asked' : 'too few responses';
}

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
	/** Null when the society is not in the sample. */
	languages: (string[] | null)[];
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

	/** DR-10: the society's mean deviation from the global cell means, or null without one. */
	offset(society: number, kind: EstimateKind): number | null {
		return (kind === 'shrunk' ? this.#offsetShrunk : this.#offset)[society] ?? null;
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

	#value(society: number, cell: number, kind: EstimateKind, scale: Scale): SocietyCell {
		const i = society * CELL_COUNT + cell;
		return {
			code: this.codes[society],
			status: this.status(society, cell),
			n: this.#c.n[i],
			estimate: this.estimate(society, cell, kind, scale),
			share: this.#c.share[i],
			notable: this.notable(society, cell, scale)
		};
	}

	/** Every society in the sample for one cell, in file order (by code). */
	column(cell: number, kind: EstimateKind, scale: Scale): SocietyCell[] {
		return this.codes.map((_, s) => this.#value(s, cell, kind, scale));
	}

	/** One society's 150 cells in grid order, for its fingerprint (FR-30). */
	row(society: number, kind: EstimateKind, scale: Scale): SocietyCell[] {
		return Array.from({ length: CELL_COUNT }, (_, c) => this.#value(society, c, kind, scale));
	}
}

export interface Society {
	code: string;
	name: string;
	region: Region;
	lat: number;
	lon: number;
}

/** A society's facts in one sample (DR-15, FR-34). */
export interface SocietyFacts {
	respondents: number;
	/** Whole percents of all respondents: flagged as students, and with no status recorded. */
	studentShare: number;
	studentUnknown: number;
	/** First and last month with at least 10 respondents starting (decision 17); null if none. */
	firstMonth: string | null;
	lastMonth: string | null;
	/** Interface languages used by at least 10 respondents, most used first (decision 10). */
	languages: readonly string[];
}

const FACT_KEYS = [
	'code',
	'n',
	'student_share',
	'student_unknown',
	'first_month',
	'last_month',
	'languages'
] as const;

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
			const facts = table(samples[sample], `${where} samples.${sample}`, FACT_KEYS, length);
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

	/** The society's facts in the sample, or null when it is not in it (FR-34). */
	facts(code: string, sample: SampleId): SocietyFacts | null {
		const i = this.#index.get(code);
		const f = this.#samples[sample];
		const respondents = i === undefined ? null : f.n[i];
		if (i === undefined || respondents === null) return null;
		return {
			respondents,
			studentShare: f.student_share[i] ?? 0,
			studentUnknown: f.student_unknown[i] ?? 0,
			firstMonth: f.first_month[i],
			lastMonth: f.last_month[i],
			languages: f.languages[i] ?? []
		};
	}
}

/** One OSF file the pipeline read, pinned by version and checksum (DR-1). */
export interface SourceFile {
	name: string;
	osfVersion: number;
	md5: string;
	url: string;
}

/**
 * `manifest.json`: the build's settings and the OSF files it read (FR-72): the pipeline version,
 * the build date (decision 20), the bootstrap's replicates and seed, the smallest group shown and
 * the three samples' sizes.
 */
export class Manifest {
	readonly pipelineVersion: string;
	readonly buildDate: string;
	readonly replicates: number;
	readonly seed: number;
	readonly intervalLevel: number;
	readonly minGroupSize: number;
	readonly smallSampleBelow: number;
	readonly samples: Record<SampleId, { respondents: number; societies: number }>;
	readonly sources: readonly SourceFile[];

	constructor(json: unknown) {
		const where = 'manifest.json';
		check(isObject(json), `${where} is not an object`);
		const text = (key: string) => {
			check(typeof json[key] === 'string', `${where} lacks ${key}`);
			return json[key] as string;
		};
		const whole = (key: string) => {
			check(Number.isInteger(json[key]), `${where} lacks ${key}`);
			return json[key] as number;
		};
		this.pipelineVersion = text('pipeline_version');
		this.buildDate = text('build_date');
		check(/^\d{4}-\d{2}-\d{2}$/.test(this.buildDate), `${where} has a malformed build date`);
		this.replicates = whole('replicates');
		this.seed = whole('seed');
		this.intervalLevel = whole('interval_level');
		this.minGroupSize = whole('min_group_size');
		this.smallSampleBelow = whole('small_sample_below');
		check(isObject(json.samples), `${where} has no samples`);
		const samples = json.samples;
		this.samples = Object.fromEntries(
			SAMPLES.map((sample) => {
				const s = samples[sample];
				check(
					isObject(s) && Number.isInteger(s.respondents) && Number.isInteger(s.societies),
					`${where} samples.${sample} is incomplete`
				);
				return [sample, { respondents: s.respondents as number, societies: s.societies as number }];
			})
		) as Record<SampleId, { respondents: number; societies: number }>;
		check(Array.isArray(json.sources) && json.sources.length > 0, `${where} lists no sources`);
		this.sources = json.sources.map((source: unknown, i: number) => {
			check(
				isObject(source) &&
					typeof source.name === 'string' &&
					Number.isInteger(source.osf_version) &&
					typeof source.md5 === 'string' &&
					/^[0-9a-f]{32}$/.test(source.md5) &&
					typeof source.url === 'string',
				`${where} sources[${i}] is incomplete`
			);
			return {
				name: source.name,
				osfVersion: source.osf_version as number,
				md5: source.md5,
				url: source.url
			};
		});
	}
}

export interface DistributionsDoc {
	sample: string;
	grid: GridDoc;
	societies: { code: string[] };
	cells: {
		n: Num[];
		sd: Num[];
		c1: Num[];
		c2: Num[];
		c3: Num[];
		c4: Num[];
		c5: Num[];
		c6: Num[];
	};
}

/** How a society's respondents answered one cell (DR-4): counts of the six responses (§4.3). */
export interface ResponseCounts {
	/** Respondents, at least 10 (DR-9). */
	n: number;
	sd: number;
	/** Respondents choosing response 1 (extremely inappropriate) to 6 (extremely appropriate). */
	counts: readonly [number, number, number, number, number, number];
}

const COUNT_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const;

/**
 * `distributions-<sample>.json`: society × cell response counts (DR-4), for the quiz (FR-61). Row
 * `s × 150 + c` is society `s` and cell `c`; a row below 10 respondents, or not asked, is null.
 * The counts of every row are checked to add up to its n.
 */
export class Distributions {
	readonly sample: SampleId;
	readonly codes: readonly string[];
	readonly #index: Map<string, number>;
	readonly #c: DistributionsDoc['cells'];

	constructor(json: unknown, sample: SampleId) {
		const where = `distributions-${sample}.json`;
		check(isObject(json), `${where} is not an object`);
		checkSample(json, sample, where);
		checkGrid(json, where);
		const societies = table(json.societies, `${where} societies`, ['code'], rows(json.societies));
		const codes = societies.code as string[];
		const c = table(
			json.cells,
			`${where} cells`,
			['n', 'sd', ...COUNT_KEYS],
			codes.length * CELL_COUNT
		) as unknown as DistributionsDoc['cells'];
		for (let i = 0; i < c.n.length; i++) {
			const n = c.n[i];
			if (n === null) continue;
			const total = COUNT_KEYS.reduce((sum, k) => sum + (c[k][i] ?? Number.NaN), 0);
			check(total === n && n >= 10, `${where} has a row whose counts do not add up to its n`);
		}
		this.sample = sample;
		this.codes = codes;
		this.#index = new Map(codes.map((code, i) => [code, i]));
		this.#c = c;
	}

	/** The society's row in this sample, or undefined when it is not in the sample. */
	indexOf(code: string): number | undefined {
		return this.#index.get(code);
	}

	/** The society's response counts for a cell, or null below 10 respondents or not asked. */
	counts(society: number, cell: number): ResponseCounts | null {
		const i = society * CELL_COUNT + cell;
		const c = this.#c;
		const n = c.n[i];
		if (n === null) return null;
		return {
			n,
			sd: c.sd[i] ?? 0,
			counts: COUNT_KEYS.map((k) => c[k][i] as number) as unknown as ResponseCounts['counts']
		};
	}
}

export interface SimilarityDoc {
	sample: string;
	pairs: { code: string[]; rank: number[]; other: string[]; r: number[]; n_cells: number[] };
}

/** One of a society's five most similar societies (DR-14, FR-32). */
export interface SimilarPair {
	other: string;
	rank: number;
	/** Pearson correlation of the two fingerprints (decision 16). */
	r: number;
	/** Pairs both societies can publish, at least 120. */
	cells: number;
}

/** `similarity-<sample>.json`: up to five pairs per society (DR-14). */
export class Similarity {
	readonly sample: SampleId;
	readonly #pairs = new Map<string, SimilarPair[]>();

	constructor(json: unknown, sample: SampleId) {
		const where = `similarity-${sample}.json`;
		check(isObject(json), `${where} is not an object`);
		checkSample(json, sample, where);
		const p = table(
			json.pairs,
			`${where} pairs`,
			['code', 'rank', 'other', 'r', 'n_cells'],
			rows(json.pairs)
		);
		this.sample = sample;
		(p.code as string[]).forEach((code, i) => {
			const r = p.r[i];
			const rank = p.rank[i];
			const cells = p.n_cells[i];
			check(
				typeof r === 'number' && typeof rank === 'number' && typeof cells === 'number',
				`${where} has missing values`
			);
			const list = this.#pairs.get(code) ?? [];
			list.push({ other: p.other[i] as string, rank, r, cells });
			this.#pairs.set(code, list);
		});
		for (const list of this.#pairs.values()) list.sort((a, b) => a.rank - b.rank);
	}

	/** Most similar first; empty when the society has too few publishable cells (decision 7). */
	pairs(code: string): readonly SimilarPair[] {
		return this.#pairs.get(code) ?? [];
	}
}

/** Contexts per behavior in `contexts-<sample>.json` (DR-12). */
const CONTEXT_COUNT = CONTEXTS.length;
const CONTEXT_ROWS = BEHAVIORS.length * CONTEXT_COUNT;

export interface ContextsDoc {
	sample: string;
	grid: { behaviors: string[]; contexts: string[] };
	societies: { code: string[] };
	cells: {
		n: Num[];
		mean: Num[];
		mean_minus: Num[];
		mean_plus: Num[];
		share: Num[];
		status: number[];
	};
	global: {
		n_societies: Num[];
		n: Num[];
		mean: Num[];
		mean_minus: Num[];
		mean_plus: Num[];
		share: Num[];
	};
	by_gender: {
		gender: string[];
		n_societies: Num[];
		n: Num[];
		mean: Num[];
		mean_minus: Num[];
		mean_plus: Num[];
		share: Num[];
	};
}

/** Respondent gender, split for all societies together only (DR-12, §4.7, decision 18). */
export type RespondentGender = 'woman' | 'man';
const GENDER_ROWS: Record<RespondentGender, { value: string; first: number }> = {
	woman: { value: 'Woman', first: 0 },
	man: { value: 'Man', first: CONTEXT_ROWS }
};

/** One series' value for one behavior in one context (DR-12). */
export interface ContextValue {
	status: StatusCode;
	/** Respondents; null when suppressed. */
	n: number | null;
	/** The raw mean with its 95% interval (there is no shrunken one); null when suppressed. */
	estimate: Estimate | null;
	share: number | null;
	/** Societies behind a global value; null for one society's own. */
	societies: number | null;
}

const CONTEXT_CELL_KEYS = ['n', 'mean', 'mean_minus', 'mean_plus', 'share', 'status'] as const;
const CONTEXT_GLOBAL_KEYS = [
	'n_societies',
	'n',
	'mean',
	'mean_minus',
	'mean_plus',
	'share'
] as const;

type GlobalContextColumns = Record<(typeof CONTEXT_GLOBAL_KEYS)[number], number[]>;

function globalColumns(value: unknown, where: string, length: number): GlobalContextColumns {
	const t = table(value, where, CONTEXT_GLOBAL_KEYS, length);
	return Object.fromEntries(
		CONTEXT_GLOBAL_KEYS.map((k) => [k, numbers(t[k] as Num[], `${where}.${k}`)])
	) as GlobalContextColumns;
}

function globalValue(c: GlobalContextColumns, i: number): ContextValue {
	const value = c.mean[i];
	return {
		status: Status.Ok,
		n: c.n[i],
		estimate: {
			value,
			lo: round2(value - c.mean_minus[i]),
			hi: round2(value + c.mean_plus[i])
		},
		share: c.share[i],
		societies: c.n_societies[i]
	};
}

/**
 * `contexts-<sample>.json`: 15 behaviors × 5 contexts per society, for all societies together and,
 * for all societies only, by respondent gender (DR-12). Behaviors and contexts are indices into
 * BEHAVIORS and CONTEXTS. Rows below 10 respondents carry only a status (DR-9).
 */
export class ContextCells {
	readonly sample: SampleId;
	readonly codes: readonly string[];
	readonly #index: Map<string, number>;
	readonly #c: ContextsDoc['cells'];
	readonly #global: GlobalContextColumns;
	readonly #byGender: GlobalContextColumns;

	constructor(json: unknown, sample: SampleId) {
		const where = `contexts-${sample}.json`;
		check(isObject(json), `${where} is not an object`);
		checkSample(json, sample, where);
		check(isObject(json.grid), `${where} has no grid`);
		check(
			JSON.stringify(json.grid.behaviors) === JSON.stringify(BEHAVIORS) &&
				JSON.stringify(json.grid.contexts) === JSON.stringify(CONTEXTS),
			`${where} has a different behavior or context order`
		);
		const societies = table(json.societies, `${where} societies`, ['code'], rows(json.societies));
		const codes = societies.code as string[];
		this.#c = table(
			json.cells,
			`${where} cells`,
			CONTEXT_CELL_KEYS,
			codes.length * CONTEXT_ROWS
		) as unknown as ContextsDoc['cells'];
		this.#global = globalColumns(json.global, `${where} global`, CONTEXT_ROWS);
		const byGender = table(json.by_gender, `${where} by_gender`, ['gender'], 2 * CONTEXT_ROWS);
		for (const { value, first } of Object.values(GENDER_ROWS)) {
			check(
				byGender.gender.slice(first, first + CONTEXT_ROWS).every((g) => g === value),
				`${where} by_gender is not women's rows then men's`
			);
		}
		this.#byGender = globalColumns(byGender, `${where} by_gender`, 2 * CONTEXT_ROWS);
		this.sample = sample;
		this.codes = codes;
		this.#index = new Map(codes.map((code, i) => [code, i]));
	}

	/** The society's row in this sample, or undefined when it is not in the sample. */
	indexOf(code: string): number | undefined {
		return this.#index.get(code);
	}

	/** One society's value (DR-12); null estimate when it rests on fewer than 10 (DR-9). */
	society(society: number, behavior: number, context: number): ContextValue {
		const i = society * CONTEXT_ROWS + behavior * CONTEXT_COUNT + context;
		const c = this.#c;
		const value = c.mean[i];
		return {
			status: c.status[i] as StatusCode,
			n: c.n[i],
			estimate:
				value === null
					? null
					: {
							value,
							lo: round2(value - (c.mean_minus[i] ?? 0)),
							hi: round2(value + (c.mean_plus[i] ?? 0))
						},
			share: c.share[i],
			societies: null
		};
	}

	/** All societies together: the unweighted mean of society means (DR-7, DR-12). */
	global(behavior: number, context: number): ContextValue {
		return globalValue(this.#global, behavior * CONTEXT_COUNT + context);
	}

	/** Women or men respondents in all societies together (DR-12, decision 18). */
	byGender(gender: RespondentGender, behavior: number, context: number): ContextValue {
		return globalValue(
			this.#byGender,
			GENDER_ROWS[gender].first + behavior * CONTEXT_COUNT + context
		);
	}
}

/**
 * The 26 societies in both surveys (DR-13, §4.4), as in `change-all.json`; the paper's sample keeps
 * 22 of them. Links and the change routes need the list before any file loads, so it is written
 * here and every change file is checked against it.
 */
export const CHANGE_SOCIETIES = [
	'AUS',
	'BRA',
	'CHN',
	'DEU',
	'ESP',
	'EST',
	'FRA',
	'GBR',
	'GRC',
	'HUN',
	'IND',
	'ISL',
	'ISR',
	'ITA',
	'JPN',
	'KOR',
	'MEX',
	'MYS',
	'NLD',
	'NZL',
	'PAK',
	'POL',
	'PRT',
	'SGP',
	'TUR',
	'USA'
] as const;

/** Whether the society is in the 2000–2003 survey: whether it has change pages. */
export function inChangeSurvey(code: string | null | undefined): boolean {
	return !!code && (CHANGE_SOCIETIES as readonly string[]).includes(code);
}

export interface ChangeDoc {
	sample: string;
	source: string;
	grid: GridDoc;
	societies: {
		code: string[];
		n0: Num[];
		diff: Num[];
		diff_minus: Num[];
		diff_plus: Num[];
		n_cells: number[];
	};
	cells: {
		n0: Num[];
		mean0: Num[];
		sd0: Num[];
		n1: Num[];
		mean1: Num[];
		sd1: Num[];
		diff: Num[];
		diff_minus: Num[];
		diff_plus: Num[];
	};
	global: {
		n_societies: Num[];
		mean0: Num[];
		mean1: Num[];
		diff: Num[];
		diff_minus: Num[];
		diff_plus: Num[];
	};
	behaviors: {
		behavior: string[];
		n_societies: Num[];
		mean: Num[];
		mean_minus: Num[];
		mean_plus: Num[];
		sd: Num[];
		increased: Num[];
	};
}

/** One survey's aggregate for a society and pair (DR-13). */
export interface SurveyValue {
	/** Ratings in 2000–2003 (decision 13), respondents in 2023–2024; at least 10 (DR-9). */
	n: number;
	mean: number;
	sd: number;
}

/** A society's pair in both surveys. */
export interface ChangePair {
	/** The 2000–2003 survey; null when either survey lacks the pair. */
	older: SurveyValue | null;
	/** The 2023–2024 survey (GSN); null when either survey lacks the pair. */
	newer: SurveyValue | null;
	/** 2023–2024 minus 2000–2003 with its 95% interval; null when either survey lacks the pair. */
	diff: Estimate | null;
}

/** The societies in both surveys together, for one pair (FR-53). */
export interface ChangeGlobal {
	/** Societies with the pair in both surveys: 26, or 25 where Israel lacks it. */
	societies: number;
	older: number;
	newer: number;
	diff: Estimate;
}

/** A society's mean difference over its pairs (DR-13). */
export interface ChangeSociety {
	code: string;
	/** 2000–2003 respondents. */
	respondents: number | null;
	diff: Estimate;
	/** Pairs in both surveys: 120, or 119 for Israel. */
	cells: number;
}

/** A behavior's mean difference over its situations and societies, as in the paper's Table 1. */
export interface ChangeBehavior {
	behavior: Behavior;
	societies: number;
	diff: Estimate;
	/** Spread of the societies' differences. */
	sd: number;
	/** Societies whose difference is above 0, beyond their interval or not. */
	increased: number;
}

const CHANGE_CELL_KEYS = [
	'n0',
	'mean0',
	'sd0',
	'n1',
	'mean1',
	'sd1',
	'diff',
	'diff_minus',
	'diff_plus'
] as const;
const CHANGE_SOCIETY_KEYS = ['code', 'n0', 'diff', 'diff_minus', 'diff_plus', 'n_cells'] as const;
const CHANGE_GLOBAL_KEYS = [
	'n_societies',
	'mean0',
	'mean1',
	'diff',
	'diff_minus',
	'diff_plus'
] as const;
const CHANGE_BEHAVIOR_KEYS = [
	'n_societies',
	'mean',
	'mean_minus',
	'mean_plus',
	'sd',
	'increased'
] as const;

function bounds(value: number, minus: number, plus: number): Estimate {
	return { value, lo: round2(value - minus), hi: round2(value + plus) };
}

/**
 * `change-<sample>.json`: the 2000–2003 survey (Gelfand et al. 2011) against the GSN for the
 * societies in both, as society × pair aggregates only (DR-13, C-6). The 120 pairs are the 12
 * behaviors both asked × 10 situations, checked by ID; `cells` gives each pair's place in the
 * 150-cell grid. A pair missing from either survey is null throughout. There is no status,
 * share, shrunken or centered value: both surveys' means are raw.
 */
export class ChangeCells {
	readonly sample: SampleId;
	/** The provenance line the pipeline writes (C-6, NFR-41). */
	readonly source: string;
	readonly codes: readonly string[];
	/** The pairs in file order, with their 150-cell indices. */
	readonly cells: readonly Cell[];
	readonly #index: Map<string, number>;
	readonly #c: ChangeDoc['cells'];
	readonly #societies: ChangeDoc['societies'];
	readonly #global: Record<(typeof CHANGE_GLOBAL_KEYS)[number], number[]>;
	readonly behaviors: readonly ChangeBehavior[];

	constructor(json: unknown, sample: SampleId) {
		const where = `change-${sample}.json`;
		check(isObject(json), `${where} is not an object`);
		checkSample(json, sample, where);
		check(typeof json.source === 'string' && json.source !== '', `${where} has no source`);
		check(isObject(json.grid), `${where} has no grid`);
		const { behaviors, situations } = json.grid;
		check(
			JSON.stringify(behaviors) === JSON.stringify(CHANGE_BEHAVIORS) &&
				JSON.stringify(situations) === JSON.stringify(SITUATIONS),
			`${where} has a different behavior or situation order`
		);
		// Each pair by its IDs, not by its position (decision 67).
		const cells = (behaviors as Behavior[]).flatMap((behavior) =>
			(situations as Situation[]).map((situation) => ({
				index: cellIndex(behavior, situation),
				behavior,
				situation
			}))
		);
		check(
			cells.length === CHANGE_CELLS.length,
			`${where} has ${cells.length} pairs, not ${CHANGE_CELLS.length}`
		);
		const societies = table(
			json.societies,
			`${where} societies`,
			CHANGE_SOCIETY_KEYS,
			rows(json.societies)
		) as unknown as ChangeDoc['societies'];
		const known = CHANGE_SOCIETIES as readonly string[];
		check(
			societies.code.every((code) => known.includes(code)),
			`${where} lists a society that is not in both surveys`
		);
		this.#c = table(
			json.cells,
			`${where} cells`,
			CHANGE_CELL_KEYS,
			societies.code.length * cells.length
		) as unknown as ChangeDoc['cells'];
		const global = table(json.global, `${where} global`, CHANGE_GLOBAL_KEYS, cells.length);
		this.#global = Object.fromEntries(
			CHANGE_GLOBAL_KEYS.map((k) => [k, numbers(global[k] as Num[], `${where} global.${k}`)])
		) as Record<(typeof CHANGE_GLOBAL_KEYS)[number], number[]>;
		const b = table(
			json.behaviors,
			`${where} behaviors`,
			['behavior', ...CHANGE_BEHAVIOR_KEYS],
			CHANGE_BEHAVIORS.length
		);
		check(
			JSON.stringify(b.behavior) === JSON.stringify(CHANGE_BEHAVIORS),
			`${where} behaviors are in another order`
		);
		const bn = Object.fromEntries(
			CHANGE_BEHAVIOR_KEYS.map((k) => [k, numbers(b[k] as Num[], `${where} behaviors.${k}`)])
		) as Record<(typeof CHANGE_BEHAVIOR_KEYS)[number], number[]>;
		this.behaviors = CHANGE_BEHAVIORS.map((behavior, i) => ({
			behavior,
			societies: bn.n_societies[i],
			diff: bounds(bn.mean[i], bn.mean_minus[i], bn.mean_plus[i]),
			sd: bn.sd[i],
			increased: bn.increased[i]
		}));
		this.sample = sample;
		this.source = json.source;
		this.codes = societies.code;
		this.cells = cells;
		this.#societies = societies;
		this.#index = new Map(societies.code.map((code, i) => [code, i]));
	}

	/** The society's row in this sample, or undefined when it is not in both surveys here. */
	indexOf(code: string): number | undefined {
		return this.#index.get(code);
	}

	/** Society s, pair k (an index into `cells`). */
	pair(society: number, k: number): ChangePair {
		const i = society * this.cells.length + k;
		const c = this.#c;
		const [n0, mean0, sd0, n1, mean1, sd1, diff] = [
			c.n0[i],
			c.mean0[i],
			c.sd0[i],
			c.n1[i],
			c.mean1[i],
			c.sd1[i],
			c.diff[i]
		];
		if (
			n0 === null ||
			mean0 === null ||
			sd0 === null ||
			n1 === null ||
			mean1 === null ||
			sd1 === null ||
			diff === null
		) {
			return { older: null, newer: null, diff: null };
		}
		return {
			older: { n: n0, mean: mean0, sd: sd0 },
			newer: { n: n1, mean: mean1, sd: sd1 },
			diff: bounds(diff, c.diff_minus[i] ?? 0, c.diff_plus[i] ?? 0)
		};
	}

	/** One society's 120 pairs in file order. */
	row(society: number): ChangePair[] {
		return this.cells.map((_, k) => this.pair(society, k));
	}

	/** The societies in both surveys together, for pair k (FR-53). */
	global(k: number): ChangeGlobal {
		const g = this.#global;
		return {
			societies: g.n_societies[k],
			older: g.mean0[k],
			newer: g.mean1[k],
			diff: bounds(g.diff[k], g.diff_minus[k], g.diff_plus[k])
		};
	}

	/** Each society's mean difference over its pairs, in file order (by code). */
	societies(): ChangeSociety[] {
		const s = this.#societies;
		return s.code.map((code, i) => {
			const diff = s.diff[i];
			check(diff !== null, `change-${this.sample}.json has a society with no difference`);
			return {
				code,
				respondents: s.n0[i],
				diff: bounds(diff, s.diff_minus[i] ?? 0, s.diff_plus[i] ?? 0),
				cells: s.n_cells[i]
			};
		});
	}
}
