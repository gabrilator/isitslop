import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readMcpConfig, type McpConfig } from '../src/lib/server/mcp/config';
import {
	authServerMetadata,
	authenticate,
	authorize,
	consent,
	googleCallback,
	register,
	resetSpentCodes,
	resourceMetadata,
	token
} from '../src/lib/server/mcp/oauth';
import { checkText, handleMcp } from '../src/lib/server/mcp/server';
import { analyze, rejectText } from '../src/lib/server/analyze';
import { crossSiteForm } from '../src/lib/server/csrf';
import { createLimiter, resetRateLimits } from '../src/lib/server/rateLimit';

const ORIGIN = 'https://isitslop.test';
const OWNER = 'gabceboli@gmail.com';
const REDIRECT = 'http://127.0.0.1:43210/callback';

const env = {
	MCP_SECRET: 'a-test-secret-that-is-long-enough-to-sign',
	MCP_ALLOWED_EMAILS: OWNER,
	GOOGLE_OAUTH_CLIENT_ID: 'isitslop-test.apps.googleusercontent.com',
	GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret'
};
const config = readMcpConfig(env) as McpConfig;

const SLOP = readFileSync(join(__dirname, 'fixtures', 'slop.en.txt'), 'utf8');
const FRENCH =
	"Bonjour Marie, j'ai lu votre publication sur le déménagement du studio à Montréal. Vous disiez que le plus difficile, c'est de garder les clients pendant la transition. Est-ce qu'une courte liste de vérification vous serait utile?";
const SPANISH =
	'Hola Marta, leí tu publicación sobre la mudanza del estudio a Madrid. Decías que lo más difícil es mantener a los clientes durante la transición. ¿Te serviría una lista corta de verificación?';

beforeEach(() => {
	resetRateLimits();
	resetSpentCodes();
});

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** A Google token endpoint that signs the browser in as `email`. */
function fakeGoogle(email: string, nonce: string, overrides: Record<string, unknown> = {}) {
	const claims = {
		iss: 'https://accounts.google.com',
		aud: config.googleClientId,
		sub: '1234',
		email,
		email_verified: true,
		nonce,
		exp: Math.floor(Date.now() / 1000) + 3600,
		...overrides
	};
	return (async () =>
		Response.json({ id_token: `${b64({ alg: 'RS256' })}.${b64(claims)}.sig` })) as typeof fetch;
}

async function registerClient(redirects = [REDIRECT]) {
	const res = await register(
		new Request(`${ORIGIN}/oauth/register`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ client_name: 'Test client', redirect_uris: redirects })
		}),
		config
	);
	return { res, body: await res.json() };
}

/** Runs the browser half: authorize, then Google comes back signed in as `email`. */
async function signIn(email: string, overrides: Record<string, unknown> = {}, cfg = config) {
	const { body: client } = await registerClient();
	const verifier = randomBytes(32).toString('base64url');
	const authUrl = new URL(`${ORIGIN}/oauth/authorize`);
	authUrl.search = new URLSearchParams({
		response_type: 'code',
		client_id: client.client_id,
		redirect_uri: REDIRECT,
		code_challenge: createHash('sha256').update(verifier).digest('base64url'),
		code_challenge_method: 'S256',
		state: 'client-state',
		resource: `${ORIGIN}/mcp`,
		scope: 'check'
	}).toString();
	const toGoogle = authorize(authUrl, cfg, ORIGIN);
	expect(toGoogle.status).toBe(302);
	const google = new URL(toGoogle.headers.get('location')!);
	const cookie = toGoogle.headers.get('set-cookie')!.split(';')[0];
	const callback = `${ORIGIN}/oauth/google/callback?code=g&state=${encodeURIComponent(google.searchParams.get('state')!)}`;
	const back = await googleCallback(
		new Request(callback, { headers: { cookie } }),
		cfg,
		ORIGIN,
		fakeGoogle(email, google.searchParams.get('nonce')!, overrides)
	);
	return { client, verifier, cookie, google, back };
}

