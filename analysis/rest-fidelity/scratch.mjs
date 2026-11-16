import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

export async function freshDir(name) {
	const value = process.env[name];
	if (!value) throw new Error(`set ${name} to a new scratch directory`);
	const root = resolve(value);
	await mkdir(root);
	return root;
}

export async function create(root, relative, content) {
	const path = resolve(root, relative);
	if (!path.startsWith(root + sep)) throw new Error(`${relative} escapes ${root}`);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content, { flag: 'wx' });
}
