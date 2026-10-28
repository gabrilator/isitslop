// The pipeline behind both /api/analyze and the MCP tool: the word limits, the
// prose guard, the rule catalog, and the Gemini judge when there is a key and
// budget left for it.

import { runScanners } from '$lib/scanners';
import { geminiAdapter } from '$lib/llm/gemini';
import { wordCount } from '$lib/lang';
import { textSanity } from './guards';
import type { Limiter } from './rateLimit';
import type { Language, ScanResult } from '$lib/types';

export const MIN_WORDS = 10;
export const MAX_WORDS = 1500;

/** Why the text can't be analyzed, or null when it can. */
export function rejectText(text: string): string | null {
	const words = wordCount(text);
	if (words < MIN_WORDS) return `Text too short (need ≥ ${MIN_WORDS} words)`;
	if (words > MAX_WORDS) return `Text too long (max ${MAX_WORDS} words)`;
	return textSanity(text);
}

export interface AnalyzeParams {
	text: string;
	language: Language;
	apiKey: string;
	/** The caller wants the Gemini judge. It still needs a key and budget. */
	judge: boolean;
	limiter: Limiter;
	/** Rate-limit bucket: the visitor's IP on the site, the connection over MCP. */
	key: string;
}

export async function analyze(
	params: AnalyzeParams
): Promise<{ result: ScanResult; judged: boolean }> {
	let useLLM = params.judge && Boolean(params.apiKey);

	// Every LLM pass runs on the server key, so every one is metered.
	let llmLimited = false;
	if (useLLM) {
		if (params.limiter.checkLLM(params.key)) {
			params.limiter.recordLLM(params.key);
		} else {
			useLLM = false;
			llmLimited = true;
		}
	}

	const result = await runScanners({
		text: params.text,
		language: params.language,
		adapter: geminiAdapter,
		apiKey: params.apiKey,
		useLLM
	});

	// runScanners reports a failed judge as an "llm: …" warning and carries on.
	const judged = useLLM && !(result.warnings ?? []).some((w) => w.startsWith('llm:'));

	if (llmLimited) {
		result.warnings = [
			...(result.warnings ?? []),
			'LLM rate limit reached, deterministic rules only for now. Try again in a bit.'
		];
	} else if (params.judge && !useLLM) {
		result.warnings = [
			...(result.warnings ?? []),
			'No API key provided, LLM scanners skipped (deterministic only).'
		];
	}

	return { result, judged };
}