async function approve(back: Response, cookie: string, decision = 'allow', cfg = config) {
	const ticket = (await back.text()).match(/name="ticket" value="([^"]+)"/)![1];
	return consent(
		new Request(`${ORIGIN}/oauth/consent`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded', cookie, origin: ORIGIN },
			body: new URLSearchParams({ ticket, decision })
		}),
		cfg,
		ORIGIN
	);
}

function tokenRequest(params: Record<string, string>, cfg = config) {
	return token(
		new Request(`${ORIGIN}/oauth/token`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams(params)
		}),
		cfg,
		ORIGIN
	);
}

/** The whole dance for the owner: an access token and its refresh token. */
async function connect() {
	const { client, verifier, cookie, back } = await signIn(OWNER);
	const code = new URL((await approve(back, cookie)).headers.get('location')!).searchParams.get(
		'code'
	)!;
	const res = await tokenRequest({
		grant_type: 'authorization_code',
		code,
		code_verifier: verifier,
		client_id: client.client_id,
		redirect_uri: REDIRECT,
		resource: `${ORIGIN}/mcp`
	});
	expect(res.status).toBe(200);
	return { client, ...(await res.json()) };
}

/** The real MCP SDK client, talking to the endpoint in-process. */
async function mcpClient(accessToken: string) {
	const transport = new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), {
		fetch: (url, init) => handleMcp(new Request(url, init), config, ORIGIN),
		requestInit: { headers: { authorization: `Bearer ${accessToken}` } }
	});
	const client = new Client({ name: 'isitslop-test', version: '1.0.0' });
	await client.connect(transport);
	return client;
}

