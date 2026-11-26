// ClientSphere Task Management Page
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: 'Follow-up on revised proposal terms',
    priority: 'HIGH',
    dueDate: '2026-12-05',
  });

  const { data: tasksData, refetch } = useQuery({
    queryKey: ['tasksList'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data;
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.put(`/tasks/${id}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasksList'] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/tasks', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasksList'] });
      setShowAddModal(false);
      alert('Task created successfully!');
    },
    onError: (err: any) => {
      alert(`Error creating task: ${err.message}`);
    },
  });

  const tasks = tasksData || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <CheckSquare className="text-violet-600" /> Representative Action Tasks
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Prioritized follow-ups, contract reviews, and scheduled client outreach deadlines.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="space-y-3">
        {tasks.map((task: any) => {
          const isCompleted = task.status === 'COMPLETED';
          const isUrgent = task.priority === 'URGENT' || task.priority === 'HIGH';

          return (
            <div
              key={task.id}
              className={`p-4 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm flex items-center justify-between gap-4 transition-all ${
                isCompleted ? 'opacity-60 bg-[#FAF9F0]/60' : ''
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  onClick={() =>
                    toggleTaskMutation.mutate({
                      id: task.id,
                      status: isCompleted ? 'TODO' : 'COMPLETED',
                    })
                  }
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-[#E2DCBF] dark:border-[#233464] hover:border-violet-600'
                  }`}
                >
                  {isCompleted && <CheckCircle2 size={14} />}
                </button>
                <div>
                  <span
                    className={`font-bold text-xs text-[#070C1B] dark:text-[#FAF9F0] ${
                      isCompleted ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                    <span>Target: {task.targetName || 'General Follow-up'}</span>
                    <span>•</span>
                    <span>Assignee: {task.assigneeName || 'David Kim'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isUrgent
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  }`}
                >
                  {task.priority}
                </span>
                {task.dueDate && (
                  <span className="text-xs font-mono text-gray-500 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0]">Create Action Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#070C1B]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => createTaskMutation.mutate(newTask)}
              disabled={createTaskMutation.isPending || !newTask.title}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {createTaskMutation.isPending ? 'Creating Task...' : 'Schedule Task'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
