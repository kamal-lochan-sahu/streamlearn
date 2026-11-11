import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell, { inputClass, buttonClass } from '../../components/auth/AuthShell';
import { useAuthStore } from '../../store/authStore';

const MIN_PASSWORD = 8;

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD)
      return toast.error(`Password must be at least ${MIN_PASSWORD} characters`);
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Password changed. You are signed in.');
      navigate('/', { replace: true });
    } catch (err) {
      if (err.response?.status === 400) setExpired(true);
    } finally {
      setLoading(false);
    }
  };

  if (expired)
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <Link to="/forgot-password" className={buttonClass}>
          Get a new link
        </Link>
      </AuthShell>
    );

  return (
    <AuthShell title="Choose a new password" subtitle="You will be signed in after this.">
      <form onSubmit={submit} className="space-y-5">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Repeat new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Change password'}
        </button>
      </form>
    </AuthShell>
  );
}
