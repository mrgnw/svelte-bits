export function fullscreenSupported(fullscreenEnabled: boolean | undefined, imagePrototype: object): boolean {
	return fullscreenEnabled === true && typeof Reflect.get(imagePrototype, 'requestFullscreen') === 'function';
}

export function imageControlsSupported(imagePrototype: object): boolean {
	return 'controls' in imagePrototype;
}
