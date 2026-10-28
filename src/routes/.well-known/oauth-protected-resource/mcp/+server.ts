import { mcpRoute, preflight } from '$lib/server/mcp/route';
import { oauthHeaders, resourceMetadata } from '$lib/server/mcp/oauth';

export const GET = mcpRoute((_, { origin }) =>
	Response.json(resourceMetadata(origin), { headers: oauthHeaders })
);
export const OPTIONS = preflight;
