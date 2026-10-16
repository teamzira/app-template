/**
 * EXAMPLE CODE — replace with the collections and fields your app uses.
 *
 * One place that declares every slot the app reads or writes. A slot's
 * `name` is the label an admin sees on the setup page, `type` is what its
 * picker offers, and `required` decides whether the app can run without it.
 * Slots resolve by id: the id bound for the account, or an `id` pinned here
 * as the default. The name is used once, at first contact with an account,
 * to guess the binding (the one collection or field with that name and
 * type); the admin confirms or corrects it in Settings. Pin ids once the app
 * is built for a known account. See AGENTS.md → "Per-account configuration".
 */
import { defineSchema } from '@/lib/teambridge/schema';

export const schema = defineSchema({
  shifts: {
    name: 'Shifts',
    fields: {
      start: { name: 'Start Time', type: 'DATETIME', required: true },
      end: { name: 'End Time', type: 'DATETIME', required: true },
      assignee: { name: 'Assignee' },
      published: { name: 'Published' },
    },
  },
  users: {
    name: 'Users',
    // The page still works without names — it falls back to showing ids.
    required: false,
    fields: {
      firstName: { name: 'First Name' },
      lastName: { name: 'Last Name' },
    },
  },
});
