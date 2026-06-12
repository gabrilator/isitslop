// The "despite challenges, bright future" formula. From Wikipedia's
// AI-cleanup catalog: a rigid closing shape, not any mention of the
// word "challenges".

export const DESPITE_PATTERNS_EN: RegExp[] = [
	/\bdespite\s+(?:its|these|those|the|such|many|numerous|several)\b[^.!?\n]{0,40}?\bchallenges\b/gi,
	/\bfac(?:es|e|ing)\s+(?:several|numerous|significant|many|various)\s+challenges\b/gi,
	/\bchallenges\s+and\s+(?:future\s+)?(?:prospects|opportunities)\b/gi,
	/\bfuture\s+(?:outlook|prospects)\b/gi
];

export const DESPITE_PATTERNS_ES: RegExp[] = [
	/\ba\s+pesar\s+de\s+(?:estos|esos|los|sus|tales|muchos|numerosos|varios)\b[^.!?\n]{0,40}?\bdesaf[íi]os\b/giu,
	/\benfrentan?\s+(?:varios|numerosos|grandes|importantes|m[úu]ltiples)\s+(?:desaf[íi]os|retos)\b/giu,
	/\b(?:desaf[íi]os|retos)\s+y\s+(?:perspectivas|oportunidades)\b/giu,
	/\bperspectivas?\s+(?:de\s+futuro|futuras?)\b/giu
];
