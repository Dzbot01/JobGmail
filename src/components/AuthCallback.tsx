import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; //../ karena dari components ke supabase.ts

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href)
     .then(() => {
        navigate('/dashboard', { replace: true });
      })
     .catch(() => {
        navigate('/', { replace: true });
      });
  }, [navigate]);

  return <div className="min-h-screen flex items-center justify-center">Sebentar ya...</div>
}