import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeakingIndicatorProps {
  className?: string;
}

export function SpeakingIndicator({ className }: SpeakingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center">
        <Volume2 className="h-4 w-4 text-primary animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-primary/20 animate-ping" />
        </div>
      </div>
      
      {/* Sound wave bars */}
      <div className="flex items-center gap-0.5 h-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 bg-primary rounded-full animate-pulse"
            style={{
              height: `${Math.random() * 12 + 6}px`,
              animationDelay: `${i * 100}ms`,
              animationDuration: '0.5s',
            }}
          />
        ))}
      </div>
      
      <span className="text-xs text-primary font-medium">AI Speaking...</span>
    </div>
  );
}
