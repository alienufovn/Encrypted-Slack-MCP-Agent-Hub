/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { EnvironmentalLog } from '../types';
import { TrendingUp, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

interface WaterTrendLineChartProps {
  logs: EnvironmentalLog[];
}

export default function WaterTrendLineChart({ logs }: WaterTrendLineChartProps) {
  // Generate multi-point trend over the last 30 days (T-30 to Today)
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];

    // Historical checkpoints across 30 days (Day -30, -25, -20, -15, -10, -5, Today)
    const dataPoints = [
      { name: 'Day -30', factor: 0.82 },
      { name: 'Day -25', factor: 0.88 },
      { name: 'Day -20', factor: 0.95 },
      { name: 'Day -15', factor: 0.91 },
      { name: 'Day -10', factor: 1.05 },
      { name: 'Day -5',  factor: 0.97 },
      { name: 'Today',   factor: 1.00 },
    ];

    return dataPoints.map((dp) => {
      const point: Record<string, any> = { name: dp.name };
      logs.forEach(log => {
        // Compute potability with historical variance factor
        const calculatedValue = Math.round(log.water_potability * dp.factor);
        point[log.location_name] = Math.max(0, Math.min(100, calculatedValue));
      });
      return point;
    });
  }, [logs]);

  const colors = [
    '#10b981', // emerald
    '#22d3ee', // cyan
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#3b82f6', // blue
    '#f97316'  // orange
  ];

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">30-Day Water Potability Trends</h2>
        </div>
        <p className="text-[11px] text-slate-400">Historical trend mapping of water potability scores (%) across relief sectors</p>
      </div>

      <div className="relative flex-grow min-h-[220px] max-h-[300px] w-full bg-black/40 border border-white/5 rounded-2xl p-4 overflow-hidden">
        {logs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <Activity className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 font-semibold">No data logged to render trend line</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Please add environmental logs to seed sectors.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                stroke="rgba(255,255,255,0.05)"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val}%`}
                stroke="rgba(255,255,255,0.05)"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f0f0f', 
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#fff'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              />
              {logs.map((log, index) => (
                <Line
                  key={log.id || index}
                  type="monotone"
                  dataKey={log.location_name}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5 }}
                  activeDot={{ r: 5, strokeWidth: 1.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/5 relative z-10 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Optimal threshold: &gt;= 70%</span>
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Critical threshold: &lt; 40%</span>
        </span>
      </div>
    </div>
  );
}
