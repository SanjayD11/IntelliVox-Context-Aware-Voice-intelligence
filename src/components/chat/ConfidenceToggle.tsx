import { cn } from '@/lib/utils';
import { useSettings, ConfidenceLevel } from '@/contexts/SettingsContext';

const confidenceOptions: { value: ConfidenceLevel; label: string; description: string }[] = [
    { value: 'normal', label: 'Normal', description: 'Balanced tone' },
    { value: 'confident', label: 'Confident', description: 'Direct & assertive' },
    { value: 'careful', label: 'Careful', description: 'Cautious & explicit' },
];

export function ConfidenceToggle() {
    const { confidenceLevel, setConfidenceLevel } = useSettings();

    return (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {confidenceOptions.map((option) => (
                <button
                    key={option.value}
                    onClick={() => setConfidenceLevel(option.value)}
                    title={option.description}
                    className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                        confidenceLevel === option.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
