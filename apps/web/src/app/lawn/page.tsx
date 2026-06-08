import { Header } from '@/components/shared/Header';
import { TreePine } from 'lucide-react';

export default function LawnPage() {
  return (
    <div>
      <Header
        title="Lawn Care LLC"
        subtitle="Lawn maintenance and landscape services"
      />
      <div className="p-8">
        <div className="card p-12 text-center">
          <TreePine className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Lawn Care Dashboard</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Schedule crews, optimize routes, manage customers, and track job profitability.
          </p>
        </div>
      </div>
    </div>
  );
}
