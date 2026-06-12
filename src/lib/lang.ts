import { franc } from 'franc-min';
import rs from 'text-readability';
import type { Language, LanguageChoice } from '$lib/types';

export function resolveLanguage(text: string, choice: LanguageChoice): Language {
	if (choice === 'en' || choice === 'es') return choice;
	const code = franc(text, { minLength: 10 });
	if (code === 'spa') return 'es';
	return 'en';
}

export function wordCount(text: string): number {
	return text.trim().split(/\s+/u).filter(Boolean).length;
}

/** Flesch-Kincaid grade level. English only for now; null otherwise. */
export function readingGrade(text: string, language: Language): number | null {
	if (language !== 'en') return null;
	const grade = rs.fleschKincaidGrade(text);
	if (!Number.isFinite(grade)) return null;
	return Math.max(0, Math.round(grade * 10) / 10);
}
