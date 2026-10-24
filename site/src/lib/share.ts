/**
 * Share images (FR-82, FR-83, §6.4; decisions 88 to 92). `npm run cards` photographs the card pages
 * in src/cards/ into `share-images/`, the build publishes them under `share/`, and every
 * prerendered route's meta tags point to its card. This module has no imports, so the Node scripts
 * (scripts/share-images.js, scripts/check-build.js) read it too.
 */

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;
/** Where the build publishes the images, below the base path. */
export const SHARE_DIR = 'share';
/** Where `npm run cards` writes them, in site/ (git-ignored; decision 90). */
export const SHARE_SOURCE = 'share-images';
/** The card that belongs to the change module, left out of a build without it (R-6). */
export const CHANGE_CARD = 'change';

/**
 * The card a prerendered route shares, as a path below SHARE_DIR without `.png` (decision 89): the
 * home page, each module, each of the 150 cells and each of the 90 societies have their own; a
 * behavior's audiences and a society's change page share their module's card; the 404 page has
 * none.
 */
export function shareCard(
	routeId: string | null,
	params: Partial<Record<string, string>>
): string | null {
	switch (routeId) {
		case '/':
			return 'home';
		case '/explore':
		case '/societies':
		case '/story':
		case '/method':
			return routeId.slice(1);
		case '/explore/[behavior]/[situation]':
			return `explore/${params.behavior}/${params.situation}`;
		case '/societies/[society]':
			return `societies/${params.society}`;
		case '/audiences':
		case '/audiences/[behavior]':
			return 'audiences';
		case '/change':
		case '/change/[society]':
			return CHANGE_CARD;
		default:
			return null;
	}
}

/**
 * FR-83, decision 89: what each module's card shows, for its alt text. Index pages add their own
 * summary; a cell's and a society's pages describe their own card, and the change pages pass
 * change-text.ts's (R-6).
 */
export const SHARE_ALT: Record<string, string> = {
	home: 'A grid of 15 everyday behaviors in 10 situations, each pair coloured from orange (inappropriate) to blue (appropriate) by its average judgment.',
	explore:
		'The grid of the 150 behavior–situation pairs, coloured from orange (inappropriate) to blue (appropriate) by average judgment, with rings sized by how much societies disagree; the pairs with the most and the least disagreement are framed.',
	societies:
		"A world map with a mark for each of the 90 societies, shaped and coloured by the GSN authors' four regions.",
	audiences:
		"Lines for the 15 behaviors' average judgments when alone, in front of colleagues or classmates and in front of management or professors, over all societies, with the largest and the smallest drop named.",
	story:
		"Two rows of dots on one scale from inappropriate to appropriate: the 150 pairs' average answers spread across most of it, and each society's average over all the pairs stays near the middle.",
	method:
		"Bars of the respondents in the atlas's three samples: all respondents, the paper's sample and those who passed the attention check."
};
