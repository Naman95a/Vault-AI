'use client';

import { useState } from 'react';
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
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
