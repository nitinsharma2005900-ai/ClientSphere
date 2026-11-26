// ClientSphere Executive Sales Intelligence Dashboard
// Interactive KPI Counters, Animated Pipeline Waterfall & Sales Velocity Matrix
// Developer: Nitin Sharma

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  Zap,
  Target,
  ArrowUpRight,
  Flame,
  Clock,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
  });

  const { data: forecastData } = useQuery({
    queryKey: ['salesForecast'],
    queryFn: async () => {
      const res = await api.get('/analytics/forecast');
      return res.data;
    },
  });

  const kpis = dashboardData?.kpis || {
    totalPipelineValue: 0,
    totalWonRevenue: 0,
    weightedForecast: 0,
    winRate: 0,
    avgDealSize: 0,
    salesVelocityPerDay: 0,
    monthlyProjectedRevenue: 0,
    totalLeads: 0,
    openDealsCount: 0,
  };

  const distribution = dashboardData?.leadDistribution || {
    hot: 0,
    warm: 0,
    cold: 0,
    total: 0,
  };

  const waterfall = dashboardData?.conversionWaterfall || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#070C1B] dark:text-[#FAF9F0]">
              Sales Intelligence Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time pipeline analytics, deterministic velocity projections, and deal health tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/opportunities"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Layers size={16} /> Open Kanban Pipeline
          </Link>
          <Link
            href="/leads"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#111B38] text-gray-700 dark:text-gray-200 hover:bg-[#F4F1E4] dark:hover:bg-[#1C2B54] transition-all"
          >
            <Flame size={16} className="text-amber-500" /> Lead Radar
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Active Pipeline */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Pipeline
            </span>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0]">
              ${kpis.totalPipelineValue.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={14} />
              <span>{kpis.openDealsCount} Qualified Deals in Flight</span>
            </div>
          </div>
        </div>

        {/* Weighted Forecast */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Weighted Forecast
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0]">
              ${kpis.weightedForecast.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-violet-600 dark:text-violet-400">
              <span>Calibrated via stage win probabilities</span>
            </div>
          </div>
        </div>

        {/* Sales Velocity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Sales Velocity / Day
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Zap size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0]">
              ${kpis.salesVelocityPerDay.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>${kpis.monthlyProjectedRevenue.toLocaleString()} Projected / Mo</span>
            </div>
          </div>
        </div>

        {/* Win Rate & Avg Deal Size */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Win Rate Efficiency
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0]">
              {(kpis.winRate * 100).toFixed(1)}%
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Avg Deal: ${kpis.avgDealSize.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pipeline Stage Waterfall Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <BarChart3 size={18} className="text-violet-600" /> Pipeline Conversion Waterfall
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Stage progression volume, deal values, and progressive conversion probabilities
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
              Global Funnel
            </span>
          </div>

          <div className="space-y-5">
            {waterfall.map((stage: any) => {
              const maxVal = 200000;
              const widthPct = Math.min(100, Math.max(15, (stage.totalValue / maxVal) * 100));

              return (
                <div key={stage.stageName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.stageName}
                    </span>
                    <span className="text-[#070C1B] dark:text-[#FAF9F0]">
                      ${stage.totalValue.toLocaleString()}{' '}
                      <span className="text-gray-400 font-normal">({stage.dealCount} deals)</span>
                    </span>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-[#F4F1E4] dark:bg-[#070C1B] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Prioritization & Scoring Radar (1 col) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <Flame size={18} className="text-amber-500" /> Lead Priority Tiers
              </h2>
              <span className="text-xs text-gray-500">Assessment 05</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              AI & deterministic multi-factor scoring distribution across inbound leads.
            </p>

            <div className="space-y-4">
              {/* Hot Leads */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> HOT Tier (Score ≥ 70)
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                    {distribution.hot} leads
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Direct outreach priority: C-Level / Verified Enterprise.</p>
              </div>

              {/* Warm Leads */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> WARM Tier (Score 40–69)
                  </span>
                  <span className="text-amber-700 dark:text-amber-300 font-extrabold text-sm">
                    {distribution.warm} leads
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Automated 5-step email sandbox nurture cadence.</p>
              </div>

              {/* Cold Leads */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> COLD Tier (Score &lt; 40)
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 font-extrabold text-sm">
                    {distribution.cold} leads
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Quarterly marketing content digest queue.</p>
              </div>
            </div>
          </div>

          <Link
            href="/imports"
            className="mt-6 w-full py-2.5 px-4 text-center rounded-xl text-xs font-bold bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464] hover:border-violet-500 text-gray-700 dark:text-gray-300 transition-colors block"
          >
            Import New Leads via CSV Wizard →
          </Link>
        </div>
      </div>

      {/* Quarterly Forecast Projection Bar */}
      {forecastData?.quarterlyProjections && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500" /> 2026 Predictive Quarterly Revenue Projections
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Weighted probability curves calculated by FastAPI sales intelligence service
              </p>
            </div>
            <span className="text-xs text-gray-500 font-medium">Confidence: 92%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecastData.quarterlyProjections.map((q: any) => (
              <div
                key={q.quarter}
                className="p-4 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]"
              >
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{q.quarter}</span>
                <div className="mt-2 text-xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0]">
                  ${(q.weighted + q.closedWon).toLocaleString()}
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                  <div className="flex justify-between">
                    <span>Commit (≥70%):</span>
                    <span className="font-semibold text-emerald-600">${q.commit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Case (≥40%):</span>
                    <span className="font-semibold text-violet-600">${q.bestCase.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
