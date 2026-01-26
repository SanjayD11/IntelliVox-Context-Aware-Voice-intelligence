import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  src?: string | null;
  initials: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function ProfileAvatar({ src, initials, size = 'md', className }: ProfileAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], 'ring-2 ring-border', className)}>
      <AvatarImage src={src || undefined} alt="Profile" className="object-cover" />
      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
