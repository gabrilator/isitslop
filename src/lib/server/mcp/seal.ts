// Signed, self-contained OAuth artifacts: client ids, sign-in state, codes and
// tokens. The server keeps no table of them. Each one carries its own claims
// and expiry under an HMAC of MCP_SECRET, so a deploy or restart signs no one
// out, and rotating MCP_SECRET revokes every one of them at once.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

type Claims = Record<string, unknown>;

function mac(secret: string, body: string): string {
	return createHmac('sha256', secret).update(body).digest('base64url');
}

/** `kind` keeps one artifact from passing for another (a code for a token, say). */
export function seal(
	secret: string,
	kind: string,
	claims: Claims,
	ttlSec?: number,
	now = Date.now()
): string {
	const exp = ttlSec === undefined ? undefined : Math.floor(now / 1000) + ttlSec;
	const body = Buffer.from(JSON.stringify({ ...claims, k: kind, exp })).toString('base64url');
	return `${body}.${mac(secret, body)}`;
}

/** The claims, or null when the signature, kind or expiry doesn't hold. */
export function unseal<T extends Claims>(
	secret: string,
	kind: string,
	value: string | null | undefined,
	now = Date.now()
): T | null {
	const [body, sig, rest] = (value ?? '').split('.');
	if (!body || !sig || rest !== undefined) return null;
	const expected = Buffer.from(mac(secret, body));
	const given = Buffer.from(sig);
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	let claims: Claims;
	try {
		claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
	} catch {
		return null;
	}
	if (claims?.k !== kind) return null;
	if (claims.exp !== undefined && (typeof claims.exp !== 'number' || claims.exp * 1000 <= now)) {
		return null;
	}
	return claims as T;
}

export function randomId(bytes = 16): string {
	return randomBytes(bytes).toString('base64url');
}

export function sha256url(value: string): string {
	return createHash('sha256').update(value).digest('base64url');
}
