'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'booking' | 'property';
}

const bookingStyles: Record<string, string> = {
  INQUIRY: 'badge-info',
  CONFIRMED: 'badge-success',
  ACTIVE: 'badge-success',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'badge-danger',
  NO_SHOW: 'badge-warning',
};

const bookingLabels: Record<string, string> = {
  INQUIRY: 'Inquiry',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

const propertyStyles: Record<string, string> = {
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-warning',
  UNDER_RENOVATION: 'badge-info',
  SOLD: 'badge-danger',
};

const propertyLabels: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  UNDER_RENOVATION: 'Renovating',
  SOLD: 'Sold',
};

export function StatusBadge({ status, variant = 'booking' }: StatusBadgeProps) {
  const styles = variant === 'property' ? propertyStyles : bookingStyles;
  const labels = variant === 'property' ? propertyLabels : bookingLabels;

  return (
    <span className={`badge ${styles[status] ?? 'badge-info'}`}>
      {labels[status] ?? status}
    </span>
  );
}
