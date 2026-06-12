declare module 'text-readability' {
	interface Readability {
		fleschKincaidGrade(text: string): number;
		fleschReadingEase(text: string): number;
		textStandard(text: string, floatOutput?: boolean): string | number;
	}
	const rs: Readability;
	export default rs;
}
