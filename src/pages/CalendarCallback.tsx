import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function CalendarCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Google Calendar...');

  useEffect(() => {
    const exchangeCode = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was cancelled or failed');
        setTimeout(() => navigate('/schedule'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        setTimeout(() => navigate('/schedule'), 3000);
        return;
      }

      try {
        const redirectUri = localStorage.getItem('google_calendar_redirect') || `${window.location.origin}/calendar-callback`;
        
        const { error: exchangeError } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'exchange-code',
            code,
            redirectUri,
          },
        });

        if (exchangeError) {
          throw exchangeError;
        }

        localStorage.removeItem('google_calendar_redirect');
        setStatus('success');
        setMessage('Google Calendar connected successfully!');
        setTimeout(() => navigate('/schedule'), 2000);
      } catch (err) {
        console.error('Error exchanging code:', err);
        setStatus('error');
        setMessage('Failed to connect Google Calendar');
        setTimeout(() => navigate('/schedule'), 3000);
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <p className="text-lg text-success">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg text-destructive">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
