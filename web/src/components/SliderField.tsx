import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface SliderFieldGradient {
  start: string;
  end: string;
  track: string;
}

interface SliderFieldProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  helper?: string;
  disabled?: boolean;
  id?: string;
  valueEditable?: boolean;
  gradient?: SliderFieldGradient;
  thumbGradient?: string;
  thumbGlow?: string;
  rightUnit?: string;
  extraInlineInfo?: ReactNode;
}

const DEFAULT_GRADIENT: SliderFieldGradient = {
  start: '#4f46e5',
  end: '#818cf8',
  track: '#2a2e3d',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function SliderField({
  label,
  leftLabel,
  rightLabel,
  value,
  min,
  max,
  step = 1,
  onChange,
  helper,
  disabled = false,
  id,
  valueEditable = true,
  gradient,
  thumbGradient,
  thumbGlow,
  rightUnit,
  extraInlineInfo,
}: SliderFieldProps) {
  const inputId = id ?? `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const valueInputId = `${inputId}-value`;

  const [editText, setEditText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isEditing = editText !== null;
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  const grad = gradient ?? DEFAULT_GRADIENT;

  const commitValue = useCallback(() => {
    if (editText === null) return;
    const parsed = parseInt(editText, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = clamp(Math.round(parsed / step) * step, min, max);
      onChange(clamped);
    }
    setEditText(null);
  }, [editText, min, max, step, onChange]);

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || /^-?\d*$/.test(raw)) {
        setEditText(raw);
      }
    },
    []
  );

  const handleValueBlur = useCallback(() => {
    commitValue();
  }, [commitValue]);

  const handleValueKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitValue();
        (e.target as HTMLInputElement).blur();
      }
    },
    [commitValue]
  );

  useEffect(() => {
    if (!isEditing) {
      setEditText(null);
    }
  }, [value, isEditing]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      onChange(v);
      if (isEditing) {
        setEditText(String(v));
      }
    },
    [onChange, isEditing]
  );

  const handleSliderPointerDown = useCallback(() => setIsDragging(true), []);
  const handleSliderPointerUp = useCallback(() => setIsDragging(false), []);
  const handleSliderPointerLeave = useCallback(() => setIsDragging(false), []);

  const valueDisplay = rightUnit ? `${value}${rightUnit}` : String(value);
  const inputValue = isEditing ? (editText ?? '') : String(value);

  return (
    <div className="slider-field">
      <div className="slider-field__header">
        <label htmlFor={inputId} className="slider-field__label">
          {label}
        </label>
        <span className="slider-field__header-right">
          {extraInlineInfo && (
            <span className="slider-field__extra">{extraInlineInfo}</span>
          )}
          {valueEditable ? (
            <span className="slider-field__value-wrap">
              <input
                id={valueInputId}
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleValueChange}
              onBlur={handleValueBlur}
              onKeyDown={handleValueKeyDown}
              disabled={disabled}
              className="slider-field__value-input"
              aria-label={`${label} value`}
              aria-describedby={inputId}
              />
              {rightUnit && (
                <span className="slider-field__value-unit" aria-hidden="true">
                  {rightUnit}
                </span>
              )}
            </span>
          ) : (
            <span className="slider-field__pill" aria-live="polite">
              {valueDisplay}
            </span>
          )}
        </span>
      </div>
      {helper && <p className="slider-field__helper">{helper}</p>}
      <div className="slider-field__rail">
        <span className="slider-field__rail-label">{leftLabel}</span>
        <div
          className="slider-field__track-wrap"
          style={
            grad
              ? ({
                  '--slider-percent': `${percent}%`,
                  '--gradient-start': grad.start,
                  '--gradient-end': grad.end,
                  '--gradient-track': grad.track,
                } as React.CSSProperties)
              : undefined
          }
        >
          {grad && <div className="slider-field__track-bg" aria-hidden="true" />}
          {(min === 0 && max === 100) && (
            <div className="slider-field__ticks" aria-hidden="true">
              {[0, 25, 50, 75, 100].map((tick) => (
                <span key={tick} className="slider-field__tick" />
              ))}
            </div>
          )}
          <span
            className={clsx('slider-field__tooltip', isDragging && 'slider-field__tooltip--visible')}
            style={{ left: `${percent}%` }}
            aria-hidden="true"
          >
            {valueDisplay}
          </span>
          <input
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            onPointerDown={handleSliderPointerDown}
            onPointerUp={handleSliderPointerUp}
            onPointerLeave={handleSliderPointerLeave}
            onPointerCancel={handleSliderPointerUp}
            disabled={disabled}
            className={clsx(
              'slider',
              disabled && 'slider--disabled',
              grad && 'slider--gradient'
            )}
            style={
              grad
                ? ({
                    ...(thumbGradient && { '--slider-thumb-grad': thumbGradient }),
                    ...(thumbGlow && { '--slider-thumb-glow': thumbGlow }),
                  } as React.CSSProperties)
                : undefined
            }
            aria-label={`${label}: ${valueDisplay}`}
          />
        </div>
        <span className="slider-field__rail-label">{rightLabel}</span>
      </div>
    </div>
  );
}
