import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password, role });
      login(data.token, data.user);
      navigate(role === 'student' ? '/student' : role === 'instructor' ? '/faculty' : '/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative gradient orbs — dark lime/emerald */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-primary/15 to-emerald-500/10 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-lime-600/10 to-green-400/10 blur-[120px] animate-float" />
        <div className="absolute top-1/3 left-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-accent/8 to-sky-400/8 blur-[100px] animate-pulse-glow" />
      </div>

      <div className="animate-fade-in-up relative w-full max-w-lg z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-3xl font-bold text-gray-900 shadow-lg animate-pulse-glow">
            U
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">UniTrack</h1>
          <p className="mt-2 text-text-muted font-semibold">Student Registration & Attendance Portal</p>
        </div>

        {/* Card */}
        <div className="glass-card">
          {/* Role Toggle */}
          <div className="mb-6 flex overflow-hidden rounded-2xl border border-gray-600 bg-gray-900/80 p-1.5">
            {[{ key: 'student', label: 'Student' }, { key: 'instructor', label: 'Faculty' }, { key: 'admin', label: 'Admin' }].map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all duration-200 ${
                  role === r.key
                    ? 'bg-primary text-gray-900 shadow-md scale-105'
                    : 'text-text-muted hover:text-text-main hover:bg-gray-700/50'
                }`}
                id={`role-toggle-${r.key}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-text-main" htmlFor="email-input">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                className="input-field text-center"
                placeholder={role === 'student' ? 'student@university.edu' : role === 'instructor' ? 'faculty@university.edu' : 'admin@university.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-text-main" htmlFor="password-input">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                className="input-field text-center"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-danger/15 border border-danger/30 px-4 py-3 text-sm font-semibold text-danger" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                `Sign in as ${role === 'instructor' ? 'Faculty' : role === 'admin' ? 'Admin' : 'Student'}`
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          © 2025 UniTrack — University Academic Portal
        </p>
      </div>
    </div>
  );
}
