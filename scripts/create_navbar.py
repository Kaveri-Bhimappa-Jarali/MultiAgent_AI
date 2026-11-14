# scripts/create_navbar.py
navbar_code = '''import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Shield,
  Activity,
  Radio,
  Layers,
  Bot,
  Zap,
  Play,
  Database,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Server,
  BarChart2,
  FileCheck,
  AlertTriangle,
  Flame,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatSocTimestamp } from '../../utils/timestamps.js';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

export const Navbar: React.FC = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { status: wsStatus, lastEventTime } = useWebSocket();

  // Navigation definition according to enterprise requirements
  const navGroups: NavGroup[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      items: [
        {
          name: 'Command Center',
          path: '/',
          icon: Activity,
          description: 'Live SOC operational dashboard & threat metrics'
        }
      ]
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Radio,
      items: [
        {
          name: 'Security Events',
          path: '/events',
          icon: Radio,
          description: 'Live raw security event stream & telemetry logs'
        },
        {
          name: 'Data Ingestion',
          path: '/ingestion',
          icon: Layers,
          description: 'Configure and monitor telemetry ingestion pipelines'
        },
        {
          name: 'Ingestion Health',
          path: '/health-monitor',
          icon: Activity,
          description: 'Collector status, message queue & streaming health'
        }
      ]
    },
    {
      id: 'detection',
      label: 'Detection',
      icon: AlertTriangle,
      items: [
        {
          name: 'Threat Detections',
          path: '/detections',
          icon: AlertTriangle,
          description: 'MITRE ATT&CK rules & ML Isolation Forest findings'
        },
        {
          name: 'Multi-Agent SOC',
          path: '/agents',
          icon: Bot,
          description: '10 specialized autonomous AI investigation agents'
        },
        {
          name: 'Threat Intelligence',
          path: '/intelligence',
          icon: Search,
          description: 'IOC indicator lookups, reputation & feed matches'
        }
      ]
    },
    {
      id: 'investigation',
      label: 'Investigation',
      icon: Shield,
      items: [
        {
          name: 'Incidents & RCA',
          path: '/incidents',
          icon: Shield,
          description: 'Correlated attack incidents & AI root-cause analysis'
        }
      ]
    },
    {
      id: 'response',
      label: 'Response',
      icon: Zap,
      items: [
        {
          name: 'SOAR Responses',
          path: '/responses',
          icon: Zap,
          description: 'Automated containment workflows & post-action verification'
        }
      ]
    },
    {
      id: 'labs',
      label: 'Labs',
      icon: Flame,
      items: [
        {
          name: 'Demo Attack Lab',
          path: '/demo',
          icon: Play,
          description: 'Simulate full multi-stage cyber attacks in real-time'
        },
        {
          name: 'Historical Lab',
          path: '/historical',
          icon: BarChart2,
          description: 'Replay historical telemetry and test detection recall'
        },
        {
          name: 'Evaluation Lab',
          path: '/evaluation',
          icon: BarChart2,
          description: 'Benchmark ML models on UNSW-NB15 & CIC-IDS datasets'
        },
        {
          name: 'Virtual Enterprise Lab',
          path: '/virtual-lab',
          icon: Server,
          description: 'Network topology and live node daemons'
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      items: [
        {
          name: 'Reports',
          path: '/reports',
          icon: FileText,
          description: 'Export executive summaries & technical audit logs'
        }
      ]
    }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Check if a group contains the current active route
  const isGroupActive = (group: NavGroup) => {
    if (group.id === 'overview' && location.pathname === '/') return true;
    return group.items.some(
      (item) => item.path !== '/' && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    );
  };

  const handleGroupClick = (group: NavGroup) => {
    // If group has only 1 item, navigate directly
    if (group.items.length === 1) {
      navigate(group.items[0].path);
      setActiveDropdown(null);
    } else {
      setActiveDropdown(activeDropdown === group.id ? null : group.id);
    }
  };

  return (
    <header
      ref={dropdownRef}
      className="fixed top-0 left-0 right-0 z-50 h-16 bg-navy-900/95 backdrop-blur-md border-b border-navy-700/80 shadow-lg"
    >
      <div className="max-w-[1680px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* LEFT: Branding */}
        <div className="flex items-center space-x-6">
          <div
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 via-royal to-royal-300 p-0.5 shadow-md shadow-royal/20 group-hover:shadow-royal/40 transition">
              <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-gold group-hover:scale-105 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono text-base font-bold tracking-tight text-softwhite">
                  ROYAL<span className="text-gold">SOC</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-navy-800 text-royal-300 border border-royal/30">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] text-mutedslate font-mono -mt-0.5 hidden sm:block">
                Autonomous AI SOC
              </p>
            </div>
          </div>
        </div>

        {/* CENTER: Desktop Dropdown Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 h-full">
          {navGroups.map((group) => {
            const active = isGroupActive(group);
            const isDropdownOpen = activeDropdown === group.id;

            return (
              <div
                key={group.id}
                className="relative h-full flex items-center"
                onMouseEnter={() => {
                  if (group.items.length > 1) setActiveDropdown(group.id);
                }}
                onMouseLeave={() => {
                  if (group.items.length > 1) setActiveDropdown(null);
                }}
              >
                <button
                  onClick={() => handleGroupClick(group)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-royal/15 text-royal-200 border border-royal/40 shadow-sm shadow-royal/10'
                      : 'text-slate-300 hover:text-softwhite hover:bg-navy-800/80'
                  }`}
                >
                  <group.icon className={`w-3.5 h-3.5 ${active ? 'text-royal-300' : 'text-slate-400'}`} />
                  <span>{group.label}</span>
                  {group.items.length > 1 && (
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-royal-300' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Dropdown Menu */}
                {group.items.length > 1 && isDropdownOpen && (
                  <div className="absolute top-[calc(100%-8px)] left-0 w-64 bg-navy-900 border border-navy-700 rounded-xl shadow-2xl p-1.5 py-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 tracking-wider border-b border-navy-800 mb-1">
                      {group.label} Modules
                    </div>
                    {group.items.map((item) => {
                      const isItemActive = location.pathname === item.path;
                      return (
                        <div
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setActiveDropdown(null);
                          }}
                          className={`flex items-start space-x-2.5 px-3 py-2 rounded-lg cursor-pointer transition ${
                            isItemActive
                              ? 'bg-royal/20 text-softwhite border border-royal/40'
                              : 'hover:bg-navy-800 text-slate-300 hover:text-softwhite'
                          }`}
                        >
                          <item.icon
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              isItemActive ? 'text-royal-300' : 'text-slate-400'
                            }`}
                          />
                          <div>
                            <p className="text-xs font-semibold leading-snug">{item.name}</p>
                            {item.description && (
                              <p className="text-[11px] text-mutedslate line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* RIGHT: Live Status, Quick Actions & User Profile */}
        <div className="flex items-center space-x-3">
          {/* Live Streaming State Pill */}
          <div
            onClick={() => navigate('/health-monitor')}
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-navy-850 border border-slate-700 hover:border-royal text-[11px] font-mono cursor-pointer transition"
            title="Ingestion & WebSocket connection state"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className={wsStatus === 'CONNECTED' ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
              {wsStatus === 'CONNECTED' ? 'LIVE' : wsStatus}
            </span>
          </div>

          {/* Quick Launch Demo Attack */}
          <button
            onClick={() => navigate('/demo')}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition text-xs font-semibold font-mono"
            title="Open Demo Attack Lab"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Demo Attack</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className={`p-2 rounded-lg text-slate-400 hover:text-softwhite hover:bg-navy-800 transition ${
              location.pathname === '/settings' ? 'text-royal-300 bg-royal/15 border border-royal/30' : ''
            }`}
            title="System Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* User Account Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-1 pl-2 rounded-xl bg-navy-800/80 border border-navy-700 hover:border-royal/50 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-700 to-royal flex items-center justify-center text-softwhite font-bold text-xs border border-royal/40">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden xl:inline text-xs font-medium text-softwhite pr-1">
                {user?.username || 'Analyst'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-navy-900 border border-navy-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-navy-800">
                  <p className="text-xs font-semibold text-softwhite">
                    {user?.full_name || user?.username || 'Security Analyst'}
                  </p>
                  <p className="text-[10px] text-mutedslate font-mono">{user?.role || 'SOC Tier 2 Analyst'}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-softwhite hover:bg-navy-800 transition"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preferences & Policies</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/reports');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-softwhite hover:bg-navy-800 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Compliance Reports</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-navy-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-softwhite hover:bg-navy-800 lg:hidden transition"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER NAVIGATION */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-navy-950/95 border-b border-navy-800 backdrop-blur-2xl max-h-[85vh] overflow-y-auto p-4 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="flex items-center space-x-2 px-2 text-[11px] font-mono uppercase text-royal-300 font-semibold tracking-wider">
                <group.icon className="w-3.5 h-3.5" />
                <span>{group.label}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                {group.items.map((item) => {
                  const isItemActive = location.pathname === item.path;
                  return (
                    <div
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-xs ${
                        isItemActive
                          ? 'bg-royal/20 text-softwhite font-semibold border border-royal/40'
                          : 'text-slate-300 hover:bg-navy-900 hover:text-softwhite'
                      }`}
                    >
                      <item.icon className="w-4 h-4 text-slate-400" />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-3 border-t border-navy-800 flex items-center justify-between">
            <button
              onClick={() => {
                navigate('/demo');
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gold/15 text-gold border border-gold/40 text-xs font-semibold font-mono"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Demo Attack</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
'''

with open(r'c:\Users\kaver\MultiAgent_AI\frontend\src\components\layout\Navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(navbar_code)

print("Created Navbar.tsx successfully!")
