import { Header } from '@/components/shared/Header';
import { Sparkles } from 'lucide-react';

export default function CleaningPage() {
  return (
    <div>
      <Header
        title="Cleaning LLC"
        subtitle="Turnover cleaning and deep cleaning management"
      />
      <div className="p-8">
        <div className="card p-12 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Cleaning Dashboard</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Schedule turnovers, manage cleaners, track quality, and invoice customers.
          </p>
        </div>
      </div>
    </div>
  );
}
