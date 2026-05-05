import {
  AlertCircleIcon,
  AlertTriangleIcon,
  MapPinIcon,
} from 'lucide-react';
import { getTBContext, TBClient, getCredentialsForAccount } from '@/lib/teambridge';
import type { Field } from '@/lib/teambridge/client/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
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
import { AddLocationModal } from './add-location-modal';

type LocationFieldMapping = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

function buildLocationFieldMapping(fields: Field[]): LocationFieldMapping {
  const mapping: LocationFieldMapping = {};
  for (const f of fields) {
    const lowerName = f.name.toLowerCase();
    if (lowerName === 'name' || lowerName === 'location name') mapping.name = f.id;
    else if (lowerName === 'address' || lowerName === 'street address') mapping.address = f.id;
    else if (lowerName === 'city') mapping.city = f.id;
    else if (lowerName === 'state') mapping.state = f.id;
    else if (lowerName === 'zip' || lowerName === 'zip code' || lowerName === 'postal code') mapping.zipCode = f.id;
  }
  return mapping;
}

type MappedLocation = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

function mapRecordToLocation(
  record: Record<string, unknown> & { id: string },
  mapping: LocationFieldMapping,
): MappedLocation {
  return {
    id: record.id,
    name: mapping.name ? String(record[mapping.name] ?? '') : 'Unnamed Location',
    address: mapping.address ? String(record[mapping.address] ?? '') : undefined,
    city: mapping.city ? String(record[mapping.city] ?? '') : undefined,
    state: mapping.state ? String(record[mapping.state] ?? '') : undefined,
    zipCode: mapping.zipCode ? String(record[mapping.zipCode] ?? '') : undefined,
  };
}

export default async function LocationsPage() {
  const { accountId, user, userContext } = await getTBContext();

  type LocationsResponse = Awaited<ReturnType<TBClient['collections']['records']['list']>>;
  let locationsResponse: LocationsResponse | null = null;
  let error: string | null = null;

  const credentials = getCredentialsForAccount(accountId);

  let locationFieldMapping: LocationFieldMapping = {};
  let collectionId: string | null = null;
  let fields: Field[] = [];

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
      const locationsCollection = collections.find((c) => c.name.toLowerCase().includes('location'));
      
      if (!locationsCollection) {
        throw new Error(
          'No Locations collection found. Create a Locations collection in Teambridge to use with this app.',
        );
      }

      collectionId = locationsCollection.id;

      const [fieldsResponse, recordsResponse] = await Promise.all([
        client.collections.getFields(locationsCollection.id),
        client.collections.records.list(locationsCollection.id, { page: 0, pageSize: 50 }),
      ]);
      
      fields = fieldsResponse;
      locationFieldMapping = buildLocationFieldMapping(fieldsResponse);
      locationsResponse = recordsResponse;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch locations';
    }
  }

  const rawRecords = locationsResponse?.data ?? [];
  const locations: MappedLocation[] = rawRecords.map((r) =>
    mapRecordToLocation(r as Record<string, unknown> & { id: string }, locationFieldMapping),
  );

  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-secondary">
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-xl font-semibold">
          {greeting}, {firstName}
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPinIcon className="size-4 text-muted-foreground" />
              Locations
            </CardTitle>
            {collectionId && fields.length > 0 && (
              <AddLocationModal 
                collectionId={collectionId} 
                fields={fields}
                fieldMapping={locationFieldMapping}
              />
            )}
          </CardHeader>

          <CardContent>
            {!credentials ? (
              <Alert>
                <AlertTriangleIcon />
                <AlertTitle>Configuration required</AlertTitle>
                <AlertDescription>
                  No credentials found for account{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{accountId}</code>.
                  Set <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">TB_CLIENT_ID</code> and{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">TB_CLIENT_SECRET</code> in your{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code>, or add
                  account-specific credentials.
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
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Zip Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.address || '—'}</TableCell>
                      <TableCell>{location.city || '—'}</TableCell>
                      <TableCell>{location.state || '—'}</TableCell>
                      <TableCell>{location.zipCode || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
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
      <p className="text-sm font-medium text-muted-foreground">
        No locations found
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Add a location to get started
      </p>
    </div>
  );
}
