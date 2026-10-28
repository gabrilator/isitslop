// Preloaded into the server by scripts/smoke-mcp.mjs (node --import), never in
// production. It answers Google's token endpoint so the sign-in runs without a
// Google account: the smoke test passes the email and nonce as the "code".

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const realFetch = globalThis.fetch;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

globalThis.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	if (url !== GOOGLE_TOKEN) return realFetch(input, init);
	const form = new URLSearchParams(String(init?.body ?? ''));
	const { email, nonce } = JSON.parse(Buffer.from(form.get('code'), 'base64url').toString('utf8'));
	const now = Math.floor(Date.now() / 1000);
	const claims = {
		iss: 'https://accounts.google.com',
		aud: form.get('client_id'),
		sub: email,
		email,
		email_verified: true,
		nonce,
		iat: now,
		exp: now + 3600
	};
	return Response.json({
		access_token: 'fake',
		token_type: 'Bearer',
		expires_in: 3600,
		id_token: `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}.fake`
	});
};
