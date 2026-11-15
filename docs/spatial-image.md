# Using SpatialImage

`SpatialImage` shows a photo that shifts with the viewer's tilt, using a depth map. Near parts move more than far parts. On visionOS it can also open a stereo HEIC in fullscreen. Without a `depth` map it is a plain image.

It takes no runtime dependencies. Install the package as described in the [README](../README.md#install), then import it:

```ts
import { SpatialImage } from '@mrgnw/svelte-bits';
```

## Minimal example

The photos in `static/spatial/` are a real set: `{stem}.avif`, `{stem}-da3-depth.avif`, `{stem}-da3-spatial.heic`, and the background layer `{stem}-bg.avif` with `{stem}-bg-depth.png`.

```svelte
<script lang="ts">
	import { SpatialImage } from '@mrgnw/svelte-bits';

	const photo = '/spatial/_80.avif';
	const depthMap = '/spatial/_80-da3-depth.avif';
	const background = '/spatial/_80-bg.avif';
	const backgroundDepth = '/spatial/_80-bg-depth.png';
	const stereo = '/spatial/_80-da3-spatial.heic';
	const description = 'Black and white portrait of a man framing his face with his hands';
</script>

<SpatialImage
	class="photo"
	src={photo}
	depth={depthMap}
	back={background}
	backDepth={backgroundDepth}
	spatial={stereo}
	alt={description}
/>

<style>
	:global(.photo) {
		width: min(100%, 32rem);
		aspect-ratio: 4 / 3;
	}
</style>
```

Give the root a size. The image and canvas fill it with `object-fit: cover`, so a root without a height collapses.

## Props

| Prop | Type | Default | Notes |
|-|-|-|-|
| `src` | `string` | required | Flat image. Also the colour texture. |
| `alt` | `string` | required | Alt text. An empty string marks the image as decorative. |
| `depth` | `string` | none | Depth map. White is near. Without it the component is a flat image. |
| `back` | `string` | none | Background layer: the photo with the foreground inpainted. Shown where tilt reveals what the foreground hid. Needs `backDepth`. |
| `backDepth` | `string` | none | Depth map of `back`. Needs `back`. |
| `spatial` | `string` | none | Stereo HEIC for fullscreen on visionOS. |
| `strength` | `number` | `0.08` | Largest shift as a fraction of box width. 0 to 0.5. Capped at 0.06 with `back`. |
| `focus` | `number` | `0.5` | Depth value that stays still. 0 to 1. |
| `scroll` | `number` | `0.35` | Weight of the scroll input. 0 turns it off. 0 to 1. |
| `textureSize` | `number` | `1024` | Longest texture side in pixels. Integer, 64 to 4096. |
| `tilt` | `{ x: number; y: number }` | none | Controlled tilt. Each axis -1 to 1, clamped to length 1. When set, the component listens to no input and draws this tilt. |
| `view` | `'composite' \| 'front' \| 'back' \| 'depth' \| 'back-depth'` | `'composite'` | What to draw at the current tilt: the normal result, the front layer over a checkerboard where it is transparent, the back layer alone, or either depth map as grayscale. The back views need `back`. |
| `controls` | `Snippet<[SpatialControls]>` | default buttons | Replaces the motion and spatial buttons. |
| `onready` | `() => void` | none | The first frame was drawn. Fires once per set of `src`, `depth`, `back` and `backDepth`. |
| `onerror` | `(error: Error) => void` | none | A load, WebGL or fullscreen failure. The flat image stays. |
| `class`, other attributes | | | Passed to the root `<div>`. |

An invalid prop throws `Error('SpatialImage: ...')`: an empty `src`, a non-string `alt`, or a number outside its range. Failures at run time go to `onerror` instead.

The image is zoomed so the largest shift never shows past an edge. A higher `strength` zooms in more.

## Controls

The default controls are two plain buttons with text and no styling beyond position:

- "Enable motion" while `motion` is `'prompt'`. It is hidden under reduced motion.
- "View in spatial" while a fullscreen spatial view is available.

Pass a `controls` snippet to replace them. It receives one object:

| Field | Type | Meaning |
|-|-|-|
| `motion` | `'unsupported' \| 'prompt' \| 'granted' \| 'denied'` | State of device orientation. |
| `requestMotion` | `() => void` | Asks for motion permission. Call it from a click. |
| `spatial` | `boolean` | True when fullscreen spatial view is available. |
| `enterSpatial` | `() => void` | Opens the spatial view. Call it from a click, and only while `spatial` is true. |

```svelte
<SpatialImage src={photo} depth={depthMap} spatial={stereo} alt={description}>
	{#snippet controls({ motion, requestMotion, spatial, enterSpatial })}
		{#if motion === 'prompt'}<button type="button" onclick={requestMotion}>Enable motion</button>{/if}
		{#if spatial}<button type="button" onclick={enterSpatial}>View in spatial</button>{/if}
	{/snippet}
</SpatialImage>
```

`SpatialControls` and `MotionState` are exported as types.

## Callbacks

- `onready` runs after the first frame is drawn. It does not run again for the same sources, for example after a lost WebGL context is restored. It runs again when `src` or `depth` changes.
- `onerror` receives an `Error` for: an image or depth map that fails to load, a cross-origin file without CORS headers, no WebGL, no vertex texture units, a lost context, or a refused fullscreen request. The flat image stays visible. A denied motion permission is not an error. It is `motion === 'denied'`.

## Inputs

All sources are feature-detected and listen at once. The component does no user-agent detection.

| Source | Rule |
|-|-|
| Cursor | Mouse position over the image sets the tilt. Leaving returns it to neutral. |
| Swipe | Touch and pen drag tilts left and right. Release returns to neutral. A vertical swipe still scrolls the page. |
| Tilt | Device orientation. The first reading is the neutral pose, and it re-centres when the screen rotates. |
| Scroll | The image's position relative to the viewport centre tilts it up and down, weighted by `scroll`. |

With the `tilt` prop set, none of these sources listen and `motion` is `'unsupported'`. Several images can then share one tilt.

A drag in progress wins. Otherwise device orientation wins once it has delivered a reading, then the cursor. The tilt eases toward its target.

### Motion permission

Where `DeviceOrientationEvent.requestPermission` exists (iOS), `motion` is `'prompt'` and no orientation events arrive until `requestMotion` runs from a click. The component never asks on its own. Where the event exists without a permission API, `motion` is `'granted'`. Without it, `'unsupported'`. Swipe works in every state.

### Reduced motion

With `prefers-reduced-motion: reduce`, cursor, tilt and scroll are off and the image sits at neutral. Swipe still works, because it is an explicit gesture. The setting is followed live.

### Cost

The frame loop runs only while the image is in the viewport, the tab is visible and the tilt is still moving. One WebGL context serves every instance on the page.

## Depth maps

The depth map is a grayscale image of the same scene and aspect ratio as `src`:

- White is near, black is far.
- Values are scaled min to max per image, so `focus` is relative to that photo.
- Only the red channel is read, at 8 bits. WebGL1 uploads images at 8 bits per channel, so a 16-bit PNG loads but gains nothing over an 8-bit one. At the default strength one depth level is about 0.3 px, which is not visible.
- It is resized to `textureSize` on the longest side.

spatial-maker writes this format. Use `depth:png`, `depth:png16` or `depth:avif` in `--output-types`:

```sh
PHOTO=photo.jpg
```

```sh
spatial-maker "$PHOTO" --output-types depth:avif
```

AVIF is the smallest of the three. The command is unverified. Check `spatial-maker --help` for the exact flags of your version.

## Background layer

At a sharp depth change, tilt opens a gap beside the near object. The front layer (`src` over `depth`) fades out where it would stretch across that gap. `back` over `backDepth` is drawn behind it and fills the gap.

Both files come from your own tooling. Generating them is outside this library.

| Prop | Content |
|-|-|
| `back` | The photo with a band around each near edge inpainted, so the gap shows background instead of the near object. AVIF keeps it small. |
| `backDepth` | The depth map with the inpainted band pushed to the far side. Keep it PNG. |

`back` and `backDepth` must match `src` in aspect ratio. The inpainted band reaches about 40 to 80 px from each edge at 1400 px. A wider gap shows the original photo again, so `strength` is capped at 0.06 when `back` is set.

Without `back`, the photo is drawn a second time behind the front layer, over a blurred copy of `depth`. The gap then shows a smooth smear of nearby pixels instead of streaks.

## Spatial fullscreen

Where the browser can show a stereo HEIC, "View in spatial" opens it in fullscreen. On a Vision Pro it displays as a spatial photo.

The button shows only when all of these hold:

- `spatial` is set and the file decodes. Browsers that cannot decode HEIC never show it.
- `document.fullscreenEnabled` is true.
- `requestFullscreen` exists on `<img>`.

`enterSpatial` calls `requestFullscreen()` on a hidden `<img src={spatial}>` inside the click, which visionOS requires. A rejected request goes to `onerror`.

Where `'controls' in HTMLImageElement.prototype` (Safari 27, or visionOS 26 with the feature flag), that `<img>` gets the `controls` attribute. With no `depth`, that image is shown inline and its native control replaces the flat image and the custom button. With `depth`, the parallax view stays and the button opens fullscreen.

Elsewhere the spatial `<img>` has no stereo display. Browsers that decode HEIC and have element fullscreen, such as macOS Safari, show the button and present a flat image.

The fullscreen path is not verified on hardware.

## Server rendering and fallback

The server renders the root, the flat `<img>` with its `alt`, and with `depth` a hidden `<canvas aria-hidden="true">`. The first paint is the flat image. WebGL is created in the browser only.

The canvas shows after the first frame is drawn. The flat image stays in the accessibility tree. If WebGL is missing, the context is lost, or a file fails to load, the canvas stays hidden, `onerror` runs and the flat image remains.

`src` and `depth` are loaded with `crossOrigin = 'anonymous'`. A file on another origin needs CORS headers, or WebGL cannot read it.

## Styling

| Hook | Use |
|-|-|
| `.spatial-image` | The root. `position: relative`. Takes your `class`. |
| `canvas[data-ready]` | The canvas once a frame is drawn. |
| `.spatial-image-motion`, `.spatial-image-enter` | The default buttons, positioned bottom right and bottom left. |
| `.spatial-image-spatial` | The spatial `<img>`. Hidden except inline or in fullscreen. |

The classes are scoped inside the component. Reach them with `:global`, or pass a `controls` snippet and style your own elements.

## Known limits

- Without `back`, the gap beside a near object shows a smooth smear of nearby pixels, and a rim about 4 texels wide of the background moves with the object.
- With `back`, the gap shows whatever `layers.py` inpainted. It inpaints only a band around each edge, so LaMa sometimes continues the subject into the gap: `_80` shows a dark smear beside the thumb and `A7_00355` a faint second outline of the head. Regenerating `bg` with the whole subject masked would fix this. That is a change to `layers.py`.
- Edges follow the depth map. Where the map has blocky steps, the faded edge has them too.
- Photos only. For video, use a plain `<video>` with a flat `mp4` fallback.
- Depth is 8 bits.
- One page runs at most one WebGL context. The mesh is 480 x 480 quads, or 240 x 240 without 32-bit indices.
- Touch drag tilts left and right only.
- The fullscreen and `<img controls>` paths are unverified on a Vision Pro.
- Tilt constants (range 15 degrees, half-life 100 ms) are starting values, not tuned on a device.
