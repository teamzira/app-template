import { tbMiddleware } from '@/lib/teambridge/middleware';

export default tbMiddleware({
  webhookSecret: process.env.TB_WEBHOOK_SECRET!,
});

export const config = {
  // Match all routes except:
  // - /api/teambridge/* (lifecycle webhooks handle their own auth)
  // - /_next/* (Next.js internals)
  // - /favicon.ico, etc.
  //
  // `/` is listed on its own and must stay. With `basePath` set, the
  // catch-all pattern stops matching the app root (`/apps/<slug>/`), and a
  // root request that a proxy exists for but doesn't match answers an empty
  // 200 instead of rendering (Next 16.1). Inside Teambridge that is a blank
  // iframe, while every other page works.
  matcher: ['/', '/((?!api/teambridge|_next|favicon.ico).+)'],
};
