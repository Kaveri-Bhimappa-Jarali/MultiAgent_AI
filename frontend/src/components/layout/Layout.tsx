import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const narrowScreen = window.matchMedia('(max-width: 767px)');
    const collapseOnNarrowScreen = () => {
      if (narrowScreen.matches) setCollapsed(true);
    };
    narrowScreen.addEventListener('change', collapseOnNarrowScreen);
    return () => narrowScreen.removeEventListener('change', collapseOnNarrowScreen);
  }, []);

  return (
    <div className="min-h-screen bg-midnight text-softwhite">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Topbar sidebarCollapsed={collapsed} />
      <main
        className={`transition-all duration-300 pt-20 pb-12 px-3 sm:px-6 min-h-screen ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
