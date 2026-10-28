import { mcpRoute } from '$lib/server/mcp/route';
import { authorize } from '$lib/server/mcp/oauth';

export const GET = mcpRoute(({ url }, { config, origin }) => authorize(url, config, origin), {
	perIp: true
});
