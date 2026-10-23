// AT-12, FR-73, FR-52, §6.5 (decision 100): an automated pass over the words the site shows, in
// every built page and in the JavaScript that writes text in the browser. It fails on
// - causal wording ("because", "due to", "leads to", …): the atlas describes differences, never
//   their causes;
// - a society's people named by nationality ("Chileans", "the Japanese") instead of "respondents
//   in Chile";
// - change in individuals ("became more permissive", "changed their views") for differences
//   between two surveys.
// A short allowlist keeps the method page's explanations of the method itself, each with a reason.
// The page-by-page reading list for the manual review is in docs/launch.md.

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { attribution, audienceCredit } from '../src/lib/attribution.ts';

const root = resolve(import.meta.dirname, '..', 'build');

const CAUSAL =
	/\b(because|due to|caused|causes|causing|leads? to|led to|results? in|as a result of|driven by|thanks to|owing to|explains? why|is why|the reason|attributable to|stems? from)\b/gi;
const CHANGE =
	/\b(became|become|becoming) (more|less|stricter|looser)\b|\bchanged (their|its) (views|norms|minds?)\b/gi;
// The 90 societies' nationality nouns (plural, or "the" + adjective) that the text must avoid.
// Adjectives alone stay allowed: they name languages ("Japanese", "French").
const NATIONALITY = new RegExp(
	`\\b(${[
		'Argentin(e|ian)s',
		'Armenians',
		'Australians',
		'Azerbaijanis',
		'Beninese people',
		'Bangladeshis',
		'Bulgarians',
		'Bosnians',
		'Bolivians',
		'Brazilians',
		'Central Africans',
		'Canadians',
		'Chileans',
		'Chinese people',
		'Cameroonians',
		'Congolese people',
		'Colombians',
		'Costa Ricans',
		'Cubans',
		'Czechs',
		'Germans',
		'Danes',
		'Algerians',
		'Spaniards',
		'Estonians',
		'Ethiopians',
		'Finns',
		'Frenchmen',
		'Britons',
		'Brits',
		'Georgians',
		'Gibraltarians',
		'Greeks',
		'Guatemalans',
		'Hondurans',
		'Croats',
		'Croatians',
		'Hungarians',
		'Indians',
		'Irish people',
		'Iranians',
		'Icelanders',
		'Israelis',
		'Italians',
		'Japanese people',
		'Kazakhs',
		'Kazakhstanis',
		'Koreans',
		'Kuwaitis',
		'Sri Lankans',
		'Lithuanians',
		'Latvians',
		'Moroccans',
		'Moldovans',
		'Mexicans',
		'Macedonians',
		'Maltese people',
		'Mongolians',
		'Mozambicans',
		'Martinicans',
		'Mauritians',
		'Malaysians',
		'Namibians',
		'Nigerians',
		'Dutch people',
		'New Zealanders',
		'Pakistanis',
		'Peruvians',
		'Filipinos',
		'Poles',
		'Portuguese people',
		'Romanians',
		'Russians',
		'Rwandans',
		'Saudis',
		'Singaporeans',
		'Salvadorans',
		'Somalilanders',
		'Serbs',
		'Serbians',
		'Slovaks',
		'Slovenians',
		'Slovenes',
		'Swedes',
		'Chadians',
		'Caribbean people',
		'Turks',
		'Taiwanese people',
		'Uruguayans',
		'Americans',
		'Vietnamese people',
		'Kosovars',
		'Yemenis',
		'Zambians',
		'Zimbabweans',
		'[Tt]he (Japanese|French|Chinese|Dutch|Irish|Portuguese|Vietnamese|Taiwanese|British|Swiss|Maltese)(?! (survey|language|version))'
	].join('|')})\\b`,
	'g'
);

/**
 * Sentences allowed to match, with why. Each entry is a fragment of the matching sentence, so a
 * new causal sentence elsewhere still fails.
 */
