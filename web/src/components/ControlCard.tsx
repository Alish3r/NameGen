import type { ReactNode } from 'react';

interface ControlCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function ControlCard({ title, children, className = '', action }: ControlCardProps) {
  return (
    <div className={`control-card ${className}`}>
      <div className="control-card__header">
        <h2 className="control-card__title">{title}</h2>
        {action && <div className="control-card__action">{action}</div>}
      </div>
      <div className="control-card__content">{children}</div>
    </div>
  );
}
