import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import Loader from '../../components/common/Loader';

// The backend redirects here after Google sign-in with a one-time ?code=...
// We swap it for a real session (the code is single-use and expires in 60 seconds).
export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const started = useRef(false); // React StrictMode runs effects twice in dev; the code works once

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get('code');
    if (!code) {
      navigate('/login?error=google_failed', { replace: true });
      return;
    }
    googleLogin(code)
      .then(() => {
        toast.success('Welcome!');
        navigate('/', { replace: true });
      })
      .catch(() => navigate('/login?error=google_failed', { replace: true }));
  }, [googleLogin, navigate, searchParams]);

  return <Loader fullScreen />;
}
