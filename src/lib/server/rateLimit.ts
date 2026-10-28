// In-memory sliding-window rate limits. Single-node only: counters reset on
// restart and are not shared across instances — fine for this app.

const MAX_BUCKETS = 10_000; // memory bound against IP-rotation floods

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export interface Limits {
	perMinute: number; // hard cap on any request
	llmPerHour: number; // LLM passes funded by the server key
	llmPerDay: number;
}

export interface Limiter {
	/** Hard gate for any request. Returns retry-after seconds when blocked. */
	checkRequest(key: string, now?: number): { ok: boolean; retryAfterSec: number };
	/** Soft gate for LLM passes — all run on the server's key, all are metered. */
	checkLLM(key: string, now?: number): boolean;
	recordLLM(key: string, now?: number): void;
	reset(): void;
}

interface Bucket {
	reqs: number[];
	llm: number[];
}

function prune(stamps: number[], cutoff: number): void {
	let drop = 0;
	while (drop < stamps.length && stamps[drop] < cutoff) drop++;
	if (drop > 0) stamps.splice(0, drop);
}

export function createLimiter(limits: Limits): Limiter {
	const buckets = new Map<string, Bucket>();

	function bucketFor(key: string): Bucket {
		let b = buckets.get(key);
		if (!b) {
			if (buckets.size >= MAX_BUCKETS) {
				// evict oldest-inserted entries
				for (const k of buckets.keys()) {
					buckets.delete(k);
					if (buckets.size < MAX_BUCKETS) break;
				}
			}
			b = { reqs: [], llm: [] };
			buckets.set(key, b);
		}
		return b;
	}

	return {
		checkRequest(key, now = Date.now()) {
			const b = bucketFor(key);
			prune(b.reqs, now - MIN);
			if (b.reqs.length >= limits.perMinute) {
				return { ok: false, retryAfterSec: Math.ceil((b.reqs[0] + MIN - now) / 1000) };
			}
			b.reqs.push(now);
			return { ok: true, retryAfterSec: 0 };
		},
		checkLLM(key, now = Date.now()) {
			const b = bucketFor(key);
			prune(b.llm, now - DAY);
			if (b.llm.length >= limits.llmPerDay) return false;
			const lastHour = b.llm.filter((t) => t >= now - HOUR).length;
			return lastHour < limits.llmPerHour;
		},
		recordLLM(key, now = Date.now()) {
			bucketFor(key).llm.push(now);
		},
		reset() {
			buckets.clear();
		}
	};
}

/** The public site, per visitor IP: /api/analyze. */
export const siteLimiter = createLimiter({ perMinute: 20, llmPerHour: 10, llmPerDay: 40 });

/** The MCP endpoint, per connection (one Google sign-in), so the budget follows the person. */
export const mcpLimiter = createLimiter({ perMinute: 60, llmPerHour: 30, llmPerDay: 200 });

/** The OAuth endpoints, per IP. They never call the LLM. */
export const oauthLimiter = createLimiter({ perMinute: 30, llmPerHour: 0, llmPerDay: 0 });

export const checkRequest = siteLimiter.checkRequest;
export const checkLLM = siteLimiter.checkLLM;
export const recordLLM = siteLimiter.recordLLM;

/** Test hook. */
export function resetRateLimits(): void {
	siteLimiter.reset();
	mcpLimiter.reset();
	oauthLimiter.reset();
}
