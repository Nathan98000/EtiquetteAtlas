/**
 * The method page's facts (FR-71, FR-72; decision 93): what each sample toggle changes, the
 * student share over all respondents (§4.8), and the OSF files, pipeline version and build date
 * from the manifest. Computed at build time; the page receives short strings (decision 28).
 */

import { count, spread } from './format';
import { CELL_COUNT } from './grid';
import {
	SAMPLE_LABEL,
	SAMPLES,
	type GlobalCells,
	type Manifest,
	type SampleId,
	type Societies
} from './model';
import { monthLabel } from './society';

export interface SampleEffect {
	sample: SampleId;
	label: string;
	respondents: string;
	societies: number;
	/** The societies the sample leaves out, by name. */
	leftOut: string[];
	/** How far the 150 global averages move from All data: on average and at most. */
	shift: { mean: string; max: string } | null;
}

/** FR-71: each sample's size, the societies it leaves out and how far the global averages move. */
export function sampleEffects(
	societies: Societies,
	global: Record<SampleId, GlobalCells>
): SampleEffect[] {
	return SAMPLES.map((sample) => {
		let total = 0;
		let largest = 0;
		for (let c = 0; c < CELL_COUNT; c++) {
			const d = Math.abs(global[sample].mean(c, 'raw') - global.all.mean(c, 'raw'));
			total += d;
			largest = Math.max(largest, d);
		}
		const respondents = societies.list.reduce(
			(sum, s) => sum + (societies.respondents(s.code, sample) ?? 0),
			0
		);
		return {
			sample,
			label: SAMPLE_LABEL[sample],
			respondents: count(respondents),
			societies: societies.count(sample),
			leftOut: societies.list
				.filter((s) => !societies.inSample(s.code, sample))
				.map((s) => s.name)
				.sort((a, b) => a.localeCompare(b, 'en')),
			shift: sample === 'all' ? null : { mean: spread(total / CELL_COUNT), max: spread(largest) }
		};
	});
}

/**
 * §4.8: the share of all respondents flagged as students and with no status recorded, whole
 * percents, from each society's shares as stored (decision 11).
 */
export function studentShares(
	societies: Societies,
	sample: SampleId
): { students: number; unknown: number } {
	let respondents = 0;
	let students = 0;
	let unknown = 0;
	for (const s of societies.list) {
		const facts = societies.facts(s.code, sample);
		if (!facts) continue;
		respondents += facts.respondents;
		students += (facts.respondents * facts.studentShare) / 100;
		unknown += (facts.respondents * facts.studentUnknown) / 100;
	}
	return {
		students: Math.round((100 * students) / respondents),
		unknown: Math.round((100 * unknown) / respondents)
	};
}

/** "2026-10-22" → "22 October 2026". */
export function dateLabel(date: string): string {
	const [year, month, day] = date.split('-');
	const [name] = monthLabel(`${year}-${month}`).split(' ');
	return `${Number(day)} ${name} ${year}`;
}

export interface VersionsView {
	pipeline: string;
	buildDate: string;
	replicates: string;
	seed: string;
	files: { name: string; version: number; md5: string; url: string }[];
}

/** The 2000–2003 survey's file, listed only in a build with the change module (R-6). */
export const COMPARISON_FILE = 'everyday-norms-2011-clean.csv';

/** FR-72: the OSF files with their versions and checksums, the pipeline version and build date. */
export function versionsView(manifest: Manifest, withComparison: boolean): VersionsView {
	return {
		pipeline: manifest.pipelineVersion,
		buildDate: dateLabel(manifest.buildDate),
		replicates: count(manifest.replicates),
		seed: String(manifest.seed),
		files: manifest.sources
			.filter((s) => withComparison || s.name !== COMPARISON_FILE)
			.map((s) => ({
				name: s.name,
				version: s.osfVersion,
				md5: s.md5,
				url: s.url
			}))
	};
}
