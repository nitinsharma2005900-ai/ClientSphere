// ClientSphere Leads & Scoring Management Page
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Users2,
  Plus,
  Flame,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLeadData, setConvertLeadData] = useState<any | null>(null);

  // New Lead form state
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    jobTitle: '',
    source: 'INBOUND_FORM',
  });

  // Convert form state
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState(75000);

  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ['leadsList'],
    queryFn: async () => {
      const res = await api.get('/leads?limit=50');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/leads', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadsList'] });
      setShowAddModal(false);
      setNewLead({ firstName: '', lastName: '', email: '', phone: '', companyName: '', jobTitle: '', source: 'INBOUND_FORM' });
      alert('New lead successfully registered!');
    },
    onError: (err: any) => {
      alert(`Error creating lead: ${err.message}`);
    },
  });

  const convertMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.post(`/leads/${id}/convert`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadsList'] });
      setShowConvertModal(false);
      setConvertLeadData(null);
      alert('Lead successfully converted into Contact, Company & Opportunity!');
    },
    onError: (err: any) => {
      alert(`Conversion Error: ${err.message}`);
    }
  });

  const leads = leadsData || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <Users2 className="text-violet-600" /> Lead Radar & Scoring Engine
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Capture prospects with automated deterministic scoring, factor explainability, and atomic deal conversion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#111B38] text-gray-600 dark:text-gray-300 hover:bg-[#F4F1E4] transition-colors"
            title="Refresh Leads"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5">Prospect Contact</th>
                <th className="py-3.5 px-5">Company & Role</th>
                <th className="py-3.5 px-5">Lead Score & Tier</th>
                <th className="py-3.5 px-5">Source</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCBF] dark:divide-[#233464]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No leads found. Create one or run the CSV import wizard!
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => {
                  const isHot = lead.priorityTier === 'HOT';
                  const isWarm = lead.priorityTier === 'WARM';

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#FAF9F0]/60 dark:hover:bg-[#1C2B54]/40 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0]">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-semibold text-gray-900 dark:text-gray-200">
                          {lead.companyName || 'Individual Entity'}
                        </div>
                        <div className="text-gray-500 mt-0.5">{lead.jobTitle || 'Executive'}</div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="font-extrabold text-sm underline decoration-dotted hover:text-violet-600 transition-colors"
                          >
                            {lead.score}/100
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHot
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : isWarm
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            }`}
                          >
                            {lead.priorityTier}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-gray-600 dark:text-gray-400 font-medium">
                        {lead.source}
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            lead.status === 'CONVERTED'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#F4F1E4] dark:bg-[#1C2B54] text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        {lead.status !== 'CONVERTED' ? (
                          <button
                            onClick={() => {
                              setConvertLeadData(lead);
                              setDealTitle(`${lead.companyName || lead.lastName} Enterprise Deal`);
                              setShowConvertModal(true);
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                          >
                            Convert to Deal →
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">Converted</span>
                        )}
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E2DCBF] dark:border-[#233464] hover:bg-[#EAE4CF] dark:hover:bg-[#1C2B54] transition-colors"
                        >
                          Factors
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explainable Lead Score Drawer / Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
              <div>
                <h3 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-600" /> Explainable Scoring Breakdown
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedLead.firstName} {selectedLead.lastName} ({selectedLead.companyName})
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Calculated Score</span>
                <div className="text-3xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0]">
                  {selectedLead.score} / 100
                </div>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs ${
                  selectedLead.priorityTier === 'HOT'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {selectedLead.priorityTier} PRIORITY
              </div>
            </div>

            {/* Factor breakdown chips */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase">Decision Factors Contributed:</span>
              {selectedLead.scoreFactors && selectedLead.scoreFactors.length > 0 ? (
                selectedLead.scoreFactors.map((factor: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#0B132B]"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-violet-600 dark:text-violet-400">{factor.factor}</span>
                      <span className="text-emerald-600">+{factor.points} pts</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{factor.explanation}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Standard demographic baseline points applied.</p>
              )}
            </div>

            <button
              onClick={() => setSelectedLead(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0]">Register New Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.firstName}
                    onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                    placeholder="e.g. Liam"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.lastName}
                    onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                    placeholder="e.g. Vance"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Business Email *</label>
                <input
                  type="email"
                  required
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  placeholder="l.vance@enterprise.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Company</label>
                  <input
                    type="text"
                    value={newLead.companyName}
                    onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                    placeholder="OmniCorp"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newLead.jobTitle}
                    onChange={(e) => setNewLead({ ...newLead, jobTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                    placeholder="VP of Engineering"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  placeholder="+1-555-0199"
                />
              </div>
            </div>

            <button
              onClick={() => createMutation.mutate(newLead)}
              disabled={!newLead.firstName || !newLead.email || createMutation.isPending}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {createMutation.isPending ? 'Scoring & Registering...' : 'Save & Calculate Score'}
            </button>
          </div>
        </div>
      )}

      {/* Atomic Conversion Modal */}
      {showConvertModal && convertLeadData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Convert Lead to Qualified Deal
              </h3>
              <button onClick={() => setShowConvertModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Atomically creates a Contact profile, links Account/Company, generates a new Opportunity, and registers timeline activities.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Deal Value (USD) *</label>
                <input
                  type="number"
                  min="0"
                  value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={() =>
                convertMutation.mutate({
                  id: convertLeadData.id,
                  payload: { dealTitle, dealValue },
                })
              }
              disabled={convertMutation.isPending || !dealTitle}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
            >
              {convertMutation.isPending ? 'Executing Atomic Conversion...' : 'Confirm Atomic Conversion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
