import { handleTBManifest } from '@/lib/teambridge';
import manifest from '@/teambridge.manifest';

// Teambridge reads the app's install manifest from here when the app is
// registered or updated. See AGENTS.md → "Install manifest".
export const GET = handleTBManifest({ webhookSecret: process.env.TB_WEBHOOK_SECRET }, manifest);
