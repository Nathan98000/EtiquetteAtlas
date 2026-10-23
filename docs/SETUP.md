# Manual setup steps

Steps only the repository owner can do, in GitHub or a third-party dashboard. Nothing here is
automated. Tick each item once it is done.

## Before the first deploy

- [x] **Confirm the repository is public.** GitHub Pages on a free account needs a public
  repository, and C-10 requires one. Check *Settings → General → Danger Zone → Change repository
  visibility*; it should say the repository is public.
- [x] **Set the Pages source to GitHub Actions.** *Settings → Pages → Build and deployment →
  Source: GitHub Actions*. Without it, the `deploy` job in `.github/workflows/deploy.yml` fails.
- [x] **Push `main`** (after reviewing the local commits). The *Deploy* workflow runs every CI check,
  builds the site and publishes it. Then open:
  - https://nathan98000.github.io/EtiquetteAtlas/ to see the placeholder home page with the
    attribution footer;
  - https://nathan98000.github.io/EtiquetteAtlas/no-such-page/ to see the custom 404 page with
    its styling and a link home.
- [x] **Check "Enforce HTTPS" (HR-6).** *Settings → Pages*. Sites on `github.io` are
  HTTPS-only, so the box should already be ticked and locked; confirm it after the first deploy.

## Analytics (SRS §8.5)

- [x] **Try Cloudflare Web Analytics with the `github.io` hostname.** In the Cloudflare dashboard
  (a free account is enough), open *Web Analytics → Add a site*. Enter the hostname
  `nathan98000.github.io` and choose the JavaScript snippet option for a site not proxied by
  Cloudflare. Record whether the hostname is accepted. If it is, note the site token from the
  snippet: it is public, since it ships in every page, so it is not a secret.
- **If the hostname is rejected, use GoatCounter instead.** Not needed: Cloudflare accepted the
  hostname (below). For reference, the fallback was a free site at https://www.goatcounter.com/
  (for example `etiquette-atlas.goatcounter.com`) and its code.

Outcome (23 October 2026): Cloudflare Web Analytics accepted `nathan98000.github.io`. Its site
token is `58ded44fdb764340973b62e1e32f48a6`; it ships in every page, so it is public. Since M7
the beacon is on every page, and its script host (`static.cloudflareinsights.com`) and reporting
host (`cloudflareinsights.com`) are the only third parties in the CSP (`site/vite.config.ts`,
`site/site.config.js`; NFR-31, NFR-32).

- [ ] **After the first deploy with the beacon, confirm it counts.** Open a few pages of
  https://nathan98000.github.io/EtiquetteAtlas/ in a browser without an ad blocker, then check
  *Web Analytics* in the Cloudflare dashboard for page views on `nathan98000.github.io` (they can
  take a few minutes). Note whether moving between views (society, sample) counts as extra page
  views. Test runs send nothing: Playwright stubs the beacon and Lighthouse CI blocks it. A page
  opened from `npm run preview` in an ordinary browser does send a page view, for `localhost`.

## Repository secrets

- [ ] **None are needed for M0.** The workflows use only the built-in `GITHUB_TOKEN`, and the
  analytics token is public. Only the optional Cloudflare Workers fallback (HR-9, a Could) would
  need secrets later: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, under *Settings →
  Secrets and variables → Actions*.

## Dependency updates (NFR-33)

- [ ] **Turn on Dependabot alerts.** *Settings → Code security → Dependabot alerts: Enable*.
  Version updates need no setting: `.github/dependabot.yml` asks for weekly grouped pull requests
  for npm, uv and GitHub Actions. Optionally enable *Dependabot security updates* too. CI already
  runs `npm audit --omit=dev` and `uv audit` on every pull request. A `@playwright/test` update
  fails CI until the Playwright image tag in `.github/workflows/ci.yml` and the visual baselines
  follow it (`npm run test:visual:update` from `site/`).

## Later

- [ ] **Before the first pipeline pull request:** under *Settings → Actions → General → Workflow
  permissions*, tick *Allow GitHub Actions to create and approve pull requests*, so
  `pipeline.yml` can open a pull request that updates `data/derived/`. Leave the default
  workflow permissions read-only: only that workflow's `pull-request` job asks for write access.
  GitHub does not run CI on pull requests opened by `GITHUB_TOKEN`, so close and reopen each
  pipeline pull request to run `ci.yml` before merging (merging runs it again before deploying).
- [ ] **Only if the 2000–2003 comparison must come down (SRS R-6, decision 75):** under
  *Settings → Secrets and variables → Actions → Variables*, add the repository variable
  `CHANGE_MODULE` with the value `off`, then rerun *Deploy*. The deployed site then has no change
  pages, links, sitemap entries, method section, 2000–2003 credit or data. Delete the variable
  (or set it to `on`) and redeploy to bring the module back. Leave it unset otherwise.
- [ ] **Optional:** a branch rule on `main` requiring the CI checks. Pushes to `main` already run
  them before any deploy, so this matters only if collaborators join.
