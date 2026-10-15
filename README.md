# Teambridge App Template

A starter template for building external apps that integrate with Teambridge.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fteamzira%2Fapp-template&env=TB_CLIENT_ID,TB_CLIENT_SECRET,TB_WEBHOOK_SECRET,APP_SLUG&envDescription=All%20four%20come%20from%20the%20app%27s%20page%20in%20the%20Teambridge%20Dev%20Portal%3A%20client%20ID,%20client%20secret,%20webhook%20secret%20and%20slug.&envLink=https%3A%2F%2Fgithub.com%2Fteamzira%2Fapp-template%23deployment)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/teambridge/teambridge-app-template.git my-app
cd my-app
yarn install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```bash
# Webhook secret (from app registration in Teambridge)
TB_WEBHOOK_SECRET=your-webhook-secret

# OAuth2 credentials (from app registration in Teambridge)
TB_CLIENT_ID=your-client-id
TB_CLIENT_SECRET=your-client-secret

# Dev mode settings
TB_DEV_MODE=true
TB_DEV_ACCOUNT_ID=your-account-id
TB_DEV_USER_ID=your-user-id
TB_DEV_USER_EMAIL=you@company.com
TB_DEV_USER_NAME=Your Name
```

### 3. Run Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the template.

What's rendered is **example code** — a demo shifts dashboard built on the design system. When you're ready to start building, replace the contents of `app/page.tsx` (and remove `app/create-shift-modal.tsx` / `app/actions.ts`). See [`AGENTS.md`](./AGENTS.md) for the design rules and primitives to build with.

## Design System

Apps built from this template use the **Alloy** design system, replicated locally via Tailwind tokens and shadcn/ui — no runtime dependency on the Alloy package.

- **`app/globals.css`** defines the full Alloy palette (Layer 1) and semantic tokens (Layer 2), then exposes them as Tailwind utilities. shadcn-compatible aliases (`bg-background`, `bg-primary`, `text-muted-foreground`, etc.) auto-flip with the `.dark` class on `<html>`.
- **`components/ui/`** ships with 22 pre-installed shadcn primitives (button, card, dialog, table, tabs, alert, badge, etc.) — already themed to Alloy. They're owned by your repo, edit freely.
- **Tailwind utilities resolve to Alloy values automatically.** `bg-blue-500` is Alloy blue 500. `rounded-md` is Alloy's 8px. v0-generated code lands on-brand without v0 knowing about Alloy.
- **`AGENTS.md`** at the repo root captures the design rules — color and radius conventions, when to use which tokens, common mistakes. Both v0 and Claude Code read it to bias generation toward the design system.

To add more primitives:

```bash
npx shadcn@latest add <name>
```

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout with TBProvider
│   ├── page.tsx                # ⚠ Example demo — replace contents when starting a real app
│   ├── create-shift-modal.tsx  # ⚠ Example — delete or replace
│   ├── actions.ts              # ⚠ Example — delete or replace
│   ├── schema.ts               # ⚠ Example — your app's collections and fields
│   ├── globals.css             # Alloy design tokens + Tailwind theme bridge
│   └── api/
│       └── teambridge/
│           ├── install/
│           │   └── route.ts    # Installation webhook
│           └── uninstall/
│               └── route.ts    # Uninstallation webhook
├── components/
│   └── ui/                     # shadcn primitives, themed to Alloy
├── lib/
│   ├── teambridge/             # Teambridge integration
│   │   ├── index.ts            # Main exports
│   │   ├── types.ts            # TypeScript types
│   │   ├── middleware.ts       # Request validation (used by proxy.ts)
│   │   ├── context/            # TBProvider and hooks
│   │   ├── client/             # API client
│   │   ├── schema.ts           # Schema resolution + write encoding
│   │   ├── router/             # URL sync + record detail panel helpers
│   │   └── handlers/           # Lifecycle handlers
│   └── utils.ts                # cn() helper
├── proxy.ts                    # Next.js proxy (formerly middleware.ts)
├── components.json             # shadcn configuration
├── AGENTS.md                   # Design system rules for AI agents and humans
├── .env.example                # Environment template
└── .env.local                  # Local config (gitignored)
```

## Authentication

The Teambridge API uses **OAuth2 Client Credentials flow** for authentication. The `TBClient` handles token management automatically:

1. Requests an access token from Auth0 using your client credentials
2. Caches the token until it expires
3. Automatically refreshes when needed

One set of credentials serves every account the app is installed on. Installing the app on an account (Settings → App Library) is what grants the app's client access to it, so each request names its account with the `X-Account-Id` header. `getTBClient()` sets that from the request context; see [`AGENTS.md`](./AGENTS.md) → "One deployment, many accounts".

### Token Endpoint

```
https://teambridge.us.auth0.com/oauth/token
```

## Usage

### Getting Context (Server Components)

```tsx
import { getTBContext } from '@/lib/teambridge';

