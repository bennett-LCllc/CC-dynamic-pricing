'use client';

import ExpenseForm from '@/components/financials/ExpenseForm';
import {
  createExpense,
  deleteExpense,
  getExpenses,
  getFinancialOverview,
  updateExpense,
} from '@/lib/api';
import type { Expense, ExpenseBreakdown, FinancialOverview, LLC } from '@cc-ops/shared';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit2,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const LLC_COLORS: Record<string, string> = {
  STR: '#0ea5e9',
  LAWN: '#22c55e',
  CLEANING: '#f59e0b',
};

const PIE_COLORS = [
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#a3e635',
];

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MORTGAGE: 'Mortgage',
  INSURANCE: 'Insurance',
  PROPERTY_TAX: 'Property Tax',
  UTILITIES: 'Utilities',
  INTERNET: 'Internet',
  WATER: 'Water',
  ELECTRIC: 'Electric',
  GAS: 'Gas',
  TRASH: 'Trash',
  HOA: 'HOA',
  MAINTENANCE: 'Maintenance',
  REPAIRS: 'Repairs',
  SUPPLIES: 'Supplies',
  FURNISHING: 'Furnishing',
  LINENS: 'Linens',
  CLEANING_SUPPLIES: 'Cleaning Supplies',
  LAWN_SUPPLIES: 'Lawn Supplies',
  EQUIPMENT: 'Equipment',
  SOFTWARE: 'Software',
  MARKETING: 'Marketing',
  PLATFORM_FEES: 'Platform Fees',
  LEGAL: 'Legal',
  ACCOUNTING: 'Accounting',
  TRAVEL: 'Travel',
  FUEL: 'Fuel',
  LABOR: 'Labor',
  OTHER: 'Other',
};

const LLC_OPTIONS: LLC[] = ['STR', 'LAWN', 'CLEANING'];

