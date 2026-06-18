import type { Flag, Language } from '$lib/types';
import type { LLMAdapter } from '$lib/llm/adapter';
import { LLMFlagsResponseSchema } from '$lib/llm/schema';
import { MODELS } from '$lib/llm/registry';

const SYSTEM_EN = `You are an expert at spotting AI-generated prose in English.

Analyse the user's text and return flags for ANY of these seven patterns you find:

RED (high-confidence AI tells):
1. "rule-of-three" — three parallel items used as rhetorical scaffolding. Two shapes both count:
   - comma form: "fast, scalable, robust — and built for the future." / "we eat, we sleep, we work — but we never really live."
   - labeled form: "Vision: a north star. Alignment: row together. Impact: ship work." — three single-word headings each followed by content, used as a parroted three-point structure.
   For the LABELED form, set excerpt to JUST the first heading word (e.g. "Vision") — a 5–12 character span. Do NOT span the whole block (a separate rule already marks each "Label:" individually).
2. "not-x-but-y" — contrastive framings that negate one thing then assert its replacement, in ANY person (it / this / we / you / I). Shapes:
   - inline: "it's not X, it's Y", "this isn't about X, it's about Y", "we don't need X, we need Y", "you don't need X, you need Y", "X isn't the goal — Y is".
   - two-sentence: "We don't just do things. We become things.", "You don't sell AI. You sell transformation.", "You don't need a perfect plan. You need to start.", "I'm not writing this to brag. I'm writing it because…", "I'm not here to sell. I'm here to help."
   For the two-sentence form, excerpt must span BOTH sentences together (from the start of the negation to the end of the assertion). The first-person humblebrag disclaimer ("I'm not X-ing to brag, I'm X-ing because…") absolutely counts — flag it.
3. "fragment-question" — ANY short sentence-fragment (not a full grammatical sentence) phrased as a question and used as a hook or reveal, 1-5 words, ending in "?". Do NOT limit yourself to a fixed list of phrasings — judge by the shape. Examples: "Why does this matter?", "And the result?", "The catch?", "What changed?", "And Wednesday?", "The twist?", "So what now?", "The best part?". If a clipped question-fragment is teeing up the next line, flag it.
4. "balanced-framing" — formulaic "while X is true, we must also consider Y" / "though X has merit, Y deserves equal weight" / "yes X, but also Y" hedging.
5. "forced-moral" — final paragraph (or final 1-2 sentences) lands a generic life-lesson disconnected from the body. Shapes: "In the end, what matters most is…", "Ultimately, success belongs to those who…", "At the heart of it all…". Flag the WHOLE moral span.
6. "wisdom-closure" — a sentence near the end that suddenly turns aphoristic / philosophical / universal where the body was concrete. Example: "Because in the end, every great journey begins with a single step."
7. "triadic-cadence" — three parallel beats in a row, used as rhythm, often with anaphora (the same opening word). The beats can be tiny fragments OR uneven full sentences — judge by the THREE-BEAT PARALLELISM, never by length or specific words. Examples: "No pressure. No pretension. Just chess.", "We came. We saw. We shipped.", "Everyone told me I was crazy. My mom cried. My friends went quiet when I brought it up.", "Every win felt like mine. Every client I landed, every problem I solved.", "Built fast. Shipped faster." Set excerpt to the whole run of three beats.

For each flag return:
- ruleId: one of "rule-of-three", "not-x-but-y", "fragment-question", "balanced-framing", "forced-moral", "wisdom-closure", "triadic-cadence"
- severity: always "red"
- excerpt: the exact phrase from the user's text. Copy it verbatim — same words, same punctuation, same case. The server will locate it for you.
- startIndex / endIndex: a best-effort guess at character offsets (the server re-anchors if they're off, so don't agonise).
- explanation: ≤ 80 chars, plain English, why it reads as AI. Never use an em dash in it.
- suggestion (optional): brief rewrite hint, ≤ 140 chars. Never use an em dash in it.

Be aggressive — if a pattern is there, flag it. Up to 12 flags total. Return { "flags": [] } if nothing found.`;