describe('MCP sign-in', () => {
	it('publishes discovery metadata for this origin, PKCE S256 only', () => {
		const as = authServerMetadata(ORIGIN);
		expect(as.issuer).toBe(ORIGIN);
		expect(as.registration_endpoint).toBe(`${ORIGIN}/oauth/register`);
		expect(as.code_challenge_methods_supported).toEqual(['S256']);
		expect(resourceMetadata(ORIGIN)).toMatchObject({
			resource: `${ORIGIN}/mcp`,
			authorization_servers: [ORIGIN]
		});
	});

	it('stays off until every required variable is set', () => {
		expect(readMcpConfig({ ...env, MCP_SECRET: 'short' })).toMatch(/MCP_SECRET/);
		expect(readMcpConfig({ ...env, MCP_ALLOWED_EMAILS: ' , ' })).toMatch(/MCP_ALLOWED_EMAILS/);
		expect(readMcpConfig({ ...env, GOOGLE_OAUTH_CLIENT_SECRET: '' })).toMatch(
			/GOOGLE_OAUTH_CLIENT_SECRET/
		);
	});

	it('lets the allowlisted Google account through to a working token', async () => {
		const { back } = await signIn(OWNER);
		expect(back.status).toBe(200);
		expect(back.headers.get('x-frame-options')).toBe('DENY');

		const tokens = await connect();
		expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 3600, scope: 'check' });
		const who = authenticate(
			new Request(`${ORIGIN}/mcp`, { headers: { authorization: `Bearer ${tokens.access_token}` } }),
			config,
			ORIGIN
		);
		expect(who?.email).toBe(OWNER);
	});

	it('matches the address without regard to case', async () => {
		const { back } = await signIn('GabCeboli@Gmail.com');
		expect(back.status).toBe(200);
	});

	it('refuses any other Google account: no consent page, no code', async () => {
		for (const email of ['someone@example.com', 'gabceboli@gmail.com.evil.test', 'gab@gmail.com']) {
			const { back } = await signIn(email);
			expect(back.status).toBe(302);
			const location = new URL(back.headers.get('location')!);
			expect(`${location.origin}${location.pathname}`).toBe(REDIRECT);
			expect(location.searchParams.get('error')).toBe('access_denied');
			expect(location.searchParams.get('state')).toBe('client-state');
			expect(location.searchParams.has('code')).toBe(false);
		}
	});

	it('refuses an unverified address and ID tokens meant for someone else', async () => {
		for (const overrides of [
			{ email_verified: false },
			{ aud: 'another-app.apps.googleusercontent.com' },
			{ nonce: 'replayed' },
			{ iss: 'https://evil.test' },
			{ exp: Math.floor(Date.now() / 1000) - 10 }
		]) {
			const { back } = await signIn(OWNER, overrides);
			expect(new URL(back.headers.get('location')!).searchParams.get('error')).toBe(
				'access_denied'
			);
		}
	});

	it('cuts a connection off once its address leaves the allowlist', async () => {
		const tokens = await connect();
		const narrower = readMcpConfig({ ...env, MCP_ALLOWED_EMAILS: 'someone@example.com' }) as McpConfig;
		const request = new Request(`${ORIGIN}/mcp`, {
			headers: { authorization: `Bearer ${tokens.access_token}` }
		});
		expect(authenticate(request, narrower, ORIGIN)).toBeNull();
		const refresh = await tokenRequest(
			{ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: tokens.client.client_id },
			narrower
		);
		expect((await refresh.json()).error).toBe('invalid_grant');
	});

	it('needs the right PKCE verifier, and a code works once', async () => {
		const { client, verifier, cookie, back } = await signIn(OWNER);
		const code = new URL((await approve(back, cookie)).headers.get('location')!).searchParams.get(
			'code'
		)!;
		const exchange = (code_verifier: string) =>
			tokenRequest({
				grant_type: 'authorization_code',
				code,
				code_verifier,
				client_id: client.client_id,
				redirect_uri: REDIRECT
			});
		expect((await (await exchange(randomBytes(32).toString('base64url'))).json()).error).toBe(
			'invalid_grant'
		);
		expect((await exchange(verifier)).status).toBe(200);
		expect((await (await exchange(verifier)).json()).error).toBe('invalid_grant');
	});

	it('refreshes into the same connection', async () => {
		const tokens = await connect();
		const res = await tokenRequest({
			grant_type: 'refresh_token',
			refresh_token: tokens.refresh_token,
			client_id: tokens.client.client_id
		});
		const fresh = await res.json();
		const grantOf = (t: string) =>
			authenticate(new Request(`${ORIGIN}/mcp`, { headers: { authorization: `Bearer ${t}` } }), config, ORIGIN)
				?.grant;
		expect(fresh.refresh_token).toBe(tokens.refresh_token);
		expect(grantOf(fresh.access_token)).toBe(grantOf(tokens.access_token));
	});

	it('sends a cancel back to the client as access_denied', async () => {
		const { cookie, back } = await signIn(OWNER);
		const res = await approve(back, cookie, 'deny');
		expect(res.status).toBe(303);
		const location = new URL(res.headers.get('location')!);
		expect(location.searchParams.get('error')).toBe('access_denied');
		expect(location.searchParams.has('code')).toBe(false);
	});

	it('only approves from the browser that started the sign-in', async () => {
		const { back } = await signIn(OWNER);
		const res = await approve(back, 'isitslop_oauth=someone-else');
		expect(res.status).toBe(400);
		expect(res.headers.get('location')).toBeNull();
	});

	it('shows a bad authorization request a page instead of redirecting anywhere', async () => {
		const { body: client } = await registerClient(['https://evil.test/callback']);
		const good = {
			response_type: 'code',
			client_id: client.client_id,
			redirect_uri: 'https://evil.test/callback',
			code_challenge: 'x'.repeat(43),
			code_challenge_method: 'S256'
		};
		const changes: Record<string, string>[] = [
			{ client_id: 'made-up' },
			{ redirect_uri: 'https://evil.test/elsewhere' },
			{ response_type: 'token' },
			{ code_challenge_method: 'plain' },
			{ resource: 'https://evil.test/mcp' }
		];
		for (const change of changes) {
			const url = new URL(`${ORIGIN}/oauth/authorize`);
			url.search = new URLSearchParams({ ...good, ...change }).toString();
			const res = authorize(url, config, ORIGIN);
			expect(res.status).toBe(400);
			expect(res.headers.get('location')).toBeNull();
		}
		const url = new URL(`${ORIGIN}/oauth/authorize`);
		url.search = new URLSearchParams(good).toString();
		expect(new URL(authorize(url, config, ORIGIN).headers.get('location')!).origin).toBe(
			'https://accounts.google.com'
		);
	});

	it('lets a loopback client come back on another port', async () => {
		const { body: client } = await registerClient();
		const url = new URL(`${ORIGIN}/oauth/authorize`);
		url.search = new URLSearchParams({
			response_type: 'code',
			client_id: client.client_id,
			redirect_uri: 'http://127.0.0.1:5555/callback',
			code_challenge: 'x'.repeat(43),
			code_challenge_method: 'S256'
		}).toString();
		expect(authorize(url, config, ORIGIN).status).toBe(302);
	});

	it('registers https and loopback redirects only', async () => {
		expect((await registerClient(['https://claude.ai/api/mcp/auth_callback'])).res.status).toBe(201);
		const bad = await registerClient(['http://evil.test/callback']);
		expect(bad.res.status).toBe(400);
		expect(bad.body.error).toBe('invalid_redirect_uri');
	});
});

