import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

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
            <h1 className="text-3xl font-bold text-white mb-8">Sign In</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={`w-full bg-bg-surface border rounded-lg pl-11 pr-4 py-4 text-white placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500/30'
                        : 'border-border focus:ring-brand/30 focus:border-brand'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`w-full bg-bg-surface border rounded-lg pl-11 pr-11 py-4 text-white placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm ${
                      errors.password
                        ? 'border-red-500 focus:ring-red-500/30'
                        : 'border-border focus:ring-brand/30 focus:border-brand'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password}</p>}
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-text-secondary hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                ) : (
                  'Sign In'
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
                className="w-full bg-bg-surface border border-border hover:border-white/40 text-white font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-3 text-sm">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.49-1.63.78-2.7.78-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.51 10.54A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.05.25-1.54V5.39H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.61l2.63-2.07z"/>
                  <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.88 5.4L4.5 7.46c.63-1.89 2.4-3.88 4.48-3.88z"/>
                </svg>
                Continue with Google
              </a>
            </form>

            {/* Register link */}
            <p className="text-center text-text-secondary text-sm mt-8">
              New to StreamLearn?{' '}
              <Link to="/register" className="text-white font-semibold hover:underline">
                Sign up now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
