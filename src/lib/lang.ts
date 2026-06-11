import { franc } from 'franc-min';
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