describe('MCP endpoint', () => {
	it('answers 401 with the discovery pointer when there is no token', async () => {
		const res = await handleMcp(
			new Request(`${ORIGIN}/mcp`, { method: 'POST', body: '{}' }),
			config,
			ORIGIN
		);
		expect(res.status).toBe(401);
		expect(res.headers.get('www-authenticate')).toContain(
			`resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp"`
		);
	});

	it('refuses a browser calling from another site', async () => {
		const { access_token } = await connect();
		const res = await handleMcp(
			new Request(`${ORIGIN}/mcp`, {
				method: 'POST',
				headers: { authorization: `Bearer ${access_token}`, origin: 'https://evil.test' }
			}),
			config,
			ORIGIN
		);
		expect(res.status).toBe(403);
	});

	it('lists one tool and returns score, tier, word count and flags', async () => {
		const { access_token } = await connect();
		const client = await mcpClient(access_token);
		const { tools } = await client.listTools();
		expect(tools.map((t) => t.name)).toEqual(['check_text']);
		expect(tools[0].outputSchema).toBeDefined();

		const res = await client.callTool({
			name: 'check_text',
			arguments: { text: SLOP, deterministic_only: true }
		});
		expect(res.isError).toBeFalsy();
		const out = res.structuredContent as Record<string, unknown> & {
			flags: Record<string, unknown>[];
		};
		expect(out).toMatchObject({ tier: 'Slop', words: 135, llm: false, warnings: [] });
		expect(out.score).toBeGreaterThanOrEqual(70);
		expect(out.flags.length).toBeGreaterThan(5);
		for (const flag of out.flags) {
			expect(Object.keys(flag).sort()).toEqual(
				expect.arrayContaining(['excerpt', 'explanation', 'rule', 'severity'])
			);
			expect(['red', 'yellow']).toContain(flag.severity);
			expect(SLOP).toContain(flag.excerpt);
		}
		expect(out.flags.some((f) => typeof f.suggestion === 'string')).toBe(true);
		// Same JSON in the text block, for clients that only read text.
		const [block] = res.content as { type: string; text: string }[];
		expect(JSON.parse(block.text)).toEqual(out);
		await client.close();
	});

	it('refuses French and Spanish with a clear message, and scores nothing', async () => {
		const { access_token } = await connect();
		const client = await mcpClient(access_token);
		for (const [text, language] of [
			[FRENCH, 'French'],
			[SPANISH, 'Spanish']
		]) {
			const res = await client.callTool({ name: 'check_text', arguments: { text } });
			expect(res.isError).toBe(true);
			expect(res.structuredContent).toBeUndefined();
			const [block] = res.content as { type: string; text: string }[];
			expect(block.text).toBe(
				`Refused: isitslop checks English only, and this text reads as ${language}. Nothing was scored.`
			);
		}
		await client.close();
	});

	it('says GET and DELETE are not offered (stateless server)', async () => {
		const { access_token } = await connect();
		for (const method of ['GET', 'DELETE']) {
			const res = await handleMcp(
				new Request(`${ORIGIN}/mcp`, { method, headers: { authorization: `Bearer ${access_token}` } }),
				config,
				ORIGIN
			);
			expect(res.status).toBe(405);
		}
	});

	it('rate-limits each connection on its own, whatever the IP', async () => {
		const a = await connect();
		const b = await connect();
		const ping = (t: string) =>
			handleMcp(
				new Request(`${ORIGIN}/mcp`, {
					method: 'POST',
					headers: {
						authorization: `Bearer ${t}`,
						'content-type': 'application/json',
						accept: 'application/json, text/event-stream'
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
				}),
				config,
				ORIGIN
			);
		for (let i = 0; i < 60; i++) expect((await ping(a.access_token)).status).toBe(200);
		const blocked = await ping(a.access_token);
		expect(blocked.status).toBe(429);
		expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
		expect((await ping(b.access_token)).status).toBe(200);
	});
});

describe('check_text', () => {
	const opts = { judge: false, geminiKey: '', connection: 'c1' };

	it('applies the same word limits as the site', async () => {
		expect(await checkText('Too short to check.', opts)).toEqual({
			refused: 'Text too short (need ≥ 10 words)'
		});
	});

	it("refuses text whose language can't be told", async () => {
		const out = await checkText('1234 5678 '.repeat(20) + 'and so on and so forth etc', opts);
		expect('refused' in out).toBe(true);
	});

	it('keeps writing tips out of the flags and the score', async () => {
		const text =
			'The report was written quickly by the team and it was reviewed very carefully by the manager, who really liked it, before it was sent to the client on Friday afternoon.';
		const out = await checkText(text, opts);
		if ('refused' in out) throw new Error(out.refused);
		expect(out.tips.length).toBeGreaterThan(0);
		expect(out.flags.map((f) => f.rule)).not.toContain('passive');
		expect(out.tier).toBe('Reads human');
	});
});

describe('shared pipeline', () => {
	const text = SLOP;

	it('keeps the site messages for bad input', () => {
		expect(rejectText('one two three')).toBe('Text too short (need ≥ 10 words)');
		expect(rejectText('word '.repeat(1501))).toBe('Text too long (max 1500 words)');
		expect(rejectText(text)).toBeNull();
	});

	it('only warns about the judge when it was asked for', async () => {
		const limiter = createLimiter({ perMinute: 10, llmPerHour: 0, llmPerDay: 0 });
		const off = await analyze({ text, language: 'en', apiKey: '', judge: false, limiter, key: 'k' });
		expect(off.result.warnings).toBeUndefined();
		const noKey = await analyze({ text, language: 'en', apiKey: '', judge: true, limiter, key: 'k' });
		expect(noKey.result.warnings).toEqual([
			'No API key provided, LLM scanners skipped (deterministic only).'
		]);
		const spent = await analyze({ text, language: 'en', apiKey: 'k', judge: true, limiter, key: 'k' });
		expect(spent.judged).toBe(false);
		expect(spent.result.warnings).toEqual([
			'LLM rate limit reached, deterministic rules only for now. Try again in a bit.'
		]);
	});
});

describe('CSRF check', () => {
	const form = (path: string, origin?: string) =>
		crossSiteForm(
			new Request(`${ORIGIN}${path}`, {
				method: 'POST',
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					...(origin ? { origin } : {})
				}
			}),
			new URL(`${ORIGIN}${path}`)
		);

	it('blocks form posts from another site or with no origin', () => {
		expect(form('/oauth/consent', 'https://evil.test')).toBe(true);
		expect(form('/oauth/consent')).toBe(true);
		expect(form('/oauth/consent', ORIGIN)).toBe(false);
	});

	it('lets MCP clients post to /oauth/token without an Origin', () => {
		expect(form('/oauth/token')).toBe(false);
	});

	it('leaves JSON and GET requests alone', () => {
		const json = new Request(`${ORIGIN}/api/analyze`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: 'https://evil.test' }
		});
		expect(crossSiteForm(json, new URL(json.url))).toBe(false);
		const get = new Request(`${ORIGIN}/oauth/authorize`);
		expect(crossSiteForm(get, new URL(get.url))).toBe(false);
	});
});
