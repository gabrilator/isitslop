// End-to-end check of /mcp with the official MCP client against the production
// build: 401, discovery, dynamic registration, Google sign-in (faked by
// scripts/fake-google.mjs inside the server), consent, PKCE, tokens, refresh,
// then check_text. It needs no Google account and spends no Gemini call unless
// SMOKE_LLM=1.
//
//   npm run build && npm run smoke:mcp
//   SMOKE_LLM=1 npm run smoke:mcp   # one real Gemini call, with the key in .env

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';

const OWNER = 'owner@example.test';
const STRANGER = 'stranger@example.test';
const REDIRECT = 'http://127.0.0.1:53682/callback'; // nothing listens: the script reads the redirect
const LLM = process.env.SMOKE_LLM === '1';

const ENGLISH =
	"In today's fast-paced world, businesses must navigate the complexities of digital transformation. Furthermore, leaders are tasked with empowering teams to leverage cutting-edge tools that unlock unprecedented value. The kicker? Most strategies fail.";
const FRENCH =
	"Bonjour Marie, j'ai lu votre publication sur le déménagement du studio à Montréal. Est-ce qu'une courte liste de vérification vous serait utile?";

function check(ok, message) {
	if (!ok) throw new Error(`FAILED: ${message}`);
	console.log(`ok  ${message}`);
}

if (!existsSync('build/index.js')) {
	console.error('No build. Run npm run build first.');
	process.exit(1);
}

const port = await new Promise((resolve) => {
	const s = createServer().listen(0, '127.0.0.1', () => {
		const { port } = s.address();
		s.close(() => resolve(port));
	});
});
const base = `http://127.0.0.1:${port}`;

const server = spawn(
	process.execPath,
	['--env-file-if-exists=.env', '--import', './scripts/fake-google.mjs', 'build/index.js'],
	{
		env: {
			...process.env,
			PORT: String(port),
			HOST: '127.0.0.1',
			ORIGIN: base,
			MCP_SECRET: randomBytes(32).toString('base64'),
			MCP_ALLOWED_EMAILS: OWNER,
			GOOGLE_OAUTH_CLIENT_ID: 'smoke.apps.googleusercontent.com',
			GOOGLE_OAUTH_CLIENT_SECRET: 'smoke',
			...(LLM ? {} : { GOOGLE_GENAI_API_KEY: '' })
		},
		stdio: ['ignore', 'inherit', 'inherit']
	}
);

/** What a browser does between the client's authorization URL and its redirect. */
async function browserSignIn(authorizationUrl, email) {
	const toGoogle = await fetch(authorizationUrl, { redirect: 'manual' });
	const google = new URL(toGoogle.headers.get('location') ?? base);
	if (google.origin !== 'https://accounts.google.com') {
		throw new Error(`authorize did not go to Google: ${toGoogle.status}`);
	}
	const cookie = toGoogle.headers.get('set-cookie').split(';')[0];
	const code = Buffer.from(
		JSON.stringify({ email, nonce: google.searchParams.get('nonce') })
	).toString('base64url');
	const callback = new URL(google.searchParams.get('redirect_uri'));
	callback.search = new URLSearchParams({ code, state: google.searchParams.get('state') }).toString();
	const back = await fetch(callback, { headers: { cookie }, redirect: 'manual' });
	if (back.status !== 200) return { location: new URL(back.headers.get('location')) };

	const ticket = (await back.text()).match(/name="ticket" value="([^"]+)"/)[1];
	const post = (headers) =>
		fetch(`${base}/oauth/consent`, {
			method: 'POST',
			redirect: 'manual',
			headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', ...headers },
			body: new URLSearchParams({ ticket, decision: 'allow' })
		});
	const forged = await post({ origin: 'https://evil.test' });
	const approved = await post({ origin: base });
	return { forged: forged.status, location: new URL(approved.headers.get('location')) };
}

class SmokeProvider {
	store = {};
	authorizationUrl = null;
	get redirectUrl() {
		return REDIRECT;
	}
	get clientMetadata() {
		return {
			client_name: 'isitslop smoke test',
			redirect_uris: [REDIRECT],
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
			token_endpoint_auth_method: 'none'
		};
	}
	clientInformation() {
		return this.store.client;
	}
	saveClientInformation(client) {
		this.store.client = client;
	}
	tokens() {
		return this.store.tokens;
	}
	saveTokens(tokens) {
		this.store.tokens = tokens;
		this.saved = (this.saved ?? 0) + 1;
	}
	redirectToAuthorization(url) {
		this.authorizationUrl = url;
	}
	saveCodeVerifier(verifier) {
		this.store.verifier = verifier;
	}
	codeVerifier() {
		return this.store.verifier;
	}
	state() {
		return 'smoke-state';
	}
}

