import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { crossSiteForm } from '$lib/server/csrf';

export const handle: Handle = async ({ event, resolve }) => {
	// Like SvelteKit's own check, it stays out of the way in dev.
	if (!dev && crossSiteForm(event.request, event.url)) {
		return new Response(`Cross-site ${event.request.method} form submissions are forbidden`, {
			status: 403
		});
	}
	return resolve(event);
};
