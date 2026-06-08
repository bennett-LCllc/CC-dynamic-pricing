'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/shared/Header';
import { getProperties } from '@/lib/api';
import type { PropertyListItem } from '@cc-ops/shared';
import PropertyForm from '@/components/properties/PropertyForm';
import {
  Building2, Plus, MapPin, Bed, Bath, Users, DollarSign,
  TrendingUp, Calendar, Loader2,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-warning',
    UNDER_RENOVATION: 'badge-info',
    SOLD: 'badge-danger',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    UNDER_RENOVATION: 'Renovating',
    SOLD: 'Sold',
  };
  return <span className={`badge ${styles[status] ?? 'badge-info'}`}>{labels[status] ?? status}</span>;
}

function PropertyCard({ property }: { property: PropertyListItem }) {
  return (
    <Link href={`/properties/${property.id}`}>
      <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-ocean-600 transition-colors truncate">
              {property.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{property.address}, {property.zipCode}</span>
            </div>
          </div>
          <StatusBadge status={property.status} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" /> {property.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" /> {property.bathrooms}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {property.maxGuests}
          </span>
          {property.hasPool && <span className="text-xs bg-ocean-50 text-ocean-600 px-1.5 py-0.5 rounded">Pool</span>}
          {property.isPetFriendly && <span className="text-xs bg-palm-50 text-palm-600 px-1.5 py-0.5 rounded">Pets</span>}
          {property.isBeachfront && <span className="text-xs bg-sand-50 text-sand-600 px-1.5 py-0.5 rounded">Beach</span>}
        </div>

        {/* Financials */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground">Base Rate</div>
            <div className="font-semibold text-foreground">${property.baseRate}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">MTD Revenue</div>
            <div className="font-semibold text-foreground">${property.revenueThisMonth.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Occupancy</div>
            <div className="font-semibold text-foreground">{property.occupancyThisMonth}%</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-5 bg-muted rounded w-2/3 mb-2" />
      <div className="h-4 bg-muted rounded w-1/2 mb-4" />
      <div className="flex gap-4 mb-4">
        <div className="h-4 bg-muted rounded w-12" />
        <div className="h-4 bg-muted rounded w-12" />
        <div className="h-4 bg-muted rounded w-12" />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <div>
      <Header
        title="Properties"
        subtitle={`${properties.length} ${properties.length === 1 ? 'property' : 'properties'} in your portfolio`}
      />
      <div className="p-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>
                {properties.filter((p) => p.status === 'ACTIVE').length} active
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : properties.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first STR property to start tracking bookings, revenue, and operations.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <PropertyForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchProperties();
          }}
        />
      )}
    </div>
  );
}
