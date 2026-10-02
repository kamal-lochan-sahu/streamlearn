import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    else if (form.name.trim().length < 2) e.name = 'Min 2 characters';
    if (!form.email) e.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password required';
    else if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Invalid Indian mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome 🎉');
      navigate('/onboarding');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ icon: Icon, name, type = 'text', placeholder, extra }) => (
    <div>
      <div className="relative">
        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type={name === 'password' ? (showPass ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={form[name]}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
          className={`w-full bg-bg-surface border rounded-lg pl-11 ${name === 'password' ? 'pr-11' : 'pr-4'} py-4 text-white placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm ${
            errors[name]
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-border focus:ring-brand/30 focus:border-brand'
          }`}
        />
        {name === 'password' && (
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {errors[name] && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/9d3533b2-0e2b-40b2-95e0-ecd7979cc88b/a3873901-5b7c-46eb-b9fa-12fea5197bd3/IN-en-20231016-popsignuptwoweeks-perspective_alpha_website_large.jpg')] bg-cover bg-center opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-bg-primary/80 to-bg-primary pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 p-6 md:p-10">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-brand font-black text-3xl tracking-tighter">STREAM</span>
          <span className="text-white font-black text-3xl tracking-tighter">LEARN</span>
        </Link>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-black/75 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/10">
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-text-secondary text-sm mb-8">
              Join StreamLearn — Watch, Learn, Grow.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field icon={User} name="name" placeholder="Full name" />
              <Field icon={Mail} name="email" type="email" placeholder="Email address" />
              <Field icon={Phone} name="phone" type="tel" placeholder="Mobile number (optional)" />
              <Field icon={Lock} name="password" placeholder="Create password" />

              {/* Password strength hint */}
              {form.password.length > 0 && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= (i + 1) * 3
                          ? form.password.length < 6
                            ? 'bg-red-500'
                            : form.password.length < 9
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-text-muted text-xs">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google */}
              <a
                href={`${import.meta.env.VITE_API_URL}/auth/google`}
                className="w-full bg-bg-surface border border-border hover:border-white/40 text-white font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-3 text-sm"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
                  />
                  <path
                    fill="#34A853"
                    d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.49-1.63.78-2.7.78-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M4.51 10.54A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.05.25-1.54V5.39H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.61l2.63-2.07z"
                  />
                  <path
                    fill="#EA4335"
                    d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.88 5.4L4.5 7.46c.63-1.89 2.4-3.88 4.48-3.88z"
                  />
                </svg>
                Continue with Google
              </a>

              {/* Terms */}
              <p className="text-text-muted text-xs text-center leading-relaxed">
                By signing up, you agree to our{' '}
                <span className="text-text-secondary hover:text-white cursor-pointer">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="text-text-secondary hover:text-white cursor-pointer">
                  Privacy Policy
                </span>
              </p>
            </form>

            <p className="text-center text-text-secondary text-sm mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
