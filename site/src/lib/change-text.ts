/**
 * The change module's words outside its own routes (R-6; decisions 75 and 95): its name in the
 * header, the credit for the 2000–2003 survey (NFR-41), the story's step title, the home page's
 * entry card, the change card's alt text and the links into the module from fingerprints and
 * drill-downs. A build without the module swaps this file for change-text.off.ts
 * (vite.config.ts), so none of it reaches that build's JavaScript; the markup around each use
 * stays behind `CHANGE_MODULE`.
 */

/** NFR-41: Gelfand et al. (2011), whose survey the GSN authors compare against. */
export const comparison = {
	label: '2000–2003 comparison data',
	text: 'Gelfand et al. (2011), Science 332:1100–1104',
	url: 'https://doi.org/10.1126/science.1197754'
};

/**
 * Decision 114 (D-32): the module's name, "Then and now", since a difference between two surveys is
 * not change in anyone (FR-52). The paths stay /change/.
 */
export const CHANGE_NAME = 'Then and now';

export const STORY_CHANGE_TITLE = 'Two surveys, 20 years apart';

/** The home page's entry card (decision 123). */
export const CHANGE_HUB = 'The same questions in 26 societies, in 2000–2003 and in 2023–2024.';

/** FR-83: what the change card shows (decision 89). */
export const CHANGE_SHARE_ALT =
	'For each of the 12 behaviors asked in both surveys, its average difference between the 2000–2003 and 2023–2024 surveys, marked where it lies beyond its 95% interval.';

/** A fingerprint's link to its society's change page (decision 67). */
export const societyChangeLink = (who: string) =>
	`How ${who} answered in 2023–2024 and in a survey from 2000–2003`;

/** A drill-down's link to the selected society's change page, or the overview (decision 67). */
export const cellChangeLink = (where: string | null) =>
	where
		? `Respondents in ${where} compared with a survey from 2000–2003`
		: 'Respondents in 26 societies in 2000–2003 and 2023–2024';
