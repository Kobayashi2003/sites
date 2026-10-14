// Runs ESLint, Prettier or Node tests over the atlas and every site in sites.json.
// Neither tool follows a junction on its own: ESLint is given each
// concepts/<slug> link, and Prettier (which refuses links) each site's real
// folder, formatted with this project's config.
//
//   node scripts/check.mjs lint | format | format:check | test
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
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

if (mode === 'test') {
  // Sites keep Node tests beside the code they cover, as *.test.mjs.
  const tests = sites.flatMap(([, folder]) =>
    readdirSync(resolve(root, folder), { recursive: true })
      .filter((file) => file.endsWith('.test.mjs'))
      .filter((file) => !file.split(/[\\/]/).includes('node_modules'))
      .map((file) => join(resolve(root, folder), file)),
  );
  if (!tests.length) {
    console.log('No site tests found.');
    process.exit(0);
  }
  process.exit(run(['--test', ...tests, ...extra]));
}

console.error(
  'Usage: node scripts/check.mjs lint | format | format:check | test',
);
process.exit(1);
