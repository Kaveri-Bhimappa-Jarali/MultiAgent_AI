import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col relative overflow-x-clip selection:bg-purple-600 selection:text-white">
      {/* Ambient purple/magenta top glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[340px] opacity-25 blur-[120px] -z-10"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #a855f7 0%, #d946ef 45%, transparent 75%)',
        }}
      />
      
      {/* Secondary cyan ambient accent */}
      <div
        className="pointer-events-none absolute top-48 right-10 w-[500px] h-[250px] opacity-10 blur-[130px] -z-10"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
        }}
      />

      <Navbar />

      <main className="flex-1 w-full max-w-[1680px] mx-auto pb-12">
        <Outlet />
      </main>

      <footer className="border-t border-[#161f2e] py-4 px-6 text-center text-xs text-slate-500 bg-[#060810]/70">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1680px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">SENTINEL SOC PLATFORM v2.4</span>
            <span className="text-slate-600">|</span>
            <span>Correlation Engine & LLM Analysis Pipeline</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            AI-Powered Security Event Correlation and Threat Response Platform
          </div>
        </div>
      </footer>
    </div>
  )
}
