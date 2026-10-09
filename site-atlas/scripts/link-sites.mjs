// Links every site listed in sites.json ({ "<slug>": "<folder, relative to
// this project>" }) to concepts/<slug> with a directory junction, and removes
// links for sites no longer listed. Idempotent; dev, build and lint run it first.
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const conceptsDir = join(root, 'concepts');
const sites = JSON.parse(readFileSync(join(root, 'sites.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

for (const name of readdirSync(conceptsDir)) {
  const path = join(conceptsDir, name);
  if (isLink(path) && !Object.hasOwn(sites, name)) {
    rmSync(path);
    console.log(`Unlinked concepts/${name}`);
  }
}

for (const [slug, folder] of Object.entries(sites)) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    fail(`sites.json: "${slug}" is not a kebab-case slug.`);
  const target = resolve(root, folder);
  const link = join(conceptsDir, slug);
  if (!existsSync(join(target, 'index.tsx'))) {
    fail(`sites.json: ${slug} points at ${target}, which has no index.tsx.`);
  }
  if (existsSync(link) || isLink(link)) {
    if (!isLink(link))
      fail(
        `concepts/${slug} is a real directory, not a link. Move it to ${target}.`,
      );
    let current;
    try {
      current = realpathSync(link);
    } catch {
      current = undefined;
    }
    if (current === realpathSync(target)) continue;
    rmSync(link);
  }
  symlinkSync(target, link, 'junction');
  console.log(`Linked concepts/${slug} -> ${target}`);
}
