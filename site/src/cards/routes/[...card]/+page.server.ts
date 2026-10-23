import { error } from '@sveltejs/kit';
import { CHANGE_MODULE } from '#lib/change-module.ts';
import { cardFor, cardPaths } from '../../cards';
import type { CardData } from '../../model';

// FR-82: one card per share image, at the image's own path (decision 89). The change module's
// card is left out of a build without it (R-6, decision 75).
export const entries = (): { card: string }[] => cardPaths(CHANGE_MODULE).map((card) => ({ card }));

export const load = async ({ params }: { params: { card: string } }): Promise<CardData> => {
	const change = CHANGE_MODULE ? (await import('#lib/server/change.ts')).changeAll : null;
	// A rest parameter keeps the trailing slash the routes are prerendered with.
	const card = cardFor(params.card.replace(/\/$/, ''), change);
	if (!card) error(404, 'Not found');
	return card;
};
