// Runs ESLint or Prettier over the atlas and every site in sites.json.
// Neither tool follows a junction on its own: ESLint is given each
// concepts/<slug> link, and Prettier (which refuses links) each site's real
// folder, formatted with this project's config.
//
//   node scripts/check.mjs lint | format | format:check
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [mode, ...extra] = process.argv.slice(2);
const run = (args) =>
  spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' }).status ??
  1;

const linked = run([join(root, 'scripts/link-sites.mjs')]);
if (linked !== 0) process.exit(linked);

const sites = Object.entries(
  JSON.parse(readFileSync(join(root, 'sites.json'), 'utf8')),
);
const bin = (path) => join(root, 'node_modules', path);

if (mode === 'lint') {
  const links = sites.map(([slug]) => `concepts/${slug}`);
  process.exit(run([bin('eslint/bin/eslint.js'), '.', ...links, ...extra]));
}

if (mode === 'format' || mode === 'format:check') {
  const folders = sites.map(([, folder]) => resolve(root, folder));
  const action = mode === 'format' ? '--write' : '--check';
  process.exit(
    run([
      bin('prettier/bin/prettier.cjs'),
      action,
      '--config',
      '.prettierrc.json',
      '.',
      ...folders,
      ...extra,
    ]),
  );
}

console.error('Usage: node scripts/check.mjs lint | format | format:check');
process.exit(1);