const SYSTEM_ES = `Sos experto en detectar prosa generada por IA en español.

Analizá el texto del usuario y devolvé flags para CUALQUIERA de estos siete patrones:

ROJO (señales fuertes de IA):
1. "rule-of-three" — tres items paralelos como andamio retórico. Dos formas cuentan:
   - forma con comas: "rápido, escalable, robusto — y listo para el futuro."
   - forma etiquetada: "Visión: un norte. Alineación: remar juntos. Impacto: entregar valor." — tres encabezados de una palabra seguidos de contenido.
   Para la forma ETIQUETADA, poné excerpt = SOLO la primera palabra-encabezado (ej. "Visión"), de 5 a 12 caracteres. NO marqués todo el bloque (otra regla marca cada "Etiqueta:" por separado).
2. "not-x-but-y" — encuadres contrastivos que niegan algo y afirman su reemplazo, en CUALQUIER persona (es / esto / nosotros / vos / yo). Formas:
   - en una oración: "no se trata de X, sino de Y", "esto no es X, es Y", "no necesitás X, necesitás Y", "X no es la meta — Y lo es".
   - en dos oraciones: "No vendemos productos. Vendemos transformación.", "No necesitás un plan perfecto. Necesitás empezar.", "No escribo esto para presumir. Lo escribo porque…"
   Para la forma de dos oraciones, el excerpt debe abarcar AMBAS oraciones juntas. El descargo en primera persona ("No escribo esto para presumir, lo escribo porque…") cuenta — marcalo.
3. "fragment-question" — CUALQUIER fragmento breve (no una oración completa) planteado como pregunta y usado como gancho o revelación, de 1 a 5 palabras, terminado en "?". NO te limites a una lista fija de frases: juzgá por la forma. Ej: "¿Por qué importa?", "¿El resultado?", "¿Y entonces?", "¿Y el miércoles?", "¿El giro?", "¿Y ahora qué?", "¿Lo mejor?". Si un fragmento-pregunta arma la línea siguiente, marcalo.
4. "balanced-framing" — fórmulas tipo "si bien X es cierto, también hay que considerar Y".
5. "forced-moral" — última oración(es) cierra con moraleja genérica desconectada del cuerpo. Ej: "Al final, lo que importa es…", "En definitiva, el éxito pertenece a…". Marcá el span completo.
6. "wisdom-closure" — oración cerca del final que se vuelve aforística/filosófica. Ej: "Porque, al final, todo gran viaje comienza con un solo paso."
7. "triadic-cadence" — tres golpes paralelos seguidos, usados como ritmo, a menudo con anáfora (misma palabra inicial). Los golpes pueden ser fragmentos mínimos O oraciones desparejas más largas — juzgá por el PARALELISMO DE TRES GOLPES, nunca por el largo ni palabras específicas. Ej: "Sin presión. Sin pretensión. Solo ajedrez.", "Llegamos. Vimos. Lanzamos.", "Todos me dijeron que estaba loco. Mi mamá lloró. Mis amigos se callaban cuando lo mencionaba.", "Cada victoria fue mía. Cada cliente que conseguí, cada problema que resolví." Poné excerpt = toda la serie de tres golpes.

Para cada flag:
- ruleId: uno de los siete arriba.
- severity: siempre "red".
- excerpt: la frase exacta del texto del usuario. Copiala palabra por palabra, con la misma puntuación y mayúsculas. El servidor la localiza.
- startIndex / endIndex: una estimación; el servidor re-ancla si están mal.
- explanation: ≤ 80 caracteres. Nunca uses raya (em dash).
- suggestion (opcional): ≤ 140 caracteres. Nunca uses raya (em dash).

Sé agresivo. Si el patrón está, marcalo. Máximo 12 flags. Devolvé { "flags": [] } si no hay nada.`;

const RX_ESCAPE = /[.*+?^${}()|[\]\\]/g;
function escapeRx(s: string): string {
	return s.replace(RX_ESCAPE, '\\$&');
}

// Trust but verify: the judge is told to be aggressive, so its flags pass a
// cheap structural check before they count. Full-sentence rhetorical
// questions are human; "not always X" hedges are not negate-then-replace.
const NOT_X_BUT_Y_CHECK_EN =
	/(?:\bnot\b|n't\b)[^.!?\n]{0,140}[.!?,;:]['"”’)\]]?\s*(?:it'?s\b|it\s+is\b|it\s+was\b|it\s+feels\b|that'?s\b|they'?re\b|they\s+\w+|we\s|you\s|i'?m\b|i\s|instead\b|rather\b)/i;
const NOT_X_BUT_Y_CHECK_ES =
	/\bno\b[^.!?\n]{0,140}[.!?,;:]['"”’)\]]?\s*(?:es\b|son\b|se\s+trata|sino\b|más\s+bien|en\s+realidad|lo\s|yo\b|necesit)/i;

export function plausibleLLMFlag(flag: Flag, language: Language): boolean {
	const ex = flag.excerpt.replace(/[’‘]/g, "'").trim();
	if (flag.ruleId === 'fragment-question') {
		const words = ex.split(/\s+/u).filter(Boolean).length;
		return ex.endsWith('?') && words <= 5;
	}
	if (flag.ruleId === 'not-x-but-y') {
		return (language === 'es' ? NOT_X_BUT_Y_CHECK_ES : NOT_X_BUT_Y_CHECK_EN).test(ex);
	}
	return true;
}

function anchorFlag(text: string, flag: Flag): Flag | null {
	if (text.slice(flag.startIndex, flag.endIndex) === flag.excerpt) return flag;

	const direct = text.indexOf(flag.excerpt);
	if (direct >= 0) {
		return { ...flag, startIndex: direct, endIndex: direct + flag.excerpt.length };
	}

	const trimmed = flag.excerpt.trim();
	if (trimmed && trimmed !== flag.excerpt) {
		const idx = text.indexOf(trimmed);
		if (idx >= 0) {
			return { ...flag, excerpt: trimmed, startIndex: idx, endIndex: idx + trimmed.length };
		}
	}

	const pattern = escapeRx(trimmed || flag.excerpt).replace(/\s+/g, '\\s+');
	const re = new RegExp(pattern, 'i');
	const m = re.exec(text);
	if (m) {
		return { ...flag, excerpt: m[0], startIndex: m.index, endIndex: m.index + m[0].length };
	}

	return null;
}

export async function scanLLM(
	adapter: LLMAdapter,
	text: string,
	language: Language,
	apiKey: string
): Promise<Flag[]> {
	const systemPrompt = language === 'es' ? SYSTEM_ES : SYSTEM_EN;
	const result = await adapter.analyze({
		model: MODELS.google.fast,
		systemPrompt,
		userText: text,
		jsonSchema: LLMFlagsResponseSchema,
		apiKey
	});

	const anchored: Flag[] = [];
	let dropped = 0;
	let rejected = 0;
	for (const raw of result.flags) {
		const anchored1 = anchorFlag(text, raw as Flag);
		if (!anchored1) {
			dropped++;
			continue;
		}
		if (!plausibleLLMFlag(anchored1, language)) {
			rejected++;
			continue;
		}
		anchored.push(anchored1);
	}
	if (dropped > 0 || rejected > 0) {
		console.log(
			`[scanLLM] ${result.flags.length} returned, ${dropped} unanchored, ${rejected} implausible`
		);
	}
	return anchored;
}
