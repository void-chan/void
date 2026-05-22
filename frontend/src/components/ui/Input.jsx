/** src/components/ui/Input.jsx */
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef(function Input({ label, error, id, className, ...props }, ref) {
  return (
    <div className="field">
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <input
        ref={ref} id={id}
        className={cn('input', error && 'is-error', className)}
        {...props}
      />
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
});
