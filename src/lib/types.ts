export type Severity = 'red' | 'yellow';
export type Language = 'en' | 'es';
export type LanguageChoice = 'auto' | Language;
export type Provider = 'google';

export interface Flag {
	ruleId: string;
	severity: Severity;
	startIndex: number;
	endIndex: number;
	excerpt: string;
	explanation: string;
	suggestion?: string;
	instance?: number;
	ruleCount?: number;
}

export interface ScanSummary {
	redCount: number;
	yellowCount: number;
	adverbPct: number;
	passiveCount: number;
	slopScore: number;
	/** Coefficient of variation of words-per-sentence; null when under 6 sentences. */
	burstiness: number | null;
	/** Flesch-Kincaid grade level; null for non-English text. */
	readingGrade: number | null;
}

export interface ScanResult {
	flags: Flag[];
	summary: ScanSummary;
	language: Language;
	warnings?: string[];
}

export interface AnalyzeRequestBody {
	text: string;
	provider: Provider;
	language: LanguageChoice;
}
