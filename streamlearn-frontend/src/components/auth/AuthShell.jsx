import { Link } from 'react-router-dom';

// The frame shared by the sign-in related pages: background, logo and a card
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-bg-primary/80 to-bg-primary pointer-events-none" />
      <div className="relative z-10 p-6 md:p-10">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-brand font-black text-3xl tracking-tighter">STREAM</span>
          <span className="text-white font-black text-3xl tracking-tighter">LEARN</span>
        </Link>
      </div>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md bg-black/75 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/10">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {subtitle && <p className="text-text-secondary text-sm mb-8">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
          {footer && <div className="text-center text-text-secondary text-sm mt-8">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export const inputClass =
  'w-full bg-bg-surface border border-border rounded-lg px-4 py-4 text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all text-sm';
export const buttonClass =
  'w-full bg-brand hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm';
