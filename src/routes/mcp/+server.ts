import { mcpRoute } from '$lib/server/mcp/route';
import { handleMcp } from '$lib/server/mcp/server';

const handler = mcpRoute(({ request }, { config, origin }) => handleMcp(request, config, origin));

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
