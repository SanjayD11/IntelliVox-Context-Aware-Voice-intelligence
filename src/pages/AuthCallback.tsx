import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const hasProcessed = useRef(false);

  const addDebug = (msg: string) => {
    const logMsg = `[AuthCallback] ${msg}`;
    console.log(logMsg);
    setDebugInfo(prev => [...prev, msg]);
  };

  // Log immediately on mount
  useEffect(() => {
    addDebug('Component mounted');
    addDebug(`Full URL: ${window.location.href}`);
    addDebug(`Pathname: ${location.pathname}`);
    addDebug(`Search: ${location.search}`);
    addDebug(`Hash: ${location.hash}`);
  }, []);

  useEffect(() => {
    // Prevent double processing
    if (hasProcessed.current) {
      addDebug('Already processed, skipping');
      return;
    }
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get parameters from URL query string
        const type = searchParams.get('type');
        const tokenHash = searchParams.get('token_hash');

        addDebug(`type: ${type || 'null'}`);
        addDebug(`token_hash: ${tokenHash ? `present (${tokenHash.substring(0, 10)}...)` : 'null'}`);

        // CASE 1: Password Recovery with token_hash
        if (type === 'recovery' && tokenHash) {
          setStatus('Verifying password reset link...');
          addDebug('Starting recovery verification...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (verifyError) {
            addDebug(`Recovery verification FAILED: ${verifyError.message}`);
            setError(`Password reset link is invalid or expired: ${verifyError.message}`);
            return;
          }

          if (data?.session) {
            addDebug('Recovery verification SUCCESS! Redirecting to /update-password');
            setStatus('Verified! Redirecting to password update...');
            setSuccess(true);
            // Small delay to show success state
            await new Promise(r => setTimeout(r, 500));
            window.location.replace('/update-password');
            return;
          } else {
            addDebug('Recovery verification returned no session');
            setError('Verification succeeded but no session was created. Please try again.');
            return;
          }
        }

        // CASE 2: Email Confirmation (signup) with token_hash
        if ((type === 'signup' || type === 'email') && tokenHash) {
          setStatus('Confirming your email...');
          addDebug('Starting email verification...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          });

          if (verifyError) {
            addDebug(`Email verification FAILED: ${verifyError.message}`);
            setError(`Email confirmation link is invalid or expired: ${verifyError.message}`);
            return;
          }

          if (data?.session) {
            addDebug('Email verification SUCCESS! Redirecting to /chat');
            setStatus('Email confirmed! Signing you in...');
            setSuccess(true);
            await new Promise(r => setTimeout(r, 500));
            window.location.replace('/chat');
            return;
          } else {
            addDebug('Email verification returned no session');
            setError('Verification succeeded but no session was created. Please try again.');
            return;
          }
        }

        // CASE 3: Token hash without type - try email verification
        if (tokenHash && !type) {
          setStatus('Verifying link...');
          addDebug('No type specified, trying email verification...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          });

          if (!verifyError && data?.session) {
            addDebug('Email verification SUCCESS! Redirecting to /chat');
            setSuccess(true);
            await new Promise(r => setTimeout(r, 500));
            window.location.replace('/chat');
            return;
          }

          addDebug(`Fallback verification failed: ${verifyError?.message || 'no session'}`);
        }

        // CASE 4: No token_hash - check for hash fragment (old Supabase format)
        if (location.hash && location.hash.includes('access_token')) {
          addDebug('Found tokens in hash fragment, waiting for Supabase to process...');
          setStatus('Processing authentication...');

          // Wait for Supabase client to process the hash
          await new Promise(r => setTimeout(r, 2000));

          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const hashType = new URLSearchParams(location.hash.replace('#', '')).get('type');
            if (hashType === 'recovery') {
              addDebug('Hash recovery detected, redirecting to /update-password');
              window.location.replace('/update-password');
            } else {
              addDebug('Hash auth detected, redirecting to /chat');
              window.location.replace('/chat');
            }
            return;
          }
        }

        // CASE 5: No valid parameters - show error
        addDebug('No valid authentication parameters found');
        setError('Invalid or missing authentication link. Please request a new one.');

      } catch (err) {
        addDebug(`Unexpected error: ${err}`);
        setError(`An unexpected error occurred: ${err}`);
      }
    };

    // Start processing
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
          <h2 className="text-xl font-semibold text-foreground">Authentication Error</h2>
          <p className="text-muted-foreground text-sm">{error}</p>

          {/* Debug info */}
          <details className="mt-4 text-left w-full bg-muted/50 rounded-lg p-2">
            <summary className="cursor-pointer text-sm text-muted-foreground font-medium">
              Debug Information (click to expand)
            </summary>
            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap">
              {debugInfo.join('\n')}
            </pre>
          </details>

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

      <div className="relative z-10 flex flex-col items-center gap-4 max-w-md p-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <Mic className="h-8 w-8 text-primary-foreground" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground text-center">{status}</p>

        {/* Always show debug info for troubleshooting */}
        <details className="mt-6 text-left w-full bg-muted/30 rounded-lg p-2" open>
          <summary className="cursor-pointer text-sm text-muted-foreground font-medium">
            Debug Information
          </summary>
          <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap">
            {debugInfo.length > 0 ? debugInfo.join('\n') : 'Initializing...'}
          </pre>
        </details>
      </div>
    </div>
  );
}
