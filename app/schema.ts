/**
 * EXAMPLE CODE — replace with the collections and fields your app uses.
 *
 * One place that names everything the app reads or writes. The same spec is
 * the app's install manifest (`app/manifest.ts`), so each entry also says what
 * an admin installing the app needs to know: what it's for, other names it
 * goes by, and whether it can be created. See AGENTS.md → "Field mapping" and
 * "Install manifest".
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
