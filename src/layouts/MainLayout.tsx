import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { DemoDataBadge } from '../components/common/DemoDataBadge';
import { GlobalSearchModal } from '../components/common/GlobalSearchModal';

export const MainLayout: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-[#1E293B]">
      {/* Official Demo Mode Notice */}
      <DemoDataBadge />

      {/* Primary University Header */}
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Main Page Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Official University Footer */}
      <Footer />

      {/* Universal Search Modal (Triggered by button or Ctrl+K) */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

