import { describe, it, expect } from 'vitest';
import { scanDeterministic, sentenceBurstiness } from '../src/lib/scanners/deterministic';
import type { Flag } from '../src/lib/types';

function ids(flags: Flag[]): string[] {
	return flags.map((f) => f.ruleId);
}

function findByRule(flags: Flag[], ruleId: string): Flag[] {
	return flags.filter((f) => f.ruleId === ruleId);
}

function assertExcerptsMatchText(text: string, flags: Flag[]) {
	for (const f of flags) {
		expect(text.slice(f.startIndex, f.endIndex)).toBe(f.excerpt);
	}
}

describe('Scanner A — deterministic (EN)', () => {
	it('flags em-dash usage', () => {
		const text = 'This is short — and to the point.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'em-dash')).toHaveLength(1);
		assertExcerptsMatchText(text, flags);
	});

	it('does not flag em-dash when absent', () => {
		const text = 'A perfectly normal sentence.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'em-dash')).toHaveLength(0);
	});

	it('flags cliché openers within the first 400 chars', () => {
		const text = "In today's fast-paced world, we must adapt.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'cliche-opener').length).toBeGreaterThanOrEqual(1);
	});

	it('ignores cliché openers after the first 400 chars', () => {
		const filler = 'a '.repeat(220);
		const text = `${filler}in today's fast-paced world.`;
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'cliche-opener')).toHaveLength(0);
	});

	it('flags Furthermore, at sentence start', () => {
		const text = 'It works. Furthermore, it scales.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'transition-comma')).toHaveLength(1);
		assertExcerptsMatchText(text, flags);
	});

	it('does not flag furthermore mid-sentence', () => {
		const text = 'It went furthermore than expected.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'transition-comma')).toHaveLength(0);
	});

	it('flags fragment-question reveals', () => {
		const text = 'But the truth is different. The kicker? Nobody reads it.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'fragment-question')).toHaveLength(1);
	});

	it('flags corporate jargon (whole-word)', () => {
		const text = 'We must leverage synergy to unlock holistic value.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'jargon').length).toBeGreaterThanOrEqual(2);
	});

	it('does not flag jargon as a substring of another word', () => {
		const text = 'The realmlike castle stood tall.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'jargon').some((f) => f.excerpt.toLowerCase() === 'realm')).toBe(
			false
		);
	});

	it('flags delve family verbs', () => {
		const text = 'Let us dive into the strategy and unpack the details.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'delve-family').length).toBeGreaterThanOrEqual(2);
	});

	it('flags AI verbs', () => {
		const text = 'We harness data to empower teams and embrace change.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'ai-verb').length).toBeGreaterThanOrEqual(3);
	});

	it('flags vague intensifiers', () => {
		const text = 'This is truly profoundly important and undoubtedly essential.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'vague-intensifier').length).toBeGreaterThanOrEqual(3);
	});

	it('flags -ly adverbs and computes density', () => {
		const text =
			'She quickly walked happily through the carefully painted door, gracefully smiling.';
		const result = scanDeterministic(text, 'en');
		expect(findByRule(result.flags, 'adverb').length).toBeGreaterThanOrEqual(4);
		expect(result.adverbPct).toBeGreaterThan(3);
	});

	it('filters common -ly false positives like "early"', () => {
		const text = 'She arrived early.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'adverb')).toHaveLength(0);
	});

	it('detects passive voice (was eaten)', () => {
		const text = 'The cake was eaten by the dog.';
		const result = scanDeterministic(text, 'en');
		expect(result.passiveCount).toBeGreaterThanOrEqual(1);
	});

	it('detects passive voice on irregular verbs (was hit)', () => {
		const text = 'The ball was hit by the boy.';
		const result = scanDeterministic(text, 'en');
		expect(result.passiveCount).toBeGreaterThanOrEqual(1);
	});

	it('detects passive voice on more irregulars (was won, were lost)', () => {
		const text = 'The match was won by the visitors. Three games were lost last week.';
		const result = scanDeterministic(text, 'en');
		expect(result.passiveCount).toBeGreaterThanOrEqual(2);
	});

	it('does not flag active voice as passive', () => {
		const text = 'The dog ate the cake.';
		const result = scanDeterministic(text, 'en');
		expect(result.passiveCount).toBe(0);
	});

	it('flags long sentences > 30 words (top 3 only)', () => {
		const long =
			'When the morning sun broke softly across the rolling hills and painted the small wooden cabins in warm light, a quiet group of travelers gathered near the river to discuss the long journey ahead, the supplies they had packed, and the unknown paths that waited beyond the bend.';
		const { flags } = scanDeterministic(long, 'en');
		expect(findByRule(flags, 'long-sentence').length).toBe(1);
	});

	it('returns excerpts whose indices match the source text', () => {
		const fixture =
			"In today's fast-paced world, businesses must navigate complexities. The kicker? Leaders harness synergy.";
		const { flags } = scanDeterministic(fixture, 'en');
		assertExcerptsMatchText(fixture, flags);
	});
});

