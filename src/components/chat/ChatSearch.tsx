import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Chat } from '@/hooks/useChats';

interface ChatSearchProps {
  chats: Chat[];
  onSearchResults: (filteredChats: Chat[]) => void;
  className?: string;
}

export function ChatSearch({ chats, onSearchResults, className }: ChatSearchProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredChats = useMemo(() => {
    if (!query.trim()) return chats;
    
    const searchTerm = query.toLowerCase().trim();
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(searchTerm)
    );
  }, [chats, query]);

  useEffect(() => {
    onSearchResults(filteredChats);
  }, [filteredChats, onSearchResults]);

  const handleClear = () => {
    setQuery('');
    setIsExpanded(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'flex items-center gap-2 transition-all duration-200',
        isExpanded ? 'w-full' : 'w-auto'
      )}>
        {isExpanded ? (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-9 pr-9 h-9 bg-sidebar-accent/50 border-sidebar-border"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setIsExpanded(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        
        {isExpanded && !query && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setIsExpanded(false)}
          >
            Cancel
          </Button>
        )}
      </div>
      
      {isExpanded && query && filteredChats.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-sidebar-accent rounded-lg text-sm text-muted-foreground text-center">
          No chats found
        </div>
      )}
    </div>
  );
}
