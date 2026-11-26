// ClientSphere Modern Collapsible Sidebar & Role Switcher
// Developer: Nitin Sharma

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, RoleType } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users2,
  Contact,
  Building2,
  KanbanSquare,
  History,
  CheckSquare,
  Workflow,
  FileSpreadsheet,
  Boxes,
  LineChart,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, role, switchRole, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (window.innerWidth < 768) setCollapsed(true); }, []);

  const navItems = [
    { label: 'Sales Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Leads & Scoring', href: '/leads', icon: Users2 },
    { label: 'Contacts', href: '/contacts', icon: Contact },
    { label: 'Accounts / Companies', href: '/companies', icon: Building2 },
    { label: 'Kanban Pipeline', href: '/opportunities', icon: KanbanSquare },
    { label: 'Activity Timeline', href: '/activities', icon: History },
    { label: 'My Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Workflow Automations', href: '/workflows', icon: Workflow },
    { label: 'CSV Import Engine', href: '/imports', icon: FileSpreadsheet },
    { label: 'Integrations Sandbox', href: '/integrations', icon: Boxes },
    { label: 'Sales Intelligence', href: '/analytics', icon: LineChart },
  ];

  if (role === 'ADMINISTRATOR' || role === 'SALES_MANAGER') {
    navItems.push({ label: 'Audit Compliance', href: '/audit-logs', icon: ShieldAlert });
  }

  const rolesList: { role: RoleType; label: string; badge: string }[] = [
    { role: 'ADMINISTRATOR', label: 'Administrator', badge: 'Full Access' },
    { role: 'SALES_MANAGER', label: 'Sales Manager', badge: 'Team Oversight' },
    { role: 'SALES_REPRESENTATIVE', label: 'Sales Rep', badge: 'Assigned Deals' },
    { role: 'MARKETING_USER', label: 'Marketing User', badge: 'Leads & Import' },
    { role: 'SUPPORT_USER', label: 'Support User', badge: 'Service Timeline' },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#0B132B] transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-20 px-5 border-b border-[#E2DCBF] dark:border-[#233464]">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-emerald-500 shadow-md shadow-violet-500/20 text-white font-bold flex-shrink-0">
            CS
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-[#070C1B] dark:text-[#FAF9F0] leading-none">
                ClientSphere
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wider">
                Enterprise CRM
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-[#EAE4CF] dark:hover:bg-[#1C2B54] transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Role Switcher Pill */}
      {!collapsed ? (
        <div className="mx-4 my-3 p-3 rounded-xl bg-[#F4F1E4] dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <Zap size={14} className="text-violet-600 dark:text-violet-400" /> Active Role Demo
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
              {role}
            </span>
          </div>
          <select
            value={role}
            onChange={(e) => switchRole(e.target.value as RoleType)}
            className="w-full text-xs font-medium py-1.5 px-2 rounded-lg bg-white dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464] text-[#070C1B] dark:text-[#FAF9F0] focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {rolesList.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label} ({r.badge})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex justify-center my-2">
          <div
            className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-600 flex items-center justify-center font-bold text-xs"
            title={`Active Role: ${role}`}
          >
            {role[0]}
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-md shadow-violet-600/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-[#EAE4CF] dark:hover:bg-[#1C2B54]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-violet-600 dark:text-violet-400'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

<button onClick={logout} className="mx-4 mb-3 rounded-lg border border-violet-300 p-2 text-sm text-violet-700">Sign out</button>
      {/* User Session Footer */}
      <div className="p-4 border-t border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : 'NS'}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Nitin Sharma'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email || 'admin@clientsphere.io'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
