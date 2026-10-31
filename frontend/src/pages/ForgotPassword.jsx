import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  ArrowLeft, 
  Send, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTranslation } from 'react-i18next';

export const ForgotPassword = () => {
  const { t } = useTranslation();
  const { resetPassword, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      console.error('[ForgotPassword] Error:', err);
      setError(err.message || 'Failed to send reset link. Please check your email address.');
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

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-stone-900">
              {t('auth.resetPassword', 'Reset Your Password')}
            </h2>
            <p className="text-xs text-stone-500">
              Enter your registered email address and we'll send you a secure password reset link.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Password Reset Email Dispatched</span>
              </div>
              <p className="leading-relaxed">
                If an account exists for <span className="font-semibold">{email}</span>, a password reset link has been dispatched. Please check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E7D32] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Sending Link...</span>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('auth.backToLogin', 'Back to Sign In')}</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

