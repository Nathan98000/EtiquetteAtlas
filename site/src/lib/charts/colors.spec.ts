import { describe, expect, it } from 'vitest';
import { REGIONS } from '../data/model';
import {
	DIVERGING,
	INK,
	REGION_COLOR,
	REGION_SHAPE,
	SURFACES,
	contrast,
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

	it.each(THEMES)('%s: region colours reach 3:1 against both page surfaces', (theme) => {
		for (const region of REGIONS) {
			for (const surface of SURFACES[theme]) {
				expect(contrast(REGION_COLOR[theme][region], surface)).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it.each(THEMES)('%s: inks read on the page as text (4.5:1)', (theme) => {
		const text = theme === 'light' ? INK.light.dark : INK.dark.light;
		for (const surface of SURFACES[theme]) expect(contrast(text, surface)).toBeGreaterThan(4.5);
	});
});

describe('FR-10, §6.4: the diverging scale', () => {
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
			'--fill-light:#f1eeea;--fill-dark:#2e3238;--ink-light:#1d2329;--ink-dark:#f2f4f6'
		);
	});
});

describe('§6.4: regions are told apart by shape as well as colour', () => {
	it('gives each region its own shape', () => {
		expect(new Set(REGIONS.map((r) => REGION_SHAPE[r])).size).toBe(4);
	});
});
