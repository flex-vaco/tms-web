import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const toggleId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <label htmlFor={toggleId} className="inline-flex items-center gap-2 cursor-pointer select-none">
        <div className="relative">
          <input
            ref={ref}
            id={toggleId}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-10 h-5 rounded-full bg-gray-200 transition-colors duration-200',
              'peer-checked:bg-brand-primary',
              'peer-disabled:opacity-50',
              className
            )}
          />
          <div
            className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5"
          />
        </div>
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </label>
    );
  }
);
Toggle.displayName = 'Toggle';
