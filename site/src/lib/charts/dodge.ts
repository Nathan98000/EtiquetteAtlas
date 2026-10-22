/**
 * Beeswarm layout (FR-20, decision 35): each dot keeps its exact x and takes the y closest to
 * the axis where it overlaps no dot placed before it. Dots are placed in order of x, ties by
 * key, so the same data always gives the same picture, with no iterations and no overlaps. A
 * force simulation would only approximate this.
 */

export interface Placed<T> {
	item: T;
	x: number;
	y: number;
}

export function dodge<T>(
	items: readonly T[],
	x: (item: T) => number,
	key: (item: T) => string,
	/** Minimum distance between two dots' centres. */
	spacing: number
): Placed<T>[] {
	const sorted = [...items].sort((a, b) => x(a) - x(b) || key(a).localeCompare(key(b)));
	const placed: Placed<T>[] = [];
	const free = (px: number, py: number) =>
		placed.every((p) => (p.x - px) ** 2 + (p.y - py) ** 2 >= spacing ** 2 - 1e-9);
	for (const item of sorted) {
		const px = x(item);
		// Candidate heights: on the axis, or just touching a dot that is close in x.
		const candidates = [0];
		for (const p of placed) {
			const dx = Math.abs(p.x - px);
			if (dx >= spacing) continue;
			const dy = Math.sqrt(spacing ** 2 - dx ** 2);
			candidates.push(p.y + dy, p.y - dy);
		}
		candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
		const y = candidates.find((cy) => free(px, cy)) ?? 0;
		placed.push({ item, x: px, y });
	}
	return placed;
}

/** The largest distance of a dot from the axis. */
export function extent(placed: readonly Placed<unknown>[]): number {
	return placed.reduce((max, p) => Math.max(max, Math.abs(p.y)), 0);
}
