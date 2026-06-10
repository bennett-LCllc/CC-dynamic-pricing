'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCustomer,
  deleteCustomer,
} from '@/lib/api';
import type { Customer } from '@cc-ops/shared';
import CustomerForm from '@/components/customers/CustomerForm';
import {
  ArrowLeft, Edit3, Trash2, Mail, Phone, Building2,
  MapPin, Calendar, DollarSign, Loader2, AlertTriangle,
  ClipboardList, ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

const TYPE_LABELS: Record<string, string> = {
  STR_OWNER: 'STR Owner',
  PM_COMPANY: 'Property Manager',
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCustomer = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCustomer(id);
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteCustomer(id);
      router.push('/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate customer');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-ocean-600 mt-4 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Customer not found.
        </div>
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-ocean-600 mt-4 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>
      </div>
    );
  }

  const lawnJobs = customer.lawnJobs ?? [];
  const cleaningJobs = customer.cleaningJobs ?? [];
  const totalLawnRevenue = lawnJobs.reduce((s, j) => s + Number(j.customerCharge ?? 0), 0);
  const totalCleaningRevenue = cleaningJobs.reduce((s, j) => s + Number(j.customerCharge ?? 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/customers"
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <StatusBadge status={customer.status} variant="booking" />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {TYPE_LABELS[customer.type] ?? customer.type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Deactivate
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Contact Info */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="text-ocean-600 hover:underline">
                  {customer.email}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${customer.phone}`} className="text-ocean-600 hover:underline">
                {customer.phone}
              </a>
            </div>
            {customer.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                {customer.company}
              </div>
            )}
          </div>
          {customer.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Properties */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Properties ({customer.properties?.length ?? 0})
            </h3>
          </div>
          {customer.properties && customer.properties.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Address</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Lot Size</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Lawn</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Cleaning</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.properties.map((prop) => (
                    <tr key={prop.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{prop.address}</div>
                        <div className="text-xs text-muted-foreground">{prop.zipCode}</div>
                      </td>
                      <td className="py-3 pr-4 capitalize">{prop.propertyType.toLowerCase()}</td>
                      <td className="py-3 pr-4">{prop.lotSize?.replace(/_/g, ' ').toLowerCase()}</td>
                      <td className="py-3 pr-4">{prop.lawnPackage?.replace(/_/g, ' ').toLowerCase() ?? '-'}</td>
                      <td className="py-3">{prop.cleaningPackage?.replace(/_/g, ' ').toLowerCase() ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No properties on file.</p>
          )}
        </div>

        {/* Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lawn Jobs */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Lawn Jobs ({lawnJobs.length})
              </h3>
              {totalLawnRevenue > 0 && (
                <span className="text-sm font-medium text-ocean-600">
                  ${totalLawnRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
                </span>
              )}
            </div>
            {lawnJobs.length > 0 ? (
              <div className="space-y-2">
                {lawnJobs.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{job.propertyAddress}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(job.scheduledDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <span className="capitalize">{job.serviceType.toLowerCase().replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        ${Number(job.customerCharge).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <StatusBadge status={job.status} variant="booking" />
                    </div>
                  </div>
                ))}
                {lawnJobs.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 10 of {lawnJobs.length} jobs
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lawn jobs on record.</p>
            )}
          </div>

          {/* Cleaning Jobs */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Cleaning Jobs ({cleaningJobs.length})
              </h3>
              {totalCleaningRevenue > 0 && (
                <span className="text-sm font-medium text-ocean-600">
                  ${totalCleaningRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
                </span>
              )}
            </div>
            {cleaningJobs.length > 0 ? (
              <div className="space-y-2">
                {cleaningJobs.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{job.propertyAddress}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(job.scheduledStart).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <span className="capitalize">{job.cleaningType.toLowerCase().replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        ${Number(job.customerCharge).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <StatusBadge status={job.status} variant="booking" />
                    </div>
                  </div>
                ))}
                {cleaningJobs.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 10 of {cleaningJobs.length} jobs
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No cleaning jobs on record.</p>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditForm && (
          <CustomerForm
            customer={customer}
            onClose={() => setShowEditForm(false)}
            onSaved={() => {
              setShowEditForm(false);
              fetchCustomer();
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-2">Deactivate Customer</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to deactivate <strong>{customer.name}</strong>? They will be marked as inactive and hidden from default views.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
