// ClientSphere Accounts & Corporate Hierarchy Page
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Building2,
  Plus,
  Users,
  DollarSign,
  Globe,
  Briefcase,
  Layers,
  ChevronRight,
  X,
} from 'lucide-react';

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCompany, setNewCompany] = useState({
    name: '',
    domain: '',
    industry: 'Enterprise Software & Cloud',
    employeeCount: 500,
    annualRevenue: 25000000,
    tier: 'ENTERPRISE_STRATEGIC',
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companiesList'],
    queryFn: async () => {
      const res = await api.get('/companies?limit=50');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/companies', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companiesList'] });
      setShowAddModal(false);
      setNewCompany({ name: '', domain: '', industry: 'Enterprise Software & Cloud', employeeCount: 500, annualRevenue: 25000000, tier: 'ENTERPRISE_STRATEGIC' });
      alert('Company successfully created!');
    },
    onError: (err: any) => {
      alert(`Error creating company: ${err.message}`);
    },
  });

  const companies = companiesData || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <Building2 className="text-violet-600" /> Accounts & Corporate Hierarchy
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Parent-subsidiary corporate account trees, associated executive contacts, and active pipeline valuations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={16} /> New Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map((comp: any) => (
          <div
            key={comp.id}
            onClick={async () => {
              const full = await api.get(`/companies/${comp.id}`);
              setSelectedCompany(full.data);
            }}
            className="p-5 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-extrabold text-base text-[#070C1B] dark:text-[#FAF9F0] group-hover:text-violet-600 transition-colors">
                  {comp.name}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <Globe size={12} className="text-violet-600" />
                  <span>{comp.domain || 'internal-domain.io'}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                {comp.tier || 'MID_MARKET'}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2DCBF] dark:border-[#233464] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Employees</span>
                <div className="font-bold text-gray-800 dark:text-gray-200">{comp.employeeCount || 250}+</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Contacts</span>
                <div className="font-bold text-violet-600">{comp.contactCount || 1}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Pipeline</span>
                <div className="font-bold text-emerald-600">
                  ${(comp.totalPipelineValue || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Details & Subsidiary Hierarchy Drawer */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
              <div>
                <h3 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0]">{selectedCompany.name}</h3>
                <p className="text-xs text-gray-500">{selectedCompany.industry}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Corporate Hierarchy Information */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Corporate Hierarchy & Subsidiaries
              </span>
              {selectedCompany.parentCompany && (
                <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464] text-xs">
                  <span className="text-gray-500">Parent Organization:</span>{' '}
                  <span className="font-bold text-violet-600">{selectedCompany.parentCompany.name}</span>
                </div>
              )}
              {selectedCompany.subsidiaries?.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 font-semibold">Subsidiaries:</span>
                  {selectedCompany.subsidiaries.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg border border-[#E2DCBF] dark:border-[#233464] text-xs font-bold"
                    >
                      {sub.name} ({sub.industry})
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">No child subsidiaries registered under this entity.</div>
              )}
            </div>

            {/* Associated Contacts */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Associated Contacts ({selectedCompany.contacts?.length || 0})
              </span>
              <div className="space-y-2">
                {selectedCompany.contacts?.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#070C1B] dark:text-[#FAF9F0]">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-gray-500">{c.jobTitle}</div>
                    </div>
                    {c.isPrimary && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                        PRIMARY
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedCompany(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0]">Create Corporate Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  placeholder="Apex Global Cloud Solutions"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Domain</label>
                <input
                  type="text"
                  value={newCompany.domain}
                  onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  placeholder="apexcloud.io"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Industry</label>
                <input
                  type="text"
                  value={newCompany.industry}
                  onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Employees</label>
                  <input
                    type="number"
                    value={newCompany.employeeCount}
                    onChange={(e) => setNewCompany({ ...newCompany, employeeCount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Annual Revenue ($)</label>
                  <input
                    type="number"
                    value={newCompany.annualRevenue}
                    onChange={(e) => setNewCompany({ ...newCompany, annualRevenue: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => createMutation.mutate(newCompany)}
              disabled={createMutation.isPending || !newCompany.name}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {createMutation.isPending ? 'Saving Account...' : 'Register Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
