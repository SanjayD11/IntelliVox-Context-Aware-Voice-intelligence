import { useState, useCallback, useEffect } from 'react';
import { Plus, MessageSquare, Settings, Mic, LogOut, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { ChatSearch } from '@/components/chat/ChatSearch';
import { ChatCard } from '@/components/chat/ChatCard';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';
import type { Chat } from '@/hooks/useChats';

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatSidebar({
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
}: ChatSidebarProps) {
  const { signOut, user } = useAuth();
  const { profile, displayName, initials } = useProfile();
  const navigate = useNavigate();
  const [filteredChats, setFilteredChats] = useState<Chat[]>(chats);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleSearchResults = useCallback((results: Chat[]) => {
    setFilteredChats(results);
  }, []);

  useEffect(() => {
    setFilteredChats(chats);
  }, [chats]);

  const displayChats = filteredChats;

  const handleDelete = async () => {
    if (chatToDelete) {
      await onDeleteChat(chatToDelete);
      setChatToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleSignOut = async () => {
    setLogoutDialogOpen(false);
    await signOut();
    navigate('/login');
  };

  const handleConfirmDelete = (chatId: string) => {
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const handleStartRename = (chatId: string) => {
    setEditingChatId(chatId);
  };

  // Logo click ALWAYS navigates to welcome/homepage
  const handleLogoClick = () => {
    navigate('/');
  };

  if (isCollapsed && !isMobileOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 bg-sidebar-background/95 backdrop-blur-xl border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-out md:relative md:translate-x-0',
          isMobileOpen ? 'translate-x-0 animate-slide-in-left' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border/50 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
            >
              <IntelliVoxLogo size="md" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight gradient-text">
                  IntelliVox
                </h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">AI Assistant</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCloseMobile}
              className="md:hidden h-9 w-9 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Button
            onClick={onNewChat}
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl font-medium shadow-lg shadow-primary/20 btn-press"
          >
            <Plus className="h-5 w-5" />
            New Chat
          </Button>

          <ChatSearch chats={chats} onSearchResults={handleSearchResults} />
        </div>

        {/* Chat List - Using unified ChatCard component */}
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1.5">
            {displayChats.map((chat) => (
              <ChatCard
                key={chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.id}
                isEditing={editingChatId === chat.id}
                onSelect={() => {
                  onSelectChat(chat.id);
                  onCloseMobile?.();
                }}
                onStartRename={() => handleStartRename(chat.id)}
                onSaveRename={async (newTitle) => {
                  await onRenameChat(chat.id, newTitle);
                  setEditingChatId(null);
                }}
                onCancelRename={() => setEditingChatId(null)}
                onDelete={() => handleConfirmDelete(chat.id)}
              />
            ))}

            {displayChats.length === 0 && chats.length > 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No matching chats
              </div>
            )}

            {chats.length === 0 && (
              <div className="text-center py-10 px-4">
                <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  No chats yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1.5">
                  Start a new conversation!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border/50 space-y-1">
          <Link to="/voice" onClick={onCloseMobile}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 rounded-xl hover:bg-primary/10 text-foreground"
              size="sm"
            >
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Mic className="h-4 w-4 text-success" />
              </div>
              <span className="font-medium">Live-Voice Chat</span>
            </Button>
          </Link>
          <Link to="/settings" onClick={onCloseMobile}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 rounded-xl"
              size="sm"
            >
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <span>Settings</span>
            </Button>
          </Link>

          <div className="pt-3 mt-2 border-t border-sidebar-border/50">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sidebar-accent/50 transition-colors">
              <ProfileAvatar
                src={profile.avatar_url}
                initials={initials}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
              size="sm"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout confirmation dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="rounded-2xl animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
