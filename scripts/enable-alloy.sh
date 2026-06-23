#!/usr/bin/env bash
#
# Opt this app into the real @teamzira/alloy design-system components.
#
# The template ships with the shadcn + Alloy-token replica and NO dependency on
# @teamzira/alloy, so it clones and deploys with zero auth. Run this only when
# you want a real Alloy component that shadcn doesn't provide
# (see docs/alloy-components.md).
#
# What it does: installs the package, wires app/globals.css + next.config.ts,
# and tells you how to set the deploy token. Idempotent — safe to re-run.
#
# Requires a read:packages GitHub token. Provide ONE of:
#   • run `gh auth refresh -s read:packages` first (this reads `gh auth token`), or
#   • export NODE_AUTH_TOKEN=<a read:packages PAT> before running.

set -euo pipefail

ALLOY_VERSION="^0.3.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1) Resolve a read:packages token.
TOKEN="${NODE_AUTH_TOKEN:-}"
if [ -z "$TOKEN" ] && command -v gh >/dev/null 2>&1; then
  TOKEN="$(gh auth token 2>/dev/null || true)"
fi
if [ -z "$TOKEN" ]; then
  echo "✗ No read:packages token found."
  echo "  Run:  gh auth refresh -s read:packages    (then re-run this script)"
  echo "  or:   export NODE_AUTH_TOKEN=<read:packages PAT>"
  exit 1
fi

# 2) Ensure npm/yarn can authenticate to GitHub Packages (one-time, user-global).
if ! grep -qs 'npm.pkg.github.com/:_authToken' "$HOME/.npmrc"; then
  echo "→ Adding GitHub Packages auth to ~/.npmrc (one-time dev setup)"
  printf '//npm.pkg.github.com/:_authToken=%s\n' "$TOKEN" >> "$HOME/.npmrc"
fi

# 3) Install the package + its peer dependency.
echo "→ Installing @teamzira/alloy@${ALLOY_VERSION} + @headlessui/react"
yarn add "@teamzira/alloy@${ALLOY_VERSION}" "@headlessui/react@^2"

# 4) Wire app/globals.css (idempotent; inserts after the tailwindcss import).
CSS="app/globals.css"
if [ -f "$CSS" ] && ! grep -q '@teamzira/alloy/theme' "$CSS"; then
  echo "→ Wiring $CSS"
  awk '
    { print }
    /^@import "tailwindcss";/ && !done {
      print ""
      print "/* @teamzira/alloy — theme + component styles (alloy-* namespaced; no collision with the shadcn tokens below). */"
      print "@import \"@teamzira/alloy/theme\";"
      print "@import \"@teamzira/alloy/styles\";"
      print "@source \"../node_modules/@teamzira/alloy/src\";"
      done = 1
    }
  ' "$CSS" > "$CSS.tmp" && mv "$CSS.tmp" "$CSS"
fi

# 5) Wire next.config.ts (idempotent).
NC="next.config.ts"
if [ -f "$NC" ] && ! grep -q 'withAlloy' "$NC"; then
  echo "→ Wiring $NC"
  awk '
    /^import type \{ NextConfig \} from "next";/ && !imp {
      print; print "import { withAlloy } from \"@teamzira/alloy/next\";"; imp = 1; next
    }
    /^export default nextConfig;/ { print "export default withAlloy(nextConfig);"; next }
    { print }
  ' "$NC" > "$NC.tmp" && mv "$NC.tmp" "$NC"
fi

# 6) Verify wiring; if a fork diverged from the expected anchors, give manual steps.
warn=0
if [ -f "$CSS" ] && ! grep -q '@teamzira/alloy/theme' "$CSS"; then
  echo "⚠ Could not auto-wire $CSS. Add these lines after '@import \"tailwindcss\";':"
  echo '    @import "@teamzira/alloy/theme";'
  echo '    @import "@teamzira/alloy/styles";'
  echo '    @source "../node_modules/@teamzira/alloy/src";'
  warn=1
fi
if [ -f "$NC" ] && ! grep -q 'withAlloy' "$NC"; then
  echo "⚠ Could not auto-wire $NC. Import { withAlloy } from '@teamzira/alloy/next' and wrap your default export: export default withAlloy(nextConfig)"
  warn=1
fi

# 7) Deploy token: set it on Vercel automatically if creds are present, else remind.
echo
echo "✓ Alloy enabled. Use components per docs/alloy-components.md."
echo
if [ -n "${VERCEL_TOKEN:-}" ] && [ -n "${VERCEL_PROJECT:-}" ]; then
  echo "→ Setting NODE_AUTH_TOKEN on Vercel project '${VERCEL_PROJECT}'"
  NODE_AUTH_TOKEN="$TOKEN" "$ROOT/scripts/setup-vercel-auth.sh"
else
  echo "⚠ This app now depends on a private package, so DEPLOYS need the token:"
  echo "    • Vercel — set NODE_AUTH_TOKEN on the project (Settings → Env Vars, Production + Preview),"
  echo "      or run:  VERCEL_TOKEN=… VERCEL_PROJECT=<project> ./scripts/setup-vercel-auth.sh"
  echo "    • GitHub Actions CI — inherits the org NODE_AUTH_TOKEN secret automatically (nothing to do)."
fi
[ "$warn" = 0 ] || exit 0
