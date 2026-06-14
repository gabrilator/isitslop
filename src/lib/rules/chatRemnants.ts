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
	'excelente pregunta',
	'¡claro que sí!',
	'¡por supuesto que sí!',
	'¡absolutamente!',
	'¡desde luego!',
	'¡buena pregunta!',
	'¡qué buena pregunta!',
	'estaré encantado de ayudarte',
	'estaré encantada de ayudarte',
	'encantado de ayudarte',
	'encantada de ayudarte',
	'con mucho gusto',
	'permitime explicarte',
	'déjame explicarte',
	'dejame explicarte',
	'acá tienes',
	'¡me alegra que preguntes!'
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
	'házmelo saber',
	'espero que te resulte útil',
	'espero que esta información te sea útil',
	'espero que te haya servido',
	'si tienes más preguntas',
	'si tenés alguna pregunta',
	'si tienes alguna otra pregunta',
	'no dudes en contactarme',
	'no dudes en preguntarme',
	'no dudes en consultarme',
	'estoy aquí para ayudarte',
	'estoy para ayudarte',
	'¿quieres que te ayude con',
	'¿querés que te ayude con'
];

export const SYCOPHANCY_EN: string[] = ["you're absolutely right", 'you are absolutely right'];

export const SYCOPHANCY_ES: string[] = [
	'tienes toda la razón',
	'tenés toda la razón',
	'tienes mucha razón',
	'tenés mucha razón',
	'estás en lo cierto',
	'excelente observación',
	'estoy completamente de acuerdo',
	'estoy totalmente de acuerdo',
	'tienes toda la razón del mundo',
	'qué buena observación'
];
