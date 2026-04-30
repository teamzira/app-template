# Teambridge App Template

A starter template for building external apps that integrate with Teambridge.

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

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout with TBProvider
│   ├── page.tsx                # Home page (start here!)
│   ├── globals.css             # Global styles
│   └── api/
│       └── teambridge/
│           ├── install/
│           │   └── route.ts    # Installation webhook
│           └── uninstall/
│               └── route.ts    # Uninstallation webhook
├── lib/
│   └── teambridge/             # Teambridge integration
│       ├── index.ts            # Main exports
│       ├── types.ts            # TypeScript types
│       ├── middleware.ts       # Request validation
│       ├── context/            # TBProvider and hooks
│       ├── client/             # API client
│       └── handlers/           # Lifecycle handlers
├── middleware.ts               # Next.js middleware
├── .env.example                # Environment template
└── .env.local                  # Local config (gitignored)
```

## Authentication

The Teambridge API uses **OAuth2 Client Credentials flow** for authentication. The `TBClient` handles token management automatically:

1. Requests an access token from Auth0 using your client credentials
2. Caches the token until it expires
3. Automatically refreshes when needed

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

```tsx
import { TBClient } from '@/lib/teambridge';

// Create a client instance with OAuth2 credentials
const client = new TBClient({
  clientId: process.env.TB_CLIENT_ID!,
  clientSecret: process.env.TB_CLIENT_SECRET!,
});

// List shifts
const shifts = await client.shifts.list({ page: 0, pageSize: 50 });

// Get users
const users = await client.users.list();

// Create a job
const jobs = await client.jobs.create([{ name: 'My New Job' }]);
```

Or use the convenience function:

```tsx
import { getTBClient } from '@/lib/teambridge';

const client = getTBClient(); // Uses env vars automatically
const shifts = await client.shifts.list();
```

### Handling Installation

Edit `app/api/teambridge/install/route.ts`:

```tsx
import { handleTBInstall } from '@/lib/teambridge';

export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async (context) => {
    // Store credentials for this account
    await db.appInstallations.create({
      accountId: context.accountId,
      // Store any account-specific data
    });

    return { success: true };
  }
);
```

## Development Workflow

### Dev Mode

Dev mode allows you to develop locally without going through the Teambridge proxy:

1. Set `TB_DEV_MODE=true` in your `.env.local`
2. Configure `TB_DEV_ACCOUNT_ID`, `TB_DEV_USER_ID`, etc.
3. The middleware will use these values instead of validating signatures

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
  baseUrl?: string;      // API base URL (default: https://api.teambridge.com)
  authUrl?: string;      // Auth0 token endpoint (default: https://teambridge.us.auth0.com/oauth/token)
  audience?: string;     // OAuth2 audience (default: API base URL)
}
```

### Client Methods

```ts
// Collections (custom data tables)
client.collections.list()
client.collections.getFields(collectionId)
client.collections.records.list(collectionId, options?)
client.collections.records.get(collectionId, recordId)
client.collections.records.create(collectionId, data)
client.collections.records.update(collectionId, recordId, data)

// Shifts
client.shifts.list(options?)
client.shifts.get(shiftId)
client.shifts.create(shifts[])  // Up to 50
client.shifts.timestamps.list(options?)

// Placements
client.placements.list(options?)
client.placements.create(placements[])  // Up to 50

// Users
client.users.list(options?)
client.users.get(userId)
client.users.lookup({ email?, phone? })
client.users.create(users[])  // Up to 200

// Jobs
client.jobs.list(options?)
client.jobs.create(jobs[])  // Up to 50

// Locations
client.locations.get(locationId)

// Timezones
client.timezones.list()

// Documents
client.documents.upload(file, options?)
```

### Context Types

```ts
interface TBContext {
  accountId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
```

## Deployment

Your app can be deployed to any platform that supports Next.js:

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- Self-hosted

Make sure to:

1. Set all required environment variables (`TB_CLIENT_ID`, `TB_CLIENT_SECRET`, `TB_WEBHOOK_SECRET`)
2. Configure your app's base URL in the Teambridge app registry

## Learn More

- [Teambridge API Documentation](https://docs.teambridge.com)
- [Next.js Documentation](https://nextjs.org/docs)
