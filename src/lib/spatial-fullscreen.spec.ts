import { describe, expect, it } from 'vitest';
import { fullscreenSupported, imageControlsSupported } from './spatial-fullscreen';

const withFullscreen = { requestFullscreen() {} };

describe('fullscreenSupported', () => {
	it('needs fullscreenEnabled and requestFullscreen on the image prototype', () => {
		expect(fullscreenSupported(true, withFullscreen)).toBe(true);
	});

	it.each([
		['disabled', false, withFullscreen],
		['missing fullscreenEnabled', undefined, withFullscreen],
		['no requestFullscreen', true, {}],
		['requestFullscreen not a function', true, { requestFullscreen: true }],
	])('is false when %s', (_, enabled, prototype) => {
		expect(fullscreenSupported(enabled, prototype)).toBe(false);
	});

	it('finds an inherited requestFullscreen', () => {
		expect(fullscreenSupported(true, Object.create(withFullscreen))).toBe(true);
	});
});

describe('imageControlsSupported', () => {
	it('checks for a controls property without reading it', () => {
		const prototype = Object.defineProperty({}, 'controls', {
			get() {
				throw new TypeError('Illegal invocation');
			},
		});
		expect(imageControlsSupported(prototype)).toBe(true);
		expect(imageControlsSupported({})).toBe(false);
	});
});
