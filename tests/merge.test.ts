import { describe, it, expect } from 'vitest';
import { computeSlopScore, diversityMultiplier } from '../src/lib/scanners/merge';
import type { Flag } from '../src/lib/types';

function makeFlag(ruleId: string, severity: 'red' | 'yellow', i: number): Flag {
	const start = i * 10;
	return {
		ruleId,
		severity,
		startIndex: start,
		endIndex: start + 5,
		excerpt: 'xxxxx',
		explanation: 'test'
	};
}

describe('diversityMultiplier', () => {
	it('returns 0.7 for one rule type', () => {
		expect(diversityMultiplier(1)).toBe(0.7);
	});
	it('returns 1.0 for two rule types', () => {
		expect(diversityMultiplier(2)).toBe(1.0);
	});
	it('returns 1.15 for three rule types', () => {
		expect(diversityMultiplier(3)).toBe(1.15);
	});
	it('returns 1.3 for four or more rule types', () => {
		expect(diversityMultiplier(4)).toBe(1.3);
		expect(diversityMultiplier(10)).toBe(1.3);
	});
	it('returns 0.7 for zero (degenerate)', () => {
		expect(diversityMultiplier(0)).toBe(0.7);
	});
});

describe('computeSlopScore', () => {
	it('returns 0 on empty flags', () => {
		expect(computeSlopScore({ flags: [], wordCount: 100 })).toBe(0);
	});

	it('long text + 1 em-dash → ~1 (lone sign forgiven, length dilutes)', () => {
		const flags = [makeFlag('em-dash', 'red', 0)];
		const score = computeSlopScore({ flags, wordCount: 600 });
		expect(score).toBeLessThanOrEqual(2);
	});

	it('short text + 1 em-dash → ~6 (lone sign still forgiven even without length dilution)', () => {
		const flags = [makeFlag('em-dash', 'red', 0)];
		const score = computeSlopScore({ flags, wordCount: 50 });
		expect(score).toBeGreaterThanOrEqual(4);
		expect(score).toBeLessThanOrEqual(8);
	});

	it('short text + 3 distinct rules → ≥30 (combination flagged)', () => {
		const flags = [
			makeFlag('em-dash', 'red', 0),
			makeFlag('jargon', 'yellow', 1),
			makeFlag('jargon', 'yellow', 2),
			makeFlag('jargon', 'yellow', 3),
			makeFlag('cliche-opener', 'red', 4)
		];
		const score = computeSlopScore({ flags, wordCount: 50 });
		expect(score).toBeGreaterThanOrEqual(30);
	});

	it('long text + 3 distinct rules → noticeably lower than short text + same flags (length dilution)', () => {
		const flags = [
			makeFlag('em-dash', 'red', 0),
			makeFlag('jargon', 'yellow', 1),
			makeFlag('jargon', 'yellow', 2),
			makeFlag('jargon', 'yellow', 3),
			makeFlag('cliche-opener', 'red', 4)
		];
		const shortScore = computeSlopScore({ flags, wordCount: 50 });
		const longScore = computeSlopScore({ flags, wordCount: 600 });
		expect(longScore).toBeLessThan(shortScore);
		expect(longScore).toBeLessThanOrEqual(15);
	});

	it('distinctness amplifies: 3 distinct singletons beat 3 of one rule (50w)', () => {
		const diverse = [
			makeFlag('em-dash', 'red', 0),
			makeFlag('jargon', 'yellow', 1),
			makeFlag('cliche-opener', 'red', 2)
		];
		const repeated = [
			makeFlag('jargon', 'yellow', 0),
			makeFlag('jargon', 'yellow', 1),
			makeFlag('jargon', 'yellow', 2)
		];
		const diverseScore = computeSlopScore({ flags: diverse, wordCount: 50 });
		const repeatedScore = computeSlopScore({ flags: repeated, wordCount: 50 });
		expect(diverseScore).toBeGreaterThan(repeatedScore);
	});

	it('8 of same rule × short text → still hits ≥90 (sustained repetition survives)', () => {
		const flags = Array.from({ length: 8 }, (_, i) => makeFlag('jargon', 'yellow', i));
		const score = computeSlopScore({ flags, wordCount: 50 });
		expect(score).toBeGreaterThanOrEqual(90);
	});

	it('writing-tip rules (adverb / passive / long-sentence) do not raise the score', () => {
		const flags = [
			...Array.from({ length: 6 }, (_, i) => makeFlag('adverb', 'yellow', i)),
			...Array.from({ length: 3 }, (_, i) => makeFlag('long-sentence', 'yellow', i + 6)),
			...Array.from({ length: 2 }, (_, i) => makeFlag('passive', 'yellow', i + 9))
		];
		const score = computeSlopScore({ flags, wordCount: 200 });
		expect(score).toBe(0);
	});

	it('writing-tip rules do not count toward distinct-type diversity', () => {
		const lone = [makeFlag('em-dash', 'red', 0)];
		const loneWithTips = [
			makeFlag('em-dash', 'red', 0),
			...Array.from({ length: 4 }, (_, i) => makeFlag('adverb', 'yellow', i + 1))
		];
		expect(computeSlopScore({ flags: lone, wordCount: 100 })).toBe(
			computeSlopScore({ flags: loneWithTips, wordCount: 100 })
		);
	});
});

