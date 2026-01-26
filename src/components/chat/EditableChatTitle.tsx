import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditableChatTitleProps {
  title: string;
  isSelected: boolean;
  isEditing: boolean;
  onSave: (newTitle: string) => Promise<void>;
  onCancelEdit: () => void;
  className?: string;
}

export function EditableChatTitle({ 
  title, 
  isSelected, 
  isEditing,
  onSave,
  onCancelEdit,
  className 
}: EditableChatTitleProps) {
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  const handleSave = async () => {
    const newTitle = editValue.trim();
    if (!newTitle || newTitle === title) {
      setEditValue(title);
      onCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(newTitle);
    } catch (error) {
      console.error('Failed to save title:', error);
      setEditValue(title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(title);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.slice(0, 20))}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          maxLength={20}
          className="h-7 text-sm px-2 py-1 bg-sidebar-accent border-primary flex-1 min-w-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-3 w-3 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 min-w-0 overflow-hidden', className)}>
      <span className="block truncate text-sm" title={title}>{title}</span>
    </div>
  );
}
