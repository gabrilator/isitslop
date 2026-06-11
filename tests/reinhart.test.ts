import { describe, it, expect } from 'vitest';
import { reinhartFlags, REINHART_MIN_WORDS } from '../src/lib/rules/reinhart';
import { scanDeterministic } from '../src/lib/scanners/deterministic';
import { isWritingTip } from '../src/lib/scanners/merge';
import type { Flag } from '../src/lib/types';

const FILLER_EN = 'The river ran past the old mill and turned the wheel before dawn. ';
const NOMINAL_EN =
	'The organization made a declaration about the situation and the regulation of the institution. ';
const FILLER_ES = 'El río pasaba junto al molino viejo y movía la rueda antes del alba. ';
const NOMINAL_ES =
	'La organización hizo una declaración sobre la situación y la regulación de la institución. ';

function byRule(flags: Flag[], ruleId: string): Flag[] {
	return flags.filter((f) => f.ruleId === ruleId);
}

describe('reinhart plugin — gate', () => {
	it('stays silent under 400 words even at high density', () => {
		const text = NOMINAL_EN.repeat(10); // ~140 words, ~36% nominalizations
		expect(reinhartFlags(text, 'en')).toEqual([]);
	});

	it('exports the 400-word gate', () => {
		expect(REINHART_MIN_WORDS).toBe(400);
	});
});

describe('reinhart plugin — nominalization', () => {
	it('flags a noun-stacked 500+ word text (EN)', () => {
		const text = FILLER_EN.repeat(30) + NOMINAL_EN.repeat(10);
		const flags = byRule(reinhartFlags(text, 'en'), 'nominalization');
		expect(flags.length).toBeGreaterThanOrEqual(40);
		expect(flags[0].excerpt.toLowerCase()).toMatch(/tion|ment|ity|ness/);
	});

	it('stays silent on plain narrative of the same length', () => {
		const text = FILLER_EN.repeat(40);
		expect(byRule(reinhartFlags(text, 'en'), 'nominalization')).toEqual([]);
	});

	it('stays silent when density is low', () => {
		const text = FILLER_EN.repeat(40) + NOMINAL_EN;
		expect(byRule(reinhartFlags(text, 'en'), 'nominalization')).toEqual([]);
	});

	it('flags a noun-stacked Spanish text', () => {
		const text = FILLER_ES.repeat(30) + NOMINAL_ES.repeat(12);
		const flags = byRule(reinhartFlags(text, 'es'), 'nominalization');
		expect(flags.length).toBeGreaterThanOrEqual(40);
	});

	it('skips false positives like business and witness', () => {
		const text = (FILLER_EN + 'The business hired a witness for the case. ').repeat(25);
		const flags = byRule(reinhartFlags(text, 'en'), 'nominalization');
		expect(flags).toEqual([]);
	});
});

describe('reinhart plugin — participial clauses', () => {
	const GERUNDY =
		'The crowd moved through the gate, pushing toward the field and the open stands. ';

	it('flags piled-up comma gerunds (EN)', () => {
		const text = FILLER_EN.repeat(25) + GERUNDY.repeat(8);
		const flags = byRule(reinhartFlags(text, 'en'), 'participial-clause');
		expect(flags.length).toBeGreaterThanOrEqual(5);
		expect(flags[0].excerpt.toLowerCase()).toBe('pushing');
	});

	it('ignores non-participle -ing words like during and morning', () => {
		const text = (FILLER_EN + 'They met again, during the long morning rain. ').repeat(25);
		expect(byRule(reinhartFlags(text, 'en'), 'participial-clause')).toEqual([]);
	});

	it('flags Spanish comma gerunds, ignoring cuando', () => {
		const gerundyEs = 'La gente cruzó la plaza, caminando hacia el mercado viejo, cuando llegó. ';
		const text = FILLER_ES.repeat(25) + gerundyEs.repeat(8);
		const flags = byRule(reinhartFlags(text, 'es'), 'participial-clause');
		expect(flags.length).toBeGreaterThanOrEqual(5);
		expect(flags.every((f) => f.excerpt.toLowerCase() !== 'cuando')).toBe(true);
	});

	it('requires at least five hits', () => {
		const text = FILLER_EN.repeat(40) + GERUNDY.repeat(3);
		expect(byRule(reinhartFlags(text, 'en'), 'participial-clause')).toEqual([]);
	});
});

describe('reinhart plugin — integration', () => {
	it('reaches scan results as writing tips with valid indices', () => {
		const text = FILLER_EN.repeat(30) + NOMINAL_EN.repeat(10);
		const { flags } = scanDeterministic(text, 'en');
		const noms = byRule(flags, 'nominalization');
		expect(noms.length).toBeGreaterThan(0);
		expect(isWritingTip('nominalization')).toBe(true);
		expect(isWritingTip('participial-clause')).toBe(true);
		for (const f of noms) {
			expect(text.slice(f.startIndex, f.endIndex)).toBe(f.excerpt);
		}
	});
});