const ALLOWED = [
	// The method page states the wording rule itself, quoting the word to avoid (§6.5): "That is
	// why the atlas speaks of "respondents in Chile" rather than "Chileans"".
	['rather than "Chileans"', 'quotes the word the rule avoids'],
	['That is why the atlas speaks of', 'explains the wording rule, not a difference']
];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

/**
 * Line breaks inside a text are only layout, as in HTML: a phrase wrapped across two lines ("is
 * why") must still match, so whitespace collapses to one space. A newline then separates only
 * the texts joined below, which `sentence` treats as ends.
 */
const flat = (/** @type {string} */ text) => text.replace(/\\[nt]/g, ' ').replace(/\s+/g, ' ');

/** The words a page shows, and its meta descriptions and alt texts, without markup. */
function pageText(/** @type {string} */ html) {
	const attributes = [...html.matchAll(/\b(?:content|alt|aria-label|title)="([^"]*)"/g)].map(
		([, value]) => value
	);
	const body = html
		.replace(/<script\b[\s\S]*?<\/script>/g, ' ')
		.replace(/<style\b[\s\S]*?<\/style>/g, ' ')
		.replace(/<[^>]+>/g, ' ');
	return [body, ...attributes].map(flat).join(' \n ');
}

/** Template and string literals in a script, where its visible text lives. */
function scriptText(/** @type {string} */ js) {
	return [...js.matchAll(/`((?:[^`\\]|\\.)*)`|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)]
		.map((m) => m[1] ?? m[2] ?? m[3] ?? '')
		.map(flat)
		.filter((s) => /[a-z] [a-z]/i.test(s))
		.join(' \n ');
}

// Cited titles are the papers' words, not the atlas's: the GSN paper's title says norms "have
// become more permissive".
const CITED = [attribution.title, audienceCredit.title];

const uncited = (/** @type {string} */ text) =>
	CITED.reduce((t, title) => t.split(title).join(' '), text);

const decode = (/** @type {string} */ text) =>
	text
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ');

/** The sentence around a match, for the report and the allowlist. */
function sentence(/** @type {string} */ text, /** @type {number} */ at) {
	const start = Math.max(text.lastIndexOf('. ', at), text.lastIndexOf('\n', at)) + 1;
	const stops = [text.indexOf('. ', at), text.indexOf('\n', at)].filter((i) => i >= 0);
	const end = stops.length ? Math.min(...stops) + 1 : text.length;
	return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

const problems = new Map();
let pages = 0;
let scripts = 0;
for (const path of walk(root)) {
	const file = relative(root, path).split(sep).join('/');
	let text;
	if (file.endsWith('.html')) {
		text = uncited(decode(pageText(readFileSync(path, 'utf8'))));
		pages += 1;
	} else if (file.endsWith('.js')) {
		text = uncited(scriptText(readFileSync(path, 'utf8')));
		scripts += 1;
	} else continue;
	for (const [rule, pattern] of [
		['FR-73 causal wording', CAUSAL],
		['§6.5 nationality noun', NATIONALITY],
		['FR-52 change in individuals', CHANGE]
	]) {
		for (const match of text.matchAll(/** @type {RegExp} */ (pattern))) {
			const found = sentence(text, match.index ?? 0);
			if (ALLOWED.some(([fragment]) => found.includes(fragment))) continue;
			const key = `${rule}: "${match[0]}" in “${found.slice(0, 160)}”`;
			problems.set(key, [...(problems.get(key) ?? []), file]);
		}
	}
}

if (problems.size) {
	for (const [problem, files] of problems) {
		const where =
			files.length > 3
				? `${files.slice(0, 3).join(', ')} and ${files.length - 3} more`
				: files.join(', ');
		console.error(`FAIL ${problem} (${where})`);
	}
	process.exit(1);
}
console.log(
	`check-content: ok, ${pages} pages and ${scripts} scripts with no causal wording, no nationality ` +
		'nouns and no change in individuals (AT-12)'
);