describe('Scanner A — deterministic (ES)', () => {
	it('flags Spanish jargon', () => {
		const text = 'Debemos potenciar la sinergia para empoderar al equipo.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'jargon').length).toBeGreaterThanOrEqual(2);
	});

	it('flags Spanish cliché opener', () => {
		const text = 'En un mundo cada vez más complejo, los líderes deben actuar.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'cliche-opener').length).toBeGreaterThanOrEqual(1);
	});

	it('flags -mente adverbs', () => {
		const text = 'Caminaba lentamente pero hablaba rápidamente y rotundamente.';
		const result = scanDeterministic(text, 'es');
		expect(findByRule(result.flags, 'adverb').length).toBeGreaterThanOrEqual(3);
	});

	it('flags Spanish fragment questions', () => {
		const text = 'Todo cambió ayer. ¿La clave? Nadie lo vio venir.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'fragment-question').length).toBeGreaterThanOrEqual(1);
	});

	it('detects Spanish passive (fue construido)', () => {
		const text = 'El puente fue construido por los romanos.';
		const result = scanDeterministic(text, 'es');
		expect(result.passiveCount).toBeGreaterThanOrEqual(1);
	});

	it('returns excerpts whose indices match the source text (ES)', () => {
		const text = 'Debemos potenciar la sinergia. ¿La clave? Adentrarse rápidamente.';
		const { flags } = scanDeterministic(text, 'es');
		assertExcerptsMatchText(text, flags);
	});
});

describe('Scanner A — em-dash exclusions', () => {
	it('does not flag en-dash between numbers ($400–$800)', () => {
		const text = 'Claude Sonnet costs roughly $400–$800 per month.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'em-dash')).toHaveLength(0);
	});

	it('does not flag dash between numbers with spaces (10 – 20)', () => {
		const text = 'Pages 10 – 20 of the report.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'em-dash')).toHaveLength(0);
	});

	it('still flags dash between words', () => {
		const text = 'It was fast — and stylish.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'em-dash')).toHaveLength(1);
	});
});

describe('Scanner A — deterministic not-x-but-y', () => {
	it('flags the classic two-sentence form', () => {
		const text = "The future isn't \"pick one model.\" It's model stacking.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'not-x-but-y').length).toBeGreaterThanOrEqual(1);
	});

	it('flags "You don\'t X. You Y." with the "You" cue', () => {
		const text = "You don't sell AI. You sell transformation.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'not-x-but-y').length).toBeGreaterThanOrEqual(1);
	});

	it('does not flag a sentence that only has negation', () => {
		const text = "I don't think so. The weather is nice.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'not-x-but-y')).toHaveLength(0);
	});
});

