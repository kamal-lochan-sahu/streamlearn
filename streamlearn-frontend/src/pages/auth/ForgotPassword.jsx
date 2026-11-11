import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell, { inputClass, buttonClass } from '../../components/auth/AuthShell';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error('Enter a valid email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true); // same message whether or not the account exists
    } catch {
      // the error toast comes from the API client (for example "too many requests")
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={
        <Link to="/login" className="text-white font-semibold hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3 text-sm text-text-secondary">
          <p className="text-white font-medium">Check your email</p>
          <p>
            If an account exists for <span className="text-white">{email}</span>, a reset link is on
            its way. It works for one hour. Check the spam folder too.
          </p>
          <button onClick={() => setSent(false)} className="text-brand hover:underline">
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
