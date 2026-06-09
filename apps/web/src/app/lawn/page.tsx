'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getLawnJobs,
  getProperties,
  deleteLawnJob,
} from '@/lib/api';
import type { LawnJob, Property } from '@cc-ops/shared';
import LawnJobForm from '@/components/lawn/LawnJobForm';
import {
  TreePine, Plus, Search, MapPin, Users,
  Clock, DollarSign, Loader2, AlertTriangle, Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

const STATUS_GROUPS = [
  { key: 'PENDING', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { key: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-ocean-100 text-ocean-700' },
  { key: 'COMPLETED', label: 'Completed', color: 'bg-palm-100 text-palm-700' },
];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  MOW: 'Mow',
  EDGE: 'Edge',
  TRIM: 'Trim',
  FERTILIZE: 'Fertilize',
  FULL_SERVICE: 'Full Service',
};

export default function LawnPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<LawnJob[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterCrew, setFilterCrew] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        statuses: filterStatus ? [filterStatus] : undefined,
        propertyId: filterProperty || undefined,
        crewId: filterCrew || undefined,
      };
      const [jobData, propData] = await Promise.all([
        getLawnJobs(filters),
        getProperties(),
      ]);
      setJobs(jobData);
      setProperties(propData as unknown as Property[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lawn jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filterStatus, filterProperty, filterCrew]);

  // Filter by search term client-side
  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) => {
      const propName = j.property?.name?.toLowerCase() ?? '';
      const crewName = j.crew?.name?.toLowerCase() ?? '';
      return (
        j.serviceType.toLowerCase().includes(q) ||
        propName.includes(q) ||
        crewName.includes(q) ||
        j.status.toLowerCase().includes(q)
      );
    });
  }, [jobs, search]);

  // Group jobs by status
  const groupedJobs = useMemo(() => {
    const groups: Record<string, LawnJob[]> = {};
    for (const group of STATUS_GROUPS) {
      groups[group.key] = filteredJobs.filter((j) => j.status === group.key);
    }
    groups.OTHER = filteredJobs.filter(
      (j) => !STATUS_GROUPS.some((g) => g.key === j.status)
    );
    return groups;
  }, [filteredJobs]);

  const totalRevenue = filteredJobs.reduce(
    (sum, j) => sum + Number(j.customerCharge ?? 0),
    0
  );
  const jobsToday = filteredJobs.filter((j) => {
    const d = new Date(j.scheduledDate);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this lawn job?')) return;
    try {
      await deleteLawnJob(id);
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lawn Care</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Crew scheduling, route optimization, and job tracking
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-palm-600 text-white rounded-lg hover:bg-palm-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Jobs Today</div>
            <div className="stat-value">{jobsToday}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Jobs</div>
            <div className="stat-value text-palm-600">{filteredJobs.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-value text-amber-600">
              {groupedJobs.PENDING?.length ?? 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Revenue (filtered)</div>
            <div className="stat-value text-palm-600">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Statuses</option>
              {STATUS_GROUPS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterCrew}
            onChange={(e) => setFilterCrew(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">All Crews</option>
            {[...new Set(jobs.map((j) => j.crew?.name).filter(Boolean))].map((name) => (
              <option key={name} value={jobs.find((j) => j.crew?.name === name)?.crewId ?? ''}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-palm-500 animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="card p-12 text-center">
            <TreePine className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No lawn jobs</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Get started by creating a new lawn job.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-palm-600 text-white rounded-lg hover:bg-palm-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Job
            </button>
          </div>
        ) : (
          /* Job groups */
          <div className="space-y-6">
            {STATUS_GROUPS.map((group) => {
              const groupJobs = groupedJobs[group.key] ?? [];
              if (groupJobs.length === 0) return null;
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${group.color}`}>
                      {group.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {groupJobs.length} job{groupJobs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onDelete={handleDelete}
                        onClick={() => router.push(`/lawn/${job.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddForm && (
          <LawnJobForm
            onClose={() => setShowAddForm(false)}
            onSaved={() => {
              setShowAddForm(false);
              fetchJobs();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Job Card                                                                  */
/* -------------------------------------------------------------------------- */

function JobCard({
  job,
  onDelete,
  onClick,
}: {
  job: LawnJob;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const scheduledDate = new Date(job.scheduledDate);
  const charge = Number(job.customerCharge ?? 0);

  return (
    <div className="card p-4 hover:border-palm-300 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {SERVICE_TYPE_LABELS[job.serviceType] ?? job.serviceType}
            </span>
          </div>
          <h4 className="font-semibold text-sm truncate">
            {job.property?.name ?? 'Unknown Property'}
          </h4>
          {job.property?.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{job.property.address}</span>
            </div>
          )}
        </div>
        <StatusBadge status={job.status} variant="booking" />
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3" onClick={onClick}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {scheduledDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
          {job.scheduledTime && ` at ${job.scheduledTime}`}
        </div>
        {job.crew && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {job.crew.name}
          </div>
        )}
        {charge > 0 && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-palm-600" />
            <span className="text-palm-600 font-medium">
              ${charge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Link
          href={`/lawn/${job.id}`}
          className="text-xs text-palm-600 hover:text-palm-700 font-medium"
        >
          View Details
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(job.id);
          }}
          className="text-xs text-red-500 hover:text-red-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
