'use client';

import { useState, useEffect } from 'react';
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseCategory,
  LLC,
  RecurringInterval,
} from '@cc-ops/shared';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'MORTGAGE', 'INSURANCE', 'PROPERTY_TAX', 'UTILITIES', 'INTERNET',
  'WATER', 'ELECTRIC', 'GAS', 'TRASH', 'HOA', 'MAINTENANCE', 'REPAIRS',
  'SUPPLIES', 'FURNISHING', 'LINENS', 'CLEANING_SUPPLIES', 'LAWN_SUPPLIES',
  'EQUIPMENT', 'SOFTWARE', 'MARKETING', 'PLATFORM_FEES', 'LEGAL',
  'ACCOUNTING', 'TRAVEL', 'FUEL', 'LABOR', 'OTHER',
];

const LLC_OPTIONS: LLC[] = ['STR', 'LAWN', 'CLEANING'];

const RECURRING_OPTIONS: RecurringInterval[] = [
  'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY',
];

interface ExpenseFormProps {
  expense?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  createExpense: (data: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, data: UpdateExpenseInput) => Promise<Expense>;
}

export default function ExpenseForm({
  expense,
  onClose,
  onSaved,
  createExpense,
  updateExpense,
}: ExpenseFormProps) {
  const isEditing = !!expense;

  const [form, setForm] = useState({
    propertyId: '',
    category: 'OTHER' as ExpenseCategory,
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    incurredBy: 'STR' as LLC,
    vendor: '',
    isRecurring: false,
    recurringInterval: '' as RecurringInterval | '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setForm({
        propertyId: expense.propertyId ?? '',
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        date: expense.date.split('T')[0],
        incurredBy: expense.incurredBy,
        vendor: expense.vendor ?? '',
        isRecurring: expense.isRecurring,
        recurringInterval: expense.recurringInterval ?? '',
        notes: expense.notes ?? '',
      });
    }
  }, [expense]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload: CreateExpenseInput = {
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      date: new Date(form.date).toISOString(),
      incurredBy: form.incurredBy,
      ...(form.propertyId ? { propertyId: form.propertyId } : {}),
      ...(form.vendor.trim() ? { vendor: form.vendor.trim() } : {}),
      isRecurring: form.isRecurring,
      ...(form.isRecurring && form.recurringInterval
        ? { recurringInterval: form.recurringInterval }
        : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };

    if (isNaN(payload.amount) || payload.amount <= 0) {
      setError('Amount must be a positive number');
      setSaving(false);
      return;
    }

    if (!payload.description) {
      setError('Description is required');
      setSaving(false);
      return;
    }

    try {
      if (isEditing && expense) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g., Monthly mortgage payment"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              required
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                required
              />
            </div>
          </div>

          {/* Category + LLC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 appearance-none bg-white"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LLC</label>
              <select
                name="incurredBy"
                value={form.incurredBy}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 appearance-none bg-white"
              >
                {LLC_OPTIONS.map((llc) => (
                  <option key={llc} value={llc}>{llc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium mb-1">Vendor</label>
            <input
              type="text"
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              placeholder="e.g., ABC Plumbing"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isRecurring"
              checked={form.isRecurring}
              onChange={handleChange}
              className="w-4 h-4 text-ocean-600 border-border rounded focus:ring-ocean-500"
            />
            <label className="text-sm font-medium">Recurring expense</label>
            {form.isRecurring && (
              <select
                name="recurringInterval"
                value={form.recurringInterval}
                onChange={handleChange}
                className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 appearance-none bg-white"
              >
                <option value="">Select interval</option>
                {RECURRING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt.toLowerCase()}</option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
