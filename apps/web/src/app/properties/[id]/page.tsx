'use client';

import PropertyForm from '@/components/properties/PropertyForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { deleteProperty, getProperty } from '@/lib/api';
import type { Property } from '@cc-ops/shared';
import {
  AlertTriangle,
  ArrowLeft,
  Bath,
  Bed,
  Calendar,
  Edit3,
  Eye,
  Flame,
  Loader2,
  MapPin,
  PawPrint,
  Trash2,
  Users,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

type Tab = 'overview' | 'bookings' | 'financials' | 'settings';

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProperty = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProperty(id);
      setProperty(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteProperty(id);
      router.push('/properties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  if (!property) {
    return <div className="p-8 text-center text-muted-foreground">Property not found.</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'financials', label: 'Financials' },
    { key: 'settings', label: 'Settings' },
  ];

  // Compute expense totals from the expenses relation
  const expenses = (property as any).expenses ?? [];
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const bookings = (property as any).bookings ?? [];
  const totalRevenue = bookings.reduce((sum: number, b: any) => sum + Number(b.totalAmount), 0);

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/properties" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{property.name}</h1>
                <StatusBadge status={property.status} />
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {property.address}, {property.city}, {property.state} {property.zipCode}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-ocean-500 text-ocean-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-label">Base Rate</div>
                <div className="stat-value">${Number(property.baseRate).toLocaleString()}</div>
                <div className="stat-change text-muted-foreground">per night</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Cleaning Fee</div>
                <div className="stat-value">${Number(property.cleaningFee).toLocaleString()}</div>
                <div className="stat-change text-muted-foreground">per booking</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Bookings</div>
                <div className="stat-value">{bookings.length}</div>
                <div className="stat-change text-muted-foreground">all time</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value">${totalRevenue.toLocaleString()}</div>
                <div className="stat-change text-muted-foreground">all time</div>
              </div>
            </div>

            {/* Property details */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Property Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="font-medium">{property.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bedrooms</div>
                  <div className="font-medium flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5" /> {property.bedrooms}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bathrooms</div>
                  <div className="font-medium flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5" /> {Number(property.bathrooms)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Max Guests</div>
                  <div className="font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {property.maxGuests}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Square Feet</div>
                  <div className="font-medium">{property.squareFeet?.toLocaleString() ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Year Built</div>
                  <div className="font-medium">{property.yearBuilt ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Pet Fee</div>
                  <div className="font-medium">${Number(property.petFee).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="font-medium">
                    {new Date(property.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {property.isPetFriendly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-palm-50 text-palm-600 rounded-full text-xs font-medium">
                    <PawPrint className="w-3 h-3" /> Pet Friendly
                  </span>
                )}
                {property.hasPool && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-ocean-50 text-ocean-600 rounded-full text-xs font-medium">
                    <Waves className="w-3 h-3" /> Pool
                  </span>
                )}
                {property.hasHotTub && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-ocean-50 text-ocean-600 rounded-full text-xs font-medium">
                    <Flame className="w-3 h-3" /> Hot Tub
                  </span>
                )}
                {property.isBeachfront && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sand-50 text-sand-600 rounded-full text-xs font-medium">
                    Beachfront
                  </span>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="text-sm">{property.description}</p>
                </div>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((a) => (
                      <span
                        key={a}
                        className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {property.photos && property.photos.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-3">
                    Photos ({property.photos.length})
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {property.photos.map((photo) => (
                      <div key={photo.id} className="group relative">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                          <img
                            src={photo.url}
                            alt={photo.caption ?? `Property photo`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.classList.add(
                                'flex',
                                'items-center',
                                'justify-center',
                              );
                              target.parentElement!.innerHTML =
                                '<span class="text-xs text-muted-foreground">No preview</span>';
                            }}
                          />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                          <div className="text-xs text-white truncate">
                            {photo.caption || photo.category}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Listing URLs */}
              {(property.listingUrlAirbnb || property.listingUrlVrbo) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">Listing URLs</div>
                  <div className="flex flex-wrap gap-3">
                    {property.listingUrlAirbnb && (
                      <a
                        href={property.listingUrlAirbnb}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-ocean-600 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Airbnb
                      </a>
                    )}
                    {property.listingUrlVrbo && (
                      <a
                        href={property.listingUrlVrbo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-ocean-600 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> VRBO
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bookings Tab ── */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="card p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Bookings will appear here once guests start reserving this property.
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Guest
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Check In
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Check Out
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Nights
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Total
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Platform
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking: any) => (
                      <tr
                        key={booking.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-sm">{booking.guestName}</div>
                          <div className="text-xs text-muted-foreground">{booking.guestEmail}</div>
                        </td>
                        <td className="px-5 py-3 text-sm">
                          {new Date(booking.checkIn).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          {new Date(booking.checkOut).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-sm">{booking.totalNights}</td>
                        <td className="px-5 py-3 text-sm font-medium">
                          ${Number(booking.totalAmount).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <span className="badge badge-info">{booking.platform}</span>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Financials Tab ── */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value text-palm-600">${totalRevenue.toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Expenses</div>
                <div className="stat-value text-red-600">${totalExpenses.toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Income</div>
                <div
                  className={`stat-value ${totalRevenue - totalExpenses >= 0 ? 'text-palm-600' : 'text-red-600'}`}
                >
                  ${(totalRevenue - totalExpenses).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold mb-4">Pricing Configuration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Base Rate</div>
                  <div className="text-lg font-semibold">${Number(property.baseRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cleaning Fee</div>
                  <div className="text-lg font-semibold">${Number(property.cleaningFee)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Pet Fee</div>
                  <div className="text-lg font-semibold">${Number(property.petFee)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Est. Nightly Total</div>
                  <div className="text-lg font-semibold">
                    ${Number(property.baseRate) + Number(property.cleaningFee)}
                  </div>
                </div>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="font-semibold">Recent Expenses</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Date
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Category
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Description
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.slice(0, 10).map((expense: any) => (
                      <tr
                        key={expense.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-5 py-3 text-sm">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          <span className="badge badge-info">{expense.category}</span>
                        </td>
                        <td className="px-5 py-3 text-sm">{expense.description}</td>
                        <td className="px-5 py-3 text-sm text-right font-medium">
                          ${Number(expense.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Property Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update property details, pricing, and configuration.
              </p>
              <button
                onClick={() => setShowEditForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Property
              </button>
            </div>

            <div className="card p-6 border-red-200">
              <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set this property to inactive. This will not delete any data but will remove it from
                active listings.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Set to Inactive
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditForm && property && (
        <PropertyForm
          property={property}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            fetchProperty();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Set Property to Inactive?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will set <strong>{property.name}</strong> to INACTIVE status. All data will be
              preserved. You can reactivate it later from the settings tab.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Setting Inactive...' : 'Set to Inactive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
