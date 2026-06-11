import type { Flag, Language } from '$lib/types';
import { JARGON_EN } from '$lib/rules/jargon.en';
import { JARGON_ES } from '$lib/rules/jargon.es';
import { CLICHE_OPENERS_EN, CLICHE_OPENERS_ES } from '$lib/rules/clichesOpeners';
import { DELVE_FAMILY_EN, DELVE_FAMILY_ES } from '$lib/rules/delveFamily';
import { AI_VERBS_EN, AI_VERBS_ES } from '$lib/rules/aiVerbs';
import { VAGUE_INTENSIFIERS_EN, VAGUE_INTENSIFIERS_ES } from '$lib/rules/vagueIntensifiers';
import { TRANSITION_STARTERS_EN, TRANSITION_STARTERS_ES } from '$lib/rules/transitionStarters';
import { FRAGMENT_QUESTIONS_EN, FRAGMENT_QUESTIONS_ES } from '$lib/rules/fragmentQuestions';
import {
	CHAT_OPENERS_EN,
	CHAT_OPENERS_ES,
	CHAT_CLOSERS_EN,
	CHAT_CLOSERS_ES,
	SYCOPHANCY_EN,
	SYCOPHANCY_ES
} from '$lib/rules/chatRemnants';
import { AI_DISCLAIMERS_EN, AI_DISCLAIMERS_ES } from '$lib/rules/aiDisclaimers';
import { HEDGES_EN, HEDGES_ES } from '$lib/rules/hedges';
import { CONCLUSION_CLOSERS_EN, CONCLUSION_CLOSERS_ES } from '$lib/rules/conclusionClosers';
import { PARTICIPIAL_GERUNDS_EN, PARTICIPIAL_GERUNDS_ES } from '$lib/rules/participialComments';
import { reinhartFlags } from '$lib/rules/reinhart';

const RX_ESCAPE = /[.*+?^${}()|[\]\\]/g;
function escapeRx(s: string): string {
	return s.replace(RX_ESCAPE, '\\$&');
}

interface Hit {
	start: number;
	end: number;
	excerpt: string;
}

