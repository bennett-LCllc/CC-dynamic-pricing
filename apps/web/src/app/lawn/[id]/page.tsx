'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getLawnJob,
  deleteLawnJob,
} from '@/lib/api';
import type { LawnJob } from '@cc-ops/shared';
import LawnJobForm from '@/components/lawn/LawnJobForm';
import {
  ArrowLeft, Edit3, Trash2, MapPin, User, Clock,
  DollarSign, Loader2, AlertTriangle, Camera,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  MOW: 'Mow',
  EDGE: 'Edge',
  TRIM: 'Trim',
  BLOW: 'Blow',
  FULL_SERVICE: 'Full Service',
  SEASONAL: 'Seasonal Cleanup',
  FERTILIZE: 'Fertilization',
  WEED_CONTROL: 'Weed Control',
};

export default function LawnJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<LawnJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchJob = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLawnJob(id);
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lawn job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteLawnJob(id);
      router.push('/lawn');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-palm-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="text-amber-800">Lawn job not found</span>
        </div>
      </div>
    );
  }

  const costBreakdown = [
    { label: 'Customer Charge', value: Number(job.customerCharge ?? 0) },
    { label: 'Labor Cost', value: Number(job.laborCost ?? 0) },
    { label: 'Material Cost', value: Number(job.materialCost ?? 0) },
  ];
  const netProfit = Number(job.customerCharge ?? 0) - Number(job.laborCost ?? 0) - Number(job.materialCost ?? 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/lawn"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {job.property?.name ?? 'Lawn Job'}
            </h1>
            {job.property?.address && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {job.property.address}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-palm-600 text-white rounded-lg hover:bg-palm-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Cancel Job
          </button>
        </div>
      </div>

      {/* Status + Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Status</div>
          <StatusBadge status={job.status} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Scheduled
          </div>
          <div className="font-medium">
            {new Date(job.scheduledDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          {job.scheduledTime && (
            <div className="text-sm text-gray-500">{job.scheduledTime}</div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Crew
          </div>
          <div className="font-medium">
            {job.crew?.name ?? 'Unassigned'}
          </div>
          {job.crew?.phone && (
            <div className="text-sm text-gray-500">{job.crew.phone}</div>
          )}
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Job Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Service Type</div>
            <div className="font-medium">
              {SERVICE_TYPE_LABELS[job.serviceType] ?? job.serviceType}
            </div>
          </div>
          {job.lotSize && (
            <div>
              <div className="text-sm text-gray-500">Lot Size</div>
              <div className="font-medium">{job.lotSize}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-gray-500">Job ID</div>
            <div className="font-medium text-xs text-gray-400">{job.id.slice(0, 8)}</div>
          </div>
        </div>
        {job.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Notes</div>
            <p className="text-gray-700">{job.notes}</p>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-palm-600" />
          Cost Breakdown
        </h2>
        <div className="space-y-3">
          {costBreakdown.map((item) => (
            <div key={item.label} className="flex justify-between">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium">
                ${(item.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-200 flex justify-between">
            <span className="font-semibold">Net Profit</span>
            <span className="font-bold text-palm-600">
              ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      {job.photos && job.photos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-palm-600" />
            Photos ({job.photos.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {job.photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.url}
                  alt={`Lawn photo ${photo.sortOrder + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                {photo.category && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                    {photo.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditForm && (
        <LawnJobForm
          job={job}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            fetchJob();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Cancel Lawn Job</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this lawn job? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Keep Job
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Cancel Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