function makeFlagAt(ruleId: string, severity: 'red' | 'yellow', startIndex: number): Flag {
	return {
		ruleId,
		severity,
		startIndex,
		endIndex: startIndex + 5,
		excerpt: 'xxxxx',
		explanation: 'test'
	};
}

function longText(words: number): string {
	return Array.from({ length: words }, (_, i) => `word${i}`).join(' ');
}

function starts(text: string): number[] {
	return [...text.matchAll(/\S+/g)].map((m) => m.index!);
}

describe('computeSlopScore — forgiveness floor', () => {
	it('1000-word essay + one lone rule-of-three → exactly 0', () => {
		const score = computeSlopScore({
			flags: [makeFlag('rule-of-three', 'red', 0)],
			wordCount: 1000
		});
		expect(score).toBe(0);
	});

	it('short text + one lone sign is NOT forgiven (under the word threshold)', () => {
		const score = computeSlopScore({ flags: [makeFlag('em-dash', 'red', 0)], wordCount: 50 });
		expect(score).toBeGreaterThan(0);
	});

	it('hard-red evidence is never forgiven: 600w + 1 artifact-residue → ≥ 25', () => {
		const score = computeSlopScore({
			flags: [makeFlag('artifact-residue', 'red', 0)],
			wordCount: 600
		});
		expect(score).toBeGreaterThanOrEqual(25);
	});

	it('any hard-red hit guarantees at least 25', () => {
		const score = computeSlopScore({
			flags: [makeFlag('chat-remnant', 'red', 0)],
			wordCount: 50
		});
		expect(score).toBeGreaterThanOrEqual(25);
	});
});

describe('computeSlopScore — concentration window', () => {
	it('6 tells packed into one passage of a 1000-word text score much higher than the same tells spread out', () => {
		const text = longText(1000);
		const s = starts(text);
		const rules: Array<[string, 'red' | 'yellow']> = [
			['em-dash', 'red'],
			['em-dash', 'red'],
			['jargon', 'yellow'],
			['jargon', 'yellow'],
			['hedge', 'yellow'],
			['hedge', 'yellow']
		];
		const packed = rules.map(([r, sev], i) => makeFlagAt(r, sev, s[i * 12]));
		const spread = rules.map(([r, sev], i) => makeFlagAt(r, sev, s[i * 160]));

		const packedScore = computeSlopScore({ flags: packed, wordCount: 1000, text });
		const spreadScore = computeSlopScore({ flags: spread, wordCount: 1000, text });

		expect(packedScore).toBeGreaterThanOrEqual(30);
		expect(spreadScore).toBeLessThanOrEqual(10);
		expect(packedScore).toBeGreaterThan(spreadScore * 3);
	});

	it('isolated lone signs in separate windows are forgiven locally (score stays global-low)', () => {
		const text = longText(1000);
		const s = starts(text);
		const flags = [makeFlagAt('jargon', 'yellow', s[0]), makeFlagAt('hedge', 'yellow', s[500])];
		const score = computeSlopScore({ flags, wordCount: 1000, text });
		expect(score).toBeLessThanOrEqual(2);
	});

	it('weak word-list singles are gated from the global score in long texts', () => {
		const flags = [makeFlag('jargon', 'yellow', 0), makeFlag('jargon', 'yellow', 1)];
		expect(computeSlopScore({ flags, wordCount: 600 })).toBe(0);
	});

	it('weak word-list rules count globally from 3 hits', () => {
		const flags = Array.from({ length: 3 }, (_, i) => makeFlag('jargon', 'yellow', i));
		expect(computeSlopScore({ flags, wordCount: 600 })).toBeGreaterThanOrEqual(1);
	});

	it('gated weak hits still score when packed into one window', () => {
		const text = longText(1000);
		const s = starts(text);
		const packed = [
			makeFlagAt('jargon', 'yellow', s[0]),
			makeFlagAt('jargon', 'yellow', s[10]),
			makeFlagAt('hedge', 'yellow', s[20])
		];
		const spread = [
			makeFlagAt('jargon', 'yellow', s[0]),
			makeFlagAt('jargon', 'yellow', s[450]),
			makeFlagAt('hedge', 'yellow', s[900])
		];
		expect(computeSlopScore({ flags: packed, wordCount: 1000, text })).toBeGreaterThanOrEqual(5);
		expect(computeSlopScore({ flags: spread, wordCount: 1000, text })).toBe(0);
	});

	it('short texts are unaffected by the window term (window ≥ whole text)', () => {
		const text = longText(80);
		const s = starts(text);
		const flags = [
			makeFlagAt('em-dash', 'red', s[0]),
			makeFlagAt('jargon', 'yellow', s[10]),
			makeFlagAt('cliche-opener', 'red', s[20])
		];
		const withText = computeSlopScore({ flags, wordCount: 80, text });
		const withoutText = computeSlopScore({ flags, wordCount: 80 });
		expect(withText).toBe(withoutText);
	});
});
