import { mcpRoute, preflight } from '$lib/server/mcp/route';
import { register } from '$lib/server/mcp/oauth';

export const POST = mcpRoute(({ request }, { config }) => register(request, config), {
	perIp: true
});
export const OPTIONS = preflight;
