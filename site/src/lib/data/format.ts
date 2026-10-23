/**
 * Numbers and phrases as §6.5 asks: scores on the −2.5 to +2.5 scale with one decimal and a
 * true minus sign, GSN response labels rather than raw scores where possible, and "respondents
 * in Chile" rather than "Chileans" (FR-73, R-2).
 */

const MINUS = '−';

/** A number with a true minus sign: "−1.25". */
export function signed(x: number, digits = 1): string {
	const text = Math.abs(x).toFixed(digits);
	if (Number(text) === 0) return text;
	return x < 0 ? `${MINUS}${text}` : text;
}

/**
 * A score on the −2.5 to +2.5 scale, signed so both sides of 0 read alike: "+1.2", "−0.4". Averages
 * of differences, whose intervals are narrow, take two decimals: "+0.05".
 */
export function score(x: number, digits = 1): string {
	const text = signed(x, digits);
	return x > 0 && Number(Math.abs(x).toFixed(digits)) !== 0 ? `+${text}` : text;
}

export function interval(lo: number, hi: number, digits = 1): string {
	return `${score(lo, digits)} to ${score(hi, digits)}`;
}

/** Disagreement τ and other spreads, which are never negative: "0.45". */
export function spread(x: number): string {
	return x.toFixed(2);
}

export function percent(x: number): string {
	return `${Math.round(x)}%`;
}

export function count(n: number): string {
	return n.toLocaleString('en-US');
}

export function ordinal(n: number): string {
	const tens = n % 100;
	if (tens >= 11 && tens <= 13) return `${n}th`;
	return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

/** The six GSN response labels (§4.3), from 1 to 6. */
export const RESPONSES = [
	'extremely inappropriate',
	'very inappropriate',
	'somewhat inappropriate',
	'somewhat appropriate',
	'very appropriate',
	'extremely appropriate'
] as const;

/**
 * The response label nearest a score: response k sits at k − 3.5, so the boundaries fall at
 * whole numbers. A score of exactly 0 lies between the two middle answers (§4.3).
 */
export function responseLabel(x: number): string {
	if (Math.abs(x) < 0.005) return 'between somewhat inappropriate and somewhat appropriate';
	const strength = Math.abs(x) <= 1 ? 'somewhat' : Math.abs(x) <= 2 ? 'very' : 'extremely';
	return `${strength} ${x < 0 ? 'inappropriate' : 'appropriate'}`;
}

/** Society names that read with "the": "respondents in the Philippines". */
const WITH_THE = new Set(['CAF', 'COD', 'GBR', 'NLD', 'PHL', 'TTO', 'USA']);

/** "the Philippines", "Chile". */
export function place(code: string, name: string): string {
	return WITH_THE.has(code) ? `the ${name}` : name;
}

/** "respondents in Chile" (§6.5). */
export function respondentsIn(code: string, name: string): string {
	return `respondents in ${place(code, name)}`;
}