export default async function Page() {
  const { accountId, user } = await getTBContext();
  return <div>Welcome, {user.name}!</div>;
}
```

### Getting Context (Client Components)

```tsx
'use client';
import { useTBContext } from '@/lib/teambridge';

function MyComponent() {
  const { accountId, user } = useTBContext();
  return <div>Account: {accountId}</div>;
}
```

### Using the API Client

> **Always use the Unified Collections API** ([docs](https://docs.teambridge.com/#tag/Collections-(Unified-API))). All app data — shifts, users, jobs, placements, etc. — lives in collections.

#### The collections workflow

Three calls cover almost everything:

1. **Find the collection by name.** Look it up with `client.collections.list()` and match on `name` (e.g. `"Shifts"`, `"Users"`, `"Jobs"`).
2. **Discover field IDs.** Each collection has fields with UUID IDs. Fetch them with `client.collections.getFields(collectionId)` and build a `name → id` map.
3. **Read or write records using field IDs.** Records are keyed by field ID — not field name — both on read and on write.

#### Example: list shifts

```tsx
import { getTBClient, getTBContext } from '@/lib/teambridge';

// The context carries the account (and the current user) the request is for.
const ctx = await getTBContext();
const client = getTBClient(ctx);

// 1. Find the Shifts collection
const collections = await client.collections.list();
const shiftsCollection = collections.find((c) => c.name === 'Shifts');
if (!shiftsCollection) throw new Error('Shifts collection not found');

// 2. Get fields and look up the IDs you need
const fields = await client.collections.getFields(shiftsCollection.id);
const startField = fields.find((f) => f.name === 'Start Time')!;
const endField   = fields.find((f) => f.name === 'End Time')!;

// 3. List records — values come back keyed by field ID.
// pageSize maxes out at 50; for larger result sets, paginate by incrementing `page`.
const { data, totalCount } = await client.collections.records.list(shiftsCollection.id, {
  page: 0,
  pageSize: 50,
});

for (const record of data) {
  console.log(record[startField.id], record[endField.id]);
}
```

#### Example: create a shift

```tsx
await client.collections.records.create(shiftsCollection.id, {
  [startField.id]: '2026-06-01T09:00:00Z',
  [endField.id]:   '2026-06-01T17:00:00Z',
});
```

#### Example: update a record

```tsx
await client.collections.records.update(shiftsCollection.id, recordId, {
  [endField.id]: '2026-06-01T18:00:00Z', // only include fields that change
});
```

The demo at `app/page.tsx` + `app/actions.ts` shows this workflow end-to-end, including a cross-reference to the Users collection for the assignee picker. (Reminder: those files are example code — replace before shipping.)

`getTBClient(ctx)` acts as the current user, so Teambridge applies their permissions. `getTBClient({ accountId })` acts with the app's own access, which is what schema resolution and background work use. Constructing `TBClient` by hand is for tests; a client without an `accountId` stops working once the app is installed on a second account.

### Handling Installation

Teambridge calls `app/api/teambridge/install/route.ts` when an admin installs the app on an account, and `uninstall/route.ts` when they remove it. Both are advisory: the app's credentials already cover the account (or no longer do) whatever the hook returns. Use them to record the account if the app keeps per-account state:

```tsx
import { handleTBInstall } from '@/lib/teambridge';

