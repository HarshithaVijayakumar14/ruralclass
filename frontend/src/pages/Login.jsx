import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTranslation } from 'react-i18next';

export const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAF7]">
      <div className="max-w-md w-full space-y-6">
        
        {/* Logo and Tagline */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#2E7D32] flex items-center justify-center text-white mx-auto shadow-md">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E7D32] tracking-tight">
            GuruMitra
          </h1>
          <p className="text-sm text-stone-600 font-medium">
            One teacher. Many grades. Zero planning stress.
          </p>
        </div>

        {/* Configuration Notice Banner if Supabase not configured */}
        {!isConfigured && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Offline / Local Mode Active</span>
            </div>
            <p className="text-amber-700 leading-relaxed">
              Supabase credentials are not configured in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">frontend/.env</code>. 
              You can log in or register locally to test offline storage and rule-based planning.
            </p>
          </div>
        )}

        {/* Main Login Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-stone-900">
              {t('auth.login', 'Sign In')}
            </h2>
            <p className="text-xs text-stone-500">
              Access your multi-grade classrooms and lesson plans
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">
                {t('auth.email', 'Email Address')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.gov.in"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700">
                  {t('auth.password', 'Password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#2E7D32] hover:underline font-medium"
                >
                  {t('auth.forgotPassword', 'Forgot Password?')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="pt-2 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-600">
              New teacher on GuruMitra?{' '}
              <Link to="/register" className="text-[#2E7D32] font-semibold hover:underline">
                Create your account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-stone-400">
          Built for rural multi-grade educators across India (Grades 1–8)
        </div>
      </div>
    </div>
  );
};
