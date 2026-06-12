import type { Language } from '$lib/types';

export interface Strings {
	tagline: string;
	openSourceRules: string;
	placeholder: string;
	words: string;
	min: string;
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
}

export const EN: Strings = {
	tagline: "Catch it before it's too late.",
	openSourceRules: 'Open-source rules',
	placeholder: 'Paste your text here',
	words: 'words',
	min: 'min 20',
	max: 'max 1000',
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
	tooShort: 'Need at least 20 words to analyze.',
	tooLong: 'Maximum 1000 words.',
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
	flagsWord: 'flags'
};

export const ES: Strings = {
	tagline: 'Atrapala antes de que sea tarde.',
	openSourceRules: 'Reglas abiertas',
	placeholder: 'Pegá tu texto acá',
	words: 'palabras',
	min: 'min 20',
	max: 'max 1000',
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
	tooShort: 'Necesito al menos 20 palabras.',
	tooLong: 'Máximo 1000 palabras.',
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
	flagsWord: 'marcas'
};

export function strings(lang: Language): Strings {
	return lang === 'es' ? ES : EN;
}
