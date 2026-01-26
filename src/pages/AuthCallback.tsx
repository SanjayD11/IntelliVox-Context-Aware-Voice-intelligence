import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const type = searchParams.get('type');
      const tokenHash = searchParams.get('token_hash');

      // Handle password recovery with token_hash
      if (type === 'recovery' && tokenHash) {
        try {
          // Verify the OTP token to establish a session
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error) {
            console.error('Recovery verification error:', error);
            navigate('/login');
            return;
          }

          if (data.session) {
            // Successfully verified, redirect to update password
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
      if (type === 'signup' && tokenHash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          });

          if (error) {
            console.error('Signup verification error:', error);
            navigate('/login');
            return;
          }

          if (data.session) {
            // Successfully verified and signed in, redirect to chat
            navigate('/chat');
            return;
          }
        } catch (err) {
          console.error('Signup verification error:', err);
          navigate('/login');
          return;
        }
      }

      // Fallback: Check for existing session (e.g., OAuth callbacks)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
        return;
      }

      if (session) {
        // User is authenticated, redirect to app
        navigate('/chat');
      } else {
        // No session, redirect to login
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
        <p className="text-muted-foreground">Verifying your account...</p>
      </div>
    </div>
  );
}
