import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [status, setStatus] = useState('Verifying your account...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        const type = searchParams.get('type');
        const tokenHash = searchParams.get('token_hash');

        // Password Recovery with token_hash
        if (type === 'recovery' && tokenHash) {
          setStatus('Verifying password reset link...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (verifyError) {
            setError('This password reset link has expired or is invalid. Please request a new one.');
            return;
          }

          if (data?.session) {
            setStatus('Verified! Redirecting...');
            setSuccess(true);
            await new Promise(r => setTimeout(r, 500));
            window.location.replace('/update-password');
            return;
          } else {
            setError('Verification failed. Please request a new password reset link.');
            return;
          }
        }

        // Email Confirmation (signup) with token_hash
        if ((type === 'signup' || type === 'email') && tokenHash) {
          setStatus('Confirming your email...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          });

          if (verifyError) {
            setError('This confirmation link has expired or is invalid. Please sign up again.');
            return;
          }

          if (data?.session) {
            setStatus('Email confirmed! Signing you in...');
            setSuccess(true);
            await new Promise(r => setTimeout(r, 500));
            window.location.replace('/chat');
            return;
          } else {
            setError('Verification failed. Please try signing up again.');
            return;
          }
        }

        // Token hash without type - try email verification
        if (tokenHash && !type) {
          setStatus('Verifying...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          });

          if (!verifyError && data?.session) {
            setSuccess(true);
            await new Promise(r => setTimeout(r, 500));
            window.location.replace('/chat');
            return;
          }
        }

        // Check for hash fragment (old Supabase format)
        if (location.hash && location.hash.includes('access_token')) {
          setStatus('Processing authentication...');
          await new Promise(r => setTimeout(r, 2000));

          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const hashType = new URLSearchParams(location.hash.replace('#', '')).get('type');
            if (hashType === 'recovery') {
              window.location.replace('/update-password');
            } else {
              window.location.replace('/chat');
            }
            return;
          }
        }

        // No valid parameters
        setError('Invalid or expired link. Please request a new one.');

      } catch {
        setError('An unexpected error occurred. Please try again.');
      }
    };

    processAuth();
  }, [searchParams, location]);

  const goToLogin = () => {
    window.location.replace('/login');
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="fixed inset-0 bg-gradient-to-br from-destructive/5 via-background to-accent/5" />

        <div className="relative z-10 flex flex-col items-center gap-4 max-w-md text-center">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Link Expired</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={goToLogin} className="mt-4 w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <p className="text-foreground font-medium">{status}</p>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <Mic className="h-8 w-8 text-primary-foreground" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
