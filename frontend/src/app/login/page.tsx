'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const DEMO_ACCOUNTS = [
  { label: 'HQ Admin', email: 'hq.admin@littlesprouts.demo' },
  { label: 'Center Owner (Downtown)', email: 'owner.downtown@littlesprouts.demo' },
  { label: 'Front-desk (Downtown)', email: 'frontdesk.downtown@littlesprouts.demo' },
  { label: 'Parent (Maria Garcia)', email: 'maria.g@example.com' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-brand-600">🌱 Little Sprouts ERP</div>
          <p className="text-sm text-gray-500 mt-1">Daycare Franchise Management</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="card mt-4 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Demo accounts (password: Passw0rd!)</p>
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="block w-full text-left text-xs text-brand-600 hover:underline"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword('Passw0rd!');
                }}
              >
                {acc.label} — {acc.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
