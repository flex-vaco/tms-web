import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary',
              'disabled:opacity-50 disabled:bg-gray-50',
              icon && 'pl-10',
              error && 'border-brand-danger focus:ring-brand-danger/30',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-brand-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
