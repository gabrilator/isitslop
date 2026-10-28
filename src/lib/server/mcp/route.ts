// Glue for the MCP and OAuth routes: read the config from the environment,
// check the origin, and meter the OAuth endpoints per IP.

import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { clientIp } from '$lib/server/clientIp';
import { oauthLimiter } from '$lib/server/rateLimit';
import { mcpOrigin, readMcpConfig, type McpConfig } from './config';

interface McpContext {
	config: McpConfig;
	origin: string;
}

export function mcpRoute(
	fn: (event: RequestEvent, ctx: McpContext) => Response | Promise<Response>,
	{ perIp = false } = {}
) {
	return (event: RequestEvent): Response | Promise<Response> => {
		const config = readMcpConfig(env);
		if (typeof config === 'string') {
			return new Response(config, { status: 404, headers: { 'content-type': 'text/plain' } });
		}
		const origin = mcpOrigin(event.url);
		if (!origin) return new Response('MCP needs HTTPS.', { status: 403 });
		if (perIp) {
			const ip = clientIp(event.getClientAddress(), event.request.headers);
			const gate = oauthLimiter.checkRequest(ip);
			if (!gate.ok) {
				return new Response('Too many requests. Slow down.', {
					status: 429,
					headers: { 'retry-after': String(gate.retryAfterSec) }
				});
			}
		}
		return fn(event, { config, origin });
	};
}

/** CORS preflight for the endpoints a browser-based MCP client may call. */
export function preflight(): Response {
	return new Response(null, {
		status: 204,
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, POST, OPTIONS',
			'access-control-allow-headers': 'content-type, authorization, mcp-protocol-version'
		}
	});
}
