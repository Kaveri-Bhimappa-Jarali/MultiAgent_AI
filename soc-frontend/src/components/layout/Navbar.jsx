import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  LayoutDashboard,
  Inbox,
  GitMerge,
  BrainCircuit,
  Flame,
  Bell,
  User,
  Menu,
  X
} from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/events', label: 'Events', icon: Inbox },
  { to: '/correlation', label: 'Correlation', icon: GitMerge },
  { to: '/ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
  { to: '/incidents', label: 'Incidents', icon: Flame },
]

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'py-2 bg-transparent pointer-events-none'
          : 'border-b border-[#1c2433] bg-[#070a12]/95 backdrop-blur-md shadow-lg shadow-black/50'
      }`}
    >
      <div className="px-4 lg:px-6 h-14 md:h-16 flex items-center justify-between gap-4 max-w-[1680px] mx-auto">
        
        {/* Brand Left - hidden when scrolling */}
        <div
          className={`transition-all duration-300 flex-shrink-0 ${
            isScrolled
              ? 'opacity-0 -translate-y-4 pointer-events-none w-0 overflow-hidden'
              : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
        >
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-800 shadow-[0_0_16px_rgba(168,85,247,0.45)] border border-purple-400/40 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-wider text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 font-black">
                  SOC
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Multi AI-Agent
              </div>
            </div>
          </NavLink>
        </div>

        {/* Center Navigation - The ONLY part visible when scrolling */}
        <div className="flex-1 flex justify-center pointer-events-auto">
          <nav
            className={`flex items-center gap-1 p-1.5 rounded-2xl transition-all duration-300 backdrop-blur-xl ${
              isScrolled
                ? 'bg-[#0d121c]/95 border border-purple-500/50 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(168,85,247,0.25)]'
                : 'bg-[#0d121c] border border-[#1e2736] shadow-inner'
            }`}
          >
            {NAV_LINKS.map(link => {
              const Icon = link.icon
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to)

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-purple-600/80 to-fuchsia-600/80 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.45)] border border-purple-400/50 -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{link.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Right Actions - hidden when scrolling */}
        <div
          className={`transition-all duration-300 flex items-center gap-3 flex-shrink-0 ${
            isScrolled
              ? 'opacity-0 -translate-y-4 pointer-events-none w-0 overflow-hidden'
              : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
        >
          {/* Notifications button & dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              title="Notifications"
              className="relative p-2 rounded-lg bg-[#0d121c] border border-[#1e2736] text-slate-400 hover:text-slate-200 hover:border-purple-500/40 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse" />
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0c1018] border border-[#1e2736] shadow-2xl p-3 z-50 text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#1e2736] text-slate-300 font-semibold">
                    <span>SOC Alerts (3 New)</span>
                    <span className="text-[10px] text-purple-400 font-mono">Live Ingest</span>
                  </div>
                  <div className="space-y-2 py-2">
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-slate-300">
                      <div className="font-bold text-rose-300">EVT-1002 Correlated to INC-2026-001</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Automated Brute Force chain detected.</div>
                    </div>
                    <div className="p-2 rounded bg-purple-950/20 border border-purple-500/20 text-slate-300">
                      <div className="font-bold text-purple-300">LLM Reasoning Completed</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Attack chain confidence: 94%. Action: BLOCK.</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User profile pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#1e2736]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-900 to-indigo-700 border border-purple-500/40 flex items-center justify-center text-purple-200">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden xl:block text-left text-xs leading-tight">
              <div className="font-semibold text-white">Security Analyst</div>
              <div className="text-[10px] text-purple-400 font-mono">Tier-3 SOC Lead</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
