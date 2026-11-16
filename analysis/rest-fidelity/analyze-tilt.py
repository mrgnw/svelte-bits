# /// script
# requires-python = ">=3.14"
# dependencies = ["numpy", "pillow>=11.3"]
# ///
import json
import os
from itertools import pairwise
from pathlib import Path

import numpy as np
from PIL import Image

from scratch import create, existing_dir, fresh_dir

BASELINE = Path(
	os.environ.get('SPATIAL_BASELINE', '/Volumes/wd/cache/spatial-maker/research/51-baseline/2026-11-16')
)
CAPTURE = existing_dir('TILT_OVERSCAN')
GATE_DELTA = 24
GATE_SHARE = 0.5
CROP = 240


def rgb(path):
	with Image.open(path) as image:
		return np.array(image.convert('RGB'))


def delta(first, second):
	assert first.shape == second.shape, (first.shape, second.shape)
	return np.abs(first.astype(np.int16) - second.astype(np.int16)).max(axis=2)


def gate(first, second):
	share = float((delta(first, second) > GATE_DELTA).mean() * 100)
	return {'over_24_pct': round(share, 3), 'pass': share < GATE_SHARE}


def heat(d):
	return np.stack([np.clip(d * 4, 0, 255), np.where(d > GATE_DELTA, 255, 0), np.zeros_like(d)], 2).astype(
		np.uint8
	)


def path_summary(frames):
	steps = [f for f in frames if 'stepMean' in f]
	zooms = [f['zoom'] for f in frames]
	return {
		'max_uncovered_pct': round(max(f['uncoveredPct'] for f in frames), 4),
		'zoom_min': round(min(zooms), 4),
		'zoom_max': round(max(zooms), 4),
		'max_zoom_step': round(max(abs(a - b) for a, b in pairwise(zooms)), 4),
		'step_mean_avg': round(sum(f['stepMean'] for f in steps) / len(steps), 3),
		'step_mean_max': round(max(f['stepMean'] for f in steps), 3),
		'step_over24_pct_avg': round(sum(f['stepOver24Pct'] for f in steps) / len(steps), 3),
		'step_over24_pct_max': round(max(f['stepOver24Pct'] for f in steps), 3),
	}


def magenta(image):
	return (image[:, :, 0] == 255) & (image[:, :, 1] == 0) & (image[:, :, 2] == 255)


def run_from_edge(mask):
	margin = mask.shape[0] // 10
	mask = mask[margin : mask.shape[0] - margin]
	covered = ~mask
	return int(np.where(covered.any(axis=1), covered.argmax(axis=1), mask.shape[1]).max())


def edge_bands(image):
	mask = magenta(image)
	return {
		'left': run_from_edge(mask),
		'right': run_from_edge(mask[:, ::-1]),
		'top': run_from_edge(mask.T),
		'bottom': run_from_edge(mask.T[:, ::-1]),
	}


def photo_results(dest, record):
	stem = record['stem']
	base = CAPTURE / stem
	plain = rgb(BASELINE / 'renders' / stem / 'reference.png')
	baseline_views = {p.stem: rgb(p) for p in (BASELINE / 'renders' / stem / 'baseline').glob('*.png')}
	for view, image in baseline_views.items():
		assert np.array_equal(rgb(base / 'views/fixed' / f'{view}.png'), image), (
			f'{stem} fixed {view} drifted'
		)
	assert np.array_equal(rgb(base / 'rest/t1024-fixed.png'), baseline_views['neutral'])
	assert not gate(255 - plain, plain)['pass']
	assert not magenta(plain).any(), f'{stem} source contains the clear colour'
	rest = {key: gate(rgb(base / 'rest' / f'{key}.png'), plain) for key in record['rest']}
	views = {}
	for mode, results in record['views'].items():
		tilted = {view: r for view, r in results.items() if view != 'neutral'}
		views[mode] = {
			'max_uncovered_pct': round(max(r['uncoveredPct'] for r in tilted.values()), 4),
			'views_with_uncovered': sum(r['uncovered'] > 0 for r in tilted.values()),
			'edge_band_px': {view: edge_bands(rgb(base / 'views' / mode / f'{view}.png')) for view in tilted},
		}
	paths = {
		mode: {name: path_summary(frames) for name, frames in p.items()}
		for mode, p in record['paths'].items()
	}
	rest_sheet(dest, stem, plain)
	return {'rest': rest, 'views': views, 'paths': paths}


def rest_sheet(dest, stem, plain):
	tiles = [plain[:CROP, :CROP]]
	for key in ['t1024-fixed', 't1024-max', 't1400-max']:
		image = rgb(CAPTURE / stem / 'rest' / f'{key}.png')[:CROP, :CROP]
		tiles += [image, heat(delta(image, tiles[0]))]
	row = Image.fromarray(np.concatenate(tiles, 1))
	save(
		dest,
		f'sheets/{stem}-rest-corner.png',
		row.resize((row.width * 2, row.height * 2), Image.Resampling.NEAREST),
	)


def worst_view_sheet(dest, photos):
	cell = (300, 460)
	sheet = Image.new('RGB', (4 * cell[0], len(photos) * cell[1]), 'gray')
	for row, (stem, result) in enumerate(photos.items()):
		bands = result['views']['none']['edge_band_px']
		view = max(bands, key=lambda name: max(bands[name].values()))
		for column, mode in enumerate(['none', 'fixed', 'max', 'length']):
			with Image.open(CAPTURE / stem / 'views' / mode / f'{view}.png') as image:
				thumb = image.convert('RGB')
			thumb.thumbnail(cell)
			sheet.paste(thumb, (column * cell[0], row * cell[1]))
	save(dest, 'sheets/worst-none-view-by-mode.png', sheet)


def save(dest, relative, image):
	with create(dest, relative) as file:
		image.save(file, format='PNG')


def main():
	capture = json.loads((CAPTURE / 'capture.json').read_text())
	dest = fresh_dir('TILT_ANALYSIS')
	photos = {r['stem']: photo_results(dest, r) for r in capture['photos']}
	worst_view_sheet(dest, photos)
	results = {
		'pinned': capture['pinned'],
		'pinned_renderer_sha256': capture['pinnedRendererSha256'],
		'experimental_renderer_sha256': capture['experimentalRendererSha256'],
		'chromium_args': capture['args'],
		'gate': f'<{GATE_SHARE}% px with max RGB delta >{GATE_DELTA} vs plain source',
		'scope': 'sampled tilts and paths at texture 1024; fixed focus 0.5 and pinned assets; Chromium/Metal',
		'photos': photos,
	}
	with create(dest, 'results.json') as file:
		file.write((json.dumps(results, indent='\t') + '\n').encode())
	print(json.dumps(photos, indent=1))


if __name__ == '__main__':
	main()
