// ClientSphere Deep Sales Intelligence & Velocity Forecasting (Assessment 06)
// Developer: Nitin Sharma

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LineChart, Calculator, TrendingUp, Sparkles, Target, Zap, ShieldCheck } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
  });

  const { data: forecastData } = useQuery({
    queryKey: ['forecastDetails'],
    queryFn: async () => {
      const res = await api.get('/analytics/forecast');
      return res.data;
    },
  });

  const kpis = dashboardData?.kpis || {
    totalPipelineValue: 0,
    salesVelocityPerDay: 0,
    monthlyProjectedRevenue: 0,
    winRate: 0,
    avgDealSize: 0,
    openDealsCount: 0,
    salesCycleDays: 0,
  };

  const waterfall = dashboardData?.conversionWaterfall || [];
  const quarterly = forecastData?.quarterlyForecast || [];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
          <LineChart className="text-violet-600" /> Sales Intelligence & Velocity Math
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Assessment 06: Documented assumptions, mathematical velocity calculations, and predictive forecasting.
        </p>
      </div>

      <button onClick={() => api.download('/analytics/forecast/pdf', 'clientsphere-sales-forecast.pdf').catch(error => alert(error.message))} className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold">Download forecast PDF</button>
      {/* Sales Velocity Formula Breakdown Box */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
          <h2 className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <Calculator className="text-emerald-500" /> Mathematical Sales Velocity Formula
          </h2>
          <span className="text-xs font-mono font-bold text-violet-600">V = (L × WR × AS) / T</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
          <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
            <span className="text-gray-500 font-semibold">Active Qualified Deals (L)</span>
            <div className="text-xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] mt-1">
              {kpis.openDealsCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
            <span className="text-gray-500 font-semibold">Historical Win Rate (WR)</span>
            <div className="text-xl font-extrabold text-blue-600 mt-1">
              {(kpis.winRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
            <span className="text-gray-500 font-semibold">Average Deal Size (AS)</span>
            <div className="text-xl font-extrabold text-emerald-600 mt-1">
              ${kpis.avgDealSize.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464]">
            <span className="text-gray-500 font-semibold">Sales Cycle Duration (T)</span>
            <div className="text-xl font-extrabold text-amber-500 mt-1">{(kpis.salesCycleDays || 34.5).toFixed(1)} Days</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-violet-700 dark:text-violet-300">Daily Revenue Yield:</span>{' '}
            <span className="font-extrabold text-base text-[#070C1B] dark:text-[#FAF9F0]">
              ${kpis.salesVelocityPerDay.toLocaleString()} / Day
            </span>
          </div>
          <div>
            <span className="font-bold text-violet-700 dark:text-violet-300">30-Day Projected Yield:</span>{' '}
            <span className="font-extrabold text-base text-emerald-600">
              ${kpis.monthlyProjectedRevenue.toLocaleString()} / Month
            </span>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
          <Zap className="text-amber-500" /> Pipeline Sensitivity Analysis (±10% Tolerance)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <span className="font-bold text-red-600 uppercase">Pessimistic Scenario (-10%)</span>
            <div className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] mt-1">
              ${Math.round(kpis.monthlyProjectedRevenue * 0.81).toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Assumes 10% lower win rate & deal compression.</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <span className="font-bold text-blue-600 uppercase">Baseline Yield</span>
            <div className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] mt-1">
              ${kpis.monthlyProjectedRevenue.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Current calibrated enterprise baseline.</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="font-bold text-emerald-600 uppercase">Optimistic Scenario (+10%)</span>
            <div className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] mt-1">
              ${Math.round(kpis.monthlyProjectedRevenue * 1.21).toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Assumes 10% acceleration and deal expansion.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
