// ClientSphere Drag-and-Drop Kanban Pipeline & Multi-Rep Collaboration
// Capstone Challenge: Opportunity Teams, Commission Splits & Team Visibility
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateRecordDialog } from '@/components/common/CreateRecordDialog';
import {
  KanbanSquare,
  Plus,
  DollarSign,
  Users,
  ChevronRight,
  Sparkles,
  Building2,
  Calendar,
  X,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';

export default function OpportunitiesKanbanPage() {
  const queryClient = useQueryClient();
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [collaboratorUserId, setCollaboratorUserId] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('SALES_ENGINEER');
  const [commissionShare, setCommissionShare] = useState(0.2);

  // Win/Loss transition state
  const [showWinLossModal, setShowWinLossModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{ dealId: string; stageId: string } | null>(null);
  const [winLossReason, setWinLossReason] = useState('');

  const { data: pipelinesData } = useQuery({
    queryKey: ['pipelinesList'],
    queryFn: async () => {
      const res = await api.get('/pipelines');
      return res.data;
    },
  });

  const { data: dealsData, refetch } = useQuery({
    queryKey: ['opportunitiesList'],
    queryFn: async () => {
      const res = await api.get('/opportunities');
      return res.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['usersDirectory'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const stageTransitionMutation = useMutation({
    mutationFn: async ({ id, stageId, reason }: { id: string; stageId: string; reason?: string }) => {
      return await api.patch(`/opportunities/${id}/stage`, { stageId, winLossReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowWinLossModal(false);
      setPendingTransition(null);
      setWinLossReason('');
    },
    onError: (err: any) => {
      alert(`Stage transition failed: ${err.message}`);
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ dealId, payload }: { dealId: string; payload: any }) => {
      return await api.post(`/opportunities/${dealId}/members`, payload);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['opportunitiesList'] });
      if (selectedDeal) {
        const refreshed = await api.get(`/opportunities/${selectedDeal.id}`);
        setSelectedDeal(refreshed.data);
      }
      setShowAddMemberModal(false);
      alert('Collaborator successfully added to deal team (Capstone Challenge)!');
    },
    onError: (err: any) => {
      alert(`Team member error: ${err.message}`);
    }
  });

  const pipeline = pipelinesData?.[0] || { stages: [] };
  const stages = pipeline.stages || [];
  const deals = dealsData || [];
  const users = usersData || [];

  const handleAdvanceStage = (deal: any, targetStageId: string, isLost: boolean = false) => {
    if (isLost) {
      setPendingTransition({ dealId: deal.id, stageId: targetStageId });
      setShowWinLossModal(true);
    } else {
      stageTransitionMutation.mutate({ id: deal.id, stageId: targetStageId });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <KanbanSquare className="text-violet-600" /> Pipeline Kanban & Deal Collaboration
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Drag, progress stages, enforce win/loss validation rules, and manage multi-representative deal teams.
          </p>
        </div>
        {pipeline.id && <CreateRecordDialog title="New opportunity" endpoint="/opportunities" queryKeys={['opportunitiesList', 'dashboardMetrics']} defaults={{ pipelineId: pipeline.id, stageId: stages[0]?.id }} fields={[{ name: 'title', label: 'Deal title', required: true }, { name: 'value', label: 'Value (USD)', type: 'number', required: true }, { name: 'stageId', label: 'Stage', required: true, options: stages.map((stage: any) => ({ value: stage.id, label: stage.name })) }, { name: 'expectedCloseDate', label: 'Expected close date', type: 'date' }]} />}
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 select-none min-h-[700px]">
        {stages.map((stage: any, stageIdx: number) => {
          const stageDeals = deals.filter((d: any) => d.stageId === stage.id);
          const totalStageVal = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
          const nextStage = stages[stageIdx + 1];

          return (
            <div
              key={stage.id}
              onDragOver={event => event.preventDefault()}
              onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); const deal = deals.find((item: any) => item.id === id); if (deal && deal.stageId !== stage.id) handleAdvanceStage(deal, stage.id, stage.name.toLowerCase().includes('lost')); }}
              className="flex-shrink-0 w-80 flex flex-col rounded-2xl bg-[#FAF9F0] dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] overflow-hidden shadow-sm"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-[#E2DCBF] dark:border-[#233464] bg-white/50 dark:bg-[#070C1B]/40">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE4CF] dark:bg-[#1C2B54] text-gray-700 dark:text-gray-300">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span>${totalStageVal.toLocaleString()}</span>
                  <span>{(stage.winProbability * 100).toFixed(0)}% Probability</span>
                </div>
              </div>

              {/* Deal Cards Container */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {stageDeals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-[#E2DCBF] dark:border-[#233464] rounded-xl">
                    No active deals in stage
                  </div>
                ) : (
                  stageDeals.map((deal: any) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={event => event.dataTransfer.setData('text/plain', deal.id)}
                      className="p-4 rounded-xl bg-white dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464] shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      onClick={async () => {
                        const full = await api.get(`/opportunities/${deal.id}`);
                        setSelectedDeal(full.data);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-[#070C1B] dark:text-[#FAF9F0] group-hover:text-violet-600 transition-colors line-clamp-2">
                          {deal.title}
                        </span>
                      </div>

                      <div className="mt-2 text-sm font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-1">
                        <DollarSign size={14} className="text-emerald-500" />
                        {deal.value?.toLocaleString() || 0}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Building2 size={13} className="text-violet-600" />
                        <span className="truncate">{deal.companyName || 'Corporate Client'}</span>
                      </div>

                      {/* Team Collaboration Members Row (Capstone Challenge) */}
                      <div className="mt-3 pt-2.5 border-t border-[#E2DCBF] dark:border-[#233464] flex items-center justify-between">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {deal.teamMembers?.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              title={`${m.name} (${m.role})`}
                              className="w-6 h-6 rounded-full bg-violet-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-[#070C1B]"
                            >
                              {m.name?.[0] || 'U'}
                            </div>
                          ))}
                        </div>

                        {nextStage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const isLost = nextStage.name.toLowerCase().includes('lost');
                              handleAdvanceStage(deal, nextStage.id, isLost);
                            }}
                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#FAF9F0] dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-1"
                          >
                            Advance <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Opportunity Detail & Team Collaboration Drawer */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
              <div>
                <h3 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0]">{selectedDeal.title}</h3>
                <p className="text-xs text-gray-500">
                  Account: {selectedDeal.company?.name || 'N/A'} • Contact: {selectedDeal.contact?.firstName}{' '}
                  {selectedDeal.contact?.lastName}
                </p>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
                <span className="text-gray-500">Commercial Value</span>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${selectedDeal.value?.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
                <span className="text-gray-500">Current Pipeline Stage</span>
                <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-1">
                  {selectedDeal.stage?.name}
                </div>
              </div>
            </div>

            {/* Capstone Challenge: Multi-Representative Collaboration Team */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Collaborative Deal Team (Capstone Challenge)
                </span>
                <button
                  onClick={() => {
                    setCollaboratorUserId(users[0]?.id || '');
                    setShowAddMemberModal(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-violet-600 text-white flex items-center gap-1 hover:bg-violet-700"
                >
                  <UserPlus size={13} /> Add Collaborator
                </button>
              </div>

              <div className="space-y-2">
                {selectedDeal.teamMembers?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {m.fullName}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-600">
                          {m.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">{m.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-600">
                        {((m.commissionShare || 0) * 100).toFixed(0)}% Split
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedDeal(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add Team Member Modal (Capstone Challenge) */}
      {showAddMemberModal && selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <UserPlus className="text-violet-600" /> Add Representative to Deal Team
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select User / Rep *</label>
                <select
                  value={collaboratorUserId}
                  onChange={(e) => setCollaboratorUserId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#070C1B]"
                >
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Collaboration Role *</label>
                <select
                  value={collaboratorRole}
                  onChange={(e) => setCollaboratorRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#070C1B]"
                >
                  <option value="SALES_ENGINEER">Sales Engineer / Solution Architect</option>
                  <option value="EXECUTIVE_SPONSOR">Executive Sponsor</option>
                  <option value="ACCOUNT_EXECUTIVE">Account Executive</option>
                  <option value="CUSTOMER_SUCCESS">Customer Success Lead</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Commission Split (0.0 to 1.0) *</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={commissionShare}
                  onChange={(e) => setCommissionShare(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={() =>
                addMemberMutation.mutate({
                  dealId: selectedDeal.id,
                  payload: {
                    userId: collaboratorUserId,
                    role: collaboratorRole,
                    canEdit: true,
                    commissionShare,
                  },
                })
              }
              disabled={addMemberMutation.isPending || !collaboratorUserId}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {addMemberMutation.isPending ? 'Adding to Deal...' : 'Confirm Team Member Addition'}
            </button>
          </div>
        </div>
      )}

      {/* Win/Loss Reason Required Modal */}
      {showWinLossModal && pendingTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <ShieldAlert className="text-red-500" /> Closed Lost Reason Required
              </h3>
              <button onClick={() => setShowWinLossModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Enterprise governance requires an explicit win/loss reason when marking a deal as Closed Lost.
            </p>

            <div>
              <label className="font-semibold text-xs block mb-1">Loss Reason *</label>
              <textarea
                rows={3}
                required
                value={winLossReason}
                onChange={(e) => setWinLossReason(e.target.value)}
                placeholder="e.g. Budget postponed to 2027 fiscal year; chosen competitor solution."
                className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent text-xs"
              />
            </div>

            <button
              onClick={() =>
                stageTransitionMutation.mutate({
                  id: pendingTransition.dealId,
                  stageId: pendingTransition.stageId,
                  reason: winLossReason,
                })
              }
              disabled={!winLossReason || stageTransitionMutation.isPending}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
            >
              Confirm Closed Lost Transition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
