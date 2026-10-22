/**
 * The 15 behaviors × 10 situations (SRS §4.2), in the SRS and paper order that every
 * `data/derived/` file uses. Cell `c` is behavior `c / 10` and situation `c % 10`. Item wording
 * follows the GSN items; `label` is the short form for axes and lists.
 */

export const BEHAVIORS = [
	'argue',
	'laugh',
	'curse',
	'kiss',
	'cry',
	'sing',
	'talk',
	'flirt',
	'listen',
	'bargain',
	'readnewspaper',
	'eat',
	'rest',
	'shout',
	'usemphone'
] as const;

export const SITUATIONS = [
	'funeral',
	'sidewalk',
	'library',
	'workplace',
	'job_interview',
	'restaurant',
	'public_park',
	'bus',
	'movies',
	'party'
] as const;

export type Behavior = (typeof BEHAVIORS)[number];
export type Situation = (typeof SITUATIONS)[number];

export const CELL_COUNT = BEHAVIORS.length * SITUATIONS.length;

interface BehaviorText {
	/** Short label for axes, lists and tables. */
	label: string;
	/** The -ing form, which starts a cell's headline: "Using a mobile phone at a funeral". */
	gerund: string;
	/** The wording in the GSN items. */
	item: string;
}

interface SituationText {
	label: string;
	/** The phrase that ends a cell's headline, as in the GSN items. */
	item: string;
}

export const BEHAVIOR_TEXT: Record<Behavior, BehaviorText> = {
	argue: { label: 'Argue', gerund: 'Arguing', item: 'argue' },
	laugh: { label: 'Laugh out loud', gerund: 'Laughing out loud', item: 'laugh out loud' },
	curse: {
		label: 'Curse or swear',
		gerund: 'Cursing or swearing',
		item: 'curse/swear (use foul language)'
	},
	kiss: { label: 'Kiss on the mouth', gerund: 'Kissing on the mouth', item: 'kiss (on the mouth)' },
	cry: { label: 'Cry', gerund: 'Crying', item: 'cry (shed tears)' },
	sing: { label: 'Sing', gerund: 'Singing', item: 'sing' },
	talk: { label: 'Talk', gerund: 'Talking', item: 'talk (have a conversation)' },
	flirt: { label: 'Flirt', gerund: 'Flirting', item: 'flirt' },
	listen: {
		label: 'Music on headphones',
		gerund: 'Listening to music on headphones',
		item: 'listen to music on headphones'
	},
	bargain: {
		label: 'Bargain',
		gerund: 'Bargaining',
		item: 'bargain (exchange goods, services, or privileges)'
	},
	readnewspaper: {
		label: 'Read the newspaper',
		gerund: 'Reading the newspaper',
		item: 'read the newspaper'
	},
	eat: { label: 'Eat', gerund: 'Eating', item: 'eat' },
	rest: {
		label: 'Rest',
		gerund: 'Resting',
		item: "rest (stay still, close one's eyes, and relax)"
	},
	shout: { label: 'Shout in anger', gerund: 'Shouting in anger', item: 'shout in anger' },
	usemphone: {
		label: 'Use a mobile phone',
		gerund: 'Using a mobile phone',
		item: 'use a mobile phone'
	}
};

export const SITUATION_TEXT: Record<Situation, SituationText> = {
	funeral: { label: 'Funeral', item: 'at a funeral ceremony' },
	sidewalk: { label: 'Sidewalk', item: 'on a city sidewalk' },
	library: { label: 'Library', item: 'in the library' },
	workplace: { label: 'Workplace', item: 'at the workplace' },
	job_interview: { label: 'Job interview', item: 'in a job interview' },
	restaurant: { label: 'Restaurant', item: 'in a restaurant' },
	public_park: { label: 'Public park', item: 'in a public park' },
	bus: { label: 'Bus', item: 'on a bus' },
	movies: { label: 'Movies', item: 'at the movies' },
	party: { label: 'Party', item: 'at a party' }
};

export interface Cell {
	index: number;
	behavior: Behavior;
	situation: Situation;
}

export const CELLS: readonly Cell[] = BEHAVIORS.flatMap((behavior, b) =>
	SITUATIONS.map((situation, s) => ({ index: b * SITUATIONS.length + s, behavior, situation }))
);

export function cellIndex(behavior: Behavior, situation: Situation): number {
	return BEHAVIORS.indexOf(behavior) * SITUATIONS.length + SITUATIONS.indexOf(situation);
}

/** URL slugs use the IDs with hyphens (§4.2): `job_interview` → `job-interview`. */
export function slug(id: string): string {
	return id.replaceAll('_', '-');
}

export function behaviorFromSlug(value: string): Behavior | undefined {
	return BEHAVIORS.find((b) => slug(b) === value);
}

export function situationFromSlug(value: string): Situation | undefined {
	return SITUATIONS.find((s) => slug(s) === value);
}

/** "Using a mobile phone at a funeral ceremony". */
export function headline(cell: Cell): string {
	return `${BEHAVIOR_TEXT[cell.behavior].gerund} ${SITUATION_TEXT[cell.situation].item}`;
}

/** The same, starting lower case, for use inside a sentence. */
export function phrase(cell: Cell): string {
	const text = headline(cell);
	return text[0].toLowerCase() + text.slice(1);
}

/** Route parameters for a cell's drill-down. */
export function cellParams(cell: Cell): { behavior: string; situation: string } {
	return { behavior: slug(cell.behavior), situation: slug(cell.situation) };
}

/**
 * The contexts file's five contexts in its order (DR-12): three audiences, from no one else around
 * to management or professors, then who does the behavior. The last two are the actor's gender,
 * never an audience (FR-42). Context `k` of behavior `b` is row `b × 5 + k`.
 */
export const CONTEXTS = [
	'alone',
	'colleagues/classmates',
	'management/professors',
	'woman',
	'man'
] as const;

export type Context = (typeof CONTEXTS)[number];

/** The audiences (FR-40), as indices into CONTEXTS. */
export const AUDIENCES = [0, 1, 2] as const;
/** Done by a woman, done by a man (FR-42), as indices into CONTEXTS. */
export const ACTORS = [3, 4] as const;
export const ALONE = 0;
export const MANAGEMENT = 2;

interface ContextText {
	/** For axes, tables and details: "In front of colleagues or classmates". */
	label: string;
	/** For narrow panels and keys: "Colleagues". */
	short: string;
	/** Inside a sentence: "judged it very appropriate when alone". */
	phrase: string;
}

export const CONTEXT_TEXT: Record<Context, ContextText> = {
	alone: { label: 'Alone', short: 'Alone', phrase: 'when alone' },
	'colleagues/classmates': {
		label: 'In front of colleagues or classmates',
		short: 'Colleagues',
		phrase: 'in front of colleagues or classmates'
	},
	'management/professors': {
		label: 'In front of management or professors',
		short: 'Management',
		phrase: 'in front of management or professors'
	},
	woman: { label: 'Done by a woman', short: 'A woman', phrase: 'done by a woman' },
	man: { label: 'Done by a man', short: 'A man', phrase: 'done by a man' }
};
