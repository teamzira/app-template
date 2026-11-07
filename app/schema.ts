/**
 * The collections and fields the job orders app reads and writes. Ids are pinned for the
 * Implementation Tracker account, the one this sample is installed on, so it runs without a
 * database; another account gets the guess by name and confirms it in Settings. See AGENTS.md →
 * "Per-account configuration".
 */
import { defineSchema } from '@/lib/teambridge/schema';

export const schema = defineSchema({
  jobs: {
    name: 'Jobs',
    id: '3e0f33a8-9f70-49be-8bc8-a9ac413a3614',
    fields: {
      name: { name: 'Name', type: 'TEXT', required: true, id: '3f115c23-9485-41e2-af3b-a8160de1b89f' },
      location: { name: 'Location', type: 'LINK_TO_LOCATION', required: true, id: 'ef847f6e-8750-499b-b26a-8d9f0b26c2c1' },
      start: { name: 'Start Date', type: 'DATETIME', required: true, id: 'c81b7397-fda8-4249-bc8e-600d711776f3' },
      end: { name: 'End Date', type: 'DATETIME', id: '18ce139a-2228-49d1-936d-4183b2d229ef' },
      // Native multi-links and selects; their public types aren't ones the guess needs to tell apart.
      roles: { name: 'Roles', id: '0ed5f422-76b8-496d-b95e-7e8453b4423c' },
      status: { name: 'Status', id: 'b991890e-2f68-4bd8-bd10-07339c7cfbb6' },
      hourlyRate: { name: 'Hourly Rate', type: 'NUMBER', id: '62441898-4360-4b69-9538-0157223f2d99' },
    },
  },
  placements: {
    name: 'Placements',
    id: 'ea5103ea-f947-451f-964a-6626e0a4d2c7',
    required: false,
    fields: {
      job: { name: 'Job', id: '6246af91-e948-412d-be2c-0e1c1c95e1b1' },
      assignee: { name: 'Assignee', type: 'LINK_TO_USER', id: '9d8418c8-c673-4d97-a781-5f8c37020d40' },
      stage: { name: 'Stage', id: 'f372226d-b85a-4b59-80c4-98a809b417be' },
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
    fields: {
      name: { name: 'Name', required: true, id: '0e17a67a-63d6-4e1a-8f08-654149a889e1' },
    },
  },
  roles: {
    name: 'Job Roles',
    id: 'c22edaa3-a72b-429c-9822-d28c6221bff8',
    required: false,
    fields: {
      name: { name: 'Name', id: '68149b59-7568-48d7-a159-1cd70efe5ca9' },
    },
  },
});
