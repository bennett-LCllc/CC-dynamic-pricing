'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCustomers,
  deleteCustomer,
} from '@/lib/api';
import type { CustomerSummary, CustomerType, CustomerStatus } from '@cc-ops/shared';
import CustomerForm from '@/components/customers/CustomerForm';
import {
  Users, Plus, Search, Mail, Phone, Building2,
  Loader2, AlertTriangle, Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

const TYPE_LABELS: Record<CustomerType, string> = {
  STR_OWNER: 'STR Owner',
  PM_COMPANY: 'Property Manager',
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
};

const TYPE_BADGE_COLORS: Record<CustomerType, string> = {
  STR_OWNER: 'bg-purple-100 text-purple-700',
  PM_COMPANY: 'bg-blue-100 text-blue-700',
  RESIDENTIAL: 'bg-green-100 text-green-700',
  COMMERCIAL: 'bg-orange-100 text-orange-700',
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCustomers({
        search: search || undefined,
        type: (filterType as CustomerType) || undefined,
        status: (filterStatus as CustomerStatus) || undefined,
      });
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, filterType, filterStatus]);

  const totalProperties = customers.reduce((sum, c) => sum + c.propertyCount, 0);
  const totalMRR = customers.reduce((sum, c) => sum + c.monthlyRecurringRevenue, 0);
  const activeCount = customers.filter((c) => c.status === 'ACTIVE').length;

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this customer? They will be marked as inactive.')) return;
    try {
      await deleteCustomer(id);
      fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate customer');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              External lawn & cleaning customers
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Customer
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
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{customers.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value text-green-600">{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Properties</div>
            <div className="stat-value text-ocean-600">{totalProperties}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-value text-ocean-600">
              ${totalMRR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Types</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="STR_OWNER">STR Owner</option>
              <option value="PM_COMPANY">Property Manager</option>
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="CHURNED">Churned</option>
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              {search || filterType || filterStatus
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first external customer.'}
            </p>
            {!search && !filterType && !filterStatus && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Customer
              </button>
            )}
          </div>
        ) : (
          /* Customer Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onDelete={handleDelete}
                onClick={() => router.push(`/customers/${customer.id}`)}
              />
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddForm && (
          <CustomerForm
            onClose={() => setShowAddForm(false)}
            onSaved={() => {
              setShowAddForm(false);
              fetchCustomers();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Customer Card                                                             */
/* -------------------------------------------------------------------------- */

function CustomerCard({
  customer,
  onDelete,
  onClick,
}: {
  customer: CustomerSummary;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <div className="card p-4 hover:border-ocean-300 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h4 className="font-semibold text-sm truncate">{customer.name}</h4>
          {customer.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>
        <StatusBadge status={customer.status} variant="booking" />
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3" onClick={onClick}>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          {customer.phone}
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE_COLORS[customer.type]}`}>
            {TYPE_LABELS[customer.type]}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {customer.propertyCount} propert{customer.propertyCount !== 1 ? 'ies' : 'y'}
          </span>
          {customer.monthlyRecurringRevenue > 0 && (
            <span className="text-ocean-600 font-medium">
              ${customer.monthlyRecurringRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(customer.id);
          }}
          className="text-xs text-red-500 hover:text-red-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Deactivate
        </button>
      </div>
    </div>
  );
}
