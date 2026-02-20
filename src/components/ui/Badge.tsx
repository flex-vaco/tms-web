import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        draft: 'bg-gray-100 text-gray-600',
        submitted: 'bg-blue-100 text-blue-700',
        approved: 'bg-green-100 text-brand-success',
        rejected: 'bg-red-100 text-brand-danger',
        pending: 'bg-amber-100 text-amber-700',
        active: 'bg-green-100 text-brand-success',
        inactive: 'bg-gray-100 text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'draft',
    },
  }
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant, className, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}