export default function FinancialsPage() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLLC, setFilterLLC] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description' | 'category'>(
    'date',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedSections, setExpandedSections] = useState({
    str: false,
    lawn: false,
    cleaning: false,
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, expenseData] = await Promise.all([
        getFinancialOverview(),
        getExpenses(),
      ]);
      setOverview(overviewData);
      setExpenses(expenseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendor ?? '').toLowerCase().includes(q),
      );
    }

    if (filterCategory) {
      result = result.filter((e) => e.category === filterCategory);
    }
    if (filterLLC) {
      result = result.filter((e) => e.incurredBy === filterLLC);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          cmp = Number(a.amount) - Number(b.amount);
          break;
        case 'description':
          cmp = a.description.localeCompare(b.description);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [expenses, search, filterCategory, filterLLC, sortField, sortDir]);

  // Get unique categories from expenses for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category));
    return Array.from(cats).sort();
  }, [expenses]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5" />
    );
  };

  const totalExpensesFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financials</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {overview?.period ?? 'Loading…'} — Revenue, expenses, and profitability
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
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

        {/* Summary Cards */}
        {overview && (
          <>
            {/* Consolidated P&L */}
            <div className="card p-5 bg-gradient-to-r from-ocean-50 to-palm-50 border-ocean-200">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-ocean-600" />
                <h3 className="font-semibold text-lg">Consolidated P&L — {overview.period}</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold text-ocean-600">
                    $
                    {overview.consolidated.revenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    $
                    {overview.consolidated.expenses.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Net Income</div>
                  <div
                    className={`text-2xl font-bold ${overview.consolidated.netIncome >= 0 ? 'text-palm-600' : 'text-red-600'}`}
                  >
                    $
                    {overview.consolidated.netIncome.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Per-LLC Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LLC_OPTIONS.map((llc) => {
                const llcLower = llc.toLowerCase() as 'str' | 'lawn' | 'cleaning';
                const data = overview.llcs[llcLower];
                const isExpanded = expandedSections[llcLower];

                return (
                  <div key={llc} className="card p-5 hover:border-ocean-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold" style={{ color: LLC_COLORS[llc] }}>
                        {llc}
                      </h4>
                      <button
                        onClick={() =>
                          setExpandedSections((prev) => ({
                            ...prev,
                            [llcLower]: !prev[llcLower],
                          }))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Revenue
                        </span>
                        <span className="font-medium">
                          ${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" /> Expenses
                        </span>
                        <span className="font-medium">
                          ${data.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm">
                        <span className="font-medium">Net Income</span>
                        <span
                          className={`font-bold ${data.netIncome >= 0 ? 'text-palm-600' : 'text-red-600'}`}
                        >
                          ${data.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {isExpanded && data.revenue > 0 && (
                        <div className="pt-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Margin</span>
                            <span>
                              {data.netIncome >= 0 ? '+' : ''}
                              {Math.round((data.netIncome / data.revenue) * 100)}%
                            </span>
                          </div>
                          {/* Mini progress bar */}
                          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${data.netIncome >= 0 ? 'bg-palm-500' : 'bg-red-500'}`}
                              style={{
                                width: `${Math.min(Math.abs(Math.round((data.netIncome / data.revenue) * 100)), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expense Breakdown Chart */}
            {overview.expenseBreakdown.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  Expense Breakdown by Category
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overview.expenseBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ category, percentage }: ExpenseBreakdown) =>
                            `${category}: ${percentage}%`
                          }
                          labelLine={{ stroke: '#94a3b8' }}
                        >
                          {overview.expenseBreakdown.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {overview.expenseBreakdown.map((item, idx) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{
                              backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-sm font-medium">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Expenses Table */}
        <div className="card">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Expenses</h3>
              <span className="text-sm text-muted-foreground">
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                {filterCategory || filterLLC ? ' (filtered)' : ''}
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search expenses…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 appearance-none bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <select
                value={filterLLC}
                onChange={(e) => setFilterLLC(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 appearance-none bg-white"
              >
                <option value="">All LLCs</option>
                {LLC_OPTIONS.map((llc) => (
                  <option key={llc} value={llc}>
                    {llc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                {expenses.length === 0
                  ? 'Get started by adding your first expense.'
                  : 'No expenses match your current filters.'}
              </p>
              {expenses.length === 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th
                      className="text-left px-5 py-3 font-medium cursor-pointer hover:text-ocean-600 select-none"
                      onClick={() => toggleSort('date')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Date <SortIcon field="date" />
                      </span>
                    </th>
                    <th
                      className="text-left px-5 py-3 font-medium cursor-pointer hover:text-ocean-600 select-none"
                      onClick={() => toggleSort('description')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Description <SortIcon field="description" />
                      </span>
                    </th>
                    <th
                      className="text-left px-5 py-3 font-medium cursor-pointer hover:text-ocean-600 select-none"
                      onClick={() => toggleSort('category')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Category <SortIcon field="category" />
                      </span>
                    </th>
                    <th className="text-left px-5 py-3 font-medium">LLC</th>
                    <th className="text-left px-5 py-3 font-medium">Vendor</th>
                    <th
                      className="text-right px-5 py-3 font-medium cursor-pointer hover:text-ocean-600 select-none"
                      onClick={() => toggleSort('amount')}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Amount <SortIcon field="amount" />
                      </span>
                    </th>
                    <th className="px-5 py-3 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-border hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{expense.description}</div>
                        {expense.isRecurring && (
                          <span className="text-xs text-muted-foreground">
                            Recurring ({expense.recurringInterval?.toLowerCase()})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {EXPENSE_CATEGORY_LABELS[expense.category] ??
                            expense.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${LLC_COLORS[expense.incurredBy]}18`,
                            color: LLC_COLORS[expense.incurredBy],
                          }}
                        >
                          {expense.incurredBy}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{expense.vendor ?? '—'}</td>
                      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                        $
                        {Number(expense.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="p-1.5 text-muted-foreground hover:text-ocean-600 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-gray-50 font-semibold">
                    <td colSpan={5} className="px-5 py-3 text-right text-sm">
                      Total ({filteredExpenses.length} expense
                      {filteredExpenses.length !== 1 ? 's' : ''}):
                    </td>
                    <td className="px-5 py-3 text-right text-sm whitespace-nowrap">
                      $
                      {totalExpensesFiltered.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {(showAddForm || editingExpense) && (
        <ExpenseForm
          expense={editingExpense}
          onClose={() => {
            setShowAddForm(false);
            setEditingExpense(null);
          }}
          onSaved={() => {
            setShowAddForm(false);
            setEditingExpense(null);
            fetchData();
          }}
          createExpense={createExpense}
          updateExpense={updateExpense}
        />
      )}
    </div>
  );
}
