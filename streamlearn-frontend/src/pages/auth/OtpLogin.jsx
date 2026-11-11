import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell, { inputClass, buttonClass } from '../../components/auth/AuthShell';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const RESEND_SECONDS = 60;

// Sign in with a 6 digit code sent by email (no password needed)
export default function OtpLogin() {
  const navigate = useNavigate();
  const otpLogin = useAuthStore((s) => s.otpLogin);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error('Enter a valid email');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setStep('code');
      setWait(RESEND_SECONDS);
      toast.success('If the account exists, a code was sent');
    } catch {
      // the API client already showed the reason (for example "wait a minute")
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return toast.error('Enter the 6 digit code');
    setLoading(true);
    try {
      await otpLogin({ email, otp });
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch {
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in with a code"
      subtitle={
        step === 'email'
          ? 'We will email you a 6 digit code.'
          : `Enter the code we sent to ${email}. It works for a few minutes.`
      }
      footer={
        <Link to="/login" className="text-white font-semibold hover:underline">
          Use password instead
        </Link>
      }
    >
      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-5">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-5">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className={`${inputClass} text-center tracking-[0.5em] text-lg`}
          />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify and sign in'}
          </button>
          <div className="flex justify-between text-xs text-text-secondary">
            <button type="button" onClick={() => setStep('email')} className="hover:text-white">
              Change email
            </button>
            <button
              type="button"
              disabled={wait > 0 || loading}
              onClick={sendCode}
              className="hover:text-white disabled:opacity-50"
            >
              {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
