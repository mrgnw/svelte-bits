# /// script
# requires-python = ">=3.14"
# dependencies = ["numpy", "pillow>=11.3"]
# ///
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

from scratch import create, existing_dir, fresh_dir

BASELINE = Path(
	os.environ.get('SPATIAL_BASELINE', '/Volumes/wd/cache/spatial-maker/research/51-baseline/2026-11-16')
)
CAPTURE = existing_dir('REST_FIDELITY')
GATE_DELTA = 24
GATE_SHARE = 0.5


def rgb(path):
	with Image.open(path) as image:
		return np.array(image.convert('RGB'))


def delta(first, second):
	assert first.shape == second.shape, (first.shape, second.shape)
	return np.abs(first.astype(np.int16) - second.astype(np.int16)).max(axis=2)


def score(first, second):
	d = delta(first, second)
	share = float((d > GATE_DELTA).mean() * 100)
	return {
		'over_24_pct': round(share, 3),
		'mean': round(float(d.mean()), 3),
		'max': int(d.max()),
		'pass': share < GATE_SHARE,
	}


CROP = 240
CROP_CELLS = ['composite/t1024-overscan', 'composite/t1024-none', 'composite/t1400-none']


def densest(mask):
	window = np.lib.stride_tricks.sliding_window_view(mask.cumsum(0).cumsum(1), (CROP, CROP))
	sums = window[:, :, -1, -1] - window[:, :, 0, -1] - window[:, :, -1, 0] + window[:, :, 0, 0]
	y, x = np.unravel_index(np.argmax(sums), sums.shape)
	return int(x), int(y)


def heat(d):
	return np.stack([np.clip(d * 4, 0, 255), np.where(d > GATE_DELTA, 255, 0), np.zeros_like(d)], 2).astype(
		np.uint8
	)


def crop_sheet(dest, stem, plain, images):
	residual = delta(images['composite/t1024-none'], plain) > GATE_DELTA
	x, y = densest(residual.astype(np.int64))
	tiles = [plain[y : y + CROP, x : x + CROP]]
	for key in CROP_CELLS:
		image = images[key][y : y + CROP, x : x + CROP]
		tiles += [image, heat(delta(image, tiles[0]))]
	row = np.concatenate(tiles, 1)
	with create(dest, f'sheets/{stem}-rest-crops.png') as file:
		Image.fromarray(row).resize((row.shape[1] * 2, row.shape[0] * 2), Image.Resampling.NEAREST).save(
			file, format='PNG'
		)
	return {
		'x': x,
		'y': y,
		'size': CROP,
		'columns': ['plain', *[f'{k}{s}' for k in CROP_CELLS for s in ('', ' diff')]],
	}


def photo_scores(dest, stem, capture):
	base = CAPTURE / stem
	ref = {path.stem: rgb(path) for path in (base / 'ref').glob('*.png')}
	plain = ref['plain']
	assert np.array_equal(plain, rgb(BASELINE / 'renders' / stem / 'reference.png')), (
		'plain reference drifted'
	)
	assert np.array_equal(
		rgb(base / 'composite/t1024-overscan.png'), rgb(BASELINE / 'renders' / stem / 'baseline/neutral.png')
	), 'pinned composite rest drifted from baseline'
	controls = {
		'plain-repeat': score(ref['plain-repeat'], plain),
		'plain-high-quality': score(ref['plain-high'], plain),
		'inverted': score(ref['inverted'], plain),
		'framed-none-vs-plain': score(ref['framed-none'], plain),
		'framed-overscan-vs-plain': score(ref['framed-overscan'], plain),
		'framed-overscan-inverted-vs-framed': score(ref['framed-overscan-inverted'], ref['framed-overscan']),
	}
	assert controls['plain-repeat']['max'] == 0
	assert not controls['inverted']['pass'] and not controls['framed-overscan-inverted-vs-framed']['pass']
	cells = {}
	images = {}
	for path in capture['paths']:
		for texture in capture['textures']:
			for zoom in capture['zooms']:
				image = images[f'{path}/t{texture}-{zoom}'] = rgb(base / path / f't{texture}-{zoom}.png')
				framed = ref[f'framed-{zoom}']
				cells[f'{path}/t{texture}-{zoom}'] = {
					'vs_plain': score(image, plain),
					'vs_framed': score(image, framed),
				}
	return {'controls': controls, 'cells': cells, 'crop': crop_sheet(dest, stem, plain, images)}


def main():
	capture = json.loads((CAPTURE / 'capture.json').read_text())
	dest = fresh_dir('REST_ANALYSIS')
	results = {
		'renderer_sha256': capture['libHashes'],
		'pinned': capture['pinned'],
		'gate': f'<{GATE_SHARE}% px with max RGB delta >{GATE_DELTA}',
		'photos': {},
	}
	for photo in capture['photos']:
		results['photos'][photo['stem']] = photo_scores(dest, photo['stem'], capture)
	with create(dest, 'results.json') as file:
		file.write((json.dumps(results, indent='\t') + '\n').encode())
	keys = list(next(iter(results['photos'].values()))['cells'])
	stems = list(results['photos'])
	print('vs_plain over_24_pct / vs_framed over_24_pct')
	print('cell'.ljust(28) + ''.join(s[:12].rjust(16) for s in stems))
	for key in keys:
		row = [results['photos'][s]['cells'][key] for s in stems]
		print(
			key.ljust(28)
			+ ''.join(
				f'{c["vs_plain"]["over_24_pct"]:7.3f}/{c["vs_framed"]["over_24_pct"]:7.3f}'.rjust(16)
				for c in row
			)
		)
	for name in next(iter(results['photos'].values()))['controls']:
		print(
			name.ljust(36)
			+ ''.join(f'{results["photos"][s]["controls"][name]["over_24_pct"]:9.3f}' for s in stems)
		)


if __name__ == '__main__':
	main()
