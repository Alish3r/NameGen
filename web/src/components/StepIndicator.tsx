import clsx from 'clsx';

type Step = 'generate' | 'shortlist' | 'check' | 'export';

interface StepIndicatorProps {
  hasResults: boolean;
  hasProbed: boolean;
  hasShortlist: boolean;
}

const steps: { id: Step; label: string }[] = [
  { id: 'generate', label: 'Generate' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'check', label: 'Check availability' },
  { id: 'export', label: 'Export' },
];

export function StepIndicator({ hasResults, hasProbed, hasShortlist }: StepIndicatorProps) {
  const getActiveStep = (): Step => {
    if (!hasResults) return 'generate';
    if (!hasProbed) return 'shortlist';
    if (hasShortlist) return 'export';
    return 'check';
  };

  const activeStep = getActiveStep();

  return (
    <div className="step-indicator" role="status" aria-label={`Current step: ${activeStep}`}>
      {steps.map((step, i) => (
        <span key={step.id} className="step-indicator__step-wrap">
          <span
            className={clsx(
              'step-indicator__step',
              activeStep === step.id && 'step-indicator__step--active'
            )}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="step-indicator__sep" aria-hidden="true"> → </span>}
        </span>
      ))}
    </div>
  );
}
