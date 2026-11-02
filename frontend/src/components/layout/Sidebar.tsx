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
        { to: '/agents', label: 'Multi-Agent SOC', icon: Bot, description: '10 AI Agents' },
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
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-navy-900 border-r border-navy-700/80 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-navy-700/80 bg-navy-950/70 flex-shrink-0">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-royal to-purple-800 flex items-center justify-center shadow-lg shadow-royal/20 flex-shrink-0">
            <ShieldAlert className="w-6 h-6 text-gold" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-softwhite tracking-wide font-sans">ROYAL SOC</span>
              <span className="text-[10px] text-gold tracking-widest font-mono uppercase">Multi-Agent AI</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-mutedslate hover:text-softwhite hover:bg-navy-800 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List grouped by category */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-500 uppercase">
                  {section.title}
                </span>
              </div>
            ) : (
              <div className="h-px bg-navy-800 my-2 mx-2" />
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
                  className={`flex items-center space-x-3 px-3 py-2 rounded-xl font-medium text-xs transition-all duration-150 ${
                    isCurrent
                      ? 'bg-royal/20 text-softwhite border border-royal/40 shadow-sm shadow-royal/10 font-semibold'
                      : 'text-mutedslate hover:text-softwhite hover:bg-navy-800/80'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? `${section.title}: ${item.label}` : item.description}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Status */}
      <div className="p-3 border-t border-navy-700/80 bg-navy-950/50 flex-shrink-0">
        {!collapsed ? (
          <div className="p-2.5 rounded-xl bg-navy-800/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-socsuccess animate-ping" />
              <span className="text-xs text-softwhite font-mono">10 Agents Ready</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-royal/30 text-royal-200 font-mono">v1.0</span>
          </div>
        ) : (
          <div className="flex justify-center" title="10 Autonomous Agents Ready">
            <span className="w-2.5 h-2.5 rounded-full bg-socsuccess" />
          </div>
        )}
      </div>
    </aside>
  );
};
