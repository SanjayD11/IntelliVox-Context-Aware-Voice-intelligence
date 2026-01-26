import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Mic, Newspaper, Lightbulb, Calendar, MessageCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';

const SUGGESTION_PROMPTS = [
  {
    icon: Newspaper,
    label: "Summarize today's top tech news",
    prompt: "Summarize today's top tech news for me. Give me the key headlines and insights.",
  },
  {
    icon: Lightbulb,
    label: "Give me a quick productivity tip",
    prompt: "Give me a quick productivity tip that I can use right now to be more effective.",
  },
  {
    icon: Calendar,
    label: "Help me plan my day",
    prompt: "Help me plan my day. Ask me about my priorities and help me organize my schedule.",
  },
  {
    icon: MessageCircle,
    label: "Start a smart conversation",
    prompt: "Let's have a smart conversation. Surprise me with an interesting topic to discuss.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Landing page is always accessible - no auto-redirect for logged-in users

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleSuggestionClick = (prompt: string) => {
    // Store the prompt in sessionStorage so voice page can pick it up
    sessionStorage.setItem('intellivox_initial_prompt', prompt);
    // Navigate directly to voice mode (or login if not authenticated)
    if (user) {
      navigate('/voice');
    } else {
      // Will redirect to voice after login
      sessionStorage.setItem('intellivox_redirect_to', '/voice');
      navigate('/login');
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />

      {/* Animated gradient orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-breathing pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-breathing pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:p-6 lg:p-8">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <IntelliVoxLogo size="md" />
            <span className="text-xl font-bold tracking-tight">IntelliVox</span>
          </button>
          {user ? (
            <Button
              variant="default"
              onClick={() => navigate('/chat')}
              className="font-medium"
            >
              Go to Chat
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Button>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 pb-8">
          <div className="max-w-3xl w-full text-center space-y-6 md:space-y-8">
            {/* Hero */}
            <div className="space-y-4 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Context-Aware Voice Intelligence
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Your Intelligent
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  Voice Companion
                </span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Experience seamless conversations with an AI that listens, understands, and responds naturally.
                Tap a suggestion to start a live voice conversation.
              </p>
            </div>

            {/* CTA Button */}
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-semibold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 group"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Suggestion Prompts - Voice Mode */}
            <div className="pt-6 md:pt-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Mic className="h-4 w-4 text-success" />
                <p className="text-sm text-muted-foreground">Tap to start a voice conversation...</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {SUGGESTION_PROMPTS.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion.prompt)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`
                        group flex items-center gap-3 p-4 rounded-xl text-left
                        bg-card/50 border border-border/50 backdrop-blur-sm
                        hover:bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                        transition-all duration-300 ease-out
                        ${hoveredIndex === index ? 'scale-[1.02]' : ''}
                      `}
                    >
                      <div className={`
                        h-10 w-10 rounded-lg flex items-center justify-center shrink-0
                        bg-primary/10 text-primary
                        group-hover:bg-primary group-hover:text-primary-foreground
                        transition-all duration-300
                      `}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                        {suggestion.label}
                      </span>
                      <Mic className="h-4 w-4 ml-auto shrink-0 text-muted-foreground/0 group-hover:text-success transition-all duration-300" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Footer - fixed at bottom on mobile */}
        <Footer />
      </div>
    </div>
  );
}
