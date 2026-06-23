#!/usr/bin/env bash
#
# Inject NODE_AUTH_TOKEN into a Vercel project so its builds can install the
# private @teamzira/* packages (e.g. @teamzira/alloy) from GitHub Packages.
#
# Run this ONCE per new app, after its Vercel project exists — e.g. as a step
# in the "create a new Teambridge app" flow. It's idempotent (upsert), so
# re-running just updates the value.
#
# Why it's needed: a Vercel Shared Environment Variable only applies to projects
# it's explicitly linked to, and (on Pro) there's no "apply to all projects"
# toggle — so each new project needs the token set. This scripts that step.
#
# Required env vars:
#   VERCEL_TOKEN     Vercel access token        -> https://vercel.com/account/tokens
#   NODE_AUTH_TOKEN  read:packages GitHub PAT    (the same token used to install the package)
#   VERCEL_PROJECT   the new project's name or id
# Optional:
#   VERCEL_TEAM      team id (team_…) if the project lives under a team
#
# Usage:
#   VERCEL_TOKEN=… NODE_AUTH_TOKEN=… VERCEL_PROJECT=my-app VERCEL_TEAM=team_… \
#     ./scripts/setup-vercel-auth.sh

set -euo pipefail

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN (https://vercel.com/account/tokens)}"
: "${NODE_AUTH_TOKEN:?Set NODE_AUTH_TOKEN (read:packages GitHub PAT)}"
: "${VERCEL_PROJECT:?Set VERCEL_PROJECT (project name or id)}"

team_qs=""
if [ -n "${VERCEL_TEAM:-}" ]; then
  team_qs="&teamId=${VERCEL_TEAM}"
fi

# GitHub PATs are JSON-safe (no quotes/backslashes), so printf interpolation is
# fine and avoids a jq dependency. Target production + preview (preview covers
# branch/PR deploys). Local dev uses each developer's own auth, not this var, so
# "development" is intentionally omitted. type=encrypted -> standard secret,
# available at build time; switch to "sensitive" if you want it write-only.
body=$(printf '{"key":"NODE_AUTH_TOKEN","value":"%s","type":"encrypted","target":["production","preview"]}' "$NODE_AUTH_TOKEN")

curl -fsS -X POST \
  "https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env?upsert=true${team_qs}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$body" >/dev/null

echo "✓ NODE_AUTH_TOKEN set on Vercel project '${VERCEL_PROJECT}' (production + preview)"
