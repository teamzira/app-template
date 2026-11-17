/**
 * EXAMPLE CODE — replace with the collections and fields your app uses.
 *
 * One place that declares every slot the app reads or writes. The same spec
 * is the app's install manifest (`teambridge.manifest.ts`): before installing
 * the app, Teambridge asks an admin to map each slot to the account's own
 * collection, field or option, and the app resolves from that mapping.
 *
 * A slot's `name` is its label (in Teambridge's install review and on the
 * app's setup page), `type` is what can be bound to it, and `required`
 * decides whether the app can run without it. `purpose`, `synonyms` and
 * `createIfMissing` help the admin installing it. Accounts installed before
 * the manifest existed fall back to the app's own Settings, prefilled by a
 * guess by name. Pin ids only in an app built for one account. See AGENTS.md
 * → "Install manifest" and "Per-account configuration".
 *
 * Keys (`shifts`, `start`…) are the app's stable names for these things and
 * end up in every account the app is installed in. Don't rename them.
 */
import { defineSchema } from '@/lib/teambridge/schema';

export const schema = defineSchema({
  shifts: {
    name: 'Shifts',
    purpose: 'The shifts the dashboard lists and creates.',
    fields: {
      start: {
        name: 'Start Time',
        type: 'DATETIME',
        required: true,
        access: 'write',
        purpose: 'When each shift starts.',
        synonyms: ['Start', 'Starts At'],
      },
      end: {
        name: 'End Time',
        type: 'DATETIME',
        required: true,
        access: 'write',
        purpose: 'When each shift ends.',
        synonyms: ['End', 'Ends At'],
      },
      assignee: {
        name: 'Assignee',
        type: 'LINK_TO_USER',
        access: 'write',
        purpose: 'Who is working the shift.',
        synonyms: ['Worker', 'Assigned To'],
        createIfMissing: true,
      },
      published: {
        name: 'Published',
        type: 'BOOLEAN',
        purpose: 'Splits published shifts from drafts.',
        createIfMissing: true,
      },
    },
  },
  users: {
    name: 'Users',
    standard: 'user',
    // The page still works without names — it falls back to showing ids.
    required: false,
    fields: {
      firstName: { name: 'First Name', type: 'TEXT', purpose: 'Shows who a shift is assigned to.' },
      lastName: { name: 'Last Name', type: 'TEXT', purpose: 'Shows who a shift is assigned to.' },
    },
  },
});
