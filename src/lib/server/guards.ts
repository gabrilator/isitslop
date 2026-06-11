// Sanity guards that run before any scanner (and especially before the LLM
// call): the endpoint should only spend tokens on things that look like prose.

const MAX_CHARS = 12_000; // 1000 words comfortably fits; megabyte bodies do not
const MIN_LETTER_RATIO = 0.55; // normal EN/ES prose sits around 0.75–0.85
const MIN_UNIQUE_RATIO = 0.15; // "spam spam spam …" detector
const MAX_AVG_WORD_LEN = 14; // base64 / minified-code detector

/** Returns a rejection reason, or null when the text looks like natural prose. */
export function textSanity(text: string): string | null {
	if (text.length > MAX_CHARS) {
		return `Text too large (max ${MAX_CHARS.toLocaleString('en-US')} characters).`;
	}
	const letters = (text.match(/\p{L}/gu) ?? []).length;
	if (letters / text.length < MIN_LETTER_RATIO) {
		return 'Text does not look like natural prose.';
	}
	const words = text.toLowerCase().split(/\s+/u).filter(Boolean);
	if (words.length >= 50) {
		const unique = new Set(words).size;
		if (unique / words.length < MIN_UNIQUE_RATIO) {
			return 'Text looks repeated, not written.';
		}
	}
	const avg = words.reduce((a, w) => a + w.length, 0) / Math.max(words.length, 1);
	if (avg > MAX_AVG_WORD_LEN) {
		return 'Text does not look like natural prose.';
	}
	return null;
}
