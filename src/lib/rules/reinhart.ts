import type { Flag, Language } from '$lib/types';

// Plugin: "reinhart" — register signals from Reinhart et al., PNAS 2025
// (arXiv:2410.16107). Instruction-tuned models write a noun-heavy register:
// nominalizations at 1.5-2x human rates and present participial clauses at
// 2-5x. Density signals, so they only run on texts of 400+ words, and they
// land as writing tips (no score impact) until calibrated against corpora.

export const REINHART_MIN_WORDS = 400;

// Human baselines (per 100 words), estimated from the paper's corpora and
// pending calibration against AuTexTification. The gate is relative, never
// absolute: the finding is "models do this MORE than people", so nothing
// is flagged below FLAG_AT_MULTIPLE times the human rate.
const HUMAN_NOMINALIZATION_PER_100: Record<Language, number> = { en: 2.7, es: 3.2 };
const HUMAN_PARTICIPIAL_PER_100 = 0.7;
const FLAG_AT_MULTIPLE = 2;
const PARTICIPIAL_MIN_HITS = 5;

const NOMINALIZATION_EN = /\b[A-Za-z]{3,}(?:tions?|sions?|ments?|ity|ities|ness|nesses)\b/g;
const NOMINALIZATION_ES = /\b\p{L}{3,}(?:ción|ciones|sión|siones|miento|mientos|idad|idades)\b/giu;

const NOMINALIZATION_FP_EN = new Set([
	'business',
	'businesses',
	'witness',
	'witnesses',
	'harness',
	'harnesses'
]);
const NOMINALIZATION_FP_ES = new Set(['navidad', 'navidades']);

const PARTICIPIAL_COMMA_EN = /,\s+([A-Za-z]{3,}ing)\b/g;
const PARTICIPIAL_OPENER_EN = /(?:^|[.!?]\s+|\n)([A-Z][a-z]{2,}ing)\b[^.!?\n]{0,80}?,/g;
const PARTICIPIAL_COMMA_ES = /,\s+(\p{L}{2,}(?:ando|iendo|yendo))\b/giu;
const PARTICIPIAL_OPENER_ES = /(?:^|[.!?]\s+|\n)(\p{L}{2,}(?:ando|iendo|yendo))\b[^.!?\n]{0,80}?,/giu;

const GERUND_FP_EN = new Set([
	'during',
	'morning',
	'evening',
	'something',
	'anything',
	'nothing',
	'everything',
	'spring',
	'sibling',
	'ceiling',
	'darling',
	'wedding',
	'pudding',
	'sterling',
	'herring',
	'inning',
	'awning',
	'lightning',
	'clothing'
]);
const GERUND_FP_ES = new Set(['cuando', 'bando', 'mando', 'comando', 'contrabando', 'blando']);

interface Hit {
	start: number;
	end: number;
	excerpt: string;
}

function collect(text: string, re: RegExp, fp: Set<string>): Hit[] {
	const hits: Hit[] = [];
	re.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const word = m[1] ?? m[0];
		if (fp.has(word.toLowerCase())) continue;
		const start = m.index + m[0].indexOf(word);
		hits.push({ start, end: start + word.length, excerpt: word });
		if (m.index === re.lastIndex) re.lastIndex++;
	}
	return hits;
}

export function reinhartFlags(text: string, language: Language): Flag[] {
	const words = text.trim().split(/\s+/u).filter(Boolean).length;
	if (words < REINHART_MIN_WORDS) return [];
	const flags: Flag[] = [];

	const nomRe = language === 'es' ? NOMINALIZATION_ES : NOMINALIZATION_EN;
	const nomFp = language === 'es' ? NOMINALIZATION_FP_ES : NOMINALIZATION_FP_EN;
	const noms = collect(text, nomRe, nomFp);
	const nomMultiple = (noms.length / words) * 100 / HUMAN_NOMINALIZATION_PER_100[language];
	if (nomMultiple >= FLAG_AT_MULTIPLE) {
		const m = nomMultiple.toFixed(1);
		const explanation =
			language === 'es'
				? `Nominalizaciones a ${m}x la tasa humana (Reinhart 2025).`
				: `Nominalizations at ${m}x the human rate (Reinhart 2025).`;
		const suggestion =
			language === 'es'
				? 'Cambiá algunos sustantivos en -ción por verbos.'
				: 'Swap a few of these nouns back into verbs.';
		for (const h of noms) {
			flags.push({
				ruleId: 'nominalization',
				severity: 'yellow',
				startIndex: h.start,
				endIndex: h.end,
				excerpt: h.excerpt,
				explanation,
				suggestion
			});
		}
	}

	const commaRe = language === 'es' ? PARTICIPIAL_COMMA_ES : PARTICIPIAL_COMMA_EN;
	const openerRe = language === 'es' ? PARTICIPIAL_OPENER_ES : PARTICIPIAL_OPENER_EN;
	const gerundFp = language === 'es' ? GERUND_FP_ES : GERUND_FP_EN;
	const seen = new Set<number>();
	const participials = [...collect(text, commaRe, gerundFp), ...collect(text, openerRe, gerundFp)]
		.filter((h) => !seen.has(h.start) && seen.add(h.start))
		.sort((a, b) => a.start - b.start);
	const partMultiple = (participials.length / words) * 100 / HUMAN_PARTICIPIAL_PER_100;
	if (participials.length >= PARTICIPIAL_MIN_HITS && partMultiple >= FLAG_AT_MULTIPLE) {
		const m = partMultiple.toFixed(1);
		const explanation =
			language === 'es'
				? `Cláusulas de gerundio a ${m}x la tasa humana (Reinhart 2025).`
				: `Participial clauses at ${m}x the human rate (Reinhart 2025).`;
		for (const h of participials) {
			flags.push({
				ruleId: 'participial-clause',
				severity: 'yellow',
				startIndex: h.start,
				endIndex: h.end,
				excerpt: h.excerpt,
				explanation
			});
		}
	}

	return flags;
}
