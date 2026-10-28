import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { resolveLanguage, foreignLanguageNotice } from '$lib/lang';
import { checkRequest, siteLimiter } from '$lib/server/rateLimit';
import { clientIp } from '$lib/server/clientIp';
import { analyze, rejectText } from '$lib/server/analyze';
import type { AnalyzeRequestBody } from '$lib/types';

const MAX_BODY_BYTES = 96_000;

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = clientIp(getClientAddress(), request.headers);
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

	const rejected = rejectText(text);
	if (rejected) throw error(400, rejected);

	const { result } = await analyze({
		text,
		language: resolveLanguage(text, langChoice),
		apiKey: env.GOOGLE_GENAI_API_KEY || '',
		judge: true,
		limiter: siteLimiter,
		key: ip
	});

	const notice = foreignLanguageNotice(text);
	if (notice) {
		result.warnings = [notice, ...(result.warnings ?? [])];
	}

	return json(result);
};
