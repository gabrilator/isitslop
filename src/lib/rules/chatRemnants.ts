// Assistant-turn leakage: phrases that belong to a chat reply, not prose.
// Openers are only checked near the start of the text, closers near the end.

export const CHAT_OPENERS_EN: string[] = [
	'certainly!',
	'sure!',
	'of course!',
	'absolutely!',
	'great question',
	"here's a",
	'here is a',
	"i'd be happy to",
	'happy to help',
	'let me explain'
];

export const CHAT_OPENERS_ES: string[] = [
	'¡claro!',
	'claro, aquí',
	'¡por supuesto!',
	'por supuesto, aquí',
	'aquí tienes',
	'con gusto',
	'permíteme explicarte',
	'excelente pregunta'
];

export const CHAT_CLOSERS_EN: string[] = [
	'i hope this helps',
	'hope this helps',
	'let me know if',
	'would you like me to',
	'feel free to ask',
	'feel free to reach out',
	'if you have any questions'
];

export const CHAT_CLOSERS_ES: string[] = [
	'espero que te sea útil',
	'espero que esto te ayude',
	'espero que te ayude',
	'no dudes en preguntar',
	'si tienes alguna pregunta',
	'avísame si',
	'házmelo saber'
];

export const SYCOPHANCY_EN: string[] = ["you're absolutely right", 'you are absolutely right'];

export const SYCOPHANCY_ES: string[] = ['tienes toda la razón', 'tenés toda la razón'];
