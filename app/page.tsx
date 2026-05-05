import Link from 'next/link';
import { getTBContext, TBClient, getCredentialsForAccount } from '@/lib/teambridge';
import type { Field } from '@/lib/teambridge/client/types';
import { CreateShiftModal } from './create-shift-modal';

type FilterStatus = 'all' | 'published' | 'draft';

/** Maps field names to our canonical display properties */
type ShiftFieldMapping = {
  startAt?: string;   // field ID
  endAt?: string;
  userId?: string;
  published?: string;
};

const SHIFT_FIELD_NAMES = {
  startAt: 'Start Time',
  endAt: 'End Time',
  userId: 'Assignee',
  published: 'Published',
} as const;

/** Maps Users collection field names to field IDs for extracting name */
type UserFieldMapping = {
  firstName?: string;
  lastName?: string;
};

function buildUserFieldMapping(fields: Field[]): UserFieldMapping {
  const mapping: UserFieldMapping = {};
  for (const f of fields) {
    if (f.name === 'First Name') mapping.firstName = f.id;
    else if (f.name === 'Last Name') mapping.lastName = f.id;
  }
  return mapping;
}

function extractUserName(record: Record<string, unknown>, mapping: UserFieldMapping): string {
  const first = (mapping.firstName ? record[mapping.firstName] : undefined) as string | undefined;
  const last = (mapping.lastName ? record[mapping.lastName] : undefined) as string | undefined;
  return [first, last].filter(Boolean).join(' ').trim();
}

function buildShiftFieldMapping(fields: Field[]): ShiftFieldMapping {
  const mapping: ShiftFieldMapping = {};
  for (const f of fields) {
    if (f.name === SHIFT_FIELD_NAMES.startAt) mapping.startAt = f.id;
    else if (f.name === SHIFT_FIELD_NAMES.endAt) mapping.endAt = f.id;
    else if (f.name === SHIFT_FIELD_NAMES.userId) mapping.userId = f.id;
    else if (f.name === SHIFT_FIELD_NAMES.published) mapping.published = f.id;
  }
  return mapping;
}

