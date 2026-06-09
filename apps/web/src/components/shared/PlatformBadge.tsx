'use client';

interface PlatformBadgeProps {
  platform: string;
}

const styles: Record<string, string> = {
  AIRBNB: 'bg-pink-100 text-pink-700',
  VRBO: 'bg-blue-100 text-blue-700',
  BOOKING_COM: 'bg-indigo-100 text-indigo-700',
  DIRECT: 'bg-palm-100 text-palm-700',
};

const labels: Record<string, string> = {
  AIRBNB: 'Airbnb',
  VRBO: 'VRBO',
  BOOKING_COM: 'Booking.com',
  DIRECT: 'Direct',
};

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[platform] ?? 'bg-muted text-muted-foreground'}`}
    >
      {labels[platform] ?? platform}
    </span>
  );
}
