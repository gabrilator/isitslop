# isitslop

Catch it before it's too late.

isitslop is a small web app that takes up to 1000 words of text and underlines the stylistic tells of AI prose — em-dashes, "delve" verbs, forced morals, fragment-question reveals, corporate jargon, vague intensifiers, passive voice, adverb spam. Works on English and Spanish. The mascot is a red parrot named **Polly** (or **Lorito** in Spanish) — because parrots mock repetition, which is exactly what LLM writing does.

No accounts. No history. No auto-rewrite. Open-source rules. Your text never leaves your browser except for a single request to the analyzer, and it is never stored.

## How it works

Three scanners run in parallel against your text:

- **Scanner A — deterministic** (no LLM). Regex, word lists, passive-voice detector, adverb density. Always runs.
- **Scanner B — fast LLM** (Gemini Flash). Catches "rule of three", "not X but Y", balanced framing, and fragment-question variants.
- **Scanner C — strong LLM** (Gemini Pro). Catches whole-document tells: forced moral at the end, tone-shift "wisdom closure" sentences.

Results merge into a flat list of flags, each with `ruleId`, severity (red / yellow), character offsets, an explanation, and an optional suggestion.

## Severity

- **Red — solid brick underline**: a high-confidence AI tell.
- **Yellow — dotted ochre underline**: a stylistic noise marker; one instance is fine, a cluster reveals AI assistance.

## Rules

### Red flags

| Rule | Trigger |
|---|---|
| `em-dash` | Any em-dash or en-dash. |
| `cliche-opener` | "in today's fast-paced world", "in an ever-changing landscape", etc., in the first 400 chars. |
| `transition-comma` | Sentence-starting `Also,` / `Furthermore,` / `Moreover,` / `Additionally,` (and Spanish `Además,` / `Asimismo,` / `Por otra parte,` / `Por otro lado,`). |
| `fragment-question` | "The kicker?", "The result?", "And the best part?", etc. |
| `artifact-residue` | Literal AI-tool fingerprints pasted in: `oaicite`, `:contentReference[…]{…}`, `turn0search0`, `utm_source=chatgpt.com`. Near-zero false positives. |
| `chat-remnant` | Assistant-turn leakage: "Certainly!" / "¡Claro!" openers (start of text only), "I hope this helps" / "Espero que te sea útil" closers (end only), "You're absolutely right" / "Tienes toda la razón" anywhere. |
| `ai-disclaimer` | "As an AI language model", "as of my last knowledge update" / "como modelo de lenguaje", "hasta mi última actualización". |
| `placeholder-remnant` | Unfilled template slots: `[insert name]`, `[Your Company]` / `[nombre]`, `[tu empresa]`. |
| `rule-of-three` | (LLM) three parallel items leading to a generalisation. |
| `not-x-but-y` | (LLM) "it's not X, it's Y" framings. |
| `balanced-framing` | (LLM) "while X is true, we must also consider Y" hedging. |
| `forced-moral` | (LLM) generic life-lesson conclusion disconnected from the body. |
| `wisdom-closure` | (LLM) sudden aphoristic tone-shift sentence near the end. |

### Yellow flags

| Rule | Trigger |
|---|---|
| `jargon` | Corporate-jargon and AI-overrepresented word list per language (`delve`, `synergy`, `tapestry`, `a testament to`, `vibrant`, `meticulous`, …; `sinergia`, `encomiable`, `vibrante`, `un crisol de`, …). The English additions come from published excess-vocabulary studies (Kobak et al. 2025, Liang et al. 2024, Juzek & Ward 2025). |
| `hedge` | Throat-clearing frames: "it's important to note", "it's worth mentioning" / "cabe destacar", "cabe señalar", "vale la pena mencionar". |
| `participial-comment` | Comma + gerund comment clause: ", highlighting the importance of…", ", underscoring…" / ", destacando…", ", lo que pone de relieve…". A top tell from Wikipedia's AI-cleanup catalog. |
| `conclusion-closer` | "In conclusion / In summary / Overall," ("En conclusión / En resumen / En definitiva") — only when it opens a sentence in the final stretch of the text. |
| `delve-family` | `delve`, `dive into`, `deep dive`, `unpack`, `unravel`, `explore`. |
| `ai-verb` | `leverage`, `harness`, `embark`, `navigate`, `unlock`, `empower`, `ensure`, `utilize`, `emerge`, `embrace`. |
| `vague-intensifier` | `truly`, `deeply`, `profoundly`, `fundamentally`, `undoubtedly`, `essentially`. |
| `adverb` | All `-ly` adverbs in English / `-mente` in Spanish. Density surfaced as a summary when > 3%. |
| `passive` | Be-verb + past participle. |
| `long-sentence` | Top three sentences over 30 words. |
| `colon-labels` | Two or more lines / sentences of the form `Word:` (e.g. `Vision: … Alignment: … Impact: …`) — leadership-deck structure tic. |

