import { Header } from '@/components/shared/Header';
import { CalendarDays } from 'lucide-react';

export default function BookingsPage() {
  return (
    <div>
      <Header
        title="Bookings"
        subtitle="Calendar and reservation management"
      />
      <div className="p-8">
        <div className="card p-12 text-center">
          <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect your Airbnb and VRBO accounts to sync bookings, or add them manually.
          </p>
        </div>
      </div>
    </div>
  );
}
