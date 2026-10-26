import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ShieldAlert, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@SOC2026!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ username, password });
      login(res.access_token, res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-royal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-navy-800 border border-slate-700/80 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-royal to-purple-800 flex items-center justify-center shadow-xl shadow-royal/30 mb-3 border border-royal/40">
            <ShieldAlert className="w-8 h-8 text-gold" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-softwhite">ROYAL ENTERPRISE SOC</h2>
          <p className="text-xs text-mutedslate mt-1 font-mono uppercase tracking-wider">
            Multi-Agent Autonomous Defense Platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/15 border border-soccritical/40 text-soccritical text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-mutedslate mb-1.5 uppercase font-mono">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-mutedslate absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-navy-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-softwhite placeholder-slate-500 focus:outline-none focus:border-royal transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mutedslate mb-1.5 uppercase font-mono">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-mutedslate absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-navy-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-softwhite placeholder-slate-500 focus:outline-none focus:border-royal transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 hover:to-purple-800 text-softwhite font-medium text-sm transition-all shadow-lg shadow-royal/25 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Credentials */}
        <div className="mt-8 pt-6 border-t border-navy-700 text-center">
          <p className="text-xs text-mutedslate mb-3 font-mono">Quick-Fill Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'Admin@SOC2026!')}
              className="py-2 px-3 rounded-lg bg-navy-900 border border-slate-700 hover:border-royal/50 text-left transition"
            >
              <div className="text-xs font-semibold text-gold">SOC Admin</div>
              <div className="text-[10px] text-mutedslate font-mono">admin / Admin@SOC2026!</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('analyst', 'Analyst@SOC2026!')}
              className="py-2 px-3 rounded-lg bg-navy-900 border border-slate-700 hover:border-royal/50 text-left transition"
            >
              <div className="text-xs font-semibold text-royal-200">SOC Analyst</div>
              <div className="text-[10px] text-mutedslate font-mono">analyst / Analyst@SOC2026!</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
