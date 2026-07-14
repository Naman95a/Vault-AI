'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { analyzePasswordStrength } from '@/lib/crypto';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'password') {
      setStrength(analyzePasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      router.push('/auth/login?registered=true');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '40px' }}>🛡️</div>
        <h1>Create Your Vault</h1>
        <p className="auth-subtitle">Set up your encrypted password vault</p>

        {error && (
          <div className="error-message">
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="register-name">Full Name</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input
                id="register-name"
                type="text"
                className="input"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-email">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">📧</span>
              <input
                id="register-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-password">Master Password</label>
            <div className="input-with-icon input-with-action">
              <span className="input-icon">🔑</span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {strength && form.password && (
              <div className="strength-meter">
                <div className="strength-bar-track">
                  <div
                    className="strength-bar-fill"
                    style={{ width: `${strength.score}%`, background: strength.color }}
                  />
                </div>
                <div className="strength-label">
                  <span className="label-text" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{strength.score}/100</span>
                </div>
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="register-confirm">Confirm Master Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔑</span>
              <input
                id="register-confirm"
                type="password"
                className="input"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner"></span> Creating Vault...</> : 'Create Encrypted Vault'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ padding: '0 10px', color: 'var(--text-tertiary)', fontSize: '14px' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => signIn('google', { callbackUrl: '/vault' })}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
