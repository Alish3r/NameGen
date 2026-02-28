import { useState, useCallback, useId } from 'react';
import clsx from 'clsx';

interface RowDisclosureProps {
  summary: string;
  details: string;
  summaryClassName?: string;
}

export function RowDisclosure({ summary, details, summaryClassName }: RowDisclosureProps) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const detailsId = useId();

  return (
    <div className="row-disclosure">
      <div className="row-disclosure__inline">
        <span className={clsx('row-disclosure__summary', summaryClassName)}>{summary}</span>
        <button
          type="button"
          onClick={toggle}
          className={clsx('row-disclosure__trigger', open && 'row-disclosure__trigger--open')}
          aria-expanded={open}
          aria-controls={detailsId}
        >
          {open ? 'Hide' : 'Details'}
        </button>
      </div>
      {open && (
        <p id={detailsId} className="row-disclosure__details">
          {details}
        </p>
      )}
    </div>
  );
}
