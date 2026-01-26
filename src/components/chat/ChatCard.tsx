import { MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { EditableChatTitle } from '@/components/chat/EditableChatTitle';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import type { Chat } from '@/hooks/useChats';

interface ChatCardProps {
  chat: Chat;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onSaveRename: (newTitle: string) => Promise<void>;
  onCancelRename: () => void;
  onDelete: () => void;
}

export function ChatCard({
  chat,
  isSelected,
  isEditing,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
}: ChatCardProps) {
  return (
    <div
      className={cn(
        // Fixed height card - strict 3-section structure
        'relative flex items-center gap-3 h-[68px] px-3 rounded-xl transition-all duration-200',
        'border border-transparent',
        isSelected
          ? 'bg-sidebar-accent border-primary/20 shadow-sm'
          : 'hover:bg-sidebar-accent/50 hover:border-border/50'
      )}
    >
      {/* LEFT: Chat icon (fixed width) */}
      <div className={cn(
        'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
        isSelected 
          ? 'bg-primary/20 text-primary' 
          : 'bg-muted text-muted-foreground'
      )}>
        <MessageSquare className="h-4 w-4" />
      </div>
      
      {/* MIDDLE: Chat content (flexible, truncates) - Click area for selection */}
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 text-left py-1.5 overflow-hidden"
      >
        {isEditing ? (
          <EditableChatTitle
            title={chat.title}
            isSelected={isSelected}
            isEditing={true}
            onSave={onSaveRename}
            onCancelEdit={onCancelRename}
          />
        ) : (
          <div className="pr-1">
            {/* 2-line clamped title */}
            <p className={cn(
              'text-sm font-medium leading-snug line-clamp-2 break-words',
              isSelected 
                ? 'text-foreground' 
                : 'text-foreground/80'
            )}>
              {chat.title}
            </p>
            {/* Timestamp */}
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {formatRelativeTime(chat.created_at)}
            </p>
          </div>
        )}
      </button>
      
      {/* RIGHT: 3-dots menu (fixed width, always visible, anchored right) */}
      <div className="shrink-0 flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                // Always visible - never hidden
                'opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="bottom"
            sideOffset={4}
            className="w-44 z-[100] bg-popover border border-border shadow-xl rounded-xl"
          >
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onStartRename();
              }}
              className="gap-2.5 cursor-pointer rounded-lg mx-1 my-0.5"
            >
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg mx-1 my-0.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
