'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Field } from '@/lib/teambridge/client/types';
import { createLocation } from './actions';

type LocationFieldMapping = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

interface AddLocationModalProps {
  collectionId: string;
  fields: Field[];
  fieldMapping: LocationFieldMapping;
}

export function AddLocationModal({ collectionId, fields, fieldMapping }: AddLocationModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build the data object using field IDs
      const data: Record<string, unknown> = {};
      
      if (fieldMapping.name && formData.name) {
        data[fieldMapping.name] = formData.name;
      }
      if (fieldMapping.address && formData.address) {
        data[fieldMapping.address] = formData.address;
      }
      if (fieldMapping.city && formData.city) {
        data[fieldMapping.city] = formData.city;
      }
      if (fieldMapping.state && formData.state) {
        data[fieldMapping.state] = formData.state;
      }
      if (fieldMapping.zipCode && formData.zipCode) {
        data[fieldMapping.zipCode] = formData.zipCode;
      }

      const result = await createLocation(collectionId, data);
      
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setFormData({ name: '', address: '', city: '', state: '', zipCode: '' });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // Determine which fields to show based on the mapping
  const hasNameField = !!fieldMapping.name;
  const hasAddressField = !!fieldMapping.address;
  const hasCityField = !!fieldMapping.city;
  const hasStateField = !!fieldMapping.state;
  const hasZipCodeField = !!fieldMapping.zipCode;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-1.5 size-4" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Enter the details for the new location.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasNameField && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="Location name"
                required
              />
            </div>
          )}

          {hasAddressField && (
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={handleInputChange('address')}
                placeholder="Street address"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {hasCityField && (
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={handleInputChange('city')}
                  placeholder="City"
                />
              </div>
            )}

            {hasStateField && (
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={handleInputChange('state')}
                  placeholder="State"
                />
              </div>
            )}
          </div>

          {hasZipCodeField && (
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange('zipCode')}
                placeholder="Zip code"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
