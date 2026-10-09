import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vinext from 'vinext';
import { defineConfig, normalizePath, type Plugin } from 'vite';

// Each site is a junction under concepts/ (scripts/link-sites.mjs). Vite
// resolves files to their real paths, which would put a site outside this
// project: its packages would not resolve, and vinext refuses to optimize
// images served from /@fs/. Map ids inside a site back to its link instead.
function linkedSites(): Plugin {
  const sites = Object.keys(
    JSON.parse(
      readFileSync(new URL('./sites.json', import.meta.url), 'utf8'),
    ) as Record<string, string>,
  ).map((slug) => {
    const link = fileURLToPath(new URL(`./concepts/${slug}`, import.meta.url));
    return {
      link: normalizePath(link),
      real: normalizePath(realpathSync(link)),
    };
  });
  return {
    name: 'site-atlas:linked-sites',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (!resolved || resolved.external) return resolved;
      const site = sites.find(({ real }) => resolved.id.startsWith(`${real}/`));
      return site
        ? { ...resolved, id: site.link + resolved.id.slice(site.real.length) }
        : resolved;
    },
  };
}

export default defineConfig({
  plugins: [linkedSites(), vinext()],
});
