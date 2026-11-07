/**
 * The collections and fields the Timesheet reads. Ids are pinned for the
 * Implementation Tracker account, the one this sample is installed on, so it
 * runs without a database; another account gets the guess by name and
 * confirms it in Settings. See AGENTS.md → "Per-account configuration".
 */
import { defineSchema } from '@/lib/teambridge/schema';

export const schema = defineSchema({
  shifts: {
    name: 'Shifts',
    id: '3474bfe1-8553-4d70-81cb-787373794600',
    fields: {
      start: { name: 'Start Time', type: 'DATETIME', required: true, id: 'fbc850fb-dcdc-4500-a21e-f315725e252d' },
      end: { name: 'End Time', type: 'DATETIME', required: true, id: 'ddc0f76e-704c-40e6-99b7-86a481230441' },
      clockIn: { name: 'Clock In Time', type: 'DATETIME', required: true, id: 'e30cf15c-30fa-43e0-84ab-9cffeb620a92' },
      clockOut: { name: 'Clock Out Time', type: 'DATETIME', required: true, id: 'e990993c-be2d-470f-933d-ca5249549641' },
      assignee: { name: 'Assignee', type: 'LINK_TO_USER', id: '4499a8d9-3be3-4779-8e8a-759b25982970' },
      location: { name: 'Location', type: 'LINK_TO_LOCATION', id: '241293c5-4782-43ec-8b9e-b85ea8ec090a' },
      // A generated duration; its public type isn't one the guess needs to tell apart.
      hoursWorked: { name: 'Hours Worked', id: '098cb92c-dad1-4a22-8119-0a9450878de9' },
    },
  },
  users: {
    name: 'Users',
    id: '7704acc5-8e52-4095-88a3-5fce2fe0c8cf',
    required: false,
    fields: {
      firstName: { name: 'First Name', id: 'b82730c9-8861-44ac-8cfe-70963ab8aa84' },
      lastName: { name: 'Last Name', id: '7ddf32fa-b9a5-4225-8ee1-08e14c7cccb2' },
    },
  },
  locations: {
    name: 'Locations',
    id: '1d7895fb-ee50-4eee-a71f-b08b12842803',
    required: false,
    fields: {
      name: { name: 'Name', id: '0e17a67a-63d6-4e1a-8f08-654149a889e1' },
    },
  },
});