function mapRecordToShift(
  record: Record<string, unknown> & { id: string },
  mapping: ShiftFieldMapping
): { id: string; userId: string | null; startAt?: string; endAt?: string; published: boolean } {
  const rawPublished = mapping.published ? record[mapping.published] : undefined;
  let published = false;
  if (typeof rawPublished === 'boolean') {
    published = rawPublished;
  } else if (typeof rawPublished === 'string') {
    published = /published|active|live|yes|true/i.test(rawPublished);
  }
  return {
    id: record.id,
    userId: (mapping.userId ? record[mapping.userId] : undefined) as string | null | undefined ?? null,
    startAt: mapping.startAt ? String(record[mapping.startAt] ?? '') : undefined,
    endAt: mapping.endAt ? String(record[mapping.endAt] ?? '') : undefined,
    published,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { accountId, user, userContext } = await getTBContext();
  const params = await searchParams;
  const currentFilter = (params.status as FilterStatus) || 'all';

  // Fetch shifts from Teambridge API via collections
  type ShiftsResponse = Awaited<ReturnType<TBClient['collections']['records']['list']>>;
  let shiftsResponse: ShiftsResponse | null = null;
  let error: string | null = null;

  // Get credentials for this account (falls back to .env if no account-specific creds)
  const credentials = getCredentialsForAccount(accountId);

  // Map of userId -> user name (for table display)
  const userNames: Record<string, string> = {};
  // List of all users for assignee dropdown: { id, name }
  const usersList: { id: string; name: string }[] = [];
  let shiftFieldMapping: ShiftFieldMapping = {};

  if (credentials) {
    try {
      const client = new TBClient({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        baseUrl: process.env.TB_API_BASE_URL!,
        authUrl: process.env.TB_AUTH_URL!,
        audience: process.env.TB_AUDIENCE!,
        userContext,
      });

      // Find the shifts collection by name
      const collections = await client.collections.list();
      const shiftsCollection = collections.find(
        (c) =>
          c.name.toLowerCase().includes('shifts')
      );
      if (!shiftsCollection) {
        throw new Error(
          'No custom Shifts collection found. Create a custom collection (not the built-in shifts) in Teambridge to use with this app.'
        );
      }

      const [fieldsResponse, recordsResponse] = await Promise.all([
        client.collections.getFields(shiftsCollection.id),
        client.collections.records.list(shiftsCollection.id, { page: 0, pageSize: 50 }),
      ]);
      shiftFieldMapping = buildShiftFieldMapping(fieldsResponse);
      shiftsResponse = recordsResponse;

      // Fetch user names from Users collection for assigned shifts
      const usersCollection = collections.find(
        (c) => c.name.toLowerCase().includes('user')
      );

      if (usersCollection) {
        const userFields = await client.collections.getFields(usersCollection.id);
        const userFieldMapping = buildUserFieldMapping(userFields);

        // Fetch all users for the assignee dropdown and table display
        const usersResponse = await client.collections.records.list(usersCollection.id, { page: 0, pageSize: 50 });
        for (const r of usersResponse.data) {
          const record = r as Record<string, unknown> & { id: string };
          const name = extractUserName(record, userFieldMapping);
          if (name) {
            usersList.push({ id: record.id, name });
            userNames[record.id] = name;
          }
        }
        usersList.sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch shifts';
    }
  }

  // Map raw records to shift shape using field definitions
  const rawRecords = shiftsResponse?.data ?? [];
  type MappedShift = ReturnType<typeof mapRecordToShift>;
  const allShifts: MappedShift[] = rawRecords.map((r) =>
    mapRecordToShift(r as Record<string, unknown> & { id: string }, shiftFieldMapping)
  );
  const publishedShifts = allShifts.filter((s) => s.published);
  const draftShifts = allShifts.filter((s) => !s.published);
  const totalCount = allShifts.length;
  const publishedCount = publishedShifts.length;
  const draftCount = draftShifts.length;

  // Filter shifts based on current tab
  const filteredShifts =
    currentFilter === 'published'
      ? publishedShifts
      : currentFilter === 'draft'
        ? draftShifts
        : allShifts;

  // Get first name for greeting
  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">
            {greeting}, {firstName}
          </h1>
        </div>

        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <StatCard
            icon={<ShiftIcon />}
            value={totalCount}
            label="Total Shifts"
            iconBg="bg-amber-100"
            iconColor="text-amber-500"
          />
          <StatCard
            icon={<CheckCircleIcon />}
            value={publishedCount}
            label="Published"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-500"
          />
          <StatCard
            icon={<DraftIcon />}
            value={draftCount}
            label="Drafts"
            iconBg="bg-blue-100"
            iconColor="text-blue-500"
          />
        </div>

        {/* Shifts Overview Section */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Shifts Overview</h2>
            </div>
            <CreateShiftModal users={usersList} />
          </div>

          {/* Status Tabs */}
          <div className="flex border-b border-gray-100">
            <TabLink
              href="./"
              label="All"
              count={totalCount}
              active={currentFilter === 'all'}
            />
            <TabLink
              href="./?status=published"
              label="Published"
              count={publishedCount}
              color="bg-emerald-500"
              active={currentFilter === 'published'}
            />
            <TabLink
              href="./?status=draft"
              label="Draft"
              count={draftCount}
              color="bg-amber-500"
              active={currentFilter === 'draft'}
            />
          </div>

          {/* Content */}
          <div className="p-5">
            {!credentials ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <WarningIcon className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Configuration Required</p>
                    <p className="mt-1 text-sm text-amber-700">
                      No credentials found for account <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">{accountId}</code>.
                      Set <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">TB_CLIENT_ID</code> and{' '}
                      <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">TB_CLIENT_SECRET</code> in your{' '}
                      <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code>, or add account-specific credentials.
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <ErrorIcon className="mt-0.5 h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error Loading Shifts</p>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : filteredShifts.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Start Time</th>
                      <th className="px-4 py-3">End Time</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredShifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <AssigneeBadge userId={shift.userId ?? null} userName={shift.userId ? userNames[shift.userId] : undefined} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {shift.startAt ? new Date(shift.startAt).toLocaleString() : '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {shift.endAt ? new Date(shift.endAt).toLocaleString() : '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusBadge published={shift.published ?? false} />
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-gray-100 p-3">
                  <EmptyIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {currentFilter === 'all'
                    ? 'No shifts found'
                    : `No ${currentFilter} shifts`}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {currentFilter === 'all'
                    ? 'Create some shifts in Teambridge to see them here'
                    : 'Try selecting a different filter'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {shiftsResponse && shiftsResponse.totalCount > 0 && (
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
              <p className="text-xs text-gray-500">
                Showing {filteredShifts.length} of {shiftsResponse.totalCount} shifts
                {currentFilter !== 'all' && ` (filtered by ${currentFilter})`}
              </p>
            </div>
          )}
        </div>

        {/* Account Info Card */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Session Info</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">User</p>
                <p className="mt-1 text-gray-900">{user.name || user.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Account ID</p>
                <p className="mt-1 font-mono text-gray-900">{accountId || 'No account'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Components

function StatCard({
  icon,
  value,
  label,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function TabLink({
  href,
  label,
  count,
  active,
  color,
}: {
  href: string;
  label: string;
  count: number;
  active?: boolean;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm transition-colors ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700'
      }`}
    >
      <span className={active ? 'font-medium' : ''}>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          color && active ? `${color} text-white` : active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

function AssigneeBadge({ userId, userName }: { userId: string | null; userName?: string }) {
  if (!userId) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserIcon className="h-3.5 w-3.5 text-gray-400" />
        </span>
        <span className="italic">Unassigned</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <UserIcon className="h-3.5 w-3.5 text-blue-600" />
      </span>
      <span>{userName || <span className="font-mono text-xs">{userId.slice(0, 8)}...</span>}</span>
    </span>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

// Icons

function ShiftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}
