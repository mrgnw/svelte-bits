import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

// Static checks only: a concurrent process that swaps a checked directory for a symlink between check and write is not prevented.
const RESEARCH = '/Volumes/wd/cache/spatial-maker/research';
export const PRESERVED = ['51-baseline', '51-rest-fidelity', '51-tilt-overscan'].map((name) => join(RESEARCH, name));

const inside = (path, root) => path === root || path.startsWith(root + sep);

export async function freshDir(name) {
	const value = process.env[name];
	if (!value) throw new Error(`set ${name} to a new scratch directory`);
	const root = join(await realpath(dirname(resolve(value))), basename(resolve(value)));
	for (const preserved of PRESERVED) {
		const canonical = await realpath(preserved).catch(() => preserved);
		if (inside(root, canonical)) throw new Error(`${value} is inside preserved evidence ${preserved}`);
	}
	await mkdir(root);
	return root;
}

export async function create(root, name, content) {
	const path = resolve(root, name);
	if (!inside(path, root) || path === root) throw new Error(`${name} escapes ${root}`);
	let parent = root;
	for (const part of relative(root, dirname(path)).split(sep).filter(Boolean)) {
		parent = join(parent, part);
		const stat = await lstat(parent).catch(() => null);
		if (stat === null) await mkdir(parent);
		else if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${name} escapes ${root} through ${parent}`);
	}
	await writeFile(path, content, { flag: 'wx' });
}
