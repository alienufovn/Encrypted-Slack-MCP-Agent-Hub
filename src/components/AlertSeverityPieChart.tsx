/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { SlackAlert } from '../types';
import { PieChart as PieIcon, Activity, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface AlertSeverityPieChartProps {
  alerts: SlackAlert[];
}

export default function AlertSeverityPieChart({ alerts }: AlertSeverityPieChartProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'active'>('active');

  const chartData = useMemo(() => {
    const targetAlerts = filterMode === 'active' 
      ? alerts.filter(a => a.status !== 'resolved')
      : alerts;

    let lowCount = 0;
    let mediumCount = 0;
    let highCount = 0;

    targetAlerts.forEach(alert => {
      if (alert.severity === 'high') highCount++;
      else if (alert.severity === 'medium') mediumCount++;
      else lowCount++;
    });

    return [
      { name: 'High Priority', value: highCount, color: '#ef4444' }, // Red/Rose
      { name: 'Medium Priority', value: mediumCount, color: '#f59e0b' }, // Amber/Yellow
      { name: 'Low Priority', value: lowCount, color: '#3b82f6' } // Blue
    ].filter(item => item.value > 0); // Only display non-empty slices to avoid visual clutter
  }, [alerts, filterMode]);

  const totalAlertsCount = useMemo(() => {
    const targetAlerts = filterMode === 'active' 
      ? alerts.filter(a => a.status !== 'resolved')
      : alerts;
    return targetAlerts.length;
  }, [alerts, filterMode]);

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-200">Alert Severity Analysis</h3>
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center bg-black/40 border border-white/5 rounded-lg p-0.5 text-[10px] font-mono">
          <button
            onClick={() => setFilterMode('active')}
            className={`px-2 py-1 rounded-md transition cursor-pointer font-bold ${
              filterMode === 'active'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ACTIVE
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2 py-1 rounded-md transition cursor-pointer font-bold ${
              filterMode === 'all'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {/* Chart visualization */}
      {totalAlertsCount === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-4">
          <Activity className="w-6 h-6 text-slate-600 mb-1.5 animate-pulse" />
          <p className="text-[11px] text-slate-500 font-semibold text-center">No alerts logged for distribution</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          {/* Recharts Container */}
          <div className="w-32 h-32 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={48}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950/95 border border-white/10 px-2.5 py-1.5 rounded-xl shadow-xl text-[10px] font-mono text-white">
                          <span className="font-bold" style={{ color: data.color }}>{data.name}</span>
                          <span className="block mt-0.5 text-slate-400">{data.value} alert{data.value > 1 ? 's' : ''} ({((data.value / totalAlertsCount) * 100).toFixed(0)}%)</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center absolute text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-black text-white leading-none">{totalAlertsCount}</span>
              <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider mt-0.5">Total</span>
            </div>
          </div>

          {/* Slices Legend List */}
          <div className="flex-grow space-y-2 w-full sm:w-auto">
            {chartData.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between text-[11px] font-mono bg-black/25 border border-white/5 px-2.5 py-1.5 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-semibold">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold">{item.value}</span>
                  <span className="text-[9px] text-slate-500">({((item.value / totalAlertsCount) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtext info */}
      {totalAlertsCount > 0 && filterMode === 'active' && chartData.some(d => d.name === 'High Priority') && (
        <div className="mt-3 bg-rose-500/5 border border-rose-500/10 p-2 rounded-xl flex items-center gap-2 text-[10px] text-rose-400 relative z-10 font-medium">
          <Flame className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
          <span>High-priority incidents detected. Resource mobilization required.</span>
        </div>
      )}
    </div>
  );
}
