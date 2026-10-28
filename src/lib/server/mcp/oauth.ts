// OAuth 2.1 in front of /mcp: discovery metadata, dynamic client registration,
// authorization code with S256 PKCE, and refresh. The person proves who they
// are by signing in with Google, and only the addresses in MCP_ALLOWED_EMAILS
// get a code. Every token is re-checked against that list on every request.
//
//   MCP client → /oauth/authorize → Google → /oauth/google/callback → consent page
//   → /oauth/consent → the client's redirect_uri?code=… → /oauth/token → /mcp
//
// Nothing is stored: client ids, codes and tokens are sealed (see seal.ts).
// Refresh tokens are not rotated. With no store, rotation couldn't catch a
// replay anyway, and several sessions of one MCP client share one credential.

import { z } from 'zod';
import { seal, unseal, randomId, sha256url } from './seal';
import { LOOPBACK, type McpConfig } from './config';
import { consentPage, messagePage } from './pages';

export const SCOPE = 'check';

const FLOW_TTL = 10 * 60; // the Google round trip and the consent click
const CODE_TTL = 5 * 60;
const ACCESS_TTL = 60 * 60;
const REFRESH_TTL = 90 * 86_400; // after that, sign in with Google again

const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

const FLOW_COOKIE = 'isitslop_oauth';

export const oauthHeaders = {
	'cache-control': 'no-store',
	pragma: 'no-cache',
	'access-control-allow-origin': '*'
};

interface ClientClaims {
	name: string;
	redirects: string[];
	[k: string]: unknown;
}

/** The authorization request, carried through the Google round trip. */
interface FlowClaims {
	client: string; // sha256 of the client id
	name: string;
	redirect: string;
	challenge: string;
	state?: string;
	browser: string; // sha256 of the cookie that ties the flow to one browser
	nonce: string;
	[k: string]: unknown;
}

interface ConsentClaims extends FlowClaims {
	email: string;
}

interface GrantClaims {
	grant: string; // one per sign-in: the connection that rate limits follow
	email: string;
	client: string;
	[k: string]: unknown;
}

interface CodeClaims extends GrantClaims {
	id: string;
	redirect: string;
	challenge: string;
	exp: number;
}

interface TokenClaims extends GrantClaims {
	aud: string;
}

export interface Connection {
	email: string;
	grant: string;
}

export function authServerMetadata(origin: string) {
	return {
		issuer: origin,
		authorization_endpoint: `${origin}/oauth/authorize`,
		token_endpoint: `${origin}/oauth/token`,
		registration_endpoint: `${origin}/oauth/register`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code', 'refresh_token'],
		code_challenge_methods_supported: ['S256'],
		token_endpoint_auth_methods_supported: ['none'],
		scopes_supported: [SCOPE]
	};
}

export function resourceMetadata(origin: string) {
	return {
		resource: `${origin}/mcp`,
		authorization_servers: [origin],
		scopes_supported: [SCOPE],
		bearer_methods_supported: ['header'],
		resource_name: 'isitslop'
	};
}

function validRedirect(value: string): boolean {
	try {
		const u = new URL(value);
		if (u.hash || u.username || u.password) return false;
		return u.protocol === 'https:' || (u.protocol === 'http:' && LOOPBACK.has(u.hostname));
	} catch {
		return false;
	}
}

/** Exact match, except that a loopback redirect may use any port (RFC 8252 §7.3). */
function redirectMatches(registered: string[], uri: string): boolean {
	if (registered.includes(uri)) return true;
	if (!validRedirect(uri)) return false;
	const u = new URL(uri);
	if (u.protocol !== 'http:') return false;
	return registered.some((r) => {
		const v = new URL(r);
		return (
			v.protocol === 'http:' &&
			v.hostname === u.hostname &&
			v.pathname === u.pathname &&
			v.search === u.search
		);
	});
}

const ClientMetadata = z.object({
	client_name: z.string().optional(),
	redirect_uris: z.array(z.string().max(500).refine(validRedirect)).min(1).max(5)
});