describe('Scanner A — colon-labels', () => {
	it('flags 3 colon labels as 3 yellow flags', () => {
		const text =
			'Three lessons:\n\nVision: a north star.\nAlignment: row together.\nImpact: ship work.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'colon-labels')).toHaveLength(3);
		assertExcerptsMatchText(text, flags);
	});

	it('flags 2 colon labels as 2 yellow flags', () => {
		const text = 'Goal: ship something. Risk: scope creep is real.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'colon-labels')).toHaveLength(2);
	});

	it('does not flag a single colon label', () => {
		const text = 'Here is the plan:\n\nGoal: ship something useful soon.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'colon-labels')).toHaveLength(0);
	});

	it('does not flag URLs', () => {
		const text = 'Visit https://example.com\nGoal: ship\nVisit https://example.com';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'colon-labels').some((f) => f.excerpt.startsWith('http'))).toBe(false);
	});

	it('does not flag times like 10:30', () => {
		const text = 'See you at 10:30 AM.\nGoal: ship.\nOr at 14:00.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'colon-labels').some((f) => /\d/.test(f.excerpt))).toBe(false);
	});
});

describe('Scanner A — inflection matching (EN)', () => {
	it('matches "delved" as the "delve" jargon entry', () => {
		const text = 'We delved deeper into the problem.';
		const { flags } = scanDeterministic(text, 'en');
		const hits = findByRule(flags, 'delve-family').concat(findByRule(flags, 'jargon'));
		expect(hits.some((f) => f.excerpt.toLowerCase() === 'delved')).toBe(true);
	});

	it('matches "leveraged synergies" via inflection', () => {
		const text = 'They leveraged synergies across the org.';
		const { flags } = scanDeterministic(text, 'en');
		const excerpts = findByRule(flags, 'jargon')
			.concat(findByRule(flags, 'ai-verb'))
			.map((f) => f.excerpt.toLowerCase());
		expect(excerpts).toContain('leveraged');
		expect(excerpts).toContain('synergies');
	});

	it('matches "navigating" and "navigates"', () => {
		const text = 'She navigates change while navigating uncertainty.';
		const { flags } = scanDeterministic(text, 'en');
		const excerpts = findByRule(flags, 'ai-verb')
			.concat(findByRule(flags, 'jargon'))
			.map((f) => f.excerpt.toLowerCase());
		expect(excerpts).toContain('navigates');
		expect(excerpts).toContain('navigating');
	});
});

describe('Scanner A — jargon expansion', () => {
	it('flags new leadership buzzwords (vision, alignment, impact, north star)', () => {
		const text =
			'Our vision is clear. Alignment matters. Impact comes from execution. Stakeholders need a north star.';
		const { flags } = scanDeterministic(text, 'en');
		const jargonExcerpts = findByRule(flags, 'jargon').map((f) => f.excerpt.toLowerCase());
		expect(jargonExcerpts).toContain('vision');
		expect(jargonExcerpts).toContain('alignment');
		expect(jargonExcerpts).toContain('impact');
		expect(jargonExcerpts).toContain('execution');
		expect(jargonExcerpts).toContain('stakeholders');
		expect(jargonExcerpts).toContain('north star');
	});
});

describe('Scanner A — artifact-residue', () => {
	it('flags pasted ChatGPT citation artifacts', () => {
		const text = 'The market grew 12% :contentReference[oaicite:0]{index=0} last year.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'artifact-residue').length).toBeGreaterThanOrEqual(1);
		assertExcerptsMatchText(text, flags);
	});

	it('flags chatgpt utm parameters in URLs', () => {
		const text = 'See https://example.com/post?utm_source=chatgpt.com for details.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'artifact-residue')).toHaveLength(1);
	});

	it('does not flag clean text', () => {
		const text = 'The market grew twelve percent last year.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'artifact-residue')).toHaveLength(0);
	});
});

