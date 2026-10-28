import { mcpRoute } from '$lib/server/mcp/route';
import { googleCallback } from '$lib/server/mcp/oauth';

export const GET = mcpRoute(
	({ request }, { config, origin }) => googleCallback(request, config, origin),
	{ perIp: true }
);
