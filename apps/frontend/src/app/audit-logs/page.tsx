// ClientSphere Enterprise Audit & Compliance Log Page (Assessment 04)
// Restricted to Administrator and Sales Manager Roles
// Developer: Nitin Sharma

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ShieldCheck, Lock, Clock, UserCheck } from 'lucide-react';

export default function AuditLogsPage() {
  const { role } = useAuth();

  const isAuthorized = role === 'ADMINISTRATOR' || role === 'SALES_MANAGER';

  const { data: auditData } = useQuery({
    queryKey: ['auditLogsList'],
    queryFn: async () => {
      const res = await api.get('/audit-logs');
      return res.data;
    },
    enabled: isAuthorized,
  });

  const logs = auditData || [];

  if (!isAuthorized) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#070C1B] dark:text-[#FAF9F0]">Access Restricted (RBAC)</h2>
        <p className="text-xs text-gray-500">
          Enterprise Audit Logs are restricted to Administrator and Sales Manager roles. Use the Active Role Switcher in the sidebar to switch roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
          <ShieldAlert className="text-violet-600" /> Enterprise Compliance & Audit Trail
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Assessment 04: Record ownership audits, sensitive customer data access logs, and tenant isolation history.
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] text-gray-500 uppercase font-bold">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">User & Role</th>
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-5">Entity Target</th>
                <th className="py-3 px-5">Sensitive Data Flag</th>
                <th className="py-3 px-5 text-right">IP Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCBF] dark:divide-[#233464]">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-[#FAF9F0]/60 dark:hover:bg-[#1C2B54]/40">
                  <td className="py-3.5 px-5 font-mono text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-bold text-[#070C1B] dark:text-[#FAF9F0]">{log.userName}</span>
                    <span className="block text-[10px] text-violet-600 font-semibold">{log.userRole}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-violet-500/10 text-violet-600">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-gray-600 dark:text-gray-300">
                    {log.entityType}:{log.entityId?.substring(0, 8)}
                  </td>
                  <td className="py-3.5 px-5">
                    {log.sensitiveFieldAccessed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        AUDITED SENSITIVE
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Standard Access</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-gray-500">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
