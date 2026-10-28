import { mcpRoute } from '$lib/server/mcp/route';
import { consent } from '$lib/server/mcp/oauth';

export const POST = mcpRoute(({ request }, { config, origin }) => consent(request, config, origin), {
	perIp: true
});
