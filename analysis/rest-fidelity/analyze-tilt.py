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

BASELINE = Path(
	os.environ.get('SPATIAL_BASELINE', '/Volumes/wd/cache/spatial-maker/research/51-baseline/2026-11-16')
)
OUT = Path(
	os.environ.get('TILT_OVERSCAN', '/Volumes/wd/cache/spatial-maker/research/51-tilt-overscan/2026-11-16')
)
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


def save_row(tiles, path):
	row = np.concatenate(tiles, 1)
	Image.fromarray(row).resize((row.shape[1] * 2, row.shape[0] * 2), Image.Resampling.NEAREST).save(path)


def path_summary(frames):
	steps = [f for f in frames if 'stepMean' in f]
	zooms = [f['zoom'] for f in frames]
	return {
		'max_uncovered_pct': round(max(f['uncoveredPct'] for f in frames), 4),
		'max_band_px': max(max(f['band'].values()) for f in frames),
		'zoom_min': round(min(zooms), 4),
		'zoom_max': round(max(zooms), 4),
		'max_zoom_step': round(max(abs(a - b) for a, b in pairwise(zooms)), 4),
		'max_step_mean': round(max(f['stepMean'] for f in steps), 3),
		'max_step_over24_pct': round(max(f['stepOver24Pct'] for f in steps), 3),
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


def photo_results(record):
	stem = record['stem']
	base = OUT / stem
	plain = rgb(BASELINE / 'renders' / stem / 'reference.png')
	baseline_views = {p.stem: rgb(p) for p in (BASELINE / 'renders' / stem / 'baseline').glob('*.png')}
	for view, image in baseline_views.items():
		assert np.array_equal(rgb(base / 'views/fixed' / f'{view}.png'), image), (
			f'{stem} fixed {view} drifted'
		)
	assert np.array_equal(rgb(base / 'rest/t1024-fixed.png'), baseline_views['neutral'])
	assert not gate(255 - plain, plain)['pass']
	rest = {key: gate(rgb(base / 'rest' / f'{key}.png'), plain) for key in record['rest']}
	views = {}
	assert not magenta(plain).any(), f'{stem} source contains the clear colour'
	for mode, results in record['views'].items():
		tilted = {view: r for view, r in results.items() if view != 'neutral'}
		bands = {view: edge_bands(rgb(base / 'views' / mode / f'{view}.png')) for view in tilted}
		views[mode] = {
			'max_uncovered_pct': round(max(r['uncoveredPct'] for r in tilted.values()), 4),
			'views_with_uncovered': sum(r['uncovered'] > 0 for r in tilted.values()),
			'edge_band_px': bands,
		}
	paths = {
		mode: {name: path_summary(frames) for name, frames in p.items()}
		for mode, p in record['paths'].items()
	}
	sheet(stem, plain)
	return {'rest': rest, 'views': views, 'paths': paths}


def sheet(stem, plain):
	base = OUT / stem
	height, width = plain.shape[:2]
	corner = (0, 0)
	tiles = []
	for key in ['t1024-fixed', 't1024-max', 't1400-max']:
		image = rgb(base / 'rest' / f'{key}.png')[corner[1] : corner[1] + CROP, corner[0] : corner[0] + CROP]
		tiles += [image, heat(delta(image, plain[:CROP, :CROP]))]
	save_row([plain[:CROP, :CROP], *tiles], OUT / 'sheets' / f'{stem}-rest-corner.png')
	edges = []
	for mode in ['none', 'max', 'length', 'fixed']:
		image = rgb(base / 'views' / mode / 'down-right.png')
		edges.append(image[height - CROP :, width - CROP :])
	save_row(edges, OUT / 'sheets' / f'{stem}-down-right-corner.png')


def main():
	capture = json.loads((OUT / 'capture.json').read_text())
	(OUT / 'sheets').mkdir(exist_ok=True)
	results = {
		'pinned': capture['pinned'],
		'pinned_renderer_sha256': capture['pinnedRendererSha256'],
		'experimental_renderer_sha256': capture['experimentalRendererSha256'],
		'gate': f'<{GATE_SHARE}% px with max RGB delta >{GATE_DELTA} vs plain source',
		'photos': {r['stem']: photo_results(r) for r in capture['photos']},
	}
	(OUT / 'results.json').write_text(json.dumps(results, indent='\t') + '\n')
	print(json.dumps(results['photos'], indent=1))


if __name__ == '__main__':
	main()
