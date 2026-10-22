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

- [ ] **Try Cloudflare Web Analytics with the `github.io` hostname.** In the Cloudflare dashboard
  (a free account is enough), open *Web Analytics → Add a site*. Enter the hostname
  `nathan98000.github.io` and choose the JavaScript snippet option for a site not proxied by
  Cloudflare. Record whether the hostname is accepted. If it is, note the site token from the
  snippet: it is public, since it ships in every page, so it is not a secret.
- [ ] **If the hostname is rejected, use GoatCounter instead.** Create a free site at
  https://www.goatcounter.com/ (for example `etiquette-atlas.goatcounter.com`) and note its
  code.

Either way, report the outcome. In M2 the beacon is added to every page and its script and
reporting hosts are added to the CSP in `site/vite.config.ts`, so the site still contacts no
other third party (NFR-31, NFR-32).

## Repository secrets

- [ ] **None are needed for M0.** The workflows use only the built-in `GITHUB_TOKEN`, and the
  analytics token is public. Only the optional Cloudflare Workers fallback (HR-9, a Could) would
  need secrets later: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, under *Settings →
  Secrets and variables → Actions*.

## Later

- [ ] **Before M1's first pipeline pull request:** under *Settings → Actions → General → Workflow
  permissions*, tick *Allow GitHub Actions to create and approve pull requests*, so
  `pipeline.yml` can open a pull request that updates `data/derived/`.
- [ ] **Optional:** a branch rule on `main` requiring the CI checks. Pushes to `main` already run
  them before any deploy, so this matters only if collaborators join.
