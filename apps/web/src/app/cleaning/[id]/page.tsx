'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCleaningJob,
  deleteCleaningJob,
  submitCleaningChecklist,
} from '@/lib/api';
import type { CleaningJob, CleaningChecklist } from '@cc-ops/shared';
import CleaningJobForm from '@/components/cleaning/CleaningJobForm';
import {
  ArrowLeft, Edit3, Trash2, MapPin, User, Clock,
  DollarSign, Loader2, AlertTriangle, CheckCircle2,
  Sparkles, Camera, ClipboardCheck,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

const CLEANING_TYPE_LABELS: Record<string, string> = {
  TURNOVER: 'Turnover',
  DEEP_CLEAN: 'Deep Clean',
  MOVE_IN_OUT: 'Move In/Out',
  MID_STAY: 'Mid-Stay',
  POST_CONSTRUCTION: 'Post-Construction',
};

// Default checklist template by cleaning type
const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  TURNOVER: [
    'Strip beds & collect linens',
    'Clean bathrooms (toilet, shower, sink, mirror)',
    'Vacuum/mop all floors',
    'Wipe all surfaces & counters',
    'Empty trash & replace bags',
    'Restock toiletries & towels',
    'Kitchen: clean dishes, wipe appliances',
    'Check for guest belongings',
    'Turn off lights & lock up',
  ],
  DEEP_CLEAN: [
    'All turnover tasks',
    'Inside oven & microwave',
    'Inside refrigerator',
    'Dust ceiling fans & light fixtures',
    'Wipe baseboards & door frames',
    'Clean windows & sills',
    'Scrub grout',
    'Move furniture & clean underneath',
  ],
  MOVE_IN_OUT: [
    'Deep clean all rooms',
    'Clean inside all cabinets & closets',
    'Appliance deep clean',
    'Wall spot-cleaning',
    'Garage/balcony sweep',
    'Final walkthrough inspection',
  ],
  MID_STAY: [
    'Change towels & linens',
    'Empty trash',
    'Wipe kitchen & bathroom surfaces',
    'Vacuum high-traffic areas',
    'Restock supplies',
  ],
  POST_CONSTRUCTION: [
    'Remove all construction debris',
    'Dust all surfaces thoroughly',
    'Vacuum with HEPA filter',
    'Clean windows & glass',
    'Wipe all fixtures',
    'Final inspection',
  ],
};