export async function register(request: Request, config: McpConfig): Promise<Response> {
	let input: unknown;
	try {
		input = JSON.parse(await request.text());
	} catch {
		return oauthError(400, 'invalid_client_metadata', 'Send the client metadata as JSON.');
	}
	const parsed = ClientMetadata.safeParse(input);
	if (!parsed.success) {
		return oauthError(
			400,
			'invalid_redirect_uri',
			'Register 1 to 5 redirect URIs, each https or http on localhost.'
		);
	}
	const name = (parsed.data.client_name ?? '').trim().slice(0, 100) || 'MCP client';
	const redirects = parsed.data.redirect_uris;
	return Response.json(
		{
			client_id: seal(config.secret, 'client', { name, redirects }),
			client_id_issued_at: Math.floor(Date.now() / 1000),
			client_name: name,
			redirect_uris: redirects,
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
			token_endpoint_auth_method: 'none'
		},
		{ status: 201, headers: oauthHeaders }
	);
}

/** Checks the client's request, then sends the browser to Google. */
export function authorize(url: URL, config: McpConfig, origin: string, now = Date.now()): Response {
	const p = url.searchParams;
	if (hasDuplicates(p)) return messagePage(400, "Can't connect", 'A parameter appears twice.');
	const clientId = p.get('client_id') ?? '';
	const client = unseal<ClientClaims>(config.secret, 'client', clientId);
	const redirect = p.get('redirect_uri') ?? '';
	const challenge = p.get('code_challenge') ?? '';
	const resource = p.get('resource');
	// Errors show here rather than redirect: anyone can register a return address,
	// and bouncing a stranger's link straight to it would make this an open redirect.
	let problem = '';
	if (!client || !redirectMatches(client.redirects, redirect)) {
		problem = 'This app is not registered here, or its return address changed.';
	} else if (p.get('response_type') !== 'code') {
		problem = 'Only response_type=code is supported.';
	} else if (p.get('code_challenge_method') !== 'S256' || !/^[\w-]{43}$/.test(challenge)) {
		problem = 'An S256 PKCE code challenge is required.';
	} else if (resource !== null && resource !== `${origin}/mcp`) {
		problem = `The resource must be ${origin}/mcp.`;
	}
	if (!client || problem) {
		return messagePage(400, "Can't connect", `${problem} Start again from your MCP client.`);
	}

	const browser = randomId();
	const nonce = randomId();
	const flow: FlowClaims = {
		client: sha256url(clientId),
		name: client.name,
		redirect,
		challenge,
		state: p.get('state') ?? undefined,
		browser: sha256url(browser),
		nonce
	};
	const google = new URL(GOOGLE_AUTHORIZE);
	google.search = new URLSearchParams({
		client_id: config.googleClientId,
		redirect_uri: `${origin}/oauth/google/callback`,
		response_type: 'code',
		scope: 'openid email',
		state: seal(config.secret, 'flow', flow, FLOW_TTL, now),
		nonce
	}).toString();
	return new Response(null, {
		status: 302,
		headers: {
			location: google.href,
			'cache-control': 'no-store',
			'set-cookie': flowCookie(origin, browser, FLOW_TTL)
		}
	});
}

/** Google sends the browser back here. An allowed address gets the consent page. */
export async function googleCallback(
	request: Request,
	config: McpConfig,
	origin: string,
	fetchFn: typeof fetch = fetch,
	now = Date.now()
): Promise<Response> {
	const url = new URL(request.url);
	const flow = unseal<FlowClaims>(config.secret, 'flow', url.searchParams.get('state'), now);
	if (!flow) return messagePage(400, 'Sign-in expired', 'Start again from your MCP client.');
	if (!sameBrowser(request, flow.browser)) {
		return messagePage(
			400,
			'Sign-in expired',
			'This sign-in started in another browser, or a newer one replaced it. Start again from your MCP client.'
		);
	}
	const back = (error: string, description: string) =>
		redirectBack(flow.redirect, flow.state, { error, error_description: description }, 302, {
			'set-cookie': flowCookie(origin, '', 0)
		});
	if (url.searchParams.has('error')) return back('access_denied', 'Google sign-in was cancelled.');

	const code = url.searchParams.get('code');
	const email = await googleEmail(code, flow.nonce, config, origin, fetchFn, now);
	if (!email) return back('access_denied', 'Google sign-in failed.');
	if (!config.allowed.has(email)) {
		return back('access_denied', 'This Google account is not allowed on this server.');
	}

	const ticket: ConsentClaims = { ...flow, email };
	return consentPage({
		client: flow.name,
		email,
		returnTo: new URL(flow.redirect).host,
		ticket: seal(config.secret, 'consent', ticket, FLOW_TTL, now)
	});
}

