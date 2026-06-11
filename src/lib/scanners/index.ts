import type { Language, ScanResult } from '$lib/types';
import type { LLMAdapter } from '$lib/llm/adapter';
import { scanDeterministic } from './deterministic';
import { scanLLM } from './llm';
import { mergeFlags, computeSlopScore } from './merge';
import { wordCount as countWords } from '$lib/lang';

export interface RunScannersParams {
	text: string;
	language: Language;
	adapter: LLMAdapter;
	apiKey: string;
	useLLM: boolean;
}

export async function runScanners(params: RunScannersParams): Promise<ScanResult> {
	const det = scanDeterministic(params.text, params.language);

	const warnings: string[] = [];
	let llmFlags: typeof det.flags = [];

	if (params.useLLM) {
		try {
			llmFlags = await scanLLM(params.adapter, params.text, params.language, params.apiKey);
		} catch (err) {
			warnings.push(`llm: ${(err as Error).message}`);
		}
	}

	const merged = mergeFlags(params.text, det.flags, llmFlags);
	const redCount = merged.filter((f) => f.severity === 'red').length;
	const yellowCount = merged.filter((f) => f.severity === 'yellow').length;

	const slopScore = computeSlopScore({
		flags: merged,
		wordCount: countWords(params.text),
		text: params.text
	});

	return {
		flags: merged,
		summary: {
			redCount,
			yellowCount,
			adverbPct: det.adverbPct,
			passiveCount: det.passiveCount,
			slopScore,
			burstiness: det.burstiness
		},
		language: params.language,
		warnings: warnings.length ? warnings : undefined
	};
}
