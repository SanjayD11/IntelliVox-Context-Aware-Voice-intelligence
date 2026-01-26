import { VolumeX, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceControlsProps {
  isSpeaking: boolean;
  onStop: () => void;
  className?: string;
}

export function VoiceControls({ isSpeaking, onStop, className }: VoiceControlsProps) {
  if (!isSpeaking) return null;
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Speaking animation bars */}
      <div className="flex items-end gap-0.5 h-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 bg-primary rounded-full animate-speaking-bar"
            style={{
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onStop}
        className="gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30 transition-all duration-200"
      >
        <VolumeX className="h-4 w-4" />
        Stop
      </Button>
    </div>
  );
}