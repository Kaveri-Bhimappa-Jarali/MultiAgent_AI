import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Play, Wifi, WifiOff, Activity } from 'lucide-react';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { status: wsStatus, lastEventTime } = useWebSocket();
  const navigate = useNavigate();

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 transition-all duration-300 bg-navy-900/90 backdrop-blur-md border-b border-navy-700/80 flex items-center justify-between px-6 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Title & Live Engine Badge */}
      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-mutedslate">
          <span>CLASSIFICATION:</span>
          <span className="px-2 py-0.5 rounded bg-navy-800 text-gold border border-gold/30 font-semibold">
            ENTERPRISE SOC PROD-LAB
          </span>
        </div>

        {/* Real-time Streaming State Pill */}
        <div
          onClick={() => navigate('/health-monitor')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-navy-800 border border-slate-700 hover:border-royal text-[11px] font-mono cursor-pointer transition"
          title="Click to open Ingestion & Pipeline Health Monitor"
        >
          {wsStatus === 'CONNECTED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-socsuccess animate-pulse" />
              <span className="text-socsuccess font-semibold">STREAM: LIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-socwarning" />
              <span className="text-socwarning font-semibold">STREAM: {wsStatus}</span>
            </>
          )}
          {lastEventTime && (
            <span className="text-slate-500 hidden xl:inline">
              (Latest: {new Date(lastEventTime).toLocaleTimeString()})
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Quick Launch Demo */}
        <button
          onClick={() => navigate('/demo')}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition text-xs font-medium font-mono"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden md:inline">Launch Demo Attack</span>
        </button>

        {/* Engine Status */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-navy-800 border border-slate-700 text-xs">
          <ShieldCheck className="w-4 h-4 text-socsuccess" />
          <span className="text-mutedslate">Defense Pipeline:</span>
          <span className="text-socsuccess font-mono font-medium">AUTOMATED ACTIVE</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-3 pl-3 border-l border-navy-700">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-royal flex items-center justify-center text-softwhite font-bold text-xs border border-royal/40">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-softwhite leading-none">{user?.full_name || user?.username || 'Analyst'}</span>
              <span className="text-[10px] text-mutedslate mt-0.5 font-mono">{user?.role || 'SOC Analyst'}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-mutedslate hover:text-soccritical hover:bg-navy-800 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
