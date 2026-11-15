import { describe, expect, it } from 'vitest';
import { arrowStep, digitKey, type KeyLike } from './arrowStep';

const press = (key: string, overrides: Partial<KeyLike> = {}): KeyLike => ({
	key,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
	shiftKey: false,
	defaultPrevented: false,
	target: { tagName: 'BODY' },
	...overrides,
});

describe('arrowStep', () => {
	it('steps back on ArrowLeft and forward on ArrowRight', () => {
		expect(arrowStep(press('ArrowLeft'))).toBe(-1);
		expect(arrowStep(press('ArrowRight'))).toBe(1);
	});

	it('ignores other keys', () => {
		for (const key of ['ArrowUp', 'ArrowDown', 'a', 'Enter', 'Tab', ' ']) expect(arrowStep(press(key))).toBe(0);
	});

	it('ignores arrows with a modifier or a prevented default', () => {
		for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'] as const) {
			expect(arrowStep(press('ArrowLeft', { [modifier]: true }))).toBe(0);
		}
		expect(arrowStep(press('ArrowRight', { defaultPrevented: true }))).toBe(0);
	});

	it('ignores arrows aimed at form controls and editable content', () => {
		for (const tagName of ['INPUT', 'input', 'SELECT', 'TEXTAREA']) {
			expect(arrowStep(press('ArrowRight', { target: { tagName } }))).toBe(0);
		}
		expect(arrowStep(press('ArrowRight', { target: { tagName: 'DIV', isContentEditable: true } }))).toBe(0);
	});

	it('navigates from buttons, links and a missing target', () => {
		for (const tagName of ['BUTTON', 'A', 'DIV']) expect(arrowStep(press('ArrowRight', { target: { tagName } }))).toBe(1);
		expect(arrowStep(press('ArrowLeft', { target: null }))).toBe(-1);
	});
});

describe('digitKey', () => {
	it('returns digits from 1 to max', () => {
		expect(digitKey(press('1'), 6)).toBe(1);
		expect(digitKey(press('6'), 6)).toBe(6);
		for (const key of ['0', '7', '9', 'a', ' ', 'ArrowLeft', '12']) expect(digitKey(press(key), 6)).toBe(0);
	});

	it('ignores digits typed into form controls or with a modifier', () => {
		expect(digitKey(press('2', { target: { tagName: 'INPUT' } }), 6)).toBe(0);
		expect(digitKey(press('2', { metaKey: true }), 6)).toBe(0);
		expect(digitKey(press('2', { target: { tagName: 'BUTTON' } }), 6)).toBe(2);
	});
});