### Where the rules live

| Kind | File | What's in it |
|---|---|---|
| Word lists (red) | [`src/lib/rules/clichesOpeners.ts`](src/lib/rules/clichesOpeners.ts) | Cliché opening phrases, EN + ES |
| Word lists (red) | [`src/lib/rules/transitionStarters.ts`](src/lib/rules/transitionStarters.ts) | Sentence-starting transitions (`Also`, `Furthermore`, `Además`, `Asimismo`, …) |
| Word lists (red) | [`src/lib/rules/fragmentQuestions.ts`](src/lib/rules/fragmentQuestions.ts) | "The kicker?", "The result?", "¿La clave?" |
| Word lists (yellow) | [`src/lib/rules/jargon.en.ts`](src/lib/rules/jargon.en.ts) | English corporate jargon + AI-overrepresented vocabulary (~145 terms, including bare-word leadership buzzwords like `vision`, `alignment`, `impact` and research-backed tells like `tapestry`, `testament to`, `meticulous`) |
| Word lists (yellow) | [`src/lib/rules/jargon.es.ts`](src/lib/rules/jargon.es.ts) | Spanish corporate jargon + AI vocabulary (~90 terms) |
| Word lists (red) | [`src/lib/rules/chatRemnants.ts`](src/lib/rules/chatRemnants.ts) | Chat openers/closers and sycophancy phrases, EN + ES |
| Word lists (red) | [`src/lib/rules/aiDisclaimers.ts`](src/lib/rules/aiDisclaimers.ts) | "As an AI…" / "como modelo de lenguaje…" disclaimers |
| Word lists (yellow) | [`src/lib/rules/hedges.ts`](src/lib/rules/hedges.ts) | "it's important to note" / "cabe destacar" hedge frames |
| Word lists (yellow) | [`src/lib/rules/conclusionClosers.ts`](src/lib/rules/conclusionClosers.ts) | "In conclusion" / "En definitiva" closers |
| Word lists (yellow) | [`src/lib/rules/participialComments.ts`](src/lib/rules/participialComments.ts) | Gerunds that form ", highlighting…" comment clauses, EN + ES |
| Word lists (yellow) | [`src/lib/rules/delveFamily.ts`](src/lib/rules/delveFamily.ts) | `delve`, `dive into`, `unpack`, `unravel`, … |
| Word lists (yellow) | [`src/lib/rules/aiVerbs.ts`](src/lib/rules/aiVerbs.ts) | `leverage`, `harness`, `empower`, `utilize`, … |
| Word lists (yellow) | [`src/lib/rules/vagueIntensifiers.ts`](src/lib/rules/vagueIntensifiers.ts) | `truly`, `deeply`, `profoundly`, … |
| Regex / logic | [`src/lib/scanners/deterministic.ts`](src/lib/scanners/deterministic.ts) | Em-dash, transition-comma boundary check, adverb density, passive voice, long-sentence detection. Imports every word list above. |
| LLM prompts | [`src/lib/scanners/llm.ts`](src/lib/scanners/llm.ts) | The `SYSTEM_EN` and `SYSTEM_ES` prompts that drive Gemini for the six abstract rules (`rule-of-three`, `not-x-but-y`, `balanced-framing`, `fragment-question`, `forced-moral`, `wisdom-closure`). |
| Allowed rule IDs | [`src/lib/llm/schema.ts`](src/lib/llm/schema.ts) | Zod schema constraining what the model is allowed to return. |

To add a new rule:
- **Word/phrase rule** → add to the matching list file, then add a call inside `scanDeterministic` in [`deterministic.ts`](src/lib/scanners/deterministic.ts).
- **Regex rule** → just add the regex helper inside [`deterministic.ts`](src/lib/scanners/deterministic.ts) and call it from `scanDeterministic`.
- **Abstract / whole-document rule** → describe it in the `SYSTEM_EN`/`SYSTEM_ES` prompt in [`llm.ts`](src/lib/scanners/llm.ts) and (if needed) widen the ruleId enum.

