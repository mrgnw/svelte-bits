import os
import stat
from pathlib import Path

# Static checks only: a concurrent process that swaps a checked directory for a symlink between
# check and write is not prevented.
RESEARCH = Path('/Volumes/wd/cache/spatial-maker/research')
PRESERVED = [RESEARCH / name for name in ('51-baseline', '51-rest-fidelity', '51-tilt-overscan')]


class UnsafeOutput(Exception):
	pass


def setting(name):
	value = os.environ.get(name)
	if not value:
		raise UnsafeOutput(f'set {name}')
	return value


def existing_dir(name):
	path = Path(setting(name)).resolve()
	if not path.is_dir():
		raise UnsafeOutput(f'{path} is not a directory')
	return path


def fresh_dir(name):
	value = setting(name)
	path = Path(value).absolute()
	root = path.parent.resolve(strict=True) / path.name
	for preserved in PRESERVED:
		if root.is_relative_to(preserved.resolve()):
			raise UnsafeOutput(f'{value} is inside preserved evidence {preserved}')
	root.mkdir()
	return root


def create(root, relative):
	path = Path(os.path.normpath(root / relative))
	if path == root or not path.is_relative_to(root):
		raise UnsafeOutput(f'{relative} escapes {root}')
	parent = root
	for part in path.parent.relative_to(root).parts:
		parent = parent / part
		try:
			mode = os.lstat(parent).st_mode
		except FileNotFoundError:
			parent.mkdir()
			continue
		if not stat.S_ISDIR(mode):
			raise UnsafeOutput(f'{relative} escapes {root} through {parent}')
	return path.open('xb')
