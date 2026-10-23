#!/bin/sh
# Runs a command in site/ inside the Playwright Linux image CI uses, so share images and visual
# regression baselines come out as they do in CI (decisions 41 and 90): same Chromium, same fonts,
# with system-ui mapped to Liberation Sans (e2e/fonts.conf). The image's tag follows the installed
# @playwright/test. Linux packages live in a Docker volume, since macOS's node_modules cannot run
# there; `npm ci` refreshes them whenever package-lock.json changes.
#
#   sh scripts/in-docker.sh npm run cards
#   sh scripts/in-docker.sh npx playwright test --project=visual
set -eu

site=$(cd "$(dirname "$0")/.." && pwd)
repo=$(dirname "$site")
version=$(node -p "require('$site/node_modules/@playwright/test/package.json').version")

exec docker run --rm --init --ipc=host \
	-v "$repo:/repo" \
	-v etiquette-atlas-linux-modules:/repo/site/node_modules \
	-w /repo/site \
	-e CI -e PORT -e CHANGE_MODULE -e UPDATE_SNAPSHOTS \
	-e FONTCONFIG_FILE=/repo/site/e2e/fonts.conf \
	"mcr.microsoft.com/playwright:v$version-noble" \
	sh -c 'lock=$(sha256sum package-lock.json | cut -d" " -f1)
		if [ "$(cat node_modules/.lock-sha256 2>/dev/null)" != "$lock" ]; then
			find node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} +
			npm ci --no-audit --no-fund --ignore-scripts >/dev/null
			echo "$lock" > node_modules/.lock-sha256
		fi
		exec "$@"' sh "$@"