try {
	for (let i = 0; ; i++) {
		const up = await fetch(`${base}/.well-known/oauth-authorization-server`).catch(() => null);
		if (up?.ok) break;
		if (i > 100) throw new Error('server did not start');
		await new Promise((r) => setTimeout(r, 100));
	}

	const mcpUrl = new URL(`${base}/mcp`);
	const provider = new SmokeProvider();
	try {
		await new Client({ name: 'isitslop-smoke', version: '1.0.0' }).connect(
			new StreamableHTTPClientTransport(mcpUrl, { authProvider: provider })
		);
		throw new Error('connected without signing in');
	} catch (err) {
		if (!(err instanceof UnauthorizedError)) throw err;
	}
	const authUrl = provider.authorizationUrl;
	check(
		authUrl?.href.startsWith(`${base}/oauth/authorize?`) && provider.store.client?.client_id,
		'401 led the client through discovery and registration to /oauth/authorize'
	);
	check(
		authUrl.searchParams.get('resource') === `${base}/mcp` &&
			authUrl.searchParams.get('code_challenge_method') === 'S256',
		'the authorization request carries the resource and an S256 challenge'
	);

	const stranger = await browserSignIn(authUrl, STRANGER);
	check(
		stranger.location.searchParams.get('error') === 'access_denied' &&
			!stranger.location.searchParams.has('code'),
		`${STRANGER} is turned away with access_denied and no code`
	);

	const owner = await browserSignIn(authUrl, OWNER);
	check(owner.forged === 403, 'a consent post from another origin is refused (CSRF)');
	const code = owner.location.searchParams.get('code');
	check(
		code && owner.location.searchParams.get('state') === 'smoke-state',
		`${OWNER} approves and the client gets a code with its state`
	);

	const transport = new StreamableHTTPClientTransport(mcpUrl, { authProvider: provider });
	await transport.finishAuth(code);
	check(provider.store.tokens?.refresh_token, 'the code and PKCE verifier trade for tokens');

	const client = new Client({ name: 'isitslop-smoke', version: '1.0.0' });
	await client.connect(transport);
	const { tools } = await client.listTools();
	check(tools.length === 1 && tools[0].name === 'check_text', 'tools/list shows check_text');

	const res = await client.callTool({
		name: 'check_text',
		arguments: { text: ENGLISH, deterministic_only: true }
	});
	const out = res.structuredContent;
	check(
		!res.isError &&
			typeof out.score === 'number' &&
			typeof out.tier === 'string' &&
			out.words === ENGLISH.split(/\s+/).length &&
			out.flags.length > 0 &&
			out.flags.every((f) => f.rule && f.severity && f.excerpt && f.explanation),
		`check_text scores English: ${out.score} (${out.tier}), ${out.words} words, ${out.flags.length} flags`
	);

	const fr = await client.callTool({ name: 'check_text', arguments: { text: FRENCH } });
	check(fr.isError && /English only/.test(fr.content[0].text), `French is refused: "${fr.content[0].text}"`);

	// An expired access token: the client refreshes on the 401 and retries.
	const saves = provider.saved;
	provider.store.tokens = { ...provider.store.tokens, access_token: 'expired.token' };
	await client.listTools();
	check(provider.saved === saves + 1, 'a dead access token is refreshed without a new sign-in');

	if (LLM) {
		const judged = await client.callTool({ name: 'check_text', arguments: { text: ENGLISH } });
		check(
			judged.structuredContent?.llm === true,
			`the Gemini judge ran: ${judged.structuredContent.score} with ${judged.structuredContent.flags.length} flags` +
				(judged.structuredContent?.llm ? '' : ` (${judged.structuredContent?.warnings.join('; ')})`)
		);
	}

	await client.close();
	console.log('\nMCP smoke test passed.');
} catch (err) {
	console.error(err);
	process.exitCode = 1;
} finally {
	server.kill();
}
