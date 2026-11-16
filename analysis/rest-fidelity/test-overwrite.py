# /// script
# requires-python = ">=3.14"
# dependencies = []
# ///
import hashlib
import os
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
CACHE = Path('/Volumes/wd/cache/spatial-maker/research')
PRESERVED = [
	CACHE / '51-baseline/2026-11-16',
	CACHE / '51-rest-fidelity/2026-11-16',
	CACHE / '51-tilt-overscan/2026-11-16',
	CACHE / '51-tilt-overscan/2026-11-16-invalid-shared-inprocess-gpu',
]


def snapshot():
	state = {}
	for root in PRESERVED:
		for path in sorted(root.rglob('*')):
			if path.is_file():
				state[str(path)] = (
					path.stat().st_size,
					path.stat().st_mtime_ns,
					hashlib.sha256(path.read_bytes()).hexdigest(),
				)
	return state


def rejected(command, env, needle):
	result = subprocess.run(
		command, cwd=HERE, env={**os.environ, **env}, capture_output=True, text=True, check=False
	)
	output = result.stdout + result.stderr
	assert result.returncode != 0, f'{command} {env} was not rejected'
	assert needle in output, f'{command} {env}: expected {needle!r} in\n{output[-2000:]}'


def main():
	before = snapshot()
	print(
		f'snapshot: {len(before)} preserved files, {sum(v[0] for v in before.values()) // 2**20} MiB hashed'
	)
	uv = ['uv', 'run', '--locked']
	with tempfile.TemporaryDirectory() as scratch:
		cases = [
			(['node', 'capture.mjs'], {'REST_FIDELITY': str(PRESERVED[1])}, 'EEXIST'),
			(['node', 'capture-tilt.mjs'], {'TILT_OVERSCAN': str(PRESERVED[2])}, 'EEXIST'),
			(['node', 'capture-tilt.mjs'], {'TILT_OVERSCAN': str(PRESERVED[3])}, 'EEXIST'),
			(['node', 'capture.mjs'], {'REST_FIDELITY': ''}, 'set REST_FIDELITY'),
			(
				[*uv, 'analyze.py'],
				{'REST_FIDELITY': str(PRESERVED[1]), 'REST_ANALYSIS': str(PRESERVED[1])},
				'FileExistsError',
			),
			(
				[*uv, 'analyze-tilt.py'],
				{'TILT_OVERSCAN': str(PRESERVED[2]), 'TILT_ANALYSIS': str(PRESERVED[2])},
				'FileExistsError',
			),
			(
				[*uv, 'analyze-tilt.py'],
				{'TILT_OVERSCAN': str(PRESERVED[2]), 'TILT_ANALYSIS': scratch},
				'FileExistsError',
			),
			(
				[*uv, 'analyze-tilt.py'],
				{'TILT_OVERSCAN': str(PRESERVED[2]), 'TILT_ANALYSIS': ''},
				'set TILT_ANALYSIS',
			),
		]
		for command, env, needle in cases:
			rejected(command, env, needle)
			print('rejected', command[-1], env)
		escape = "import { create } from './scratch.mjs'; await create(process.argv[1], '../escape', 'x');"
		rejected(['node', '--input-type=module', '-e', escape, scratch], {}, 'escapes')
		rejected(
			[
				'python3',
				'-c',
				f"from scratch import create; create(__import__('pathlib').Path({scratch!r}), '../escape')",
			],
			{},
			'escapes',
		)
		target = Path(scratch) / 'exists'
		target.write_bytes(b'keep')
		write = f"import {{ create }} from './scratch.mjs'; await create({scratch!r}, 'exists', 'overwrite');"
		rejected(['node', '--input-type=module', '-e', write], {}, 'EEXIST')
		assert target.read_bytes() == b'keep'
		print('rejected containment escapes and exclusive-write overwrite')
		assert not (Path(scratch).parent / 'escape').exists()
	assert snapshot() == before, 'preserved evidence changed'
	print('preserved evidence unchanged')


if __name__ == '__main__':
	main()