export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async ({ accountId, accountName }) => {
    await db.installations.upsert({ accountId, accountName });

    // Optional: open the app at this path right after install.
    return { success: true, setupPath: '/setup/' };
  }
);
```

Apps installed before the hook existed never received it, so an app with per-account state should also accept an account the first time the proxy sends a request for it. See [`AGENTS.md`](./AGENTS.md) → "One deployment, many accounts".

## Development Workflow

### Dev Mode

Dev mode allows you to develop locally without going through the Teambridge proxy:

1. Set `TB_DEV_MODE=true` in your `.env.local`
2. Configure `TB_DEV_ACCOUNT_ID`, `TB_DEV_USER_ID`, etc.
3. The proxy will use these values instead of validating signatures

Every API call acts on `TB_DEV_ACCOUNT_ID`, so the app must be installed on that account (Settings → App Library). If it isn't, every call fails with a 403. Take the id from the server `TB_OPEN_API_BASE_URL` points at; a local database's account id is not valid against production.

### Testing with Real Data

1. Register your app in Teambridge
2. Get your OAuth2 client credentials (Client ID and Client Secret)
3. Configure the credentials in your `.env.local`
4. Your app will have access to real account data

## API Reference

### Client Configuration

```ts
interface TBClientConfig {
  clientId: string;      // OAuth2 Client ID
  clientSecret: string;  // OAuth2 Client Secret
  accountId?: string;    // Account every request acts on (X-Account-Id); getTBClient() always sets it
  userContext?: string;  // Signed X-User-Context to act as the current user
  baseUrl?: string;      // API base URL (default: https://open-api.teambridge.com)
  authUrl?: string;      // Auth0 token endpoint (default: https://teambridge.us.auth0.com/oauth/token)
  audience?: string;     // OAuth2 audience (default: https://api.teambridge.com/openapi/)
}

getTBClient(ctx)                    // from getTBContext(): as the current user
getTBClient({ accountId })          // the app's own access
```

### Client Methods

```ts
client.collections.list()
client.collections.getFields(collectionId)
client.collections.records.list(collectionId, { page?, pageSize?, filters? })   // pageSize max 50
client.collections.records.listAll(collectionId, { filters?, maxPages? })      // paged read with a hard cap
client.collections.records.get(collectionId, recordId)
client.collections.records.create(collectionId, data)
client.collections.records.update(collectionId, recordId, data)

// Platform users (separate from the Users collection)
client.users.get(userId)            // → { recordId, email, … }
client.users.getLocations(userId)   // needs userContext

// File uploads — separate API
client.documents.upload(file, options?)

// Static lookup
client.timezones.list()
```

Non-2xx responses throw `TBApiError` (`status`, `path`, `body`, plus `code` and `detail` parsed from the body). `error.isNotInstalled` is true when the app has no access to the account: not installed, or uninstalled.

### Schema helpers

`@/lib/teambridge/schema` declares the collections and fields an app uses, resolves them once per account (pinned ids first, names as the fallback), reports missing ones, and encodes writes:

```ts
defineSchema(spec)
resolveSchema(client, spec)                           // → { ready, collections, issues }; cached per client.accountId
toWriteValue(field, value)                            // follows writeFormatHint / DATETIME / readOnly
readIds(value)                                        // link & select values → string[]
```

### Record detail

`@/lib/teambridge/router` opens a record in the Teambridge host's record detail panel:

```tsx
<TBRecordLink recordId={id}>Open</TBRecordLink>
const { openRecord } = useOpenRecord();
<TBRecordEditWatcher />   // in the layout: refresh after edits made in the panel
```

See [`AGENTS.md`](./AGENTS.md) → "Living inside the Teambridge shell" for why these exist.

### Context Types

```ts
interface TBContext {
  accountId: string;     // the account this request is for
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  userContext?: string;  // signed X-User-Context (server only)
}
```

## Deployment

Your app can be deployed to any platform that supports Next.js:

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- Self-hosted

Make sure to:

1. Register the app in the Teambridge Dev Portal (Settings → Dev Portal). It gives you the client ID, client secret, webhook secret and slug.
2. Set the four environment variables the deploy button asks for: `TB_CLIENT_ID`, `TB_CLIENT_SECRET`, `TB_WEBHOOK_SECRET` and `APP_SLUG`. None of them can be left for later: the proxy signs every request with the webhook secret, and the slug sets the path the app is served under. One deployment and one set of credentials serve every account the app is installed on. Deployments always build for the Teambridge proxy; the `TB_DEV_*` values are for local development only.
3. Set the app's origin in the Dev Portal to the deployment URL; the `/apps/<slug>` path is appended for you.

## Learn More

- [`AGENTS.md`](./AGENTS.md) — design system rules and conventions for this template
- [shadcn/ui](https://ui.shadcn.com) — the component library used in `components/ui/`
- [Teambridge API Documentation](https://docs.teambridge.com)
- [Next.js Documentation](https://nextjs.org/docs)
