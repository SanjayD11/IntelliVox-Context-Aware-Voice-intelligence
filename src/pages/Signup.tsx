import { useState, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Mail, Lock, ArrowRight, Sparkles, User, Check, X } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';
import { cn } from '@/lib/utils';

// Password validation requirements
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'number', label: 'One number (0-9)', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (pw: string) => /[!@#$%^&*]/.test(pw) },
];

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogoClick = () => {
    navigate('/');
  };

  // Password strength validation
  const passwordValidation = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      passed: req.test(password),
    }));
  }, [password]);

  const allRequirementsPassed = passwordValidation.every(req => req.passed);
  const passedCount = passwordValidation.filter(req => req.passed).length;

  // Calculate strength level for visual indicator
  const strengthLevel = useMemo(() => {
    if (passedCount <= 1) return 'weak';
    if (passedCount <= 3) return 'medium';
    if (passedCount <= 4) return 'good';
    return 'strong';
  }, [passedCount]);

  const strengthColors = {
    weak: 'bg-destructive',
    medium: 'bg-warning',
    good: 'bg-primary',
    strong: 'bg-success',
  };

  const strengthLabels = {
    weak: 'Weak',
    medium: 'Medium',
    good: 'Good',
    strong: 'Strong',
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

    // Validate full name
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Check all password requirements
    if (!allRequirementsPassed) {
      setError('Please meet all password requirements.');
      return;
    }

    setLoading(true);

    // Split full name into first and last name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error, needsConfirmation } = await signUp(email, password, firstName, lastName);

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

              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-10 bg-input/50 border-border/50 h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Email Field */}
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

              {/* Password Field */}
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

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-3 pt-2 animate-fade-in">
                    {/* Strength Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength</span>
                        <span className={cn(
                          "font-medium",
                          strengthLevel === 'weak' && "text-destructive",
                          strengthLevel === 'medium' && "text-warning",
                          strengthLevel === 'good' && "text-primary",
                          strengthLevel === 'strong' && "text-success"
                        )}>
                          {strengthLabels[strengthLevel]}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300 rounded-full",
                            strengthColors[strengthLevel]
                          )}
                          style={{ width: `${(passedCount / PASSWORD_REQUIREMENTS.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-1 gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/30">
                      {passwordValidation.map((req) => (
                        <div
                          key={req.id}
                          className={cn(
                            "flex items-center gap-2 text-xs transition-colors",
                            req.passed ? "text-success" : "text-muted-foreground"
                          )}
                        >
                          {req.passed ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                          )}
                          <span>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
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
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive animate-fade-in flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && password.length > 0 && (
                  <p className="text-xs text-success animate-fade-in flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-medium gap-2 btn-press"
                disabled={loading || !allRequirementsPassed || password !== confirmPassword || !fullName.trim()}
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
