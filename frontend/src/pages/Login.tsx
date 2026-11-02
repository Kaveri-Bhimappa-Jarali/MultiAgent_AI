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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#070B16' }}
    >
      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,90,230,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(216,184,117,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,90,230,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Animated grid lines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(109,90,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(109,90,230,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      <div
        className="w-full max-w-md p-8 rounded-2xl relative z-10 animate-card-appear"
        style={{
          background: 'linear-gradient(135deg, rgba(17,26,46,0.95) 0%, rgba(11,16,32,0.98) 100%)',
          border: '1px solid rgba(109,90,230,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,90,230,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
            style={{
              background: 'linear-gradient(135deg, #6D5AE6 0%, #9B8DF2 100%)',
              boxShadow: '0 0 40px rgba(109,90,230,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            <ShieldAlert className="w-9 h-9 text-white" />
            {/* Glow ring */}
            <div style={{ position: 'absolute', inset: -4, borderRadius: 20, border: '1px solid rgba(109,90,230,0.3)', pointerEvents: 'none' }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">ROYAL ENTERPRISE SOC</h1>
          <p className="text-xs mt-1 font-mono tracking-wider uppercase" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Multi-Agent Autonomous Defense Platform
          </p>
          <div className="flex items-center gap-2 mt-3">
            {['AI-Powered', '10 Agents', 'Real-Time'].map(tag => (
              <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(109,90,230,0.12)', color: '#9B8DF2', border: '1px solid rgba(109,90,230,0.25)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl flex items-center space-x-2.5 text-xs animate-slide-in-up" style={{ background: 'rgba(240,82,101,0.1)', border: '1px solid rgba(240,82,101,0.35)', color: '#FCA5A5' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase font-mono tracking-wider" style={{ color: 'rgba(148,163,184,0.65)' }}>Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none transition-all duration-200 font-mono"
                style={{ background: 'rgba(11,16,32,0.8)', border: '1px solid rgba(109,90,230,0.2)', color: '#F5F7FC' }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(109,90,230,0.6)'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(109,90,230,0.1)'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(109,90,230,0.2)'; (e.target as HTMLElement).style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase font-mono tracking-wider" style={{ color: 'rgba(148,163,184,0.65)' }}>Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-mono"
                style={{ background: 'rgba(11,16,32,0.8)', border: '1px solid rgba(109,90,230,0.2)', color: '#F5F7FC' }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(109,90,230,0.6)'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(109,90,230,0.1)'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(109,90,230,0.2)'; (e.target as HTMLElement).style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50"
            style={{
              background: loading ? 'rgba(109,90,230,0.5)' : 'linear-gradient(135deg, #6D5AE6 0%, #9B8DF2 100%)',
              boxShadow: loading ? 'none' : '0 0 24px rgba(109,90,230,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 36px rgba(109,90,230,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(109,90,230,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
            {loading && (
              <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white' }} />
            )}
          </button>
        </form>

        {/* Quick credentials */}
        <div className="mt-7 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs text-center font-mono mb-3" style={{ color: 'rgba(148,163,184,0.5)' }}>Quick-Fill Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'SOC Admin', roleStyle: { color: '#D8B875' }, u: 'admin', p: 'Admin@SOC2026!' },
              { role: 'SOC Analyst', roleStyle: { color: '#9B8DF2' }, u: 'analyst', p: 'Analyst@SOC2026!' }
            ].map(cred => (
              <button
                key={cred.u}
                type="button"
                onClick={() => handleQuickFill(cred.u, cred.p)}
                className="py-2.5 px-3 rounded-xl text-left transition-all duration-150"
                style={{ background: 'rgba(11,16,32,0.7)', border: '1px solid rgba(109,90,230,0.15)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.15)'; (e.currentTarget as HTMLElement).style.background = 'rgba(11,16,32,0.7)'; }}
              >
                <div className="text-xs font-semibold" style={cred.roleStyle}>{cred.role}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{cred.u} / {cred.p}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