/**
 * The verified address from Google's ID token, lowercased, or null. The token
 * comes straight from Google's token endpoint over TLS, so its signature needs
 * no check of its own (OpenID Connect Core §3.1.3.7).
 */
async function googleEmail(
	code: string | null,
	nonce: string,
	config: McpConfig,
	origin: string,
	fetchFn: typeof fetch,
	now: number
): Promise<string | null> {
	if (!code) return null;
	try {
		const res = await fetchFn(GOOGLE_TOKEN, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				client_id: config.googleClientId,
				client_secret: config.googleClientSecret,
				redirect_uri: `${origin}/oauth/google/callback`
			}),
			signal: AbortSignal.timeout(10_000)
		});
		if (!res.ok) {
			console.error('[oauth] Google token exchange failed', res.status, await res.text());
			return null;
		}
		const { id_token } = (await res.json()) as { id_token?: string };
		const claims = JSON.parse(
			Buffer.from(String(id_token).split('.')[1] ?? '', 'base64url').toString('utf8')
		);
		const valid =
			GOOGLE_ISSUERS.has(claims.iss) &&
			claims.aud === config.googleClientId &&
			claims.nonce === nonce &&
			typeof claims.exp === 'number' &&
			claims.exp * 1000 > now &&
			claims.email_verified === true &&
			typeof claims.email === 'string';
		if (!valid) console.error('[oauth] Google ID token refused');
		return valid ? claims.email.toLowerCase() : null;
	} catch (err) {
		console.error('[oauth] Google sign-in failed', err);
		return null;
	}
}

/** The consent form posts here. Connect sends a code back to the client. */
export async function consent(
	request: Request,
	config: McpConfig,
	origin: string,
	now = Date.now()
): Promise<Response> {
	const form = new URLSearchParams(await request.text());
	const ticket = unseal<ConsentClaims>(config.secret, 'consent', form.get('ticket'), now);
	if (!ticket || !sameBrowser(request, ticket.browser)) {
		return messagePage(400, 'Approval expired', 'Start again from your MCP client.');
	}
	const clear = { 'set-cookie': flowCookie(origin, '', 0) };
	if (form.get('decision') !== 'allow' || !config.allowed.has(ticket.email)) {
		return redirectBack(
			ticket.redirect,
			ticket.state,
			{ error: 'access_denied', error_description: 'The connection was not approved.' },
			303,
			clear
		);
	}
	const code = {
		id: randomId(),
		grant: randomId(12),
		email: ticket.email,
		client: ticket.client,
		redirect: ticket.redirect,
		challenge: ticket.challenge
	};
	return redirectBack(
		ticket.redirect,
		ticket.state,
		{ code: seal(config.secret, 'code', code, CODE_TTL, now) },
		303,
		clear
	);
}

// Codes are single-use. The ledger only has to outlive each code (5 minutes),
// so memory is enough.
const spentCodes = new Map<string, number>();

function spend(id: string, exp: number, now: number): boolean {
	for (const [k, e] of spentCodes) if (e * 1000 <= now) spentCodes.delete(k);
	if (spentCodes.has(id)) return false;
	spentCodes.set(id, exp);
	return true;
}

/** Test hook. */
export function resetSpentCodes(): void {
	spentCodes.clear();
}

