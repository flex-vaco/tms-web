import { cn } from '../../utils/cn';

function hashColor(name: string): string {
  const colors = [
    'from-brand-primary to-brand-primary-dk',
    'from-brand-secondary to-brand-accent',
    'from-brand-success to-emerald-600',
    'from-purple-500 to-purple-700',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-teal-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const sizeClass = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size];
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white bg-gradient-to-br flex-shrink-0',
        sizeClass,
        hashColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
