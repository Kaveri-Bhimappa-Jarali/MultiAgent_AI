import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Shield,
  LayoutDashboard,
  Radio,
  GitMerge,
  BrainCircuit,
  Flame,
  AlertTriangle,
  Bot,
  Zap,
  Play,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Activity,
  Network,
  Crosshair,
  Database,
  FileText,
  Settings,
  Menu,
  X
} from 'lucide-react';

const PRIMARY_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/events', label: 'Events', icon: Radio },
  { to: '/correlation', label: 'Correlation', icon: GitMerge },
  { to: '/ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
  { to: '/incidents', label: 'Incidents', icon: Flame },
  { to: '/responses', label: 'Responses', icon: Zap },
];

const MORE_LINKS = [
  { to: '/detections', label: 'Threat Detections', icon: AlertTriangle, desc: 'Rule & ML Alert Findings' },
  { to: '/agents', label: 'Multi-Agent SOC', icon: Bot, desc: '10 Autonomous AI Agents' },
  { to: '/demo', label: 'Demo Attack Lab', icon: Play, desc: 'Simulated Scenarios' },
  { to: '/virtual-lab', label: 'Virtual Enterprise Lab', icon: Network, desc: 'Virtual Node Network' },
  { to: '/ingestion', label: 'Data Ingestion', icon: Layers, desc: 'Telemetry Sources' },
  { to: '/health-monitor', label: 'Ingestion Health', icon: Activity, desc: 'Collector Status' },
  { to: '/intelligence', label: 'Threat Intelligence', icon: Crosshair, desc: 'CTI Indicators' },
  { to: '/evaluation', label: 'Evaluation Lab', icon: Database, desc: 'Model Benchmarks' },
  { to: '/reports', label: 'Executive Reports', icon: FileText, desc: 'PDF Dossiers' },
  { to: '/settings', label: 'System Settings', icon: Settings, desc: 'Configuration' },
];

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { status: wsStatus } = useWebSocket();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isMoreActive = MORE_LINKS.some(link => location.pathname === link.to);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'py-2 bg-transparent pointer-events-none'
          : 'border-b border-[#1c2433]/70 bg-[#070a12]/85 backdrop-blur-md shadow-lg shadow-black/40 py-2.5'
      }`}
    >
      {/* 3-Column Grid ensures Center Pill is 100% mathematically centered at all times */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 lg:px-8 max-w-[1720px] mx-auto w-full gap-2">
        
        {/* Column 1: Brand Left */}
        <div
          className={`flex items-center justify-start transition-all duration-300 ${
            isScrolled
              ? 'opacity-0 -translate-y-2 pointer-events-none'
              : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
        >
          <NavLink to="/" className="flex items-center gap-2.5 group select-none">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-800 shadow-[0_0_16px_rgba(168,85,247,0.45)] border border-purple-400/40 group-hover:scale-105 transition-transform flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-wider text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 font-black">
                  SOC
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 font-mono font-bold">
                  AI
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold hidden sm:block">
                Multi-Agent Defense
              </div>
            </div>
          </NavLink>
        </div>

        {/* Column 2: Center Floating Pill Navigation - ALWAYS DEAD-CENTER! */}
        <div className="flex justify-center pointer-events-auto">
          <nav
            className={`flex items-center gap-1 p-1.5 rounded-2xl transition-all duration-300 backdrop-blur-xl ${
              isScrolled
                ? 'bg-[#0d121c]/95 border border-purple-500/50 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(168,85,247,0.25)]'
                : 'bg-[#0d121c]/90 border border-purple-500/40 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(168,85,247,0.18)]'
            }`}
          >
            {PRIMARY_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to);

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
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
                  <span className="hidden sm:inline whitespace-nowrap">{link.label}</span>
                </NavLink>
              );
            })}

            {/* "More / Labs" Dropdown Pill */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`relative flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                  isMoreActive
                    ? 'text-purple-300 bg-purple-950/40 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-64 rounded-xl bg-[#0c1018] border border-[#1e2736] shadow-2xl p-2 z-50 text-xs"
                  >
                    <div className="px-2 py-1.5 text-[10px] font-mono uppercase text-slate-500 font-bold border-b border-[#1e2736] mb-1">
                      More SOC Modules &amp; Labs
                    </div>
                    <div className="space-y-0.5">
                      {MORE_LINKS.map((link) => {
                        const Icon = link.icon;
                        const isSelected = location.pathname === link.to;
                        return (
                          <NavLink
                            key={link.to}
                            to={link.to}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
                              isSelected
                                ? 'bg-purple-600/30 text-purple-200 font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                            <div className="truncate">
                              <div className="leading-tight font-medium">{link.label}</div>
                              <div className="text-[10px] text-slate-500 truncate">{link.desc}</div>
                            </div>
                          </NavLink>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        {/* Column 3: Right Actions */}
        <div
          className={`flex items-center justify-end gap-2.5 transition-all duration-300 ${
            isScrolled
              ? 'opacity-0 -translate-y-2 pointer-events-none'
              : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
        >
          {/* Quick Demo Attack */}
          <button
            onClick={() => navigate('/demo')}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition text-xs font-semibold font-mono shadow-[0_0_12px_rgba(216,184,117,0.15)] select-none"
            title="Launch Demo Attack Scenario"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Demo Attack</span>
          </button>

          {/* Live Stream Status Pill */}
          <div
            onClick={() => navigate('/health-monitor')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 text-[11px] font-mono cursor-pointer transition select-none"
            title="Ingestion & Pipeline Health"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className={wsStatus === 'CONNECTED' ? 'text-emerald-400 font-bold hidden md:inline' : 'text-amber-400 hidden md:inline'}>
              LIVE
            </span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              title="SOC Ingest Alerts"
              className="relative p-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-slate-400 hover:text-slate-200 hover:border-purple-500/40 transition-colors"
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
                    <span>SOC Live Alerts</span>
                    <span className="text-[10px] text-purple-400 font-mono">Real-Time Ingest</span>
                  </div>
                  <div className="space-y-2 py-2">
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-slate-300">
                      <div className="font-bold text-rose-300">EVT-1002 Correlated to INC-2026-001</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Automated Brute Force attack chain detected.</div>
                    </div>
                    <div className="p-2 rounded bg-purple-950/20 border border-purple-500/20 text-slate-300">
                      <div className="font-bold text-purple-300">LLM Reasoning Completed</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Attack confidence: 94%. Action: BLOCK_IP.</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Pill & Logout Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 transition select-none"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-900 to-indigo-700 border border-purple-500/40 flex items-center justify-center text-purple-200 font-bold text-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden xl:inline text-xs font-semibold text-white truncate max-w-[80px]">
                {user?.username || 'Admin'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden xl:inline" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0c1018] border border-[#1e2736] shadow-2xl p-2 z-50 text-xs"
                >
                  <div className="px-2 py-1.5 border-b border-[#1e2736] mb-1">
                    <div className="font-semibold text-white">{user?.username || 'admin'}</div>
                    <div className="text-[10px] text-purple-400 font-mono">{user?.role || 'SOC Admin'}</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-slate-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-[#1e2736] bg-[#070a12]/98 px-4 py-4 space-y-1 pointer-events-auto"
          >
            {PRIMARY_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-purple-950/40 hover:text-purple-200"
                >
                  <Icon className="w-4 h-4 text-purple-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
            <div className="pt-2 border-t border-[#1e2736] mt-2 space-y-1">
              {MORE_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};