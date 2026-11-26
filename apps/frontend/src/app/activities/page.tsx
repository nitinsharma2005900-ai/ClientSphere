// ClientSphere Activity Stream & Timeline Page
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  History,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'NOTE',
    subject: 'Client Briefing Note',
    description: 'Reviewed cloud infrastructure SLA requirements.',
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['activitiesList'],
    queryFn: async () => {
      const res = await api.get('/activities');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/activities', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activitiesList'] });
      setShowAddModal(false);
      setNewActivity({ type: 'NOTE', subject: '', description: '' });
      alert('Activity successfully logged!');
    },
    onError: (err: any) => {
      alert(`Error logging activity: ${err.message}`);
    },
  });

  const activities = activitiesData || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <History className="text-violet-600" /> Customer Activity Timeline
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Chronological audit log of calls, outbound emails, calendar meetings, and deal stage transitions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={16} /> Log Activity
        </button>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-4">
        {activities.map((act: any) => {
          const isCall = act.type === 'CALL';
          const isEmail = act.type === 'EMAIL';
          const isMeeting = act.type === 'MEETING';

          return (
            <div
              key={act.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm flex items-start gap-4"
            >
              <div
                className={`p-2.5 rounded-xl flex-shrink-0 ${
                  isCall
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : isEmail
                    ? 'bg-violet-500/10 text-violet-600'
                    : isMeeting
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-blue-500/10 text-blue-600'
                }`}
              >
                {isCall ? (
                  <Phone size={18} />
                ) : isEmail ? (
                  <Mail size={18} />
                ) : isMeeting ? (
                  <Calendar size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0]">
                    {act.subject}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{act.description}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 font-semibold">
                  <span>Logged by: {act.userName || 'Representative'}</span>
                  <span>•</span>
                  <span>Type: {act.type}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Log Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0]">Log Activity Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Activity Type</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#070C1B]"
                >
                  <option value="NOTE">Note / Observation</option>
                  <option value="CALL">Phone Call</option>
                  <option value="EMAIL">Email Thread</option>
                  <option value="MEETING">Meeting / Demo</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => createMutation.mutate(newActivity)}
              disabled={createMutation.isPending || !newActivity.subject}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {createMutation.isPending ? 'Logging Activity...' : 'Save Activity Entry'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
