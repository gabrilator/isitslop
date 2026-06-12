import { describe, it, expect } from 'vitest';
import { plausibleLLMFlag } from '../src/lib/scanners/llm';
import { readingGrade } from '../src/lib/lang';
import type { Flag } from '../src/lib/types';

function llmFlag(ruleId: string, excerpt: string): Flag {
	return {
		ruleId,
		severity: 'red',
		startIndex: 0,
		endIndex: excerpt.length,
		excerpt,
		explanation: 'test'
	};
}

describe('plausibleLLMFlag — fragment-question', () => {
	it('keeps true fragments', () => {
		expect(plausibleLLMFlag(llmFlag('fragment-question', 'The kicker?'), 'en')).toBe(true);
		expect(plausibleLLMFlag(llmFlag('fragment-question', 'And the result?'), 'en')).toBe(true);
		expect(plausibleLLMFlag(llmFlag('fragment-question', '¿La clave?'), 'es')).toBe(true);
	});

	it('rejects full-sentence rhetorical questions (human writing)', () => {
		expect(
			plausibleLLMFlag(llmFlag('fragment-question', 'But why did her body stop listening?'), 'en')
		).toBe(false);
		expect(
			plausibleLLMFlag(llmFlag('fragment-question', 'Who are we doing this for?'), 'en')
		).toBe(false);
		expect(
			plausibleLLMFlag(llmFlag('fragment-question', 'Has your body ever said no?'), 'en')
		).toBe(false);
	});

	it('rejects non-questions', () => {
		expect(plausibleLLMFlag(llmFlag('fragment-question', 'Great question.'), 'en')).toBe(false);
	});
});

describe('plausibleLLMFlag — not-x-but-y', () => {
	it('keeps real negate-then-replace pairs', () => {
		expect(
			plausibleLLMFlag(
				llmFlag('not-x-but-y', "success isn't just about working hard. It's about working smart."),
				'en'
			)
		).toBe(true);
		expect(
			plausibleLLMFlag(
				llmFlag('not-x-but-y', "It's not something you're simply born with. It's a muscle."),
				'en'
			)
		).toBe(true);
	});

	it('rejects hedges without a replacement assertion', () => {
		expect(
			plausibleLLMFlag(
				llmFlag(
					'not-x-but-y',
					'the solution is not always to power through. \n\nIt may work for some but if you find yourself chronically exhausted'
				),
				'en'
			)
		).toBe(false);
	});

	it('passes other rules through untouched', () => {
		expect(plausibleLLMFlag(llmFlag('forced-moral', 'whatever text'), 'en')).toBe(true);
	});
});

describe('readingGrade', () => {
	it('returns a sane grade for simple English prose', () => {
		const text =
			'The cat sat on the mat. The dog ran in the park. We ate bread and jam. The sun was warm that day. We walked home before dark.';
		const grade = readingGrade(text, 'en');
		expect(grade).not.toBeNull();
		expect(grade!).toBeGreaterThanOrEqual(0);
		expect(grade!).toBeLessThan(6);
	});

	it('returns a higher grade for dense formal prose', () => {
		const simple = readingGrade('We ate bread. The sun was warm. We walked home.', 'en')!;
		const dense = readingGrade(
			'The organizational implementation of multidimensional strategic considerations necessitates comprehensive institutional transformation across heterogeneous administrative infrastructures.',
			'en'
		)!;
		expect(dense).toBeGreaterThan(simple);
	});

	it('returns null for Spanish (not supported yet)', () => {
		expect(readingGrade('El puente fue construido por los romanos hace siglos.', 'es')).toBeNull();
	});
});
