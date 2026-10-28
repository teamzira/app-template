@AGENTS.md

## Working on this app (Claude Code)

AGENTS.md is the contract for how the app looks and how it talks to Teambridge. These are the working habits that keep Claude from shipping fixes that don't hold.

### Find the real cause before changing code

Most "it silently does nothing" bugs here have come from one layer, while the fix went into another. Before editing anything for a data bug:

1. Log the exact request (method, path, body) and the full response or `TBApiError` (status, body). Remove any `catch` that turns an error into empty data or a no-op, at least while debugging.
2. Check the field metadata the code depends on: does the field resolve, what are its `type`, `readOnly` and `writeFormatHint`, and is the value actually in the raw record?
3. Only then change code, and change the layer the evidence points at. If a write fails, suspect the write's encoding before rewriting the read path.

If a fix doesn't work, go back to step 1 instead of stacking another change on top. When you report the fix, say what the cause was and how you confirmed it.

### Know what dev mode can and can't prove

`TB_DEV_MODE=true` runs the app standalone at `localhost:3000`, with no Teambridge host around it. Every API call acts on `TB_DEV_ACCOUNT_ID`, which must have the app installed; a 403 on every call means it doesn't. Locally you can verify rendering, data reads and writes (with real credentials), types, and lint. You **can't** verify anything that needs the host: the record detail panel opening and reopening (`?rid=`), URL sync with the parent, the `/apps/<slug>` base path, the proxy's 30 s timeout and buffering, or the real user's `X-User-Context` permissions.

For changes in those areas, say plainly that they need checking in the embedded app, and give the test steps (for record detail: the checklist in AGENTS.md → "Record detail"). Don't report them as verified. The setup flow is the exception: `/setup/`, saving, the gate and the lifecycle hooks can all be verified standalone (AGENTS.md → "Per-account configuration" → "Testing the flow"); only Teambridge opening `setupPath` after install needs the host.

### Ask about the account, don't guess

- Before writing code against a collection, look at its real field list (`getFields`), not the names you'd expect. Put what you find in `app/schema.ts`, with ids pinned once you have them. Each slot is guessed by name once, at first contact with an account, then bound by id; the setup page shows every slot prefilled with that guess for an admin to confirm. A slot with no `type` offers every field.
- If the account is missing a field or collection the feature needs, tell the user which ones to add and with what type, and build the feature to degrade (see AGENTS.md → "When a field or collection doesn't exist"). Don't substitute a similarly named field.
- Ask before assuming anything about business rules: which shifts count, which statuses mean "done", who should see what.

### Before you finish

- `yarn typecheck` and `yarn lint` pass. The lint rule against bare `fetch` is intentional; use `tbFetch`.
- No new hex colors, raw `<button>`/`<input>`, or `min-h-screen` (see AGENTS.md → "Common mistakes").
- New pages call `requireSetup()` before reading records (outside the `try`, or with `unstable_rethrow` first in the `catch`), render `<SetupNotice issues={resolved.issues} />` above their content for non-blocking issues, let `SchemaNotReadyError` (thrown without a database) fall into their ordinary error state, and handle loading, error and empty states.
- Error copy never says the app can't connect to Teambridge.
- Per-account settings persist in Postgres, not memory. An app for several accounts needs `DATABASE_URL`, which the Neon integration from the README's deploy button for several accounts sets. An app for one account can do without, with every slot's id pinned in `app/schema.ts`. Without it a production build hides Settings and resolves each account from the pinned ids, or else the guess by name, and the server log says so. Don't build anything that assumes the memory store, and keep the app's own per-account settings in `AccountConfig` rather than a second store (AGENTS.md → "The config store").
- Copy that people using the app see never mentions a database, a deployment, configuration or a workaround; they know Teambridge, not how the app is built. When the app can't work it fails like any other error, and the cause goes to the server log.
