'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  CheckSquare, 
  Mail, 
  LogOut, 
  Menu, 
  X, 
  User
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

interface NavigationSidebarProps {
  userEmail: string;
  userFullName: string | null;
}

export default function NavigationSidebar({ userEmail, userFullName }: NavigationSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Pipeline', href: '/pipeline', icon: Kanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Email Sequences', href: '/sequences', icon: Mail },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      setLoggingOut(true);
      await logoutAction();
      router.push('/');
      router.refresh();
    }
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-[#06b6d4]/10 text-[#06b6d4] border-l-2 border-[#06b6d4]'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/20'
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Navbar (Visible on mobile only, hidden on md) */}
      <div className="md:hidden flex items-center justify-between bg-[#0f1a1c] border-b border-[#1a2e30] px-4 py-3 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#06b6d4] flex items-center justify-center font-bold text-[#09100f]">
            S
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Solo<span className="text-[#06b6d4]">CRM</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-neutral-400 hover:text-white focus:outline-none p-1.5 rounded-lg border border-[#1a2e30]"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          {/* Drawer Content */}
          <div className="relative flex flex-col w-4/5 max-w-sm bg-[#0f1a1c] border-r border-[#1a2e30] h-full p-6 text-neutral-100 transition-transform duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#06b6d4] flex items-center justify-center font-bold text-[#09100f]">
                  S
                </div>
                <span className="font-bold text-lg tracking-tight text-white">
                  Solo<span className="text-[#06b6d4]">CRM</span>
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg border border-[#1a2e30]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links inside mobile drawer */}
            <div className="flex-1 overflow-y-auto">
              <NavLinks onClick={() => setMobileMenuOpen(false)} />
            </div>

            {/* User profile & logout inside mobile drawer */}
            <div className="border-t border-[#1a2e30] pt-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1a2e30] flex items-center justify-center text-[#06b6d4] font-semibold border border-[#06b6d4]/20">
                  {userFullName ? userFullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate">{userFullName || 'User'}</p>
                  <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-900/80 text-red-400 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Hidden on mobile, visible on md+) */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-[#0f1a1c] border-r border-[#1a2e30] p-6 justify-between z-30">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-[#06b6d4] flex items-center justify-center font-bold text-[#09100f] text-lg">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Solo<span className="text-[#06b6d4]">CRM</span>
            </span>
          </div>

          {/* Navigation Links */}
          <NavLinks />
        </div>

        {/* User Account & Logout */}
        <div className="border-t border-[#1a2e30] pt-6 mt-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#1a2e30] flex items-center justify-center text-[#06b6d4] font-semibold border border-[#06b6d4]/20">
              {userFullName ? userFullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{userFullName || 'Solo Founder'}</p>
              <p className="text-xs text-neutral-400 truncate" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 bg-red-950/10 hover:bg-red-950/30 border border-red-900/30 hover:border-red-900/60 text-red-400 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>
    </>
  );
}
