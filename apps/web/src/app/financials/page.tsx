import { Header } from '@/components/shared/Header';
import { BarChart3 } from 'lucide-react';

export default function FinancialsPage() {
  return (
    <div>
      <Header
        title="Financials"
        subtitle="Revenue, expenses, and profitability across all three LLCs"
      />
      <div className="p-8">
        <div className="card p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Financial Dashboard</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Per-LLC P&L, consolidated financials, expense tracking, and tax-ready reports.
          </p>
        </div>
      </div>
    </div>
  );
}
