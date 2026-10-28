// SvelteKit's form-origin (CSRF) rule, moved here so it can skip one path: MCP
// clients post form-encoded requests to /oauth/token from outside any browser,
// with no Origin header and no cookies to ride on. svelte.config.js turns the
// built-in check off and src/hooks.server.ts runs this one instead.

const FORM_TYPES = new Set([
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	'application/x-sveltekit-formdata'
]);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MACHINE_FORMS = new Set(['/oauth/token']);

export function crossSiteForm(request: Request, url: URL): boolean {
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	return (
		UNSAFE_METHODS.has(request.method) &&
		FORM_TYPES.has(type) &&
		request.headers.get('origin') !== url.origin &&
		!MACHINE_FORMS.has(url.pathname)
	);
}