export default function CleaningJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<CleaningJob | null>(null);
  const [checklist, setChecklist] = useState<CleaningChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Local checklist state for checkboxes
  const [localTasks, setLocalTasks] = useState<Record<string, boolean>>({});

  const fetchJob = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCleaningJob(id);
      setJob(data);
      if (data.checklist) {
        setChecklist(data.checklist);
        setLocalTasks(data.checklist.tasks as Record<string, boolean>);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cleaning job');
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
      await deleteCleaningJob(id);
      router.push('/cleaning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
      setDeleteLoading(false);
    }
  };

  const handleChecklistToggle = (task: string) => {
    setLocalTasks((prev) => ({ ...prev, [task]: !prev[task] }));
  };

  const handleChecklistSubmit = async () => {
    setChecklistLoading(true);
    try {
      const result = await submitCleaningChecklist(id, localTasks);
      setChecklist(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  // Determine which checklist template to use
  const templateTasks = job
    ? CHECKLIST_TEMPLATES[job.cleaningType] ?? CHECKLIST_TEMPLATES.TURNOVER
    : [];

  // Merge template with any saved tasks
  const allTasks = templateTasks.map((t) => ({
    name: t,
    done: localTasks[t] ?? false,
  }));
  const completedCount = allTasks.filter((t) => t.done).length;

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

  if (!job) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cleaning job not found.
      </div>
    );
  }

  const scheduledStart = new Date(job.scheduledStart);
  const scheduledEnd = new Date(job.scheduledEnd);
  const customerCharge = Number(job.customerCharge ?? 0);
  const laborCost = Number(job.laborCost ?? 0);
  const supplyCost = Number(job.supplyCost ?? 0);
  const travelCost = Number(job.travelCost ?? 0);
  const totalCost = laborCost + supplyCost + travelCost;
  const profit = customerCharge - totalCost;

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/cleaning"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {job.property?.name ?? 'Unknown Property'}
                </h1>
                <StatusBadge status={job.status} variant="booking" />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {CLEANING_TYPE_LABELS[job.cleaningType] ?? job.cleaningType}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {scheduledStart.toLocaleDateString()} at{' '}
                  {scheduledStart.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
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
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Customer Charge</div>
            <div className="stat-value">
              ${customerCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Cost</div>
            <div className="stat-value text-red-600">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Profit</div>
            <div className={`stat-value ${profit >= 0 ? 'text-palm-600' : 'text-red-600'}`}>
              ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Checklist</div>
            <div className="stat-value text-ocean-600">
              {completedCount}/{allTasks.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Details */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Job Details</h3>
            <div className="space-y-4">
              {job.property?.address && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ocean-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-ocean-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="font-medium text-sm">
                      {job.property.address}
                      {job.property.zipCode && `, ${job.property.zipCode}`}
                    </div>
                  </div>
                </div>
              )}

              {job.cleaner && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ocean-50 rounded-lg">
                    <User className="w-4 h-4 text-ocean-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Assigned Cleaner</div>
                    <div className="font-medium text-sm">{job.cleaner.name}</div>
                    {job.cleaner.phone && (
                      <div className="text-xs text-muted-foreground">{job.cleaner.phone}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-xs text-muted-foreground">Scheduled Start</div>
                  <div className="font-medium text-sm">
                    {scheduledStart.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scheduledStart.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Scheduled End</div>
                  <div className="font-medium text-sm">
                    {scheduledEnd.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scheduledEnd.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {(job.bedrooms != null || job.bathrooms != null || job.squareFeet != null) && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">Property Details</div>
                  <div className="flex gap-4 text-sm">
                    {job.bedrooms != null && (
                      <span>{job.bedrooms} bed{job.bedrooms !== 1 ? 's' : ''}</span>
                    )}
                    {job.bathrooms != null && (
                      <span>{job.bathrooms} bath{job.bathrooms !== 1 ? 's' : ''}</span>
                    )}
                    {job.squareFeet != null && (
                      <span>{Number(job.squareFeet).toLocaleString()} sqft</span>
                    )}
                  </div>
                </div>
              )}

              {job.booking && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">Linked Booking</div>
                  <Link
                    href={`/bookings/${job.booking.id}`}
                    className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
                  >
                    {job.booking.guestName} —{' '}
                    {new Date(job.booking.checkIn).toLocaleDateString()} to{' '}
                    {new Date(job.booking.checkOut).toLocaleDateString()}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Cost Breakdown</h3>
            <div className="max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer charge</span>
                <span className="font-medium">
                  ${customerCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-border pt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labor</span>
                  <span className="font-medium">
                    ${laborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplies</span>
                  <span className="font-medium">
                    ${supplyCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Travel</span>
                  <span className="font-medium">
                    ${travelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Total cost</span>
                <span className="font-medium text-red-600">
                  ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                <span>Profit</span>
                <span className={profit >= 0 ? 'text-palm-600' : 'text-red-600'}>
                  ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-ocean-600" />
              <h3 className="font-semibold">Cleaning Checklist</h3>
            </div>
            {checklist?.completedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-palm-600" />
                Completed {new Date(checklist.completedAt).toLocaleString()}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {allTasks.map((task) => (
              <label
                key={task.name}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleChecklistToggle(task.name)}
                  className="w-4 h-4 rounded border-border text-ocean-600 focus:ring-ocean-500"
                />
                <span
                  className={`text-sm ${
                    task.done ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {task.name}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {completedCount} of {allTasks.length} tasks completed
            </span>
            <button
              onClick={handleChecklistSubmit}
              disabled={checklistLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
            >
              {checklistLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {checklist ? 'Update Checklist' : 'Submit Checklist'}
            </button>
          </div>
        </div>

        {/* Photos */}
        {job.photos && job.photos.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-ocean-600" />
              <h3 className="font-semibold">Photos</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {job.photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.category ?? 'Cleaning photo'}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" fill="%23e5e7eb"><rect width="128" height="128"/></svg>';
                    }}
                  />
                  {photo.category && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                      {photo.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="card p-6">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.notes}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {new Date(job.createdAt).toLocaleString()}</div>
          <div>Last updated: {new Date(job.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditForm && job && (
        <CleaningJobForm
          job={job}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            fetchJob();
          }}
        />
      )}

      {/* Cancel Confirmation */}
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
              <h3 className="text-lg font-semibold">Cancel Cleaning Job?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will cancel the cleaning job for{' '}
              <strong>{job.property?.name}</strong> scheduled on{' '}
              {scheduledStart.toLocaleDateString()}. The job status will be set to
              CANCELLED.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep Job
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Cancelling…' : 'Cancel Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
