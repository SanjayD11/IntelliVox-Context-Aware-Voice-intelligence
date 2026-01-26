import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full py-4 px-4 md:px-6 border-t border-border/30 bg-background/80 backdrop-blur-sm mt-auto shrink-0">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>IntelliVox © 2026</span>
        <span className="mx-1">|</span>
        <span className="flex items-center gap-1">
          Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> by Sanjay Dharmarajou
        </span>
      </div>
    </footer>
  );
}
