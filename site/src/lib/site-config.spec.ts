import { describe, expect, it } from 'vitest';
import { DEFAULT_BASE_PATH, normalizeBasePath, parseSwitch } from '../../site.config.js';
import { attribution } from './attribution';

describe('HR-1: base path from config', () => {
	it('defaults to the case-sensitive repository path', () => {
		expect(DEFAULT_BASE_PATH).toBe('/EtiquetteAtlas');
	});

	it.each([
		['/EtiquetteAtlas', '/EtiquetteAtlas'],
		['/EtiquetteAtlas/', '/EtiquetteAtlas'],
		[' /etiquette-atlas// ', '/etiquette-atlas'],
		['', ''],
		['/', '']
	])('normalizes %j to %j', (value, expected) => {
		expect(normalizeBasePath(value)).toBe(expected);
	});

	it.each(['EtiquetteAtlas', '//cdn.example.org', '/two words'])('rejects %j', (value) => {
		expect(() => normalizeBasePath(value)).toThrow(/BASE_PATH/);
	});
});

describe('R-6: the change module switch (decision 75)', () => {
	it.each([
		[undefined, true],
		['', true],
		['on', true],
		[' OFF ', false],
		['off', false]
	])('reads %j as %j', (value, expected) => {
		expect(parseSwitch(value)).toBe(expected);
	});

	it('rejects anything else, so a typo cannot ship the wrong build', () => {
		expect(() => parseSwitch('no')).toThrow(/CHANGE_MODULE/);
	});
});

describe('NFR-40: attribution', () => {
	it('names authors, title, year, OSF data, licence and the atlas note', () => {
		expect(attribution.authors).toContain('Eriksson');
		expect(attribution.title).toMatch(/^Everyday norms/);
		expect(attribution.year).toBe(2025);
		expect(attribution.dataUrl).toBe('https://doi.org/10.17605/OSF.IO/SH4RB');
		expect(attribution.license).toBe('CC BY 4.0');
		expect(attribution.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
		expect(attribution.note).toMatch(/aggregated and modelled by The Etiquette Atlas/);
	});

	it('credits the 2000–2003 comparison data (NFR-41)', () => {
		expect(attribution.comparison).toMatch(/^Gelfand et al\. \(2011\)/);
	});
});
