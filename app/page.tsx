import {
  AlertCircleIcon,
  AlertTriangleIcon,
  MapPinIcon,
  BuildingIcon,
  PieChartIcon,
} from 'lucide-react';
import { getTBContext, TBClient, getCredentialsForAccount } from '@/lib/teambridge';
import type { Field, Shift } from '@/lib/teambridge/client/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShiftsByLocationChart } from './shifts-by-location-chart';

type LocationFieldMapping = {
  name?: string;
  address?: string;
};

function buildLocationFieldMapping(fields: Field[]): LocationFieldMapping {
  const mapping: LocationFieldMapping = {};
  for (const f of fields) {
    const lowerName = f.name.toLowerCase();
    if (lowerName === 'name' || lowerName === 'location name') {
      mapping.name = f.id;
    } else if (lowerName === 'address' || lowerName === 'street address') {
      mapping.address = f.id;
    }
  }
  return mapping;
}

function mapRecordToLocation(
  record: Record<string, unknown> & { id: string },
  mapping: LocationFieldMapping
): { id: string; name: string; address: string | null } {
  const name = mapping.name
    ? String(record[mapping.name] ?? '')
    : '';
  const address = mapping.address
    ? (record[mapping.address] as string | null) ?? null
    : null;

  return { id: record.id, name, address };
}

async function fetchAllRecords<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ data: T[]; totalCount: number }>
): Promise<{ data: T[]; totalCount: number }> {
  const pageSize = 50;
  let page = 0;
  let hasMore = true;
  const allData: T[] = [];
  let totalCount = 0;

  while (hasMore) {
    const response = await fetcher(page, pageSize);
    allData.push(...response.data);
    totalCount = response.totalCount;
    hasMore = response.data.length === pageSize;
    page++;
  }

  return { data: allData, totalCount };
}

export default async function LocationsPage() {
  const { accountId, userContext } = await getTBContext();

  type Location = { id: string; name: string; address: string | null };
  let locations: Location[] = [];
  let shifts: Shift[] = [];
  let error: string | null = null;
  let totalCount = 0;

  const credentials = getCredentialsForAccount(accountId);

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

      const collections = await client.collections.list();

      // Find Locations and Shifts collections
      // Use exact match first, then fall back to partial match
      const locationsCollection = collections.find(
        (c) => c.name.toLowerCase() === 'locations'
      ) || collections.find(
        (c) => c.name.toLowerCase().includes('location')
      );
      const shiftsCollection = collections.find(
        (c) => c.name.toLowerCase() === 'shifts'
      );

      if (!locationsCollection) {
        throw new Error(
          'No Locations collection found. Create a Locations collection in Teambridge to use this app.'
        );
      }

      // Fetch locations
      const fieldsResponse = await client.collections.getFields(locationsCollection.id);
      const fieldMapping = buildLocationFieldMapping(fieldsResponse);

      const locationsResult = await fetchAllRecords(async (page, pageSize) => {
        const response = await client.collections.records.list(
          locationsCollection.id,
          { page, pageSize }
        );
        return {
          data: response.data.map((r) =>
            mapRecordToLocation(r as Record<string, unknown> & { id: string }, fieldMapping)
          ),
          totalCount: response.totalCount,
        };
      });

      locations = locationsResult.data;
      totalCount = locationsResult.totalCount;

      // Fetch shifts if collection exists
      if (shiftsCollection) {
        // Get shift fields to find the location field ID
        const shiftFields = await client.collections.getFields(shiftsCollection.id);
        const locationField = shiftFields.find(
          (f) => f.name.toLowerCase() === 'location' || f.name.toLowerCase().includes('location')
        );

        const shiftsResult = await fetchAllRecords(async (page, pageSize) => {
          const response = await client.collections.records.list(
            shiftsCollection.id,
            { page, pageSize }
          );
          return {
            data: response.data,
            totalCount: response.totalCount,
          };
        });

        // Map raw records to Shift type with locationId
        shifts = shiftsResult.data.map((record) => {
          const locationValue = locationField ? record[locationField.id] : null;
          return {
            ...record,
            recordId: record.id,
            locationId: typeof locationValue === 'string' ? locationValue : null,
          } as unknown as Shift;
        });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch data';
    }
  }

  // Build location lookup map
  const locationMap = new Map(locations.map((loc) => [loc.id, loc.name]));

  // Count shifts by location
  const shiftCountByLocation = new Map<string, number>();
  for (const shift of shifts) {
    const locationName = shift.locationId
      ? (locationMap.get(shift.locationId) || 'Unknown Location')
      : 'No Location';
    shiftCountByLocation.set(
      locationName,
      (shiftCountByLocation.get(locationName) || 0) + 1
    );
  }

  // Convert to array and sort by count descending
  const shiftLocationData = Array.from(shiftCountByLocation.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-secondary">
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
            <MapPinIcon className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Locations</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'location' : 'locations'} in your account
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Shifts by Location Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <PieChartIcon className="size-4 text-muted-foreground" />
                Shifts by Location
              </CardTitle>
              <CardDescription>
                Distribution of {shifts.length} shifts across locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!credentials ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  Configure credentials to view chart
                </div>
              ) : error ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-destructive">
                  Error loading data
                </div>
              ) : (
                <ShiftsByLocationChart data={shiftLocationData} />
              )}
            </CardContent>
          </Card>

          {/* Locations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BuildingIcon className="size-4 text-muted-foreground" />
                All Locations
              </CardTitle>
            </CardHeader>

            <CardContent>
              {!credentials ? (
                <Alert>
                  <AlertTriangleIcon />
                  <AlertTitle>Configuration required</AlertTitle>
                  <AlertDescription>
                    No credentials found for account{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {accountId}
                    </code>
                    . Set{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      TB_CLIENT_ID
                    </code>{' '}
                    and{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      TB_CLIENT_SECRET
                    </code>{' '}
                    in your{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      .env.local
                    </code>
                    .
                  </AlertDescription>
                </Alert>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Error loading locations</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : locations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          {location.name || (
                            <span className="italic text-muted-foreground">Unnamed</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {location.address || (
                            <span className="text-muted-foreground">No address</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <MapPinIcon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No locations found</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Create some locations in Teambridge to see them here
      </p>
    </div>
  );
}
