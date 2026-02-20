import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-primary text-white hover:bg-brand-primary-dk focus-visible:ring-brand-primary',
        'outline-primary':
          'border border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary hover:text-white focus-visible:ring-brand-primary',
        success:
          'bg-brand-success text-white hover:brightness-90 focus-visible:ring-brand-success',
        danger:
          'bg-brand-danger text-white hover:brightness-90 focus-visible:ring-brand-danger',
        ghost:
          'text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400',
        secondary:
          'bg-brand-secondary text-white hover:brightness-90 focus-visible:ring-brand-secondary',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
