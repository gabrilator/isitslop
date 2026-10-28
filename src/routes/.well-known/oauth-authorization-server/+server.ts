import { mcpRoute, preflight } from '$lib/server/mcp/route';
import { authServerMetadata, oauthHeaders } from '$lib/server/mcp/oauth';

export const GET = mcpRoute((_, { origin }) =>
	Response.json(authServerMetadata(origin), { headers: oauthHeaders })
);
export const OPTIONS = preflight;
