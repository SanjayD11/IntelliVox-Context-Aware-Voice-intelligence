import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Footer } from '@/components/layout/Footer';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogoClick = () => {
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ripple" />
          </div>
          <p className="text-muted-foreground text-sm animate-fade-in">Loading IntelliVox...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email first. Check your inbox for a confirmation link.');
      } else if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    }

    setResetLoading(false);
  };

  if (showResetForm) {
    return (
      <div className="min-h-screen flex flex-col bg-background gradient-mesh">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="mb-8 flex items-center gap-3 animate-fade-in-up hover:opacity-80 transition-opacity cursor-pointer"
          >
            <IntelliVoxLogo size="lg" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight gradient-text">IntelliVox</h1>
              <p className="text-xs text-muted-foreground">Context-Aware Voice Intelligence</p>
            </div>
          </button>

          <Card className="w-full max-w-md glass border-border/50 shadow-2xl animate-scale-in">
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
              <CardDescription>
                {resetSent
                  ? 'Check your email for the reset link'
                  : 'Enter your email to receive a reset link'
                }
              </CardDescription>
            </CardHeader>

            {resetSent ? (
              <CardContent className="pt-4 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-success" />
                </div>
                <p className="text-muted-foreground text-sm">
                  We've sent a password reset link to <strong>{resetEmail}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResetForm(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4 pt-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="pl-10 bg-input/50 border-border/50 h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-medium btn-press"
                    disabled={resetLoading}
                  >
                    {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowResetForm(false);
                      setError(null);
                    }}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background gradient-mesh">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="mb-8 flex items-center gap-3 animate-fade-in-up hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="relative">
            <IntelliVoxLogo size="lg" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">IntelliVox</h1>
            <p className="text-xs text-muted-foreground">AI Voice Assistant</p>
          </div>
        </button>

        <Card className="w-full max-w-md glass border-border/50 shadow-2xl animate-scale-in">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue to IntelliVox
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-input/50 border-border/50 h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-input/50 border-border/50 h-12 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-medium gap-2 btn-press"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Features */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 max-w-md animate-fade-in px-4" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success" />
            Voice-powered AI
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Live conversations
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-accent" />
            Multi-language
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
