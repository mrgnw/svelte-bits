import os
from pathlib import Path


def existing_dir(name):
	value = os.environ.get(name)
	assert value, f'set {name}'
	path = Path(value).resolve()
	assert path.is_dir(), path
	return path


def fresh_dir(name):
	value = os.environ.get(name)
	assert value, f'set {name} to a new scratch directory'
	path = Path(value).resolve()
	path.mkdir()
	return path


def create(root, relative):
	path = (root / relative).resolve()
	assert path.is_relative_to(root), f'{relative} escapes {root}'
	path.parent.mkdir(parents=True, exist_ok=True)
	return path.open('xb')
