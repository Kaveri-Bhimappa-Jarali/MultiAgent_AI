import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col relative overflow-x-clip selection:bg-purple-600 selection:text-white">
      {/* Ambient purple/magenta top glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] opacity-25 blur-[120px] -z-10"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #a855f7 0%, #d946ef 45%, transparent 75%)',
        }}
      />

      {/* Secondary cyan ambient accent */}
      <div
        className="pointer-events-none absolute top-48 right-10 w-[550px] h-[280px] opacity-10 blur-[130px] -z-10"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
        }}
      />

      <Navbar />

      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 lg:px-8 py-6 pb-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#161f2e] py-4 px-6 text-center text-xs text-slate-500 bg-[#060810]/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1720px] mx-auto font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">ROYAL SOC PLATFORM v2.4</span>
            <span className="text-slate-600">|</span>
            <span>10 Autonomous AI Agents Active • Dual-Layer Detection (ML + MITRE Rules)</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Enterprise AI Security Operations Center &amp; Automated Threat Response
          </div>
        </div>
      </footer>
    </div>
  );
};