function findPhrase(text: string, phrase: string, caseInsensitive = true): Hit[] {
	const flags = caseInsensitive ? 'giu' : 'gu';
	const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRx(phrase)}(?![\\p{L}\\p{N}])`, flags);
	const out: Hit[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		out.push({ start: m.index, end: m.index + m[0].length, excerpt: m[0] });
		if (m.index === re.lastIndex) re.lastIndex++;
	}
	return out;
}

function inflectedPatternEn(word: string): string {
	if (word.includes(' ') || word.includes('-')) return escapeRx(word);
	if (word.length < 3) return escapeRx(word);
	if (/[^a-zA-Z]/.test(word)) return escapeRx(word);
	const alts: string[] = [escapeRx(word)];
	if (word.endsWith('y') && word.length >= 4) {
		const yStem = word.slice(0, -1);
		alts.push(`${escapeRx(yStem)}ies`, `${escapeRx(yStem)}ied`, `${escapeRx(yStem)}ying`);
	} else {
		const stem = word.endsWith('e') ? word.slice(0, -1) : word;
		alts.push(`${escapeRx(word)}s`, `${escapeRx(stem)}ed`, `${escapeRx(stem)}ing`);
		if (!word.endsWith('e') && /[sxz]$|sh$|ch$/.test(word)) alts.push(`${escapeRx(word)}es`);
	}
	return alts.join('|');
}

function findPhraseInflectedEn(text: string, phrase: string): Hit[] {
	const pattern = inflectedPatternEn(phrase);
	const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'giu');
	const out: Hit[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		out.push({ start: m.index, end: m.index + m[0].length, excerpt: m[0] });
		if (m.index === re.lastIndex) re.lastIndex++;
	}
	return out;
}

function dashesEn(text: string): Flag[] {
	const flags: Flag[] = [];
	const re = /[—–]/g;
	const numericLike = /[\d$€£¥%]/;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		let i = m.index - 1;
		while (i >= 0 && text[i] === ' ') i--;
		const before = i >= 0 ? text[i] : '';
		let j = m.index + 1;
		while (j < text.length && text[j] === ' ') j++;
		const after = j < text.length ? text[j] : '';
		if (numericLike.test(before) && numericLike.test(after)) continue;
		flags.push({
			ruleId: 'em-dash',
			severity: 'red',
			startIndex: m.index,
			endIndex: m.index + 1,
			excerpt: m[0],
			explanation: 'Em/en-dash is a common AI tell when used repeatedly.'
		});
	}
	return flags;
}

function clicheOpeners(text: string, list: string[]): Flag[] {
	const head = text.slice(0, 400);
	const flags: Flag[] = [];
	for (const phrase of list) {
		for (const hit of findPhrase(head, phrase)) {
			flags.push({
				ruleId: 'cliche-opener',
				severity: 'red',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation: 'Cliché opening phrase associated with AI prose.'
			});
		}
	}
	return flags;
}

function transitionCommas(text: string, list: string[]): Flag[] {
	const flags: Flag[] = [];
	for (const word of list) {
		const re = new RegExp(`(^|[.!?¡¿]\\s+|\\n+)(${escapeRx(word)}),`, 'gu');
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			const start = m.index + m[1].length;
			const end = start + m[2].length + 1;
			flags.push({
				ruleId: 'transition-comma',
				severity: 'red',
				startIndex: start,
				endIndex: end,
				excerpt: text.slice(start, end),
				explanation: `Sentence-starting "${word}," is overused in AI prose.`
			});
		}
	}
	return flags;
}

function fragmentQuestions(text: string, list: string[]): Flag[] {
	const flags: Flag[] = [];
	for (const phrase of list) {
		const re = new RegExp(escapeRx(phrase), 'giu');
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			flags.push({
				ruleId: 'fragment-question',
				severity: 'red',
				startIndex: m.index,
				endIndex: m.index + m[0].length,
				excerpt: m[0],
				explanation: 'Fragment-question reveal — classic AI rhetorical tic.'
			});
		}
	}
	return flags;
}

function jargon(text: string, list: string[], language: Language): Flag[] {
	const flags: Flag[] = [];
	const finder = language === 'en' ? findPhraseInflectedEn : findPhrase;
	for (const phrase of list) {
		for (const hit of finder(text, phrase)) {
			flags.push({
				ruleId: 'jargon',
				severity: 'yellow',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation: 'Corporate jargon. Prefer a concrete verb or noun.'
			});
		}
	}
	return flags;
}

function delveFamily(text: string, list: string[], language: Language): Flag[] {
	const flags: Flag[] = [];
	const finder = language === 'en' ? findPhraseInflectedEn : findPhrase;
	for (const phrase of list) {
		for (const hit of finder(text, phrase)) {
			flags.push({
				ruleId: 'delve-family',
				severity: 'yellow',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation: 'Vague "exploration" verb — say what you actually do.'
			});
		}
	}
	return flags;
}

function aiVerbs(text: string, list: string[], language: Language): Flag[] {
	const flags: Flag[] = [];
	const finder = language === 'en' ? findPhraseInflectedEn : findPhrase;
	for (const phrase of list) {
		for (const hit of finder(text, phrase)) {
			flags.push({
				ruleId: 'ai-verb',
				severity: 'yellow',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation: 'High-AI-frequency verb. Try a plainer alternative.'
			});
		}
	}
	return flags;
}

function vagueIntensifiers(text: string, list: string[]): Flag[] {
	const flags: Flag[] = [];
	for (const phrase of list) {
		for (const hit of findPhrase(text, phrase)) {
			flags.push({
				ruleId: 'vague-intensifier',
				severity: 'yellow',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation: 'Vague intensifier — adds no information.'
			});
		}
	}
	return flags;
}

const ADVERB_FALSE_POSITIVES_EN = new Set([
	'only',
	'family',
	'apply',
	'reply',
	'rely',
	'comply',
	'supply',
	'imply',
	'multiply',
	'fly',
	'try',
	'cry',
	'dry',
	'why',
	'shy',
	'sly',
	'ply',
	'ally',
	'rally',
	'jolly',
	'silly',
	'hilly',
	'lily',
	'belly',
	'jelly',
	'gully',
	'bully',
	'fully',
	'pulley',
	'gallery',
	'early'
]);

function adverbs(text: string, language: Language): { flags: Flag[]; count: number; totalWords: number } {
	const re = language === 'es' ? /\p{L}+mente\b/giu : /\b[a-zA-Z]+ly\b/g;
	const flags: Flag[] = [];
	let m: RegExpExecArray | null;
	let count = 0;
	while ((m = re.exec(text)) !== null) {
		const word = m[0];
		if (language === 'en' && ADVERB_FALSE_POSITIVES_EN.has(word.toLowerCase())) continue;
		if (word.length < 5) continue;
		count++;
		flags.push({
			ruleId: 'adverb',
			severity: 'yellow',
			startIndex: m.index,
			endIndex: m.index + word.length,
			excerpt: word,
			explanation: language === 'es' ? 'Adverbio en -mente.' : '-ly adverb.'
		});
	}
	if (flags.length >= 4) {
		const clusterNote =
			language === 'es'
				? 'Muchos adverbios juntos — pueden sonar tímidos o evasivos.'
				: 'Many adverbs cluster — can sound timid or evasive.';
		for (const f of flags) f.explanation = clusterNote;
	}
	const totalWords = text.split(/\s+/u).filter(Boolean).length;
	return { flags, count, totalWords };
}

const IRREGULAR_PAST_PARTICIPLES_EN = [
	'done', 'seen', 'made', 'gone', 'taken', 'given', 'written', 'known', 'shown',
	'grown', 'drawn', 'built', 'sold', 'told', 'held', 'paid', 'bought', 'brought',
	'caught', 'taught', 'thought', 'kept', 'left', 'lost', 'sent', 'spent', 'read',
	'hit', 'cut', 'put', 'set', 'let', 'shut', 'split', 'spread', 'hurt', 'cost',
	'fit', 'quit', 'bet', 'burst', 'beat', 'beaten', 'found', 'hidden', 'broken',
	'chosen', 'frozen', 'stolen', 'eaten', 'sworn', 'torn', 'worn', 'swum', 'sung',
	'rung', 'drunk', 'sunk', 'begun', 'stuck', 'struck', 'dug', 'hung', 'swung',
	'fled', 'slept', 'dealt', 'meant', 'wept', 'swept', 'crept', 'felt', 'fed',
	'led', 'said', 'heard', 'understood', 'overcome', 'driven', 'ridden', 'risen',
	'thrown', 'blown', 'flown', 'spoken', 'awoken', 'forgotten', 'gotten', 'got',
	'sat', 'won', 'run', 'met', 'shot', 'lit', 'split'
];

function passiveVoice(text: string, language: Language): Flag[] {
	const flags: Flag[] = [];
	const re =
		language === 'es'
			? /\b(soy|eres|es|somos|sois|son|era|eras|éramos|eran|fui|fuiste|fue|fuimos|fueron|sido|siendo|seré|serás|será|seremos|serán)\s+\p{L}+(?:ado|ada|ados|adas|ido|ida|idos|idas)\b/giu
			: new RegExp(
					`\\b(am|is|are|was|were|be|been|being|gets|got|getting)\\s+([a-zA-Z]+(?:ed|en)|${IRREGULAR_PAST_PARTICIPLES_EN.join('|')})\\b`,
					'gi'
				);
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		flags.push({
			ruleId: 'passive',
			severity: 'yellow',
			startIndex: m.index,
			endIndex: m.index + m[0].length,
			excerpt: m[0],
			explanation: 'Passive voice — prefer an active subject when possible.'
		});
	}
	return flags;
}

function notXButY(text: string, language: Language): Flag[] {
	const flags: Flag[] = [];
	const re =
		language === 'es'
			? /\b(?:no\s+es|no\s+son|no\s+se\s+trata\s+de|no\s+somos|no\s+necesitamos)\b[^.!?]{3,150}[.!?]['"”’)\]]?\s+(?:Es|Son|Se\s+trata|Más\s+bien|Sino|En\s+realidad)\b[^.!?]{3,150}[.!?]/gu
			: /\b(?:isn't|aren't|wasn't|weren't|don't|doesn't|won't|can't|cannot|is\s+not|are\s+not)\b[^.!?]{3,150}[.!?]['"”’)\]]?\s+(?:It's|It\s+is|That's|That\s+is|We\s+|You\s+|They\s+|Instead,?\s|Rather,?\s)/gu;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		flags.push({
			ruleId: 'not-x-but-y',
			severity: 'red',
			startIndex: m.index,
			endIndex: m.index + m[0].length,
			excerpt: m[0].trimEnd(),
			explanation: 'Two-sentence "not X. Y" framing — a classic AI rhetorical move.'
		});
	}
	return flags;
}

function colonLabels(text: string): Flag[] {
	const re = /([A-Z][A-Za-z]{2,20}):(?=\s+\S)/g;
	const hits: Array<{ start: number; end: number; excerpt: string }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const start = m.index;
		let i = start - 1;
		while (i >= 0 && (text[i] === ' ' || text[i] === '\t')) i--;
		const ok = i < 0 || text[i] === '\n' || text[i] === '.' || text[i] === '!' || text[i] === '?';
		if (!ok) continue;
		const end = start + m[1].length + 1;
		hits.push({ start, end, excerpt: text.slice(start, end) });
	}
	if (hits.length < 2) return [];
	return hits.map((h) => ({
		ruleId: 'colon-labels',
		severity: 'yellow' as const,
		startIndex: h.start,
		endIndex: h.end,
		excerpt: h.excerpt,
		explanation: "Repeated 'Label:' headings — a parroted leadership-deck structure.",
		suggestion: 'Pick one structure or write it as a paragraph.'
	}));
}

const ARTIFACT_PATTERNS: RegExp[] = [
	/:contentReference\[[^\]]*\]\{[^}]*\}/g,
	/\boaicite\b/g,
	/\bturn\d+(?:search|view|news|image|fetch)\d+\b/g,
	/utm_source=chatgpt\.com/g,
	/\battributableIndex\b/g
];

function artifactResidue(text: string, language: Language): Flag[] {
	const explanation =
		language === 'es'
			? 'Artefacto literal de herramienta de IA pegado en el texto.'
			: 'Literal AI-tool artifact pasted in — a copy-paste fingerprint.';
	const flags: Flag[] = [];
	for (const re of ARTIFACT_PATTERNS) {
		re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			flags.push({
				ruleId: 'artifact-residue',
				severity: 'red',
				startIndex: m.index,
				endIndex: m.index + m[0].length,
				excerpt: m[0],
				explanation
			});
		}
	}
	return flags;
}

function chatRemnants(text: string, language: Language): Flag[] {
	const openers = language === 'es' ? CHAT_OPENERS_ES : CHAT_OPENERS_EN;
	const closers = language === 'es' ? CHAT_CLOSERS_ES : CHAT_CLOSERS_EN;
	const sycophancy = language === 'es' ? SYCOPHANCY_ES : SYCOPHANCY_EN;
	const explanation =
		language === 'es'
			? 'Frase de asistente de chat que quedó pegada en el texto.'
			: 'Chat-assistant phrasing left in the text.';
	const flags: Flag[] = [];
	const head = text.slice(0, 120);
	for (const phrase of openers) {
		for (const hit of findPhrase(head, phrase)) {
			flags.push({
				ruleId: 'chat-remnant',
				severity: 'red',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation
			});
		}
	}
	const tailStart = Math.max(0, text.length - 200);
	const tail = text.slice(tailStart);
	for (const phrase of closers) {
		for (const hit of findPhrase(tail, phrase)) {
			flags.push({
				ruleId: 'chat-remnant',
				severity: 'red',
				startIndex: tailStart + hit.start,
				endIndex: tailStart + hit.end,
				excerpt: hit.excerpt,
				explanation
			});
		}
	}
	for (const phrase of sycophancy) {
		for (const hit of findPhrase(text, phrase)) {
			flags.push({
				ruleId: 'chat-remnant',
				severity: 'red',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation
			});
		}
	}
	return flags;
}

function aiDisclaimers(text: string, language: Language): Flag[] {
	const list = language === 'es' ? AI_DISCLAIMERS_ES : AI_DISCLAIMERS_EN;
	const explanation =
		language === 'es'
			? 'El modelo hablando de sí mismo — declaración literal de IA.'
			: 'The model talking about itself — a literal AI disclaimer.';
	const flags: Flag[] = [];
	for (const phrase of list) {
		for (const hit of findPhrase(text, phrase)) {
			flags.push({
				ruleId: 'ai-disclaimer',
				severity: 'red',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation
			});
		}
	}
	return flags;
}

const PLACEHOLDER_RE =
	/\[\s*(?:insert|your|add|name|company|date|topic|city|product|tu|tus|su|inserta|insertar|agrega|nombre|empresa|fecha|tema|ciudad|producto)\b[^\]\n]{0,40}\]/giu;

function placeholderRemnants(text: string, language: Language): Flag[] {
	const explanation =
		language === 'es'
			? 'Marcador de plantilla sin completar.'
			: 'Unfilled template placeholder.';
	const flags: Flag[] = [];
	PLACEHOLDER_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
		flags.push({
			ruleId: 'placeholder-remnant',
			severity: 'red',
			startIndex: m.index,
			endIndex: m.index + m[0].length,
			excerpt: m[0],
			explanation
		});
	}
	return flags;
}

function hedges(text: string, language: Language): Flag[] {
	const list = language === 'es' ? HEDGES_ES : HEDGES_EN;
	const explanation =
		language === 'es'
			? 'Muletilla de relleno — andá directo al punto.'
			: 'Throat-clearing hedge — state the point directly.';
	const suggestion =
		language === 'es'
			? 'Cortala: la oración funciona sin eso.'
			: 'Cut it — the sentence works without it.';
	const flags: Flag[] = [];
	for (const phrase of list) {
		for (const hit of findPhrase(text, phrase)) {
			flags.push({
				ruleId: 'hedge',
				severity: 'yellow',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation,
				suggestion
			});
		}
	}
	return flags;
}

function participialComments(text: string, language: Language): Flag[] {
	const list = language === 'es' ? PARTICIPIAL_GERUNDS_ES : PARTICIPIAL_GERUNDS_EN;
	const explanation =
		language === 'es'
			? 'Gerundio colgado al final — análisis sin argumento.'
			: 'Bolted-on "-ing" comment clause — analysis without an argument.';
	const re = new RegExp(`,\\s+(${list.map(escapeRx).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
	const flags: Flag[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const start = m.index + m[0].length - m[1].length;
		flags.push({
			ruleId: 'participial-comment',
			severity: 'yellow',
			startIndex: start,
			endIndex: start + m[1].length,
			excerpt: m[1],
			explanation
		});
	}
	return flags;
}

function conclusionClosers(text: string, language: Language): Flag[] {
	const list = language === 'es' ? CONCLUSION_CLOSERS_ES : CONCLUSION_CLOSERS_EN;
	const explanation =
		language === 'es'
			? 'Cierre de resumen formulaico — la IA reformula lo obvio.'
			: 'Formulaic summary closer — AI loves to restate the obvious.';
	const suggestion =
		language === 'es'
			? 'Terminá con tu punto más fuerte, no con un resumen.'
			: 'End on your strongest point instead of a recap.';
	const threshold = text.length * 0.6;
	const flags: Flag[] = [];
	for (const phrase of list) {
		for (const hit of findPhrase(text, phrase)) {
			if (hit.start < threshold) continue;
			let i = hit.start - 1;
			while (i >= 0 && (text[i] === ' ' || text[i] === '\t')) i--;
			const ok = i < 0 || text[i] === '\n' || text[i] === '.' || text[i] === '!' || text[i] === '?';
			if (!ok) continue;
			flags.push({
				ruleId: 'conclusion-closer',
				severity: 'yellow',
				startIndex: hit.start,
				endIndex: hit.end,
				excerpt: hit.excerpt,
				explanation,
				suggestion
			});
		}
	}
	return flags;
}

const SENTENCE_RE = /[^.!?¡¿\n]+(?:[.!?]+|(?=\n|$))/gu;

/** Coefficient of variation of words-per-sentence. Null below 6 sentences. */
export function sentenceBurstiness(text: string): number | null {
	const counts: number[] = [];
	SENTENCE_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = SENTENCE_RE.exec(text)) !== null) {
		const words = m[0].trim().split(/\s+/u).filter(Boolean).length;
		if (words > 0) counts.push(words);
	}
	if (counts.length < 6) return null;
	const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
	if (mean === 0) return null;
	const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
	return Number((Math.sqrt(variance) / mean).toFixed(2));
}

