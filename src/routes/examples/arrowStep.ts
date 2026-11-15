type KeyTarget = { tagName?: string; isContentEditable?: boolean } | null;

export type KeyLike = {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	defaultPrevented: boolean;
	target: object | null;
};

const TYPING_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

function ignored(event: KeyLike): boolean {
	if (event.defaultPrevented) return true;
	const target = event.target as KeyTarget;
	if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return true;
	if (target?.isContentEditable) return true;
	return TYPING_TAGS.has(target?.tagName?.toUpperCase() ?? '');
}

export function arrowStep(event: KeyLike): -1 | 0 | 1 {
	if (ignored(event)) return 0;
	if (event.key === 'ArrowLeft') return -1;
	if (event.key === 'ArrowRight') return 1;
	return 0;
}

export function digitKey(event: KeyLike, max: number): number {
	if (ignored(event) || !/^[1-9]$/.test(event.key)) return 0;
	const digit = Number(event.key);
	return digit <= max ? digit : 0;
}
