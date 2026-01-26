import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verifying your account...');

  useEffect(() => {
    const handleCallback = async () => {
      const type = searchParams.get('type');
      const tokenHash = searchParams.get('token_hash');

      console.log('AuthCallback - type:', type, 'tokenHash:', tokenHash ? 'present' : 'missing');

      // Handle password recovery with token_hash
      if (type === 'recovery' && tokenHash) {
        setStatus('Verifying password reset link...');
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          console.log('Recovery verification result:', { data, error });

          if (error) {
            console.error('Recovery verification error:', error.message);
            setStatus('Reset link expired or invalid. Redirecting...');
            setTimeout(() => navigate('/login'), 1500);
            return;
          }

          if (data.session) {
            setStatus('Verified! Redirecting to password update...');
            navigate('/update-password');
            return;
          }
        } catch (err) {
          console.error('Recovery error:', err);
          navigate('/login');
          return;
        }
      }

      // Handle email confirmation (signup) with token_hash
      // Note: 'signup' type is deprecated, use 'email' for email confirmation
      if ((type === 'signup' || type === 'email') && tokenHash) {
        setStatus('Confirming your email...');
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email', // Use 'email' type for signup confirmation
          });

          console.log('Email verification result:', { data, error });

          if (error) {
            console.error('Email verification error:', error.message);
            setStatus('Confirmation link expired or invalid. Redirecting...');
            setTimeout(() => navigate('/login'), 1500);
            return;
          }

          if (data.session) {
            setStatus('Email confirmed! Signing you in...');
            navigate('/chat');
            return;
          }
        } catch (err) {
          console.error('Signup verification error:', err);
          navigate('/login');
          return;
        }
      }

      // If we have a token_hash but no recognized type, try email type as fallback
      if (tokenHash && !type) {
        setStatus('Verifying...');
        try {
          // Try email verification first
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          });

          if (!error && data.session) {
            navigate('/chat');
            return;
          }
        } catch (err) {
          console.error('Fallback verification error:', err);
        }
      }

      // Fallback: Check for existing session (e.g., OAuth callbacks or hash fragments)
      // Wait a moment for Supabase to process any hash fragments
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        navigate('/login');
        return;
      }

      if (session) {
        // Check if this is a recovery session
        const urlHash = window.location.hash;
        if (urlHash.includes('type=recovery')) {
          navigate('/update-password');
        } else {
          navigate('/chat');
        }
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

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
      </div>
    </div>
  );
}
