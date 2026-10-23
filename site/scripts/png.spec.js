import { crc32, deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decode, quantize } from './png.js';

/** An RGB PNG, every row with filter type 1 (Sub), as Chromium may write it. */
function rgbPng(
	/** @type {number} */ width,
	/** @type {number} */ height,
	/** @type {(x: number, y: number) => number} */ colour
) {
	const rows = Buffer.alloc(height * (width * 3 + 1));
	for (let y = 0; y < height; y++) {
		const at = y * (width * 3 + 1);
		rows[at] = 1;
		let previous = [0, 0, 0];
		for (let x = 0; x < width; x++) {
			const c = colour(x, y);
			const rgb = [c >> 16, (c >> 8) & 255, c & 255];
			rgb.forEach((v, k) => (rows[at + 1 + x * 3 + k] = (v - previous[k]) & 255));
			previous = rgb;
		}
	}
	const chunk = (/** @type {string} */ type, /** @type {Buffer} */ data) => {
		const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const out = Buffer.alloc(12 + data.length);
		out.writeUInt32BE(data.length, 0);
		body.copy(out, 4);
		out.writeUInt32BE(crc32(body) >>> 0, 8 + data.length);
		return out;
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 2;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(rows)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

describe('decision 92: share images rewritten with a 256-colour palette', () => {
	it('keeps an image of 256 colours or fewer exactly', () => {
		const png = rgbPng(64, 40, (x, y) => (((x % 16) * 16) << 16) | (((y % 16) * 16) << 8) | 0x80);
		const { png: indexed, worst, shifted } = quantize(png);
		expect(indexed[25]).toBe(3);
		expect(Array.from(decode(indexed).pixels)).toEqual(Array.from(decode(png).pixels));
		expect(worst).toBe(0);
		expect(shifted).toBe(0);
	});

	it('keeps flat colours exactly and moves edge shades only a little', () => {
		// Two flat fills and a white background, with a 600-shade grey ramp between them.
		const png = rgbPng(600, 60, (x, y) =>
			y < 20
				? 0x1d5a99
				: y < 40
					? 0xa3480b
					: y < 50
						? 0xffffff
						: Math.round((x * 255) / 599) * 0x010101
		);
		const { png: indexed, worst, shifted } = quantize(png);
		const before = decode(png).pixels;
		const after = decode(indexed).pixels;
		for (const i of [0, 30 * 600 + 7, 45 * 600 + 300]) expect(after[i]).toBe(before[i]);
		expect(worst).toBeLessThan(16);
		expect(shifted).toBe(0);
	});

	it('refuses PNGs it cannot read', () => {
		expect(() => decode(Buffer.from('not a png'))).toThrow('not a PNG');
	});
});
