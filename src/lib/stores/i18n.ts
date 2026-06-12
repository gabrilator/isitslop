import type { Language } from '$lib/types';

export interface Strings {
	tagline: string;
	openSourceRules: string;
	placeholder: string;
	words: string;
	max: string;
	analyze: string;
	analyzing: string;
	settings: string;
	provider: string;
	language: string;
	auto: string;
	english: string;
	spanish: string;
	mascotName: string;
	clean: string;
	slopScore: string;
	red: string;
	yellow: string;
	adverbs: string;
	passive: string;
	noFlags: string;
	tooShort: string;
	tooLong: string;
	editAgain: string;
	close: string;
	save: string;
	cancel: string;
	footerBy: string;
	errorTitle: string;
	rerun: string;
	slopFlags: string;
	writingTips: string;
	rhythm: string;
	rhythmMonotone: string;
	rhythmSteady: string;
	rhythmVaried: string;
	flagsWord: string;
	readingGrade: string;
	gradeEasy: string;
	gradeFormal: string;
	gradeDense: string;
	gradeInfo: string;
	gradeInfoLabel: string;
	tierHuman: string;
	tierMild: string;
	tierHeavy: string;
	tierSlop: string;
	aboutTitle: string;
	aboutPhilosophy: string;
}

export const EN: Strings = {
	tagline: "Catch it before it's too late.",
	openSourceRules: 'Open-source rules',
	placeholder: 'Paste your text here',
	words: 'words',
	max: 'max 1500',
	analyze: 'Analyze',
	analyzing: 'Analyzing',
	settings: 'Settings',
	provider: 'Provider',
	language: 'Language',
	auto: 'Auto',
	english: 'EN',
	spanish: 'ES',
	mascotName: 'Polly',
	clean: 'Looks clean.',
	slopScore: 'Slop score',
	red: 'red flags',
	yellow: 'yellow flags',
	adverbs: 'adverb density',
	passive: 'passive voice',
	noFlags: 'No flags. Either it is genuinely clean or your text is too plain to judge.',
	tooShort: 'Need at least 10 words to analyze.',
	tooLong: 'Maximum 1500 words.',
	editAgain: 'Edit again',
	close: 'Close',
	save: 'Save',
	cancel: 'Cancel',
	footerBy: 'by gabricebria.com',
	errorTitle: 'Could not analyze',
	rerun: 'Try again',
	slopFlags: 'Slop flags',
	writingTips: 'Writing tips',
	rhythm: 'Sentence rhythm',
	rhythmMonotone: 'Monotone, AI-like uniformity',
	rhythmSteady: 'Steady',
	rhythmVaried: 'Varied, reads human',
	flagsWord: 'flags',
	readingGrade: 'Reading grade',
	gradeEasy: 'Conversational',
	gradeFormal: 'Formal',
	gradeDense: 'Dense',
	gradeInfo:
		'Flesch-Kincaid grade: the US school grade needed to read this with ease. Aim for 6 to 9 for a general audience.',
	gradeInfoLabel: 'What is this?',
	tierHuman: 'Reads human',
	tierMild: 'Mild',
	tierHeavy: 'Heavy',
	tierSlop: 'Slop',
	aboutTitle: 'Built on published research',
	aboutPhilosophy:
		'Every flag names the rule that fired and the research behind it. Your text is analyzed once and never stored.'
};

export const ES: Strings = {
	tagline: 'Atrapala antes de que sea tarde.',
	openSourceRules: 'Reglas abiertas',
	placeholder: 'Pegá tu texto acá',
	words: 'palabras',
	max: 'max 1500',
	analyze: 'Analizar',
	analyzing: 'Analizando',
	settings: 'Ajustes',
	provider: 'Proveedor',
	language: 'Idioma',
	auto: 'Auto',
	english: 'EN',
	spanish: 'ES',
	mascotName: 'Lorito',
	clean: 'Se ve limpio.',
	slopScore: 'Puntaje de slop',
	red: 'banderas rojas',
	yellow: 'banderas amarillas',
	adverbs: 'densidad de adverbios',
	passive: 'voz pasiva',
	noFlags: 'Sin marcas. O el texto es genuinamente limpio, o es demasiado neutro para juzgar.',
	tooShort: 'Necesito al menos 10 palabras.',
	tooLong: 'Máximo 1500 palabras.',
	editAgain: 'Volver a editar',
	close: 'Cerrar',
	save: 'Guardar',
	cancel: 'Cancelar',
	footerBy: 'por gabricebria.com',
	errorTitle: 'No pude analizar',
	rerun: 'Reintentar',
	slopFlags: 'Banderas de slop',
	writingTips: 'Consejos de escritura',
	rhythm: 'Ritmo de oraciones',
	rhythmMonotone: 'Monótono, uniformidad típica de IA',
	rhythmSteady: 'Estable',
	rhythmVaried: 'Variado, suena humano',
	flagsWord: 'marcas',
	readingGrade: 'Nivel de lectura',
	gradeEasy: 'Conversacional',
	gradeFormal: 'Formal',
	gradeDense: 'Denso',
	gradeInfo:
		'Nivel Flesch-Kincaid: el grado escolar que pide el texto para leerse fácil. Apuntá a 6 a 9 para público general.',
	gradeInfoLabel: '¿Qué es esto?',
	tierHuman: 'Suena humano',
	tierMild: 'Leve',
	tierHeavy: 'Pesado',
	tierSlop: 'Slop',
	aboutTitle: 'Basado en investigación publicada',
	aboutPhilosophy:
		'Cada marca nombra la regla que la disparó y la investigación detrás. Tu texto se analiza una vez y nunca se guarda.'
};

export function strings(lang: Language): Strings {
	return lang === 'es' ? ES : EN;
}
