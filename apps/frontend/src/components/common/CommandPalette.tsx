// ClientSphere Quick Command Palette (Cmd+K)
// Developer: Nitin Sharma

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Building, Kanban, Workflow, Boxes, LineChart, ArrowRight, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = [
    { title: 'Go to Sales Dashboard', category: 'Navigation', href: '/', icon: LineChart },
    { title: 'View Kanban Pipeline', category: 'Navigation', href: '/opportunities', icon: Kanban },
    { title: 'Manage Leads & Scoring', category: 'Navigation', href: '/leads', icon: Users },
    { title: 'Inspect Multi-Company Contacts', category: 'Navigation', href: '/contacts', icon: Users },
    { title: 'Browse Accounts & Hierarchy', category: 'Navigation', href: '/companies', icon: Building },
    { title: 'Open Workflow Automations', category: 'Tools', href: '/workflows', icon: Workflow },
    { title: 'Launch CSV Lead Import Wizard', category: 'Tools', href: '/imports', icon: Boxes },
    { title: 'Explore Sandbox Integrations', category: 'Tools', href: '/integrations', icon: Boxes },
    { title: 'View Sales Velocity & Forecasting', category: 'Analytics', href: '/analytics', icon: LineChart },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        router.push(filtered[selectedIndex].href);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl overflow-hidden animate-slide-up">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E2DCBF] dark:border-[#233464]">
          <Search size={20} className="text-gray-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, pages, or entities..."
            autoFocus
            className="w-full text-sm bg-transparent text-[#070C1B] dark:text-[#FAF9F0] placeholder-gray-400 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">No matching commands found.</div>
          ) : (
            filtered.map((action, idx) => {
              const Icon = action.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.title}
                  onClick={() => {
                    router.push(action.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-[#F4F1E4] dark:hover:bg-[#1C2B54]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isSelected ? 'text-white' : 'text-violet-600 dark:text-violet-400'} />
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F4F1E4] dark:bg-[#1C2B54] text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {action.category}
                    </span>
                    {isSelected && <ArrowRight size={14} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Command Helper Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] text-[11px] text-gray-500 dark:text-gray-400">
          <span>Use ↑ ↓ to navigate</span>
          <span>Press ↵ to select</span>
          <span>ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