export async function token(
	request: Request,
	config: McpConfig,
	origin: string,
	now = Date.now()
): Promise<Response> {
	const type = request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!type.startsWith('application/x-www-form-urlencoded')) {
		return oauthError(400, 'invalid_request', 'Send a form-encoded body.');
	}
	const p = new URLSearchParams(await request.text());
	if (hasDuplicates(p)) return oauthError(400, 'invalid_request', 'A parameter appears twice.');
	const clientId = p.get('client_id');
	if (!unseal<ClientClaims>(config.secret, 'client', clientId)) {
		return oauthError(401, 'invalid_client', 'Unknown client. Register again.');
	}
	const resource = p.get('resource');
	if (resource !== null && resource !== `${origin}/mcp`) {
		return oauthError(400, 'invalid_target', `The resource must be ${origin}/mcp.`);
	}
	const client = sha256url(clientId!);
	const aud = `${origin}/mcp`;

	switch (p.get('grant_type')) {
		case 'authorization_code': {
			const code = unseal<CodeClaims>(config.secret, 'code', p.get('code'), now);
			if (!code || code.client !== client || code.redirect !== p.get('redirect_uri')) {
				return oauthError(400, 'invalid_grant', 'The code is invalid or expired.');
			}
			if (!pkceMatches(p.get('code_verifier'), code.challenge)) {
				return oauthError(400, 'invalid_grant', 'The code verifier does not match.');
			}
			if (!spend(code.id, code.exp, now)) {
				return oauthError(400, 'invalid_grant', 'The code was already used.');
			}
			if (!config.allowed.has(code.email)) {
				return oauthError(400, 'invalid_grant', 'This account is not allowed on this server.');
			}
			const who: TokenClaims = { grant: code.grant, email: code.email, client, aud };
			return issue(config, who, seal(config.secret, 'refresh', who, REFRESH_TTL, now), now);
		}
		case 'refresh_token': {
			const refresh = p.get('refresh_token') ?? '';
			const who = unseal<TokenClaims>(config.secret, 'refresh', refresh, now);
			if (!who || who.client !== client || who.aud !== aud || !config.allowed.has(who.email)) {
				return oauthError(400, 'invalid_grant', 'Sign in again.');
			}
			return issue(config, who, refresh, now);
		}
		default:
			return oauthError(400, 'unsupported_grant_type', 'Use authorization_code or refresh_token.');
	}
}

function issue(config: McpConfig, who: TokenClaims, refresh: string, now: number): Response {
	const claims: TokenClaims = { grant: who.grant, email: who.email, client: who.client, aud: who.aud };
	return Response.json(
		{
			access_token: seal(config.secret, 'access', claims, ACCESS_TTL, now),
			token_type: 'Bearer',
			expires_in: ACCESS_TTL,
			refresh_token: refresh,
			scope: SCOPE
		},
		{ headers: oauthHeaders }
	);
}

/** The connection behind a bearer token, or null. Re-checks the allowlist every time. */
export function authenticate(
	request: Request,
	config: McpConfig,
	origin: string,
	now = Date.now()
): Connection | null {
	const bearer = request.headers.get('authorization')?.match(/^Bearer\s+([\w.-]+)$/i)?.[1];
	const who = unseal<TokenClaims>(config.secret, 'access', bearer, now);
	if (!who || who.aud !== `${origin}/mcp` || !config.allowed.has(who.email)) return null;
	return { email: who.email, grant: who.grant };
}

function pkceMatches(verifier: string | null, challenge: string): boolean {
	return !!verifier && /^[\w.~-]{43,128}$/.test(verifier) && sha256url(verifier) === challenge;
}

function hasDuplicates(p: URLSearchParams): boolean {
	return [...new Set(p.keys())].some((k) => p.getAll(k).length > 1);
}

function redirectBack(
	redirect: string,
	state: string | undefined,
	params: Record<string, string>,
	status = 302,
	headers: Record<string, string> = {}
): Response {
	const target = new URL(redirect);
	for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
	if (state !== undefined) target.searchParams.set('state', state);
	return new Response(null, {
		status,
		headers: { location: target.href, 'cache-control': 'no-store', ...headers }
	});
}

function flowCookie(origin: string, value: string, maxAge: number): string {
	const secure = origin.startsWith('https:') ? '; Secure' : '';
	return `${FLOW_COOKIE}=${value}; Path=/oauth; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function sameBrowser(request: Request, browserHash: string): boolean {
	for (const part of (request.headers.get('cookie') ?? '').split(';')) {
		const [name, value] = part.trim().split('=');
		if (name === FLOW_COOKIE && value) return sha256url(value) === browserHash;
	}
	return false;
}

function oauthError(status: number, error: string, description: string): Response {
	return Response.json({ error, error_description: description }, { status, headers: oauthHeaders });
}
