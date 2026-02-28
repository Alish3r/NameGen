import clsx from 'clsx';

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  id,
  disabled = false,
}: ToggleFieldProps) {
  const toggleId = id ?? `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <label
      htmlFor={toggleId}
      className={clsx(
        'toggle-field',
        disabled && 'toggle-field--disabled'
      )}
    >
      <input
        id={toggleId}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="toggle-field__input"
        aria-label={label}
        aria-describedby={`${toggleId}-desc`}
      />
      <span className="toggle-field__switch" aria-hidden="true" />
      <div className="toggle-field__content">
        <span className="toggle-field__label">{label}</span>
        <span id={`${toggleId}-desc`} className="toggle-field__desc">
          {description}
        </span>
      </div>
      <span className="toggle-field__pill" aria-hidden="true">
        {checked ? 'On' : 'Off'}
      </span>
    </label>
  );
}
