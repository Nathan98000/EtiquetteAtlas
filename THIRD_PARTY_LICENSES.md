# Third-party licences

The Etiquette Atlas's own code is under the MIT licence (`LICENSE`). It builds on the software and
data below (NFR-42). Versions are those pinned in `site/package-lock.json` and `uv.lock`; each
package's full licence text ships with it.

## Data

| Source | Licence | Used for |
| --- | --- | --- |
| [Global Study of Everyday Norms](https://doi.org/10.17605/OSF.IO/SH4RB), Eriksson et al. (2025), OSF sh4rb | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Every aggregate in `data/derived/`; credited on every page (NFR-40) |
| 2000–2003 comparison data, [Gelfand et al. (2011)](https://doi.org/10.1126/science.1197754), via the GSN deposit | Deposited in OSF sh4rb under CC BY 4.0; whether that covers this extract is open (SRS §11.2) | Society–cell aggregates only, in the change module (C-6, NFR-41) |
| [Natural Earth](https://www.naturalearthdata.com/) 1:110m land, through [world-atlas](https://github.com/topojson/world-atlas) 2.0.2 | Public domain (Natural Earth); ISC (world-atlas) | The dot map's outlines (FR-24) and the Societies share image |

## Code shipped to the browser

| Package | Version | Licence |
| --- | --- | --- |
| [Svelte](https://github.com/sveltejs/svelte) | 5.57.2 | MIT |
| [SvelteKit](https://github.com/sveltejs/kit) (`@sveltejs/kit`) | 3.1.0 | MIT |
| [devalue](https://github.com/sveltejs/devalue), [esm-env](https://github.com/benmccann/esm-env), [clsx](https://github.com/lukeed/clsx) (SvelteKit and Svelte runtime) | 5.9.4, 1.2.2, 2.1.1 | MIT |
| [d3-scale](https://github.com/d3/d3-scale) | 4.0.2 | ISC |
| [d3-array](https://github.com/d3/d3-array) | 3.2.4 | ISC |
| [d3-geo](https://github.com/d3/d3-geo) | 3.1.1 | ISC |
| [d3-interpolate](https://github.com/d3/d3-interpolate), [d3-color](https://github.com/d3/d3-color), [d3-format](https://github.com/d3/d3-format), [d3-time](https://github.com/d3/d3-time), [d3-time-format](https://github.com/d3/d3-time-format) (d3-scale's dependencies) | 3.0.1, 3.1.0, 3.1.2, 3.1.0, 4.1.0 | ISC |
| [internmap](https://github.com/mbostock/internmap) (d3-array's dependency) | 2.0.3 | ISC |
| [topojson-client](https://github.com/topojson/topojson-client) | 3.1.0 | ISC |

## Services the browser contacts

| Service | Terms | Used for |
| --- | --- | --- |
| [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) beacon, loaded from `static.cloudflareinsights.com` and reporting to `cloudflareinsights.com` | Cloudflare's terms and [privacy policy](https://www.cloudflare.com/privacypolicy/); the script is not redistributed | Counting page views without cookies (FR-90); described on the method page (FR-92) |

## Build and test tools (site)

| Package | Licence |
| --- | --- |
| Vite, Vitest, `@sveltejs/adapter-static`, `@sveltejs/vite-plugin-svelte`, svelte-check | MIT |
| ESLint, typescript-eslint, eslint-plugin-svelte, eslint-config-prettier, Prettier, prettier-plugin-svelte | MIT |
| TypeScript | Apache-2.0 |
| Playwright (`@playwright/test`) | Apache-2.0 |
| axe-core and `@axe-core/playwright` | MPL-2.0 (used unmodified, in tests only) |
| Lighthouse CI (`@lhci/cli`) and Lighthouse | Apache-2.0 |
| [Playwright Docker image](https://mcr.microsoft.com/en-us/artifact/mar/playwright) (`mcr.microsoft.com/playwright`), for the share images and visual regression in CI and locally | Apache-2.0 (Playwright); Ubuntu packages under their own licences |
| [Liberation Sans](https://github.com/liberationfonts/liberation-fonts), from that image, renders the share images' text | SIL Open Font License 1.1; the font is not shipped, only its glyphs drawn into the PNGs |

## Pipeline (Python)

| Package | Licence |
| --- | --- |
| DuckDB | MIT |
| NumPy | BSD-3-Clause, with bundled parts under 0BSD, MIT, Zlib and CC0-1.0 |
| pandas, pandas-stubs | BSD-3-Clause |
| pandera | MIT |
| pytest, pytest-cov, mypy, Ruff | MIT |
| coverage.py | Apache-2.0 |
