// Links src/library to the shared components folder with a directory junction,
// so the atlas shows whatever that folder holds without copying it. Idempotent;
// dev, build, typecheck and lint run it first.
import { existsSync, lstatSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const link = resolve(root, 'src/library');
const target = resolve(root, '../../components');

if (!existsSync(target)) {
  console.error(`Components folder not found at ${target}. Check out or restore it there.`);
  process.exit(1);
}

let stat;
try {
  stat = lstatSync(link);
} catch {
  stat = undefined;
}

if (stat && !stat.isSymbolicLink()) {
  console.error(`${link} is a real directory, not a link. Move its contents to ${target}.`);
  process.exit(1);
}

if (stat) {
  let current;
  try {
    current = realpathSync(link);
  } catch {
    current = undefined;
  }
  if (current === realpathSync(target)) process.exit(0);
  rmSync(link);
}

symlinkSync(target, link, 'junction');
console.log(`Linked ${relative(root, link)} -> ${target}`);