function longSentences(text: string): Flag[] {
	const sentenceRe = /[^.!?¡¿\n]+(?:[.!?]+|(?=\n|$))/gu;
	const matches: Array<{ start: number; end: number; words: number; excerpt: string }> = [];
	let m: RegExpExecArray | null;
	while ((m = sentenceRe.exec(text)) !== null) {
		const raw = m[0];
		const leading = raw.length - raw.replace(/^\s+/, '').length;
		const start = m.index + leading;
		const trimmed = raw.trim();
		if (!trimmed) continue;
		const words = trimmed.split(/\s+/u).filter(Boolean).length;
		if (words > 30) {
			matches.push({ start, end: start + trimmed.length, words, excerpt: trimmed });
		}
	}
	matches.sort((a, b) => b.words - a.words);
	const top = matches.slice(0, 3);
	return top.map((s) => ({
		ruleId: 'long-sentence',
		severity: 'yellow' as const,
		startIndex: s.start,
		endIndex: s.end,
		excerpt: s.excerpt,
		explanation: `Long sentence (${s.words} words). Consider splitting.`
	}));
}

export interface DeterministicResult {
	flags: Flag[];
	adverbPct: number;
	passiveCount: number;
	burstiness: number | null;
}

export function scanDeterministic(text: string, language: Language): DeterministicResult {
	const jargonList = language === 'es' ? JARGON_ES : JARGON_EN;
	const cliches = language === 'es' ? CLICHE_OPENERS_ES : CLICHE_OPENERS_EN;
	const delve = language === 'es' ? DELVE_FAMILY_ES : DELVE_FAMILY_EN;
	const aiV = language === 'es' ? AI_VERBS_ES : AI_VERBS_EN;
	const intens = language === 'es' ? VAGUE_INTENSIFIERS_ES : VAGUE_INTENSIFIERS_EN;
	const trans = language === 'es' ? TRANSITION_STARTERS_ES : TRANSITION_STARTERS_EN;
	const fragQ = language === 'es' ? FRAGMENT_QUESTIONS_ES : FRAGMENT_QUESTIONS_EN;

	const adverbResult = adverbs(text, language);
	const passiveFlags = passiveVoice(text, language);

	const all: Flag[] = [
		...dashesEn(text),
		...clicheOpeners(text, cliches),
		...transitionCommas(text, trans),
		...fragmentQuestions(text, fragQ),
		...jargon(text, jargonList, language),
		...delveFamily(text, delve, language),
		...aiVerbs(text, aiV, language),
		...vagueIntensifiers(text, intens),
		...adverbResult.flags,
		...passiveFlags,
		...longSentences(text),
		...colonLabels(text),
		...notXButY(text, language),
		...artifactResidue(text, language),
		...chatRemnants(text, language),
		...aiDisclaimers(text, language),
		...placeholderRemnants(text, language),
		...hedges(text, language),
		...participialComments(text, language),
		...conclusionClosers(text, language),
		...reinhartFlags(text, language)
	];

	const adverbPct = adverbResult.totalWords
		? (adverbResult.count / adverbResult.totalWords) * 100
		: 0;

	return {
		flags: all,
		adverbPct: Number(adverbPct.toFixed(1)),
		passiveCount: passiveFlags.length,
		burstiness: sentenceBurstiness(text)
	};
}
