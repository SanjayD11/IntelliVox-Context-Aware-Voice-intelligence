import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
          <p className="text-muted-foreground text-sm animate-fade-in">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Check for stored redirect destination (e.g., from suggestion clicks on home page)
    const storedRedirect = sessionStorage.getItem('intellivox_redirect_to');
    if (storedRedirect) {
      sessionStorage.removeItem('intellivox_redirect_to');
      return <Navigate to={storedRedirect} replace />;
    }
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { error, needsConfirmation } = await signUp(email, password);

    if (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    if (needsConfirmation) {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
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
            <CardContent className="pt-8 text-center">
              <div className="mb-6 flex justify-center animate-fade-in-up">
                <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center glow-success">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                We've sent a verification link to{' '}
                <strong className="text-foreground">{email}</strong>.
                <br />Click the link in your email to verify your account.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full h-12 rounded-xl font-medium">
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
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
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Get started with IntelliVox today
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
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
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
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Features */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 max-w-md animate-fade-in px-4" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success" />
            Free to use
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            No credit card
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-accent" />
            Instant access
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
