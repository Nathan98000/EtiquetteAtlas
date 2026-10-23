/**
 * Chart colours for both themes (§6.4, NFR-12; decision 34).
 *
 * - Appropriateness: a blue–orange diverging scale, neutral at 0 (the scale midpoint), orange for
 *   inappropriate and blue for appropriate, interpolated in OkLab between seven stops. The two
 *   ends stay apart under simulated deuteranopia, protanopia and tritanopia.
 * - Marks drawn on a fill (disagreement circles, FR-15 glyphs) use whichever ink contrasts more
 *   with it, which gives at least 4:1 on any fill (marks need 3:1).
 * - Regions: four colours that avoid orange and blue, so they never read as appropriateness, each
 *   with a shape as well, since colour alone separates them only weakly for some readers.
 */

import type { Region } from '../data/model';

export type Theme = 'light' | 'dark';

/** Stops at −2.5, −1.67, −0.83, 0, +0.83, +1.67, +2.5. */
export const DIVERGING: Record<Theme, readonly string[]> = {
	light: ['#a3480b', '#d9813f', '#f2c79d', '#f1eeea', '#a9c8e6', '#5b95cc', '#1d5a99'],
	dark: ['#f5a36a', '#c86d2c', '#7a4422', '#2e3238', '#2b4f74', '#3f7fbf', '#8fc1f0']
};

export const INK: Record<Theme, { dark: string; light: string }> = {
	light: { dark: '#1d2329', light: '#ffffff' },
	dark: { dark: '#14181c', light: '#f2f4f6' }
};

/** Page surfaces (app.css): chart marks need 3:1 against both. */
export const SURFACES: Record<Theme, readonly string[]> = {
	light: ['#ffffff', '#f3f5f7'],
	dark: ['#14181c', '#1d2328']
};

export const REGION_COLOR: Record<Theme, Record<Region, string>> = {
	light: { Africa: '#c2408a', Asia: '#00695c', 'Latin America': '#957a00', West: '#2f2470' },
	dark: { Africa: '#e26aa8', Asia: '#58d6b6', 'Latin America': '#e8d36b', West: '#9a8cf0' }
};

export type Shape = 'triangle' | 'square' | 'diamond' | 'circle';

export const REGION_SHAPE: Record<Region, Shape> = {
	Africa: 'triangle',
	Asia: 'square',
	'Latin America': 'diamond',
	West: 'circle'
};

type Rgb = [number, number, number];
type Lab = [number, number, number];

function hexToRgb(hex: string): Rgb {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as Rgb;
}

function rgbToHex(rgb: Rgb): string {
	return `#${rgb
		.map((c) =>
			Math.round(Math.min(1, Math.max(0, c)) * 255)
				.toString(16)
				.padStart(2, '0')
		)
		.join('')}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklab(rgb: Rgb): Lab {
	const [r, g, b] = rgb.map(toLinear);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

function oklabToRgb([L, a, b]: Lab): Rgb {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	].map(fromLinear) as Rgb;
}

const STOPS: Record<Theme, Lab[]> = {
	light: DIVERGING.light.map((hex) => rgbToOklab(hexToRgb(hex))),
	dark: DIVERGING.dark.map((hex) => rgbToOklab(hexToRgb(hex)))
};

/** The fill for a score on the −2.5 to +2.5 scale (FR-10). */
export function fill(score: number, theme: Theme): string {
	const stops = STOPS[theme];
	const t = (Math.min(2.5, Math.max(-2.5, score)) + 2.5) / 5;
	const x = t * (stops.length - 1);
	const i = Math.min(stops.length - 2, Math.floor(x));
	const f = x - i;
	const [a, b] = [stops[i], stops[i + 1]];
	return rgbToHex(oklabToRgb([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f) as Lab));
}

/**
 * A fingerprint's difference from the global mean (FR-30) takes the same colours spread over
 * ±1.5 instead of ±2.5, clamped beyond: 99% of differences lie within (decision 46). Blue is more
 * appropriate than the global average, orange less.
 */
export const DEVIATION_MAX = 1.5;

/** The score on the ±2.5 palette that shows a difference. */
export function deviationScore(difference: number): number {
	return (Math.max(-DEVIATION_MAX, Math.min(DEVIATION_MAX, difference)) / DEVIATION_MAX) * 2.5;
}

/**
 * A difference between the two surveys (FR-50, decision 69): the diverging scale's ends, blue for
 * judged more appropriate in 2023–2024 and orange for less, when beyond the interval. Within it the
 * arrow takes the 3:1 outline colour (--border-strong in app.css), copied here for the check.
 */
export const DIRECTION_COLOR: Record<Theme, { more: string; less: string; within: string }> = {
	light: { more: DIVERGING.light[6], less: DIVERGING.light[0], within: '#7d8792' },
	dark: { more: DIVERGING.dark[6], less: DIVERGING.dark[0], within: '#6b7680' }
};

/** WCAG relative luminance. */
export function luminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex).map(toLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two colours. */
export function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** The ink for marks on a fill: dark or light, whichever contrasts more. */
export function ink(background: string, theme: Theme): string {
	const { dark, light } = INK[theme];
	return contrast(background, dark) >= contrast(background, light) ? dark : light;
}

/**
 * CSS custom properties carrying a score's fill and ink for both themes, so the page switches
 * theme without redrawing: `--fill` and `--ink` resolve in app.css.
 */
export function scoreStyle(score: number): string {
	const light = fill(score, 'light');
	const dark = fill(score, 'dark');
	return (
		`--fill-light:${light};--fill-dark:${dark};` +
		`--ink-light:${ink(light, 'light')};--ink-dark:${ink(dark, 'dark')}`
	);
}

/** The fill and ink for a fingerprint's difference (FR-30, decision 46). */
export function deviationStyle(difference: number): string {
	return scoreStyle(deviationScore(difference));
}

/** The same for a region's colour (FR-21). */
export function regionStyle(region: Region): string {
	return `--region-light:${REGION_COLOR.light[region]};--region-dark:${REGION_COLOR.dark[region]}`;
}

/** The arrows' colours for both themes; `--more` and `--less` resolve in app.css. */
export function directionStyle(): string {
	const { light, dark } = DIRECTION_COLOR;
	return (
		`--more-light:${light.more};--more-dark:${dark.more};` +
		`--less-light:${light.less};--less-dark:${dark.less}`
	);
}
