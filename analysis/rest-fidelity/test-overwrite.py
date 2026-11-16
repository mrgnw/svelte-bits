# /// script
# requires-python = ">=3.14"
# dependencies = []
# ///
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

from scratch import PRESERVED, UnsafeOutput, create, fresh_dir

HERE = Path(__file__).parent
BASELINE, REST, TILT = PRESERVED


def snapshot():
	state = {}
	for root in PRESERVED:
		for path in sorted(root.rglob('*')):
			if path.is_file() or path.is_symlink():
				info = path.lstat()
				state[str(path)] = (
					info.st_size,
					info.st_mtime_ns,
					hashlib.sha256(path.read_bytes()).hexdigest(),
				)
			else:
				state[str(path)] = 'dir'
	return state


def rejected(command, env, needle):
	result = subprocess.run(
		command, cwd=HERE, env={**os.environ, **env}, capture_output=True, text=True, check=False
	)
	output = result.stdout + result.stderr
	assert result.returncode != 0, f'{command} {env} was not rejected'
	assert needle in output, f'{command} {env}: expected {needle!r} in\n{output[-2000:]}'
	print(
		'rejected', command[-1] if command[0] != 'node' or '-e' not in command else 'scratch.mjs', env or ''
	)


def node_create(root, name):
	script = "import { create } from './scratch.mjs'; await create(process.argv[1], process.argv[2], 'x');"
	return ['node', '--input-type=module', '-e', script, str(root), name]


def python_rejects(action, needle):
	try:
		action()
	except (UnsafeOutput, FileExistsError) as error:
		assert needle in f'{type(error).__name__} {error}', error
		print('rejected scratch.py', needle)
		return
	raise AssertionError(f'{action} was not rejected')


def check_destinations(scratch):
	uv = ['uv', 'run', '--locked']
	alias = scratch / 'alias-to-tilt'
	alias.symlink_to(TILT)
	deep_alias = scratch / 'alias-to-rest-run'
	deep_alias.symlink_to(REST / '2026-11-16')
	inside = 'inside preserved evidence'
	destinations = [
		REST / '2026-11-16',
		TILT / '2026-11-16',
		TILT / 'new-child',
		BASELINE / '2026-11-16' / 'new-child',
		alias / 'new-child',
		deep_alias / 'new-child',
	]
	for destination in destinations:
		rejected(['node', 'capture-tilt.mjs'], {'TILT_OVERSCAN': str(destination)}, inside)
		rejected(['node', 'capture.mjs'], {'REST_FIDELITY': str(destination)}, inside)
		rejected(
			[*uv, 'analyze-tilt.py'],
			{'TILT_OVERSCAN': str(TILT / '2026-11-16'), 'TILT_ANALYSIS': str(destination)},
			inside,
		)
		rejected(
			[*uv, 'analyze.py'],
			{'REST_FIDELITY': str(REST / '2026-11-16'), 'REST_ANALYSIS': str(destination)},
			inside,
		)
	for created in [
		TILT / 'new-child',
		BASELINE / '2026-11-16' / 'new-child',
		REST / '2026-11-16' / 'new-child',
	]:
		assert not created.exists(), created
	existing = scratch / 'existing'
	existing.mkdir()
	rejected(['node', 'capture-tilt.mjs'], {'TILT_OVERSCAN': str(existing)}, 'EEXIST')
	rejected(
		[*uv, 'analyze-tilt.py'],
		{'TILT_OVERSCAN': str(TILT / '2026-11-16'), 'TILT_ANALYSIS': str(existing)},
		'FileExistsError',
	)
	rejected(['node', 'capture.mjs'], {'REST_FIDELITY': ''}, 'set REST_FIDELITY')
	rejected(
		[*uv, 'analyze-tilt.py'],
		{'TILT_OVERSCAN': str(TILT / '2026-11-16'), 'TILT_ANALYSIS': ''},
		'set TILT_ANALYSIS',
	)


def check_writes(scratch):
	root = scratch / 'root'
	root.mkdir()
	outside = scratch / 'outside'
	outside.mkdir()
	(root / 'link').symlink_to(outside)
	(root / 'final').symlink_to(outside / 'target')
	(root / 'exists').write_bytes(b'keep')
	cases = [
		('../escape', 'escapes'),
		('link/x', 'escapes'),
		('link/sub/x', 'escapes'),
		('final', 'EEXIST'),
		('exists', 'EEXIST'),
	]
	for name, needle in cases:
		rejected(node_create(root, name), {}, needle)
		python_rejects(
			lambda name=name: create(root, name), 'FileExistsError' if needle == 'EEXIST' else needle
		)
	assert list(outside.iterdir()) == [], list(outside.iterdir())
	assert not (scratch / 'escape').exists()
	assert (root / 'exists').read_bytes() == b'keep'
	with create(root, 'nested/ok.txt') as file:
		file.write(b'ok')
	subprocess.run(node_create(root, 'nested/js.txt'), cwd=HERE, check=True)
	assert (root / 'nested/ok.txt').read_bytes() == b'ok' and (root / 'nested/js.txt').read_bytes() == b'x'
	os.environ['FRESH'] = str(scratch / 'alias-to-tilt' / 'python-child')
	python_rejects(lambda: fresh_dir('FRESH'), 'inside preserved evidence')
	print('symlink, escape and overwrite writes rejected; nested writes inside root succeed')


def main():
	before = snapshot()
	print(f'snapshot: {len(before)} preserved paths')
	scratch = Path(tempfile.mkdtemp(prefix='rest-fidelity-overwrite-test-')).resolve()
	print('scratch left in place:', scratch)
	check_destinations(scratch)
	check_writes(scratch)
	after = snapshot()
	assert after == before, json.dumps(sorted(set(after) ^ set(before)))
	print('preserved evidence unchanged')


if __name__ == '__main__':
	main()
