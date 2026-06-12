import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { runScanners } from '$lib/scanners';
import { geminiAdapter } from '$lib/llm/gemini';
import { resolveLanguage, wordCount } from '$lib/lang';
import { checkRequest, checkLLM, recordLLM } from '$lib/server/rateLimit';
import { textSanity } from '$lib/server/guards';
import type { AnalyzeRequestBody } from '$lib/types';

const MIN_WORDS = 10;
const MAX_WORDS = 1500;
const MAX_BODY_BYTES = 96_000;

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const gate = checkRequest(ip);
	if (!gate.ok) {
		return json(
			{ message: 'Too many requests. Slow down.' },
			{ status: 429, headers: { 'retry-after': String(gate.retryAfterSec) } }
		);
	}

	const declaredBytes = Number(request.headers.get('content-length') ?? 0);
	if (declaredBytes > MAX_BODY_BYTES) throw error(413, 'Request body too large');

	let body: AnalyzeRequestBody;
	try {
		body = (await request.json()) as AnalyzeRequestBody;
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const text = typeof body.text === 'string' ? body.text : '';
	const provider = body.provider ?? 'google';
	const langChoice = body.language ?? 'auto';

	if (provider !== 'google') throw error(400, `Unsupported provider: ${provider}`);
	if (langChoice !== 'auto' && langChoice !== 'en' && langChoice !== 'es') {
		throw error(400, `Unsupported language: ${langChoice}`);
	}

	const words = wordCount(text);
	if (words < MIN_WORDS) throw error(400, `Text too short (need ≥ ${MIN_WORDS} words)`);
	if (words > MAX_WORDS) throw error(400, `Text too long (max ${MAX_WORDS} words)`);

	const sanity = textSanity(text);
	if (sanity) throw error(400, sanity);

	const apiKey = env.GOOGLE_GENAI_API_KEY || '';
	let useLLM = Boolean(apiKey);

	// Every LLM pass runs on the server key, so every one is metered per IP.
	let llmLimited = false;
	if (useLLM) {
		if (checkLLM(ip)) {
			recordLLM(ip);
		} else {
			useLLM = false;
			llmLimited = true;
		}
	}

	const language = resolveLanguage(text, langChoice);

	const result = await runScanners({
		text,
		language,
		adapter: geminiAdapter,
		apiKey,
		useLLM
	});

	if (llmLimited) {
		result.warnings = [
			...(result.warnings ?? []),
			'LLM rate limit reached, deterministic rules only for now. Try again in a bit.'
		];
	} else if (!useLLM) {
		result.warnings = [
			...(result.warnings ?? []),
			'No API key provided, LLM scanners skipped (deterministic only).'
		];
	}

	return json(result);
};
