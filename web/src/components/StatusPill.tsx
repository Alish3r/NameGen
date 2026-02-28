import clsx from 'clsx';

type StatusVariant = 'available' | 'parked' | 'active' | 'unknown' | 'empty';

interface StatusPillProps {
  status: StatusVariant;
  title?: string;
}

const labelMap: Record<StatusVariant, string> = {
  available: 'Available',
  parked: 'Parked',
  active: 'Active',
  unknown: 'Unknown',
  empty: '—',
};

export function StatusPill({ status, title }: StatusPillProps) {
  if (status === 'empty') {
    return <span className="status-pill status-pill--empty">—</span>;
  }

  return (
    <span
      className={clsx('status-pill', `status-pill--${status}`)}
      title={title ?? labelMap[status]}
    >
      {labelMap[status]}
    </span>
  );
}
