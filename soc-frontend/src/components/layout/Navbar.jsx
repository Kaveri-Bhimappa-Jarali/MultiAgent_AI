import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  ChevronDown,
  AlertTriangle,
  Bot,
  Crosshair,
  Zap,
  Network,
  FlaskConical,
  Cpu,
  Layers,
  FileText,
  Settings,
  Sparkles,
  LogOut,
  Sliders
} from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/events', label: 'Events', icon: Inbox },
  { to: '/correlation', label: 'Correlation', icon: GitMerge },
  { to: '/ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
  { to: '/incidents', label: 'Incidents', icon: Flame },
]

const MODULE_GROUPS = [
  {
    category: 'INVESTIGATE & DETECT',
    items: [
      { to: '/pipeline', label: 'Multi-Agent Pipeline', icon: Sliders, desc: '4-Stage Integrated Workflow', badge: 'Live' },
      { to: '/detections', label: 'Threat Detections', icon: AlertTriangle, desc: '12 MITRE Rules & Tuning' },
      { to: '/agents', label: '10 Multi-AI Agents', icon: Bot, desc: 'Blackboard Multi-Agent Pipeline', badge: '10' },
      { to: '/intelligence', label: 'Threat Intelligence', icon: Crosshair, desc: 'CTI Reputation & Cache' },
    ]
  },
  {
    category: 'RESPOND & DEFEND',
    items: [
      { to: '/responses', label: 'SOAR Containment', icon: Zap, desc: 'Approval Gates & 7-State Verification' },
    ]
  },
  {
    category: 'LABS & SIMULATION',
    items: [
      { to: '/simulation', label: 'Attack Simulation', icon: Crosshair, desc: 'Adversary Emulation Console' },
      { to: '/virtual-lab', label: 'Virtual Enterprise Lab', icon: Network, desc: '3-Node Guest Daemon Network' },
      { to: '/demo', label: 'Interactive Demo Lab', icon: FlaskConical, desc: '1-Click Scenario Injections' },
      { to: '/evaluation', label: 'ML Evaluation Lab', icon: Cpu, desc: 'UNSW-NB15 & CICIDS Benchmarks' },
    ]
  },
  {
    category: 'OPERATIONS & ADMIN',
    items: [
      { to: '/health-monitor', label: 'Pipeline & Collectors', icon: Layers, desc: 'Queue Depth & Flow Sniffer' },
      { to: '/reports', label: 'Executive PDF Reports', icon: FileText, desc: 'ReportLab Incident Dossiers' },
      { to: '/settings', label: 'System Policies', icon: Settings, desc: 'Risk Parameters & Audit Logs' },
    ]
  }
]

export function Navbar() {
  const [modulesOpen, setModulesOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setModulesOpen(false)
        setNotifOpen(false)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Check if current route is one of the module links
  const isModuleActive = MODULE_GROUPS.some(group =>
    group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))
  )

  const activeModuleItem = MODULE_GROUPS.flatMap(g => g.items).find(i =>
    location.pathname === i.to || location.pathname.startsWith(i.to + '/')
  )

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

        {/* Center Navigation - Visible when scrolling */}
        <div className="flex-1 flex justify-center pointer-events-auto" ref={dropdownRef}>
          <nav
            className={`flex items-center gap-1 p-1.5 rounded-2xl transition-all duration-300 backdrop-blur-xl relative ${
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

            {/* Modules Dropdown Toggle Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModulesOpen(!modulesOpen)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                  isModuleActive
                    ? 'text-purple-300 bg-purple-950/60 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="whitespace-nowrap">
                  {activeModuleItem ? activeModuleItem.label : 'Modules'}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${modulesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega-Dropdown Menu */}
              <AnimatePresence>
                {modulesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 mt-3 w-[680px] rounded-2xl bg-[#0a0e17] border border-purple-500/40 shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(168,85,247,0.2)] p-4 z-50 text-xs backdrop-blur-2xl"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {MODULE_GROUPS.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400/80 px-2.5 pb-1 border-b border-[#182130]">
                            {group.category}
                          </div>

                          <div className="space-y-1 pt-1">
                            {group.items.map((item) => {
                              const ItemIcon = item.icon
                              const isItemActive = location.pathname === item.to

                              return (
                                <NavLink
                                  key={item.to}
                                  to={item.to}
                                  onClick={() => setModulesOpen(false)}
                                  className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                                    isItemActive
                                      ? 'bg-purple-950/60 border border-purple-500/50 text-white'
                                      : 'hover:bg-[#111726] border border-transparent text-slate-300 hover:text-white'
                                  }`}
                                >
                                  <span className={`p-1.5 rounded-lg border mt-0.5 ${
                                    isItemActive ? 'bg-purple-600/30 border-purple-400 text-purple-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                                  }`}>
                                    <ItemIcon className="w-3.5 h-3.5" />
                                  </span>

                                  <div className="flex-1 truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs truncate">{item.label}</span>
                                      {item.badge && (
                                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</p>
                                  </div>
                                </NavLink>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                    <span>Live SOC Alerts</span>
                    <span className="text-[10px] text-purple-400 font-mono">Real-Time</span>
                  </div>
                  <div className="space-y-2 py-2">
                    <div
                      onClick={() => {
                        setNotifOpen(false)
                        navigate('/incidents')
                      }}
                      className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-slate-300 cursor-pointer hover:bg-rose-950/40 transition"
                    >
                      <div className="font-bold text-rose-300 flex items-center justify-between">
                        <span>Incident Correlated</span>
                        <span className="text-[10px] text-rose-400 font-mono">HIGH</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Automated brute-force SSH chain identified.</div>
                    </div>
                    <div
                      onClick={() => {
                        setNotifOpen(false)
                        navigate('/pipeline')
                      }}
                      className="p-2 rounded bg-purple-950/20 border border-purple-500/20 text-slate-300 cursor-pointer hover:bg-purple-950/40 transition"
                    >
                      <div className="font-bold text-purple-300 flex items-center justify-between">
                        <span>Multi-Agent Synthesis</span>
                        <span className="text-[10px] text-purple-400 font-mono">10 AGENTS</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Tier-3 RCA & SOAR containment ready.</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User profile pill */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2 border-l border-[#1e2736] text-left hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-900 to-indigo-700 border border-purple-500/40 flex items-center justify-center text-purple-200">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <div className="font-semibold text-white">Security Analyst</div>
                <div className="text-[10px] text-purple-400 font-mono">Tier-3 SOC Lead</div>
              </div>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0c1018] border border-[#1e2736] shadow-2xl p-2 z-50 text-xs font-mono"
                >
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/settings')
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-purple-400" />
                    <span>System Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/login')
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Switch User / Login</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
