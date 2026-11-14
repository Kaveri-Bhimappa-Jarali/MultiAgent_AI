import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-midnight text-softwhite flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <Outlet />
      </main>
      <footer className="border-t border-navy-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        ROYAL SOC Enterprise Security Operations • Autonomous Multi-Agent Threat Detection &amp; Verified Containment
      </footer>
    </div>
  );
};
