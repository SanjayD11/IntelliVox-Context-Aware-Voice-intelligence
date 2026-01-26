import { cn } from '@/lib/utils';

interface IntelliVoxLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const iconSizes = {
  sm: 16,
  md: 22,
  lg: 28,
  xl: 40,
};

export function IntelliVoxLogo({ size = 'md', className, showGlow = true }: IntelliVoxLogoProps) {
  const iconSize = iconSizes[size];
  
  return (
    <div 
      className={cn(
        'rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center relative overflow-hidden',
        sizeClasses[size],
        showGlow && 'glow-primary',
        className
      )}
    >
      {/* Abstract AI + Voice Logo */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* Central orb representing AI core */}
        <circle 
          cx="20" 
          cy="20" 
          r="8" 
          className="fill-primary"
        />
        
        {/* Inner glow ring */}
        <circle 
          cx="20" 
          cy="20" 
          r="5" 
          className="fill-primary-foreground/20"
        />
        
        {/* Sound wave arcs - left */}
        <path 
          d="M10 14C7.5 16.5 7.5 23.5 10 26" 
          className="stroke-primary" 
          strokeWidth="2" 
          strokeLinecap="round"
          fill="none"
        />
        <path 
          d="M6 10C2 15 2 25 6 30" 
          className="stroke-primary/60" 
          strokeWidth="2" 
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Sound wave arcs - right */}
        <path 
          d="M30 14C32.5 16.5 32.5 23.5 30 26" 
          className="stroke-primary" 
          strokeWidth="2" 
          strokeLinecap="round"
          fill="none"
        />
        <path 
          d="M34 10C38 15 38 25 34 30" 
          className="stroke-primary/60" 
          strokeWidth="2" 
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Top neural connection */}
        <circle cx="20" cy="6" r="2" className="fill-primary/70" />
        <line x1="20" y1="8" x2="20" y2="12" className="stroke-primary/50" strokeWidth="1.5" />
        
        {/* Bottom neural connection */}
        <circle cx="20" cy="34" r="2" className="fill-primary/70" />
        <line x1="20" y1="28" x2="20" y2="32" className="stroke-primary/50" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
