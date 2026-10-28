// What the MCP endpoint needs from the environment. Until all four required
// values are set, every MCP and OAuth route answers 404 and the site runs as
// before.

export interface McpConfig {
	secret: string;
	/** Lowercased Google addresses allowed to connect. */
	allowed: Set<string>;
	googleClientId: string;
	googleClientSecret: string;
	/** The site's Gemini key, for the LLM judge. Without it the rules run alone. */
	geminiKey: string;
}

export const MIN_SECRET_LENGTH = 32;

export const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The config, or a sentence saying what's missing. */
export function readMcpConfig(env: Record<string, string | undefined>): McpConfig | string {
	const secret = env.MCP_SECRET ?? '';
	const allowed = new Set(
		(env.MCP_ALLOWED_EMAILS ?? '')
			.split(',')
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean)
	);
	const missing: string[] = [];
	if (secret.length < MIN_SECRET_LENGTH) missing.push(`MCP_SECRET (${MIN_SECRET_LENGTH}+ characters)`);
	if (!allowed.size) missing.push('MCP_ALLOWED_EMAILS');
	if (!env.GOOGLE_OAUTH_CLIENT_ID) missing.push('GOOGLE_OAUTH_CLIENT_ID');
	if (!env.GOOGLE_OAUTH_CLIENT_SECRET) missing.push('GOOGLE_OAUTH_CLIENT_SECRET');
	if (missing.length) return `MCP is off on this server. Set ${missing.join(', ')}.`;
	return {
		secret,
		allowed,
		googleClientId: env.GOOGLE_OAUTH_CLIENT_ID!,
		googleClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
		geminiKey: env.GOOGLE_GENAI_API_KEY ?? ''
	};
}

/** The public origin when it's HTTPS. Plain HTTP passes only on loopback, for local runs. */
export function mcpOrigin(url: URL): string | null {
	if (url.protocol === 'https:') return url.origin;
	return url.protocol === 'http:' && LOOPBACK.has(url.hostname) ? url.origin : null;
}
