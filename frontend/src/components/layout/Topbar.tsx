import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Play, Wifi, WifiOff } from 'lucide-react';
import { formatSocTimestamp } from '../../utils/timestamps.js';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { status: wsStatus, lastEventTime } = useWebSocket();
  const navigate = useNavigate();

  const isConnected = wsStatus === 'CONNECTED';

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 transition-all duration-300 flex items-center justify-between px-6 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
      style={{
        background: 'rgba(7,11,22,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(109,90,230,0.12)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)'
      }}
    >
      {/* Left: Classification + Live Status */}
      <div className="flex items-center space-x-4">
        {/* Classification Badge */}
        <div
          className="hidden sm:flex items-center space-x-2 text-[11px] font-mono"
          style={{ color: 'rgba(148,163,184,0.7)' }}
        >
          <span>CLASSIFICATION:</span>
          <span
            className="px-2 py-0.5 rounded font-semibold tracking-wide"
            style={{
              background: 'rgba(216,184,117,0.1)',
              color: '#D8B875',
              border: '1px solid rgba(216,184,117,0.3)'
            }}
          >
            ENTERPRISE SOC PROD-LAB
          </span>
        </div>

        {/* Live Stream Status Pill */}
        <button
          onClick={() => navigate('/health-monitor')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono transition-all duration-200"
          style={
            isConnected
              ? {
                  background: 'rgba(45,190,133,0.08)',
                  border: '1px solid rgba(45,190,133,0.3)',
                  color: '#2DBE85',
                  boxShadow: '0 0 12px rgba(45,190,133,0.15)'
                }
              : {
                  background: 'rgba(244,185,66,0.08)',
                  border: '1px solid rgba(244,185,66,0.3)',
                  color: '#F4B942'
                }
          }
          title="Click to open Ingestion & Pipeline Health Monitor"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={
              isConnected
                ? { background: '#2DBE85', boxShadow: '0 0 6px rgba(45,190,133,0.8)', animation: 'pulse 2s infinite' }
                : { background: '#F4B942' }
            }
          />
          {isConnected ? (
            <><Wifi className="w-3 h-3" /><span className="font-semibold">STREAM: LIVE</span></>
          ) : (
            <><WifiOff className="w-3 h-3" /><span className="font-semibold">STREAM: {wsStatus}</span></>
          )}
          {lastEventTime && (
            <span className="hidden xl:inline opacity-60">
              · {formatSocTimestamp(lastEventTime)}
            </span>
          )}
        </button>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center space-x-3">
        {/* Defense Pipeline Badge */}
        <div
          className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl text-[11px] font-mono"
          style={{
            background: 'rgba(45,190,133,0.06)',
            border: '1px solid rgba(45,190,133,0.15)',
            color: 'rgba(148,163,184,0.7)'
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#2DBE85' }} />
          <span>Defense Pipeline:</span>
          <span className="font-semibold" style={{ color: '#2DBE85' }}>ACTIVE</span>
        </div>

        {/* Launch Demo Button */}
        <button
          onClick={() => navigate('/demo')}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(216,184,117,0.15), rgba(216,184,117,0.08))',
            color: '#D8B875',
            border: '1px solid rgba(216,184,117,0.35)',
            boxShadow: '0 0 12px rgba(216,184,117,0.1)'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(216,184,117,0.25), rgba(216,184,117,0.15))';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(216,184,117,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(216,184,117,0.15), rgba(216,184,117,0.08))';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(216,184,117,0.1)';
          }}
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="hidden md:inline">Launch Demo</span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px" style={{ background: 'rgba(109,90,230,0.2)' }} />

        {/* User */}
        <div className="flex items-center space-x-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6D5AE6, #9B8DF2)',
              boxShadow: '0 0 12px rgba(109,90,230,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-none">
              {user?.full_name || user?.username || 'Analyst'}
            </span>
            <span className="text-[10px] mt-0.5 font-mono" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {user?.role || 'SOC Analyst'}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg transition-all duration-200"
            style={{ color: 'rgba(148,163,184,0.6)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#F05265';
              (e.currentTarget as HTMLElement).style.background = 'rgba(240,82,101,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.6)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
