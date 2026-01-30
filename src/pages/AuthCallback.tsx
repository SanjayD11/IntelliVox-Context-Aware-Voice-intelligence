import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verifying your account...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (msg: string) => {
    console.log('[AuthCallback]', msg);
    setDebugInfo(prev => [...prev, msg]);
  };

  useEffect(() => {
    const handleCallback = async () => {
      // Get parameters from URL
      const type = searchParams.get('type');
      const tokenHash = searchParams.get('token_hash');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Also check hash fragment (Supabase sometimes uses this)
      const hashParams = new URLSearchParams(location.hash.replace('#', ''));
      const hashType = hashParams.get('type');
      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      const hashError = hashParams.get('error');

      addDebug(`URL params - type: ${type}, tokenHash: ${tokenHash ? 'present' : 'missing'}`);
      addDebug(`Hash params - type: ${hashType}, accessToken: ${hashAccessToken ? 'present' : 'missing'}`);
      addDebug(`Full URL: ${window.location.href}`);

      // Check for error in URL
      if (errorParam || hashError) {
        const errMsg = errorDescription || hashParams.get('error_description') || 'An error occurred';
        addDebug(`Error in URL: ${errMsg}`);
        setError(errMsg);
        setStatus('Authentication failed');
        return;
      }

      // CASE 1: Token hash verification (PKCE flow from email templates)
      if (tokenHash) {
        const verifyType = type === 'recovery' ? 'recovery' : 'email';
        addDebug(`Verifying token_hash with type: ${verifyType}`);
        setStatus(type === 'recovery' ? 'Verifying password reset link...' : 'Confirming your email...');

        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: verifyType as 'recovery' | 'email',
          });

          addDebug(`verifyOtp result - session: ${data?.session ? 'present' : 'null'}, error: ${verifyError?.message || 'none'}`);

          if (verifyError) {
            setError(`Verification failed: ${verifyError.message}`);
            setStatus('Link expired or invalid');
            return;
          }

          if (data?.session) {
            if (type === 'recovery') {
              addDebug('Recovery verified, redirecting to /update-password');
              setStatus('Verified! Redirecting...');
              navigate('/update-password', { replace: true });
            } else {
              addDebug('Email verified, redirecting to /chat');
              setStatus('Email confirmed! Signing you in...');
              navigate('/chat', { replace: true });
            }
            return;
          }
        } catch (err) {
          addDebug(`verifyOtp exception: ${err}`);
          setError('Verification failed. Please try again.');
          return;
        }
      }

      // CASE 2: Access token in hash fragment (implicit flow)
      if (hashAccessToken && hashRefreshToken) {
        addDebug('Found tokens in hash, setting session...');
        setStatus('Completing authentication...');

        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          addDebug(`setSession result - user: ${data?.user ? 'present' : 'null'}, error: ${sessionError?.message || 'none'}`);

          if (sessionError) {
            setError(`Failed to set session: ${sessionError.message}`);
            return;
          }

          if (data?.session) {
            if (hashType === 'recovery') {
              addDebug('Recovery session set, redirecting to /update-password');
              navigate('/update-password', { replace: true });
            } else {
              addDebug('Session set, redirecting to /chat');
              navigate('/chat', { replace: true });
            }
            return;
          }
        } catch (err) {
          addDebug(`setSession exception: ${err}`);
          setError('Failed to complete authentication');
          return;
        }
      }

      // CASE 3: Check for existing session (OAuth callbacks, already authenticated)
      addDebug('Checking for existing session...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Supabase to process

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      addDebug(`getSession result - session: ${session ? 'present' : 'null'}, error: ${sessionError?.message || 'none'}`);

      if (sessionError) {
        setError(`Session error: ${sessionError.message}`);
        return;
      }

      if (session) {
        // Check if this might be a recovery flow
        const isRecovery = type === 'recovery' || hashType === 'recovery' ||
          location.hash.includes('type=recovery') ||
          location.search.includes('type=recovery');

        if (isRecovery) {
          addDebug('Recovery detected with session, redirecting to /update-password');
          navigate('/update-password', { replace: true });
        } else {
          addDebug('Session found, redirecting to /chat');
          navigate('/chat', { replace: true });
        }
        return;
      }

      // No session found and no tokens - redirect to login
      addDebug('No session or tokens found, redirecting to /login');
      setStatus('No valid authentication found');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    };

    handleCallback();
  }, [navigate, searchParams, location]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

        <div className="relative z-10 flex flex-col items-center gap-4 max-w-md text-center">
          <div className="h-12 w-12 rounded-xl bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Authentication Error</h2>
          <p className="text-muted-foreground">{error}</p>

          {/* Debug info in development */}
          {debugInfo.length > 0 && (
            <details className="mt-4 text-left w-full">
              <summary className="cursor-pointer text-sm text-muted-foreground">Debug Info</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                {debugInfo.join('\n')}
              </pre>
            </details>
          )}

          <Button onClick={() => navigate('/login', { replace: true })} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <Mic className="h-6 w-6 text-primary-foreground" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground">{status}</p>

        {/* Debug info in development */}
        {debugInfo.length > 0 && (
          <details className="mt-4 text-left max-w-md">
            <summary className="cursor-pointer text-sm text-muted-foreground">Debug Info</summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
              {debugInfo.join('\n')}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
