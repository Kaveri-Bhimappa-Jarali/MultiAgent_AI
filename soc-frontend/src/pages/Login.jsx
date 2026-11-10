import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Button } from '../components/ui/Button'
import { Shield, Lock, User, Key, CheckCircle2, AlertCircle } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('analyst')
  const [password, setPassword] = useState('Analyst@SOC2026!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e?.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const res = await api.login({ username, password })
      if (res && res.access_token) {
        localStorage.setItem('soc_token', res.access_token)
        localStorage.setItem('soc_user', JSON.stringify(res.user || { username, role: 'ANALYST' }))
        navigate('/')
      } else {
        throw new Error('Invalid token response')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (user, pass) => {
    setUsername(user)
    setPassword(pass)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#070a12] relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-[#0d121c] border border-[#1e2736] shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-800 border border-purple-400/40 shadow-[0_0_25px_rgba(168,85,247,0.5)] flex items-center justify-center text-white">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Multi-Agent AI SOC</h1>
          <p className="text-xs text-slate-400 font-mono">Autonomous Threat Detection & Defense Command</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Analyst Identity / Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Passphrase / Secret</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 text-sm" disabled={loading}>
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
          </Button>
        </form>

        {/* Quick Fill Credentials */}
        <div className="pt-4 border-t border-[#182130] space-y-2 text-xs font-mono">
          <div className="text-[11px] text-slate-400 text-center uppercase tracking-wider">Quick-Fill Credentials</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin', 'Admin@SOC2026!')}
              className="p-2 rounded-xl bg-[#090d16] border border-[#1e2736] hover:border-purple-500/40 text-slate-300 text-left transition-colors"
            >
              <div className="font-bold text-purple-300">SOC Admin</div>
              <div className="text-[10px] text-slate-500">Lead Director</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('analyst', 'Analyst@SOC2026!')}
              className="p-2 rounded-xl bg-[#090d16] border border-[#1e2736] hover:border-purple-500/40 text-slate-300 text-left transition-colors"
            >
              <div className="font-bold text-cyan-300">SOC Analyst</div>
              <div className="text-[10px] text-slate-500">Triage Specialist</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