### Slop score

The score composes five factors. Every flag is always shown in the editor and panel — the score is what gets smart about them.

1. **Per-rule repetition** — each rule group of N instances contributes `baseWeight × 2 × (1.5ᴺ − 1)`. `baseWeight` is **8** for red rules, **3** for yellow. Writing-tip rules (`adverb`, `long-sentence`, `passive`) are flagged in the editor but excluded from the score entirely.
2. **Diversity multiplier** — the raw sum is multiplied by a factor based on how many *distinct* slop-rule types fired: **×0.7** for 1, **×1.0** for 2, **×1.15** for 3, **×1.3** for 4+. Combinations of different tells get amplified.
3. **Length normalisation** — the global score scales by `150 / max(wordCount, 150)`. A 150-word paragraph scores at face value; a 600-word piece needs ~4× the slop density to hit the same number.
4. **Concentration** — slop clusters, so a 100-word window slides across the text (step 25) and the densest window is scored standalone (×0.85). The final score is `max(global, densest window)`: one stuffed paragraph in an otherwise clean essay flags loudly, while the same tells spread thinly across 1000 words stay low. A window holding a single soft sign is forgiven, same as globally.
5. **Forgiveness floor & hard evidence** — exactly one soft sign in a text over 400 words scores **0** (a 1000-word essay with one rule-of-three is not slop). The dead-giveaway rules (`artifact-residue`, `chat-remnant`, `ai-disclaimer`, `placeholder-remnant`) are never forgiven and any hit guarantees a score of at least **25** — they're evidence, not style.

Implemented in [`src/lib/scanners/merge.ts`](src/lib/scanners/merge.ts).

### Sentence rhythm (burstiness)

Human writing varies sentence length; LLM writing regresses to a mean. isitslop computes the **coefficient of variation of words-per-sentence** (σ/μ — a local, transparent proxy for the "burstiness" signal GPTZero and Pangram describe) and shows it as a rhythm meter in the panel: **Monotone** (< 0.30, AI-like uniformity), **Steady** (0.30–0.45), **Varied** (> 0.45). It needs at least 6 sentences and never affects the slop score — it's a writing tip, not a verdict.

## Run it

```bash
npm install
cp .env.example .env       # add your Gemini key if you want LLM scanners (optional)
npm run dev
```

Open <http://localhost:5173>. Without an API key the deterministic scanner still runs, so you'll always see the regex/word-list flags. Set the `GOOGLE_GENAI_API_KEY` env var to enable the LLM scanners.

### Abuse protection

The Gemini key lives only in the server's env — it never reaches the browser — and `/api/analyze` defends itself ([`src/lib/server/`](src/lib/server/)):

- **Per-IP rate limits** — 20 requests/min hard cap (429 + `Retry-After`); LLM passes are capped at 10/hour and 40/day per IP, after which the endpoint degrades to deterministic-only with a warning.
- **Sanity guards before any tokens are spent** — body size cap, language/provider whitelists, and prose checks (letter ratio, repeated-word spam, base64/code blobs all get a 400).
- Limits are in-memory: they reset on restart and assume a single node. Behind a reverse proxy, set adapter-node's `ADDRESS_HEADER` (e.g. `x-forwarded-for`) so `getClientAddress()` sees real client IPs instead of the proxy's.

### Provider

v1 ships with Google Gemini. The codebase keeps the adapter behind an interface so adding Anthropic or OpenAI is a single file under [`src/lib/llm/`](src/lib/llm/) plus a registry entry.

## Stack

SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind 4 · `@google/genai` · `zod` · `franc-min` · `compromise` · `adapter-node`.

Deploys to any Node host (self-hosted, Railway, Fly, your own VPS). Swap the adapter for Cloudflare/Netlify if you'd rather go serverless.

## Test

```bash
npm test              # deterministic scanner + scoring unit tests
npm run check         # full SvelteKit typecheck
```

## What's not in v1

No accounts, no history, no auto-rewrite, no public API, no browser extension, no paywall, no analytics. The rules file *is* the product.

## License

MIT. See [LICENSE](LICENSE).
