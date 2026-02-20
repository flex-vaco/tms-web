import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const statCardVariants = cva('rounded-xl p-5 shadow-card', {
  variants: {
    variant: {
      primary: 'bg-gradient-to-br from-brand-primary to-brand-primary-dk text-white',
      secondary: 'bg-gradient-to-br from-brand-secondary to-brand-accent text-white',
      success: 'bg-gradient-to-br from-brand-success to-emerald-600 text-white',
      neutral: 'bg-white text-gray-800 border border-gray-200',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, variant, className }: StatCardProps) {
  const isColored = variant && variant !== 'neutral';
  return (
    <div className={cn(statCardVariants({ variant }), className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-medium uppercase tracking-wide', isColored ? 'text-white/70' : 'text-gray-500')}>
            {title}
          </p>
          <p className={cn('mt-1 text-3xl font-bold font-mono', isColored ? 'text-white' : 'text-gray-800')}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('mt-1 text-xs', isColored ? 'text-white/60' : 'text-gray-400')}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('text-2xl ml-3', isColored ? 'text-white/60' : 'text-gray-300')}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
