import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RetryButtonProps {
    onRetry: () => void;
    disabled?: boolean;
    className?: string;
}

export function RetryButton({ onRetry, disabled, className }: RetryButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    disabled={disabled}
                    className={cn(
                        'gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-200',
                        'hover:bg-muted/50',
                        className
                    )}
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                Regenerate response with same context
            </TooltipContent>
        </Tooltip>
    );
}
