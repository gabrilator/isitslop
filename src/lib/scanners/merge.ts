import type { Flag } from '$lib/types';

function flagLength(f: Flag): number {
	return f.endIndex - f.startIndex;
}

function overlaps(a: Flag, b: Flag): boolean {
	return a.startIndex < b.endIndex && b.startIndex < a.endIndex;
}

export function validateFlags(text: string, flags: Flag[]): Flag[] {
	return flags.filter((f) => {
		if (
			!Number.isInteger(f.startIndex) ||
			!Number.isInteger(f.endIndex) ||
			f.startIndex < 0 ||
			f.endIndex <= f.startIndex ||
			f.endIndex > text.length
		) {
			return false;
		}
		return text.slice(f.startIndex, f.endIndex) === f.excerpt;
	});
}

export function mergeFlags(text: string, ...groups: Flag[][]): Flag[] {
	const all = groups.flat();
	const valid = validateFlags(text, all);
	valid.sort((a, b) => {
		if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
		if (a.severity !== b.severity) return a.severity === 'red' ? -1 : 1;
		return flagLength(a) - flagLength(b);
	});

	const kept: Flag[] = [];
	for (const flag of valid) {
		let drop = false;
		for (const existing of kept) {
			if (!overlaps(flag, existing)) continue;
			const sameRange =
				existing.startIndex === flag.startIndex && existing.endIndex === flag.endIndex;
			if (sameRange && existing.ruleId === flag.ruleId) {
				drop = true;
				break;
			}
			if (existing.severity === 'red' && flag.severity === 'yellow') {
				drop = true;
				break;
			}
			if (
				existing.severity === flag.severity &&
				flagLength(existing) <= flagLength(flag) &&
				existing.startIndex <= flag.startIndex &&
				existing.endIndex >= flag.endIndex
			) {
				drop = true;
				break;
			}
		}
		if (!drop) kept.push(flag);
	}

	const counts = new Map<string, number>();
	for (const f of kept) counts.set(f.ruleId, (counts.get(f.ruleId) ?? 0) + 1);
	const seen = new Map<string, number>();
	for (const f of kept) {
		const n = (seen.get(f.ruleId) ?? 0) + 1;
		seen.set(f.ruleId, n);
		f.instance = n;
		f.ruleCount = counts.get(f.ruleId)!;
	}

	return kept;
}

const RED_BASE = 8;
const YELLOW_BASE = 3;
const ESCALATION = 1.5;
const LENGTH_BASELINE = 150; // a paragraph

export const WRITING_TIP_RULES = new Set([
	'adverb',
	'long-sentence',
	'passive',
	'nominalization',
	'participial-clause'
]);

export function isWritingTip(ruleId: string): boolean {
	return WRITING_TIP_RULES.has(ruleId);
}

export function ruleContribution(severity: 'red' | 'yellow', count: number): number {
	if (count <= 0) return 0;
	const base = severity === 'red' ? RED_BASE : YELLOW_BASE;
	return base * 2 * (Math.pow(ESCALATION, count) - 1);
}

export function diversityMultiplier(distinctTypes: number): number {
	if (distinctTypes <= 1) return 0.7;
	if (distinctTypes === 2) return 1.0;
	if (distinctTypes === 3) return 1.15;
	return 1.3;
}

// Dead-giveaway rules: literal evidence of AI involvement, never forgiven,
// and any hit guarantees at least HARD_RED_MIN_SCORE.
const HARD_RED_RULES = new Set([
	'artifact-residue',
	'ai-disclaimer',
	'chat-remnant',
	'placeholder-remnant'
]);
const HARD_RED_MIN_SCORE = 25;

// One lone soft sign in a long text is style, not slop.
const FORGIVENESS_MIN_WORDS = 400;

// Concentration: slop clusters. Score the densest 100-word window standalone
// and let it override a length-diluted global score.
const WINDOW_WORDS = 100;
const WINDOW_STEP = 25;
const WINDOW_WEIGHT = 0.85;

export function isHardRed(ruleId: string): boolean {
	return HARD_RED_RULES.has(ruleId);
}

function rawTimesDiversity(flags: Flag[]): number {
	const groups = new Map<string, { severity: 'red' | 'yellow'; count: number }>();
	for (const f of flags) {
		const g = groups.get(f.ruleId);
		if (g) g.count++;
		else groups.set(f.ruleId, { severity: f.severity, count: 1 });
	}
	let raw = 0;
	for (const g of groups.values()) raw += ruleContribution(g.severity, g.count);
	return raw * diversityMultiplier(groups.size);
}

function wordStarts(text: string): number[] {
	const starts: number[] = [];
	const re = /\S+/gu;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) starts.push(m.index);
	return starts;
}

function worstWindowScore(slopFlags: Flag[], text: string): number {
	const starts = wordStarts(text);
	// short text: the global score already sees the whole thing at once
	if (starts.length <= WINDOW_WORDS) return 0;
	let worst = 0;
	for (let i = 0; i < starts.length; i += WINDOW_STEP) {
		const charStart = starts[i];
		const end = i + WINDOW_WORDS;
		const charEnd = end < starts.length ? starts[end] : text.length;
		const wFlags = slopFlags.filter((f) => f.startIndex >= charStart && f.startIndex < charEnd);
		if (wFlags.length === 0) continue;
		// a lone soft sign inside a window is forgiven, same as globally
		if (wFlags.length === 1 && !isHardRed(wFlags[0].ruleId)) continue;
		// window ≤ LENGTH_BASELINE words, so the length factor is always 1 here
		const score = rawTimesDiversity(wFlags) * WINDOW_WEIGHT;
		if (score > worst) worst = score;
		if (end >= starts.length) break;
	}
	return worst;
}

export function computeSlopScore(params: {
	flags: Flag[];
	wordCount: number;
	text?: string;
}): number {
	const slopFlags = params.flags.filter((f) => !isWritingTip(f.ruleId));
	if (slopFlags.length === 0) return 0;

	const hasHardRed = slopFlags.some((f) => isHardRed(f.ruleId));

	if (params.wordCount > FORGIVENESS_MIN_WORDS && slopFlags.length === 1 && !hasHardRed) {
		return 0;
	}

	const adjusted = rawTimesDiversity(slopFlags);
	const global = (adjusted * LENGTH_BASELINE) / Math.max(params.wordCount, LENGTH_BASELINE);
	const concentration = params.text ? worstWindowScore(slopFlags, params.text) : 0;

	let score = Math.round(Math.max(global, concentration));
	if (hasHardRed) score = Math.max(score, HARD_RED_MIN_SCORE);
	return Math.min(100, score);
}
