// Shrinks a share image (decision 92) by rewriting Chromium's 24-bit PNG as an indexed one with
// at most 256 colours, without a dependency. The cards are flat fills, lines and antialiased text:
// the flat colours are kept exactly and the edge shades between them share the remaining palette
// entries. An image with 256 colours or fewer is kept exactly. About a third of the size, so 247
// images fit NFR-5's 60 MB with room to spare.

import { crc32, deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** @param {Buffer} png @returns {{ type: string, data: Buffer }[]} */
function chunks(png) {
	if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
	const out = [];
	for (let at = 8; at < png.length;) {
		const length = png.readUInt32BE(at);
		out.push({
			type: png.toString('ascii', at + 4, at + 8),
			data: png.subarray(at + 8, at + 8 + length)
		});
		at += 12 + length;
	}
	return out;
}

/** The Paeth predictor (PNG spec, filter type 4). */
function paeth(/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ c) {
	const pa = Math.abs(b - c);
	const pb = Math.abs(a - c);
	const pc = Math.abs(a + b - 2 * c);
	return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The value a row filter predicts from the left, upper and upper-left bytes. */
function predict(
	/** @type {number} */ filter,
	/** @type {number} */ a,
	/** @type {number} */ b,
	/** @type {number} */ c
) {
	switch (filter) {
		case 0:
			return 0;
		case 1:
			return a;
		case 2:
			return b;
		case 3:
			return (a + b) >> 1;
		case 4:
			return paeth(a, b, c);
		default:
			throw new Error(`unknown filter ${filter}`);
	}
}

/**
 * An 8-bit, non-interlaced RGB, RGBA or indexed PNG's pixels as 0xRRGGBB numbers; alpha must be
 * opaque.
 * @param {Buffer} png
 */
export function decode(png) {
	const parts = chunks(png);
	const header = parts.find((c) => c.type === 'IHDR')?.data;
	if (!header) throw new Error('no IHDR');
	const [width, height] = [header.readUInt32BE(0), header.readUInt32BE(4)];
	const [depth, type, interlace] = [header[8], header[9], header[12]];
	if (depth !== 8 || ![2, 3, 6].includes(type) || interlace !== 0) {
		throw new Error(`unsupported PNG: depth ${depth}, colour type ${type}, interlace ${interlace}`);
	}
	const plte = parts.find((c) => c.type === 'PLTE')?.data;
	const bpp = type === 6 ? 4 : type === 3 ? 1 : 3;
	const stride = width * bpp;
	const raw = inflateSync(Buffer.concat(parts.filter((c) => c.type === 'IDAT').map((c) => c.data)));
	const pixels = new Uint32Array(width * height);
	let previous = new Uint8Array(stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? line[x - bpp] : 0;
			const b = previous[x];
			const c = x >= bpp ? previous[x - bpp] : 0;
			line[x] = (line[x] + predict(filter, a, b, c)) & 255;
		}
		for (let x = 0; x < width; x++) {
			const i = x * bpp;
			if (bpp === 4 && line[i + 3] !== 255) throw new Error('transparent pixels');
			pixels[y * width + x] = plte
				? plte.readUIntBE(line[i] * 3, 3)
				: (line[i] << 16) | (line[i + 1] << 8) | line[i + 2];
		}
		previous = line;
	}
	return { width, height, pixels };
}

/** @param {string} type @param {Buffer} data */
function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body) >>> 0);
	return Buffer.concat([length, body, crc]);
}

const channels = (/** @type {number} */ c) => [c >> 16, (c >> 8) & 255, c & 255];

/**
 * Squared RGB distance, with a change of hue (channels moving apart) counting more than a change
 * of lightness (channels moving together), so a grey edge maps to a lighter or darker grey rather
 * than to a colour.
 */
function distance(/** @type {number} */ p, /** @type {number} */ q) {
	const dr = (p >> 16) - (q >> 16);
	const dg = ((p >> 8) & 255) - ((q >> 8) & 255);
	const db = (p & 255) - (q & 255);
	return dr * dr + dg * dg + db * db + 2 * ((dr - dg) ** 2 + (dg - db) ** 2 + (db - dr) ** 2);
}

