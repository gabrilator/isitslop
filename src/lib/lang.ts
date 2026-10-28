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

const SUPPORTED_CODES = new Set(['eng', 'spa', 'und']);

const LANG_NAMES: Record<string, string> = {
	eng: 'English',
	spa: 'Spanish',
	fra: 'French',
	ita: 'Italian',
	deu: 'German',
	por: 'Portuguese',
	cmn: 'Chinese',
	jpn: 'Japanese',
	kor: 'Korean',
	rus: 'Russian',
	nld: 'Dutch',
	pol: 'Polish',
	tur: 'Turkish',
	arb: 'Arabic',
	hin: 'Hindi',
	vie: 'Vietnamese',
	ukr: 'Ukrainian',
	swe: 'Swedish',
	dan: 'Danish',
	nob: 'Norwegian',
	fin: 'Finnish',
	ron: 'Romanian',
	ces: 'Czech',
	slk: 'Slovak',
	ell: 'Greek',
	cat: 'Catalan',
	glg: 'Galician',
	eus: 'Basque',
	heb: 'Hebrew',
	ind: 'Indonesian',
	tha: 'Thai',
	hun: 'Hungarian',
	bul: 'Bulgarian',
	srp: 'Serbian',
	hrv: 'Croatian'
};

/** franc's ISO 639-3 code for the MAIN language of the text, 'und' when it can't tell. */
export function mainLanguage(text: string): string {
	return franc(text, { minLength: 10 });
}

export function languageName(code: string): string {
	return LANG_NAMES[code] ?? code;
}

/** Warns when the MAIN language is neither English nor Spanish. */
export function foreignLanguageNotice(text: string): string | null {
	const code = mainLanguage(text);
	if (SUPPORTED_CODES.has(code)) return null;
	return `Main language looks like ${languageName(code)}. The rules cover English and Spanish only, so results are unreliable.`;
}

/** Flesch-Kincaid grade level. English only for now; null otherwise. */
export function readingGrade(text: string, language: Language): number | null {
	if (language !== 'en') return null;
	const grade = rs.fleschKincaidGrade(text);
	if (!Number.isFinite(grade)) return null;
	return Math.max(0, Math.round(grade * 10) / 10);
}
