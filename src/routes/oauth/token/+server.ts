import { mcpRoute, preflight } from '$lib/server/mcp/route';
import { token } from '$lib/server/mcp/oauth';

export const POST = mcpRoute(({ request }, { config, origin }) => token(request, config, origin), {
	perIp: true
});
export const OPTIONS = preflight;
