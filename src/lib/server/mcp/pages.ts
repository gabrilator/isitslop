// The two pages a person sees during MCP sign-in: the consent step after
// Google, and the message when something has to start over. Plain HTML, no
// layout and no analytics, so nothing in these URLs leaves the server.

const CSS = `
body{margin:0;background:#fafaf7;color:#1a1a1a;font:18px/1.55 'Source Serif 4',Georgia,serif}
main{max-width:34rem;margin:12vh auto;padding:0 16px}
img{width:48px;height:48px}
h1{font-size:1.6rem;line-height:1.25;margin:.6rem 0 1rem}
.quiet{color:#5c574f;font-size:.95rem}
form{display:flex;gap:.75rem;margin-top:1.75rem}
button{font:600 .95rem 'IBM Plex Mono',ui-monospace,monospace;padding:.6rem 1.2rem;border:1px solid #1a1a1a;border-radius:4px;background:#1a1a1a;color:#fafaf7;cursor:pointer}
button.ghost{background:transparent;color:#1a1a1a}
`;

const HEADERS = {
	'content-type': 'text/html; charset=utf-8',
	'cache-control': 'no-store',
	'x-frame-options': 'DENY',
	'content-security-policy':
		"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
	// Not 'no-referrer': with it, browsers post the form with Origin: null and the CSRF check refuses it.
	'referrer-policy': 'same-origin'
};

function esc(s: string): string {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}

function page(status: number, title: string, body: string): Response {
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body><main><img src="/parrot.svg" alt=""><h1>${esc(title)}</h1>${body}</main></body>
</html>`;
	return new Response(html, { status, headers: HEADERS });
}

export function messagePage(status: number, title: string, message: string): Response {
	return page(status, title, `<p>${esc(message)}</p>`);
}

export function consentPage(p: {
	client: string;
	email: string;
	returnTo: string;
	ticket: string;
}): Response {
	return page(
		200,
		'Connect to isitslop',
		`<p><strong>${esc(p.client)}</strong> wants to check English text with isitslop as ${esc(p.email)}.</p>
<p class="quiet">The app chose that name itself. Connect only if you just started this from your own MCP client. You'll go back to ${esc(p.returnTo)}.</p>
<form method="post" action="/oauth/consent">
<input type="hidden" name="ticket" value="${esc(p.ticket)}">
<button name="decision" value="allow">Connect</button>
<button name="decision" value="deny" class="ghost">Cancel</button>
</form>`
	);
}
