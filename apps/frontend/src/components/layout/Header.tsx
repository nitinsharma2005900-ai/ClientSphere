// ClientSphere Header & Command Palette Trigger
// Developer: Nitin Sharma

'use client';

import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Bell, Plus, CheckCircle2 } from 'lucide-react';
import { CommandPalette } from '../common/CommandPalette';
import Link from 'next/link';

export const Header: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('clientsphere_theme');
      if (stored === 'dark') {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('clientsphere_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('clientsphere_theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between h-20 px-3 md:px-8 border-b border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0]/80 dark:bg-[#070C1B]/80 backdrop-blur-md">
        {/* Search & Quick Command Palette */}
        <div className="flex items-center gap-3 min-w-0 w-auto md:w-96">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center justify-between w-full px-4 py-2 text-sm rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#111B38] text-gray-500 dark:text-gray-400 hover:border-violet-500 shadow-sm transition-all group"
          >
            <span className="flex items-center gap-2.5">
              <Search size={16} className="text-gray-400 group-hover:text-violet-600 transition-colors" />
              <span className="hidden md:inline">Search leads, accounts, deals...</span>
            </span>
            <kbd className="hidden md:inline px-2 py-0.5 text-[11px] font-semibold bg-[#F4F1E4] dark:bg-[#1C2B54] rounded-md border border-[#E2DCBF] dark:border-[#233464]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex items-center gap-4">
          {/* Quick Create Link */}
          <Link
            href="/leads"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> New Prospect
          </Link>

          {/* Notifications Simulator */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#111B38] text-gray-600 dark:text-gray-300 hover:bg-[#F4F1E4] dark:hover:bg-[#1C2B54] transition-colors relative"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-xl z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
                  <span className="font-bold text-sm">System Notifications</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">All Active</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Hot Lead Scoring Verified</p>
                      <p className="text-gray-500">Victoria Sterling scored 85 (HOT) via Inbound Form.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-violet-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Workflow Executed</p>
                      <p className="text-gray-500">Executive Task created for Apex Cloud Migration.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Light/Dark Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#111B38] text-gray-600 dark:text-gray-300 hover:bg-[#F4F1E4] dark:hover:bg-[#1C2B54] transition-colors"
            title={isDark ? 'Switch to Warm Ivory Light Mode' : 'Switch to Deep Navy Dark Mode'}
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-violet-600" />}
          </button>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
};
