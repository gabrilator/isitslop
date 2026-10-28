// The MCP endpoint: one tool, check_text, on the same pipeline as /api/analyze.
// English only, behind the OAuth in oauth.ts, rate-limited per connection.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { analyze, rejectText } from '$lib/server/analyze';
import { mcpLimiter } from '$lib/server/rateLimit';
import { languageName, mainLanguage, wordCount } from '$lib/lang';
import { isWritingTip, slopTier } from '$lib/scanners/merge';
import { EN } from '$lib/stores/i18n';
import { authenticate } from './oauth';
import type { McpConfig } from './config';
import type { Flag } from '$lib/types';

const MAX_BODY_BYTES = 128_000; // 1500 words of JSON-RPC, with room to spare

const INSTRUCTIONS =
	'isitslop scores English text for signs of AI writing: a rule catalog built from the slop research, plus a Gemini judge. Call check_text on English drafts only. It refuses every other language, French included.';

const TIERS = {
	human: EN.tierHuman,
	mild: EN.tierMild,
	heavy: EN.tierHeavy,
	slop: EN.tierSlop
};

const flagShape = z.object({
	rule: z.string(),
	severity: z.enum(['red', 'yellow']),
	excerpt: z.string(),
	explanation: z.string(),
	suggestion: z.string().optional()
});

const checkShape = {
	score: z.number().describe('0 to 100. Under 15 reads human.'),
	tier: z.enum([TIERS.human, TIERS.mild, TIERS.heavy, TIERS.slop]),
	words: z.number(),
	flags: z.array(flagShape).describe('Slop flags. Each one counts toward the score.'),
	tips: z.array(flagShape).describe('Writing tips. They never count toward the score.'),
	llm: z.boolean().describe("Whether the Gemini judge ran and its flags are in."),
	warnings: z.array(z.string())
};

export type CheckResult = z.infer<z.ZodObject<typeof checkShape>>;

function toFlag(f: Flag): z.infer<typeof flagShape> {
	return {
		rule: f.ruleId,
		severity: f.severity,
		excerpt: f.excerpt,
		explanation: f.explanation,
		...(f.suggestion ? { suggestion: f.suggestion } : {})
	};
}

/** The tool's work, apart from the protocol: a result, or the reason it was refused. */
export async function checkText(
	text: string,
	opts: { judge: boolean; geminiKey: string; connection: string }
): Promise<CheckResult | { refused: string }> {
	const rejected = rejectText(text);
	if (rejected) return { refused: rejected };

	const code = mainLanguage(text);
	if (code !== 'eng') {
		const reads =
			code === 'und' ? "its language can't be told" : `this text reads as ${languageName(code)}`;
		return { refused: `Refused: isitslop checks English only, and ${reads}. Nothing was scored.` };
	}

	const { result, judged } = await analyze({
		text,
		language: 'en',
		apiKey: opts.geminiKey,
		judge: opts.judge,
		limiter: mcpLimiter,
		key: opts.connection
	});
	return {
		score: result.summary.slopScore,
		tier: TIERS[slopTier(result.summary.slopScore)],
		words: wordCount(text),
		flags: result.flags.filter((f) => !isWritingTip(f.ruleId)).map(toFlag),
		tips: result.flags.filter((f) => isWritingTip(f.ruleId)).map(toFlag),
		llm: judged,
		warnings: result.warnings ?? []
	};
}

export function createMcpServer(config: McpConfig, connection: string): McpServer {
	const server = new McpServer(
		{ name: 'isitslop', version: '1.0.0' },
		{ instructions: INSTRUCTIONS }
	);
	server.registerTool(
		'check_text',
		{
			title: 'Check English text for slop',
			description:
				'Checks an English draft for signs of AI writing with isitslop: its rule catalog plus a Gemini judge. ' +
				'Returns a score from 0 to 100 (under 15 reads human), the tier, the word count, the slop flags ' +
				'(each with the rule, severity, excerpt, why it reads as AI and usually a fix) and the writing tips, ' +
				'which never count. English only: text in any other language, French included, is refused. ' +
				'Takes 10 to 1500 words. deterministic_only skips the Gemini judge (rules only, instant).',
			inputSchema: {
				text: z.string().describe('The English text to check, 10 to 1500 words.'),
				deterministic_only: z
					.boolean()
					.optional()
					.describe('Skip the Gemini judge and run the rule catalog alone.')
			},
			outputSchema: checkShape,
			annotations: { readOnlyHint: true, openWorldHint: false }
		},
		async ({ text, deterministic_only }) => {
			const out = await checkText(text, {
				judge: !deterministic_only,
				geminiKey: config.geminiKey,
				connection
			});
			if ('refused' in out) {
				return { isError: true, content: [{ type: 'text' as const, text: out.refused }] };
			}
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(out) }],
				structuredContent: out
			};
		}
	);
	return server;
}

/** One HTTP request to /mcp: Streamable HTTP, stateless, JSON responses. */
export async function handleMcp(
	request: Request,
	config: McpConfig,
	origin: string
): Promise<Response> {
	// Clients outside a browser send no Origin. A browser from another site is refused (DNS rebinding).
	const from = request.headers.get('origin');
	if (from && from !== origin) return new Response('Untrusted request origin', { status: 403 });

	const connection = authenticate(request, config, origin);
	if (!connection) {
		const presented = request.headers.has('authorization') ? ', error="invalid_token"' : '';
		return Response.json(
			{ error: 'invalid_token', error_description: 'Sign in from your MCP client.' },
			{
				status: 401,
				headers: {
					'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"${presented}`,
					'cache-control': 'no-store'
				}
			}
		);
	}

	// Stateless: no server-initiated stream to open (GET) and no session to end (DELETE).
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
	}

	const gate = mcpLimiter.checkRequest(connection.grant);
	if (!gate.ok) {
		return new Response('Too many requests. Slow down.', {
			status: 429,
			headers: { 'retry-after': String(gate.retryAfterSec) }
		});
	}

	const server = createMcpServer(config, connection.grant);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
		maxRequestBodySize: MAX_BODY_BYTES
	});
	await server.connect(transport);
	try {
		return await transport.handleRequest(request);
	} finally {
		await server.close();
	}
}
