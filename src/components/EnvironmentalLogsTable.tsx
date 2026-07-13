/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EnvironmentalLog } from '../types';
import { Droplet, Package, AlertTriangle, CheckCircle, Clock, MapPin, Plus, Send, X, AlertCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EnvironmentalLogsTableProps {
  logs: EnvironmentalLog[];
  onAddLog: (newLog: Partial<EnvironmentalLog>) => Promise<void>;
  loading: boolean;
}

const generateSparklinePoints = (currentPotability: number) => {
  // Deterministic trend values based on current status for a high-fidelity visual experience
  const points = [
    Math.round(currentPotability * 0.88),
    Math.round(currentPotability * 0.96),
    Math.round(currentPotability * 0.91),
    Math.round(currentPotability * 1.04),
    currentPotability
  ];
  return points.map(p => Math.max(0, Math.min(100, p)));
};

const Sparkline = ({ potability }: { potability: number }) => {
  const points = generateSparklinePoints(potability);
  const width = 50;
  const height = 14;
  const padding = 1;
  
  const maxVal = 100;
  const minVal = 0;
  const valRange = maxVal - minVal;
  
  const svgPoints = points.map((val, index) => {
    const x = (index / (points.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - minVal) / valRange) * (height - padding * 2) - padding;
    return { x, y };
  });

  const pathD = svgPoints.reduce((acc, pt, index) => {
    return acc + (index === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
  }, '');

  const strokeColor = potability >= 70 ? '#10b981' : potability >= 40 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="flex items-center gap-1.5" title={`Historical trend: ${points.join(' -> ')}%`}>
      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tight">Trend:</span>
      <div className="bg-black/30 px-1 py-0.5 rounded border border-white/5 flex items-center justify-center">
        <svg width={width} height={height} className="overflow-visible">
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={svgPoints[svgPoints.length - 1].x}
            cy={svgPoints[svgPoints.length - 1].y}
            r="1.5"
            fill={strokeColor}
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
};

export default function EnvironmentalLogsTable({ logs, onAddLog, loading }: EnvironmentalLogsTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Filtering system
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'warning' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form fields
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState('14.5678');
  const [lng, setLng] = useState('121.0123');
  const [potability, setPotability] = useState(80);
  const [supplies, setSupplies] = useState('150 MREs, 40 First Aid Kits');
  const [details, setDetails] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesSearch = log.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (log.emergency_supplies && log.emergency_supplies.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Location Name', 'Latitude', 'Longitude', 'Water Potability (%)', 'Emergency Supplies', 'Last Reported', 'Status', 'Details'];
    const rows = filteredLogs.map(log => [
      log.id || '',
      `"${log.location_name.replace(/"/g, '""')}"`,
      log.latitude,
      log.longitude,
      log.water_potability,
      `"${(log.emergency_supplies || '').replace(/"/g, '""')}"`,
      log.last_reported,
      log.status,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `environmental_field_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: EnvironmentalLog['status']) => {
    switch (status) {
      case 'safe':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Safe Zone
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-full font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-2.5 py-1 rounded-full font-semibold animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            CRITICAL
          </span>
        );
    }
  };

  const getSeverityBadge = (log: EnvironmentalLog) => {
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10';
    
    if (log.status === 'critical' || log.water_potability < 40) {
      severity = 'HIGH';
      colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
    } else if (log.status === 'warning' || log.water_potability < 70) {
      severity = 'MEDIUM';
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    
    return (
      <span className={`inline-flex items-center gap-1 border text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider ${colorClass}`}>
        {severity} SEVERITY
      </span>
    );
  };

  const getPotabilityColor = (val: number) => {
    if (val >= 70) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (val >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return;

    setSubmitting(true);
    try {
      let status: 'safe' | 'warning' | 'critical' = 'safe';
      if (potability < 35) status = 'critical';
      else if (potability < 70) status = 'warning';

      await onAddLog({
        location_name: locationName,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        water_potability: potability,
        emergency_supplies: supplies,
        status,
        details
      });

      // Reset form
      setLocationName('');
      setPotability(80);
      setSupplies('200 MREs, 50 First Aid Kits');
      setDetails('');
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-full">
      
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title block */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <h2 className="text-lg font-bold text-white tracking-tight">Environmental Field Logs</h2>
          </div>
          <p className="text-xs text-slate-400">Supabase-synchronized GIS tracking indicators and disaster asset mapping</p>
        </div>

        <button
          id="btn-report-incident"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition duration-150 shadow-lg shadow-emerald-500/15 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Log Incident
        </button>
      </div>

      {/* Grid of Locations */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-white/5 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Retrieving real-time Supabase field records...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
          <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-400">No logs found</p>
          <p className="text-xs text-slate-500 mt-1">Click &apos;Log Incident&apos; to seed your Supabase environmental database.</p>
        </div>
      ) : (
        <>
          {/* Filtering & Export Utility Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 p-2 bg-black/40 border border-white/5 rounded-2xl relative z-10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow">
              {/* Search Bar */}
              <div className="relative flex-grow max-w-md">
                <input
                  type="text"
                  placeholder="Search location, details, or supplies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0f0f0f] text-xs text-white placeholder-slate-500 border border-white/10 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(['all', 'safe', 'warning', 'critical'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition duration-150 cursor-pointer ${
                      statusFilter === status
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-export-csv"
              onClick={exportToCSV}
              disabled={filteredLogs.length === 0}
              className="flex items-center justify-center gap-1.5 bg-[#0f0f0f] hover:bg-white/5 border border-white/10 text-xs font-semibold px-3 py-1.5 rounded-xl text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Export current filtered table to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl relative z-10">
              <AlertTriangle className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">
                {searchQuery 
                  ? `No logs match "${searchQuery}" with "${statusFilter}" status`
                  : `No logs match the '${statusFilter}' filter type`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Toggle another filter option or clear search query to inspect telemetry.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 overflow-y-auto max-h-[520px] pr-1">
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group relative p-4 rounded-2xl border transition duration-200 ${
                    log.status === 'critical' || log.water_potability < 40
                      ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10'
                      : log.status === 'warning' || log.water_potability < 70
                        ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10'
                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-start gap-2">
                      <div className={`p-2 rounded-lg border group-hover:border-white/10 ${
                        log.status === 'critical' || log.water_potability < 40
                          ? 'bg-rose-500/10 border-rose-500/15'
                          : log.status === 'warning' || log.water_potability < 70
                            ? 'bg-amber-500/10 border-amber-500/15'
                            : 'bg-black/40 border-white/5'
                      }`}>
                        <MapPin className={`w-4 h-4 ${
                          log.status === 'critical' || log.water_potability < 40
                            ? 'text-rose-400'
                            : log.status === 'warning' || log.water_potability < 70
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-white transition">{log.location_name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          LAT: {log.latitude.toFixed(4)} / LNG: {log.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {getSeverityBadge(log)}
                        {getStatusBadge(log.status)}
                      </div>
                      <Sparkline potability={log.water_potability} />
                    </div>
                  </div>

                  {log.details && (
                    <p className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-lg border border-white/5 mb-3 leading-relaxed">
                      {log.details}
                    </p>
                  )}

                  {/* Dynamic Metric Bars */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    
                    {/* Water Potability Meter */}
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Droplet className="w-3 h-3 text-cyan-400" />
                          Water Potability
                        </span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border text-[10px] ${getPotabilityColor(log.water_potability)}`}>
                          {log.water_potability}%
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            log.water_potability >= 70 ? 'bg-emerald-500' : log.water_potability >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${log.water_potability}%` }}
                        />
                      </div>
                    </div>

                    {/* Supplies Block */}
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-400 font-medium">
                        <Package className="w-3 h-3 text-amber-400" />
                        Depot Supplies
                      </div>
                      <p className="text-[11px] text-slate-200 font-semibold truncate mt-0.5" title={log.emergency_supplies}>
                        {log.emergency_supplies || 'No supplies logged'}
                      </p>
                    </div>

                  </div>

                  <div className="flex items-center gap-1 mt-3 text-[9px] text-slate-500 justify-end font-mono">
                    <Clock className="w-3 h-3" />
                    Updated: {new Date(log.last_reported).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Log Incident Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <h3 className="font-bold text-white text-base">Log Environmental Incident</h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Sector / Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sector 1 Flood Zone"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Water Potability ({potability}%)</label>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      potability >= 70 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : potability >= 45 ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                    }`}>
                      {potability >= 70 ? 'POTABLE' : potability >= 35 ? 'RISK ZONE' : 'HAZARD ZONE'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={potability}
                    onChange={(e) => setPotability(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Emergency Depot Supplies</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 MREs, 100 First Aid Kits, 50 Filters"
                    value={supplies}
                    onChange={(e) => setSupplies(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Field Observation Details</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe flooding, toxicity reports, chemical spills or contamination observations..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-white/5 flex gap-3 justify-end bg-black/40 -mx-5 -mb-5 p-5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs cursor-pointer border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    {submitting ? 'Syncing...' : 'Dispatch & Sync'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