describe('Scanner A — chat-remnant', () => {
	it('flags assistant openers at the start', () => {
		const text = "Certainly! The recipe needs three eggs and a cup of flour.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'chat-remnant').length).toBeGreaterThanOrEqual(1);
	});

	it('does not flag opener phrases deep in the text', () => {
		const filler = 'word '.repeat(60);
		const text = `${filler}Certainly! That was the plan.`;
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'chat-remnant')).toHaveLength(0);
	});

	it('flags assistant closers at the end', () => {
		const text = 'The recipe needs three eggs and a cup of flour. I hope this helps.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'chat-remnant').length).toBeGreaterThanOrEqual(1);
	});

	it('flags sycophancy anywhere', () => {
		const text = "The data was wrong. You're absolutely right about the totals. We fixed them.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'chat-remnant').length).toBeGreaterThanOrEqual(1);
	});

	it('flags Spanish closers at the end', () => {
		const text = 'La receta lleva tres huevos y una taza de harina. Espero que te sea útil.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'chat-remnant').length).toBeGreaterThanOrEqual(1);
	});
});

describe('Scanner A — ai-disclaimer', () => {
	it('flags "As an AI language model"', () => {
		const text = 'As an AI language model, I cannot browse the internet for recipes.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'ai-disclaimer').length).toBeGreaterThanOrEqual(1);
	});

	it('flags knowledge-cutoff remnants', () => {
		const text = 'The library had many books. As of my last knowledge update, the answer was unclear.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'ai-disclaimer').length).toBeGreaterThanOrEqual(1);
	});

	it('flags Spanish disclaimers', () => {
		const text = 'Como modelo de lenguaje, no puedo darte una receta exacta para esa torta.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'ai-disclaimer').length).toBeGreaterThanOrEqual(1);
	});
});

describe('Scanner A — placeholder-remnant', () => {
	it('flags unfilled template slots', () => {
		const text = 'Dear [insert name], thank you for applying to [Your Company] this week.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'placeholder-remnant')).toHaveLength(2);
		assertExcerptsMatchText(text, flags);
	});

	it('flags Spanish placeholders', () => {
		const text = 'Estimado [nombre], gracias por escribir a [tu empresa] esta semana.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'placeholder-remnant')).toHaveLength(2);
	});

	it('does not flag editorial brackets like [sic]', () => {
		const text = 'He wrote "their [sic] going to win" in the letter.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'placeholder-remnant')).toHaveLength(0);
	});
});

describe('Scanner A — hedge', () => {
	it('flags throat-clearing hedges (EN)', () => {
		const text = "It's important to note that the bridge closes at noon.";
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'hedge')).toHaveLength(1);
	});

	it('flags cabe destacar (ES)', () => {
		const text = 'Cabe destacar que el puente cierra al mediodía.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'hedge')).toHaveLength(1);
	});

	it('does not flag plain sentences', () => {
		const text = 'The bridge closes at noon.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'hedge')).toHaveLength(0);
	});
});

describe('Scanner A — participial-comment', () => {
	it('flags comma + gerund comment clauses (EN)', () => {
		const text = 'Revenue grew forty percent, highlighting the importance of focus.';
		const { flags } = scanDeterministic(text, 'en');
		const hits = findByRule(flags, 'participial-comment');
		expect(hits).toHaveLength(1);
		expect(hits[0].excerpt.toLowerCase()).toBe('highlighting');
		assertExcerptsMatchText(text, flags);
	});

	it('does not flag a gerund without a preceding comma', () => {
		const text = 'Highlighting the report was her first job of the day.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'participial-comment')).toHaveLength(0);
	});

	it('flags comma + gerundio (ES)', () => {
		const text = 'Las ventas subieron mucho, reflejando una tendencia clara del mercado.';
		const { flags } = scanDeterministic(text, 'es');
		const hits = findByRule(flags, 'participial-comment');
		expect(hits).toHaveLength(1);
		expect(hits[0].excerpt.toLowerCase()).toBe('reflejando');
	});

	it('flags "lo que pone de relieve" (ES)', () => {
		const text = 'Los precios bajaron otra vez, lo que pone de relieve la debilidad del sector.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'participial-comment')).toHaveLength(1);
	});
});

