import type { ReactNode } from 'react';
import clsx from 'clsx';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
  'aria-label'?: string;
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  className = '',
  'aria-label': ariaLabel,
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx('btn', `btn--${variant}`, loading && 'btn--loading', className)}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