/**
 * Median cut, weighted by pixel count: splits the box with the widest channel range at its
 * weighted median until there are `boxes` boxes, each drawn as its weighted mean colour.
 * @param {[number, number][]} colours colour and count
 * @param {number} boxes
 * @returns {number[]}
 */
function medianCut(colours, boxes) {
	if (boxes <= 0 || colours.length === 0) return [];
	const range = (/** @type {[number, number][]} */ box) => {
		let best = { channel: 0, span: -1 };
		for (let k = 0; k < 3; k++) {
			const values = box.map(([c]) => channels(c)[k]);
			const span = Math.max(...values) - Math.min(...values);
			if (span > best.span) best = { channel: k, span };
		}
		return best;
	};
	const queue = [colours];
	while (queue.length < boxes) {
		let pick = -1;
		let widest = 0;
		queue.forEach((box, i) => {
			const { span } = range(box);
			if (box.length > 1 && span > widest) [pick, widest] = [i, span];
		});
		if (pick < 0) break;
		const box = queue[pick];
		const { channel } = range(box);
		box.sort((a, b) => channels(a[0])[channel] - channels(b[0])[channel] || a[0] - b[0]);
		const total = box.reduce((sum, [, n]) => sum + n, 0);
		let cut = 1;
		for (let i = 0, seen = 0; i < box.length - 1; i++) {
			seen += box[i][1];
			if (seen >= total / 2) {
				cut = i + 1;
				break;
			}
		}
		queue.splice(pick, 1, box.slice(0, cut), box.slice(cut));
	}
	return queue.map((box) => {
		const total = box.reduce((sum, [, n]) => sum + n, 0);
		const mean = [0, 1, 2].map((k) =>
			Math.round(box.reduce((sum, [c, n]) => sum + channels(c)[k] * n, 0) / total)
		);
		return (mean[0] << 16) | (mean[1] << 8) | mean[2];
	});
}

/** Colours covering at least this many pixels are flat fills, lines or text, kept exactly. */
const FLAT = 40;

/**
 * The image as an indexed PNG of at most 256 colours: the flat colours exactly, and the edge
 * shades between them by a median cut of the rest; every pixel takes the nearest palette colour.
 * Returns the PNG with how far any channel moved and the share of pixels whose hue moved.
 * @param {Buffer} png
 */
export function quantize(png) {
	const { width, height, pixels } = decode(png);
	/** @type {Map<number, number>} */
	const counts = new Map();
	for (const p of pixels) counts.set(p, (counts.get(p) ?? 0) + 1);
	// Most frequent first; ties by colour, so the same image always gives the same palette.
	const all = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
	const flat = all.length <= 256 ? all : all.filter(([, n]) => n >= FLAT).slice(0, 192);
	const rest = all.slice(flat.length);
	const palette = [...flat.map(([c]) => c), ...medianCut(rest, 256 - flat.length)];
	/** @type {Map<number, number>} */
	const index = new Map();
	for (const colour of counts.keys()) {
		let best = 0;
		for (let i = 1; i < palette.length; i++) {
			if (distance(colour, palette[i]) < distance(colour, palette[best])) best = i;
		}
		index.set(colour, best);
	}
	// How far the replaced colours moved: the largest change in any channel, and the share of
	// pixels whose hue moved by more than 24 levels (channels moving apart).
	let worst = 0;
	let shifted = 0;
	for (const [colour, n] of counts) {
		const before = channels(colour);
		const after = channels(palette[/** @type {number} */ (index.get(colour))]);
		const d = before.map((v, k) => v - after[k]);
		worst = Math.max(worst, ...d.map(Math.abs));
		if (Math.max(...d) - Math.min(...d) > 24) shifted += n;
	}
	// Filter type 0 on every row, as the PNG spec recommends for indexed images.
	const rows = Buffer.alloc(height * (width + 1));
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			rows[y * (width + 1) + 1 + x] = /** @type {number} */ (index.get(pixels[y * width + x]));
		}
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 3; // indexed colour
	const plte = Buffer.alloc(palette.length * 3);
	palette.forEach((colour, i) => plte.writeUIntBE(colour, i * 3, 3));
	const out = Buffer.concat([
		SIGNATURE,
		chunk('IHDR', header),
		chunk('PLTE', plte),
		chunk('IDAT', deflateSync(rows, { level: 9, memLevel: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
	return { png: out, worst, shifted: shifted / pixels.length };
}