describe('Scanner A — conclusion-closer', () => {
	it('flags "In conclusion" near the end at sentence start', () => {
		const text =
			'The trip took three days by train. We slept in small towns along the route and ate at local bars. In conclusion, the slow way was the better way.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'conclusion-closer')).toHaveLength(1);
	});

	it('does not flag the same phrase early in the text', () => {
		const text =
			'In conclusion is a phrase teachers love. The trip took three days by train. We slept in small towns along the route and ate at local bars near the station every night.';
		const { flags } = scanDeterministic(text, 'en');
		expect(findByRule(flags, 'conclusion-closer')).toHaveLength(0);
	});

	it('flags "En definitiva" near the end (ES)', () => {
		const text =
			'El viaje duró tres días en tren. Dormimos en pueblos chicos y comimos en bares locales. En definitiva, ir despacio fue la mejor decisión.';
		const { flags } = scanDeterministic(text, 'es');
		expect(findByRule(flags, 'conclusion-closer')).toHaveLength(1);
	});
});

describe('Scanner A — enriched jargon lists', () => {
	it('flags tapestry, testament, boasts, vibrant (EN)', () => {
		const text =
			'The city boasts a vibrant tapestry of food. It is a testament to its people.';
		const { flags } = scanDeterministic(text, 'en');
		const excerpts = findByRule(flags, 'jargon').map((f) => f.excerpt.toLowerCase());
		expect(excerpts).toContain('boasts');
		expect(excerpts).toContain('vibrant');
		expect(excerpts).toContain('tapestry');
		expect(excerpts.some((e) => e.includes('testament'))).toBe(true);
	});

	it('flags encomiable, vibrante, crisol (ES)', () => {
		const text = 'Un esfuerzo encomiable en una ciudad vibrante, un crisol de culturas.';
		const { flags } = scanDeterministic(text, 'es');
		const excerpts = findByRule(flags, 'jargon').map((f) => f.excerpt.toLowerCase());
		expect(excerpts).toContain('encomiable');
		expect(excerpts).toContain('vibrante');
		expect(excerpts).toContain('crisol');
	});
});

describe('sentenceBurstiness', () => {
	it('returns null under 6 sentences', () => {
		expect(sentenceBurstiness('One two three. Four five six. Seven eight.')).toBeNull();
	});

	it('returns near-zero for metronome sentences', () => {
		const text = 'Cats sit on mats. Dogs run in parks. Birds fly to trees. Fish swim in lakes. Bees buzz near hives. Ants march in lines.';
		const cv = sentenceBurstiness(text);
		expect(cv).not.toBeNull();
		expect(cv!).toBeLessThan(0.15);
	});

	it('returns a higher value for varied sentence lengths', () => {
		const text =
			'Stop. The old train rolled past the empty station while rain hammered the broken roof above us. Why? Nobody knew the answer to that question at all. Years later we still talked about that strange night by the tracks and the sound it made. Done.';
		const cv = sentenceBurstiness(text);
		expect(cv).not.toBeNull();
		expect(cv!).toBeGreaterThan(0.5);
	});

	it('is exposed in scan results', () => {
		const text = 'Cats sit on mats. Dogs run in parks. Birds fly to trees. Fish swim in lakes. Bees buzz near hives. Ants march in lines.';
		const result = scanDeterministic(text, 'en');
		expect(result.burstiness).not.toBeNull();
	});
});

describe('Scanner A — does not crash on edge cases', () => {
	it('handles empty string', () => {
		const result = scanDeterministic('', 'en');
		expect(result.flags).toEqual([]);
		expect(result.adverbPct).toBe(0);
	});

	it('handles text without any flags', () => {
		const text = 'Cats sit on mats.';
		const result = scanDeterministic(text, 'en');
		expect(result.flags).toEqual([]);
	});
});
