import { describe, expect, it } from 'vitest';
import { REGIONS } from '../data/model';
import {
	DEVIATION_MAX,
	DIRECTION_COLOR,
	DIVERGING,
	INK,
	MARK_INK,
	REGION_COLOR,
	REGION_SHAPE,
	SURFACES,
	contrast,
	deviationScore,
	deviationStyle,
	difference,
	directionStyle,
	fill,
	ink,
	scoreStyle,
	type Theme
} from './colors';

const THEMES: Theme[] = ['light', 'dark'];
const scores = Array.from({ length: 101 }, (_, i) => -2.5 + i * 0.05);

describe('NFR-12: contrast of chart colours', () => {
	it('passes WCAG reference values', () => {
		expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
	});

	it.each(THEMES)('%s: marks drawn on any fill reach 4:1 with the chosen ink', (theme) => {
		const worst = Math.min(
			...scores.map((x) => contrast(fill(x, theme), ink(fill(x, theme), theme)))
		);
		expect(worst).toBeGreaterThanOrEqual(4);
	});

	it.each(THEMES)(
		'%s: D-25: marks in the text ink with a page-coloured halo stand out on any fill (3:1)',
		(theme) => {
			const { ink: mark, halo } = MARK_INK[theme];
			const worst = Math.min(
				...scores.map((x) =>
					Math.max(contrast(mark, fill(x, theme)), contrast(halo, fill(x, theme)))
				)
			);
			expect(worst).toBeGreaterThanOrEqual(3);
			expect(SURFACES[theme][0]).toBe(halo);
		}
	);

	it.each(THEMES)('%s: region colours reach 3:1 against both page surfaces', (theme) => {
		for (const region of REGIONS) {
			for (const surface of SURFACES[theme]) {
				expect(contrast(REGION_COLOR[theme][region], surface)).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it.each(THEMES)(
		'%s: the change arrows reach 3:1 against both page surfaces (decision 69)',
		(theme) => {
			for (const colour of Object.values(DIRECTION_COLOR[theme])) {
				for (const surface of SURFACES[theme]) {
					expect(contrast(colour, surface)).toBeGreaterThanOrEqual(3);
				}
			}
			expect(directionStyle()).toContain(`--more-${theme}:${DIVERGING[theme][6]}`);
			expect(directionStyle()).toContain(`--less-${theme}:${DIVERGING[theme][0]}`);
		}
	);

	it.each(THEMES)('%s: inks read on the page as text (4.5:1)', (theme) => {
		const text = theme === 'light' ? INK.light.dark : INK.dark.light;
		for (const surface of SURFACES[theme]) expect(contrast(text, surface)).toBeGreaterThan(4.5);
	});
});

describe('FR-10, §6.4: the diverging scale', () => {
	it.each(THEMES)(
		'%s: direction A: the neutral midpoint stays apart from every page surface',
		(theme) => {
			for (const surface of SURFACES[theme]) {
				expect(difference(fill(0, theme), surface)).toBeGreaterThanOrEqual(0.03);
			}
		}
	);

	it.each(THEMES)('%s: hits its stops and is neutral at the midpoint', (theme) => {
		expect(fill(-2.5, theme)).toBe(DIVERGING[theme][0]);
		expect(fill(0, theme)).toBe(DIVERGING[theme][3]);
		expect(fill(2.5, theme)).toBe(DIVERGING[theme][6]);
		expect(fill(9, theme)).toBe(DIVERGING[theme][6]);
	});

	it('is orange below 0 and blue above it', () => {
		const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
		const [r1, , b1] = rgb(fill(-1.5, 'light'));
		const [r2, , b2] = rgb(fill(1.5, 'light'));
		expect(r1).toBeGreaterThan(b1);
		expect(b2).toBeGreaterThan(r2);
	});

	it('carries both themes in CSS custom properties', () => {
		expect(scoreStyle(0)).toBe(
			'--fill-light:#e2e2e2;--fill-dark:#3a3d43;--ink-light:#22201c;--ink-dark:#ffffff'
		);
	});
});

describe('FR-30, decision 46: the fingerprint’s difference scale', () => {
	it('spreads ±1.5 over the same colours, neutral at 0 and clamped beyond', () => {
		expect(DEVIATION_MAX).toBe(1.5);
		expect(deviationScore(0)).toBe(0);
		expect(deviationScore(0.75)).toBeCloseTo(1.25);
		expect(deviationScore(-1.5)).toBe(-2.5);
		expect(deviationScore(2.6)).toBe(2.5);
		expect(deviationStyle(0)).toBe(scoreStyle(0));
		expect(deviationStyle(-3)).toBe(scoreStyle(-2.5));
	});
});

describe('§6.4: regions are told apart by shape as well as colour', () => {
	it('gives each region its own shape', () => {
		expect(new Set(REGIONS.map((r) => REGION_SHAPE[r])).size).toBe(4);
	});
});
