import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Layers,
  Bot,
  AlertTriangle,
  Zap,
  Crosshair,
  Database,
  FlaskConical,
  Settings,
  Radio,
  FileText,
  Network,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavSection {
  title: string;
  items: Array<{
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
    badge?: string;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/', label: 'Command Center', icon: Activity, description: 'Security Overview' }
      ]
    },
    {
      title: 'MONITOR',
      items: [
        { to: '/events', label: 'Security Events', icon: Radio, description: 'Incoming Telemetry' },
        { to: '/ingestion', label: 'Data Ingestion', icon: Layers, description: 'Telemetry Sources' },
        { to: '/health-monitor', label: 'Ingestion Health', icon: Activity, description: 'Collector Status' },
        { to: '/virtual-lab', label: 'Virtual Enterprise Lab', icon: Network, description: 'Virtual Node Network' }
      ]
    },
    {
      title: 'INVESTIGATE',
      items: [
        { to: '/detections', label: 'Threat Detections', icon: AlertTriangle, description: 'Alert Findings' },
        { to: '/agents', label: 'Multi-Agent SOC', icon: Bot, description: '10 AI Agents', badge: '10' },
        { to: '/incidents', label: 'Incidents & RCA', icon: ShieldAlert, description: 'Incident Investigation' },
        { to: '/intelligence', label: 'Threat Intelligence', icon: Crosshair, description: 'CTI Indicators' }
      ]
    },
    {
      title: 'RESPOND',
      items: [
        { to: '/responses', label: 'SOAR Responses', icon: Zap, description: 'Containment Actions' }
      ]
    },
    {
      title: 'TEST & EVALUATE',
      items: [
        { to: '/simulation', label: 'Attack Simulation', icon: Crosshair, description: 'Live VM Attack Runner' },
        { to: '/demo', label: 'Demo Attack Lab', icon: FlaskConical, description: 'Simulated Scenarios' },
        { to: '/evaluation', label: 'Historical Lab', icon: Database, description: 'Dataset Replay & Audit' },
        { to: '/evaluation?tab=ml', label: 'Evaluation Lab', icon: FlaskConical, description: 'Model Benchmarks' }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { to: '/reports', label: 'Reports', icon: FileText, description: 'Executive Reports' },
        { to: '/settings', label: 'Settings', icon: Settings, description: 'System Configuration' }
      ]
    }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, #070B16 0%, #0B1020 60%, #070B16 100%)',
        borderRight: '1px solid rgba(109,90,230,0.15)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)'
      }}
    >
      {/* Brand Header */}
      <div
        className="h-16 flex items-center justify-between px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(109,90,230,0.15)', background: 'rgba(7,11,22,0.9)' }}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6D5AE6, #8B73FF)',
              boxShadow: '0 0 20px rgba(109,90,230,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
          >
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-white tracking-wide">ROYAL SOC</span>
              <span
                className="text-[10px] tracking-widest font-mono uppercase"
                style={{ color: '#D8B875' }}
              >
                Multi-Agent AI
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg transition-all duration-200"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#F5F7FC';
            (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.15)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            {!collapsed ? (
              <div className="px-3 pt-3 pb-1">
                <span
                  className="text-[10px] font-mono tracking-widest font-semibold uppercase"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                >
                  {section.title}
                </span>
              </div>
            ) : (
              <div className="h-px mx-2 my-2" style={{ background: 'rgba(109,90,230,0.12)' }} />
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const itemBasePath = item.to.split('?')[0];
              const isCurrent =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname === itemBasePath &&
                    (!item.to.includes('?') || location.search === item.to.slice(itemBasePath.length));

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 relative group"
                  style={
                    isCurrent
                      ? {
                          background: 'linear-gradient(135deg, rgba(109,90,230,0.25), rgba(109,90,230,0.1))',
                          color: '#F5F7FC',
                          border: '1px solid rgba(109,90,230,0.4)',
                          boxShadow: '0 0 12px rgba(109,90,230,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                          fontWeight: 600
                        }
                      : {
                          color: 'rgba(148,163,184,0.85)',
                          border: '1px solid transparent'
                        }
                  }
                  onMouseEnter={e => {
                    if (!isCurrent) {
                      (e.currentTarget as HTMLElement).style.color = '#F5F7FC';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isCurrent) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.85)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                  title={collapsed ? `${section.title}: ${item.label}` : item.description}
                >
                  {/* Active left glow bar */}
                  {isCurrent && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full"
                      style={{
                        height: '60%',
                        background: 'linear-gradient(180deg, #6D5AE6, #9B8DF2)',
                        boxShadow: '0 0 8px rgba(109,90,230,0.8)'
                      }}
                    />
                  )}

                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-purple-400' : ''}`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(109,90,230,0.2)',
                        color: '#9B8DF2',
                        border: '1px solid rgba(109,90,230,0.35)'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Status */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(109,90,230,0.12)' }}>
        {!collapsed ? (
          <div
            className="p-2.5 rounded-xl flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(45,190,133,0.1), rgba(17,26,46,0.8))',
              border: '1px solid rgba(45,190,133,0.2)'
            }}
          >
            <div className="flex items-center space-x-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#2DBE85', boxShadow: '0 0 6px rgba(45,190,133,0.8)' }}
              />
              <span className="text-xs text-softwhite font-mono">10 Agents Ready</span>
            </div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold"
              style={{ background: 'rgba(109,90,230,0.25)', color: '#9B8DF2' }}
            >
              v1.0
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title="10 Autonomous Agents Ready">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: '#2DBE85', boxShadow: '0 0 8px rgba(45,190,133,0.7)' }}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
