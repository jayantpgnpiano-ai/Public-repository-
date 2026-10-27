import React, { useState } from 'react';
import { X, Feather, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register, demoLogin } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    if (mode === 'login') {
      const res = await login(identifier, password);
      if (res.success) {
        showToast('Welcome back.', 'success');
        onClose();
      } else {
        setErrorMsg(res.error || 'Login failed');
      }
    } else if (mode === 'register') {
      const res = await register(username, email, password, displayName);
      if (res.success) {
        showToast('Account created. Welcome to Project Connect.', 'success');
        onClose();
      } else {
        setErrorMsg(res.error || 'Registration failed');
      }
    } else if (mode === 'forgot') {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        showToast(data.message, 'info');
        setMode('login');
      } catch {
        showToast('Password reset failed', 'error');
      }
    }

    setIsSubmitting(false);
  };

  const handleDemo = async (targetUsername: string) => {
    setIsSubmitting(true);
    await demoLogin(targetUsername);
    setIsSubmitting(false);
    showToast(`Signed in as @${targetUsername}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E8E4DC] max-w-md w-full overflow-hidden shadow-2xl p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DC] mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2A2724] text-[#FAF8F5] flex items-center justify-center">
              <Feather className="w-4 h-4 text-[#EFECE6]" />
            </div>
            <span className="font-serif-editorial text-lg font-medium text-[#1C1917]">
              Project Connect
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#78716C] hover:text-[#1C1917]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-[#FDF2F0] border border-[#F5C2B8] text-xs text-[#8C2C1D]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'login' && (
            <>
              <div>
                <label className="block text-[#57534E] font-medium mb-1">Username or Email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. elena or elena@projectconnect.app"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[#57534E] font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-[#8A5F38] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                />
              </div>
            </>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[#57534E] font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Clara Wood"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. clara_w"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="clara@example.com"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Password (min 6 chars)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917]"
                />
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <div>
              <label className="block text-[#57534E] font-medium mb-1">Enter your account email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5D0C4] text-sm text-[#1C1917]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 rounded-xl bg-[#2A2724] hover:bg-black text-[#FAF8F5] text-xs font-medium transition-colors shadow-xs"
          >
            {isSubmitting
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        {/* 1-Click Demo Accounts */}
        <div className="mt-5 pt-4 border-t border-[#F0ECE1]">
          <div className="text-[11px] text-[#78716C] font-medium mb-2 text-center">
            Or experience the platform instantly:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo('elena')}
              className="py-2 px-3 rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] hover:bg-[#EFECE6] text-xs font-medium text-[#1C1917] transition-colors text-center"
            >
              Sign in as Elena (Designer)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('marcus')}
              className="py-2 px-3 rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] hover:bg-[#EFECE6] text-xs font-medium text-[#1C1917] transition-colors text-center"
            >
              Sign in as Marcus (Architect)
            </button>
          </div>
        </div>

        {/* Switch mode */}
        <div className="mt-4 text-center text-xs text-[#78716C]">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('register');
                }}
                className="text-[#1C1917] font-semibold hover:underline"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already a member?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className="text-[#1C1917] font-semibold hover:underline"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
