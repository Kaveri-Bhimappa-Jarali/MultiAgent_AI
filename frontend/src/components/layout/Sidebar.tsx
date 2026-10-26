import React from 'react';
import { NavLink } from 'react-router-dom';
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

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navItems = [
    { to: '/', label: 'Command Center', icon: Activity },
    { to: '/events', label: 'Security Events', icon: Radio },
    { to: '/ingestion', label: 'Data Ingestion', icon: Layers },
    { to: '/health-monitor', label: 'Ingestion Health', icon: Activity },
    { to: '/detections', label: 'Threat Detections', icon: AlertTriangle },
    { to: '/agents', label: 'Multi-Agent SOC', icon: Bot },
    { to: '/incidents', label: 'Incidents & RCA', icon: ShieldAlert },
    { to: '/responses', label: 'SOAR Responses', icon: Zap },
    { to: '/intelligence', label: 'Threat Intel (CTI)', icon: Crosshair },
    { to: '/evaluation', label: 'Historical Lab', icon: Database },
    { to: '/virtual-lab', label: 'Virtual Enterprise Lab', icon: Network },
    { to: '/demo', label: 'Demo Attack Lab', icon: FlaskConical },
    { to: '/reports', label: 'SOC Reports', icon: FileText },
    { to: '/settings', label: 'Policies & Audits', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-navy-900 border-r border-navy-700/80 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-navy-700/80 bg-navy-950/70">
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

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-royal/20 text-softwhite border border-royal/40 shadow-sm shadow-royal/10'
                    : 'text-mutedslate hover:text-softwhite hover:bg-navy-800/80'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Status */}
      <div className="p-3 border-t border-navy-700/80 bg-navy-950/50">
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
