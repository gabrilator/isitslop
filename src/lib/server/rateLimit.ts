// In-memory, per-IP sliding-window rate limits. Single-node only: counters
// reset on restart and are not shared across instances — fine for this app.

const REQ_PER_MIN = 20; // hard cap on any /api/analyze call
const LLM_PER_HOUR = 10; // LLM passes funded by the server key
const LLM_PER_DAY = 40;
const MAX_BUCKETS = 10_000; // memory bound against IP-rotation floods

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

interface Bucket {
	reqs: number[];
	llm: number[];
}

const buckets = new Map<string, Bucket>();

function bucketFor(ip: string): Bucket {
	let b = buckets.get(ip);
	if (!b) {
		if (buckets.size >= MAX_BUCKETS) {
			// evict oldest-inserted entries
			for (const key of buckets.keys()) {
				buckets.delete(key);
				if (buckets.size < MAX_BUCKETS) break;
			}
		}
		b = { reqs: [], llm: [] };
		buckets.set(ip, b);
	}
	return b;
}

function prune(stamps: number[], cutoff: number): void {
	let drop = 0;
	while (drop < stamps.length && stamps[drop] < cutoff) drop++;
	if (drop > 0) stamps.splice(0, drop);
}

/** Hard gate for any request. Returns retry-after seconds when blocked. */
export function checkRequest(ip: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
	const b = bucketFor(ip);
	prune(b.reqs, now - MIN);
	if (b.reqs.length >= REQ_PER_MIN) {
		return { ok: false, retryAfterSec: Math.ceil((b.reqs[0] + MIN - now) / 1000) };
	}
	b.reqs.push(now);
	return { ok: true, retryAfterSec: 0 };
}

/** Soft gate for LLM passes — all run on the server's key, all are metered. */
export function checkLLM(ip: string, now = Date.now()): boolean {
	const b = bucketFor(ip);
	prune(b.llm, now - DAY);
	if (b.llm.length >= LLM_PER_DAY) return false;
	const lastHour = b.llm.filter((t) => t >= now - HOUR).length;
	return lastHour < LLM_PER_HOUR;
}

export function recordLLM(ip: string, now = Date.now()): void {
	bucketFor(ip).llm.push(now);
}

/** Test hook. */
export function resetRateLimits(): void {
	buckets.clear();
}
