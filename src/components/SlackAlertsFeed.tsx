/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SlackAlert } from '../types';
import { 
  Bell, Hash, User, ShieldAlert, Clock, Eye, Check, 
  Square, CheckSquare, X, AlertTriangle, Download, 
  Search, ExternalLink, Keyboard, MapPin 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SlackAlertsFeedProps {
  alerts: SlackAlert[];
  onAlertAction: (id: string, action: 'acknowledged' | 'resolved') => Promise<void>;
  loading: boolean;
  onMapJump?: (locationName: string) => void;
  selectedIds?: Set<string>;
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export default function SlackAlertsFeed({ 
  alerts, 
  onAlertAction, 
  loading, 
  onMapJump,
  selectedIds: parentSelectedIds,
  setSelectedIds: parentSetSelectedIds
}: SlackAlertsFeedProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = parentSelectedIds !== undefined ? parentSelectedIds : localSelectedIds;
  const setSelectedIds = parentSetSelectedIds !== undefined ? parentSetSelectedIds : setLocalSelectedIds;

  const [viewFilter, setViewFilter] = useState<'active' | 'archived'>('active');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<SlackAlert | null>(null);
  
  // Custom toast notification list for high-severity alerts
  const [toasts, setToasts] = useState<{ id: string; text: string; channel: string; user: string }[]>([]);
  const seenHighSeverityIds = useRef<Set<string>>(new Set());

  // Detect and trigger toasts for new incoming high-severity alerts
  useEffect(() => {
    // On mount or first load, populate the seen set so we don't spam toasts for old history
    if (seenHighSeverityIds.current.size === 0 && alerts.length > 0) {
      alerts.forEach(alert => {
        if (alert.severity === 'high') {
          seenHighSeverityIds.current.add(alert.id);
        }
      });
      return;
    }

    // Process new alerts
    alerts.forEach(alert => {
      if (alert.severity === 'high' && !seenHighSeverityIds.current.has(alert.id)) {
        seenHighSeverityIds.current.add(alert.id);
        
        const toastId = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [
          ...prev,
          { id: toastId, text: alert.text, channel: alert.channel_name, user: alert.user_name }
        ]);

        // Auto remove toast in 6 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 6000);
      }
    });
  }, [alerts]);

  // Real-time multi-criteria filter segmenting active vs archived
  const filteredAlerts = useMemo(() => {
    const baseAlerts = alerts.filter(alert => {
      if (viewFilter === 'active') {
        return alert.status !== 'resolved';
      } else {
        return alert.status === 'resolved';
      }
    });

    if (!searchQuery.trim()) return baseAlerts;
    const q = searchQuery.toLowerCase().trim();
    return baseAlerts.filter(alert => {
      return (
        alert.text.toLowerCase().includes(q) ||
        alert.user_name.toLowerCase().includes(q) ||
        alert.channel_name.toLowerCase().includes(q) ||
        (alert.location_name && alert.location_name.toLowerCase().includes(q)) ||
        alert.severity.toLowerCase().includes(q) ||
        alert.status.toLowerCase().includes(q)
      );
    });
  }, [alerts, viewFilter, searchQuery]);

  const pendingCount = alerts.filter(a => a.status === 'pending').length;
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  const activeAlerts = filteredAlerts.filter(a => a.status !== 'resolved');

  // Keyboard Shortcuts for open modal view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // [A] key for Acknowledge on the modal
      if (key === 'a' && selectedAlertForModal) {
        e.preventDefault();
        if (selectedAlertForModal.status === 'pending') {
          onAlertAction(selectedAlertForModal.id, 'acknowledged');
          setSelectedAlertForModal(prev => prev ? { ...prev, status: 'acknowledged' } : null);
        }
      }

      // [R] key for Resolve on the modal
      if (key === 'r' && selectedAlertForModal) {
        e.preventDefault();
        if (selectedAlertForModal.status !== 'resolved') {
          onAlertAction(selectedAlertForModal.id, 'resolved');
          setSelectedAlertForModal(null); // Auto close details view
        }
      }

      // [Esc] to close Modal
      if (e.key === 'Escape' && selectedAlertForModal) {
        setSelectedAlertForModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAlertForModal, onAlertAction]);

  const getSeverityStyle = (sev: SlackAlert['severity']) => {
    switch (sev) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getStatusBadge = (status: SlackAlert['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            unresolved
          </span>
        );
      case 'acknowledged':
        return (
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            acknowledged
          </span>
        );
      case 'resolved':
        return (
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            resolved
          </span>
        );
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open modal on checkbox click
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allUnresolvedIds = activeAlerts.map(a => a.id);
    const areAllSelected = allUnresolvedIds.every(id => selectedIds.has(id));

    if (areAllSelected) {
      // Unselect all unresolved
      setSelectedIds(prev => {
        const next = new Set(prev);
        allUnresolvedIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all unresolved
      setSelectedIds(prev => {
        const next = new Set(prev);
        allUnresolvedIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkAction = async (action: 'acknowledged' | 'resolved') => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const idsArray = Array.from(selectedIds) as string[];
      // Process all actions in parallel
      await Promise.all(idsArray.map(id => onAlertAction(id, action)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk action execution failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // CSV Exporter for offline disaster coordinator backup
  const handleExportCSV = () => {
    if (alerts.length === 0) return;
    const headers = ['id', 'timestamp', 'channel_id', 'channel_name', 'user_id', 'user_name', 'text', 'severity', 'status', 'location_name'];
    const rows = filteredAlerts.map(alert => [
      alert.id || '',
      alert.timestamp || '',
      alert.channel_id || '',
      alert.channel_name || '',
      alert.user_id || '',
      alert.user_name || '',
      alert.text || '',
      alert.severity || '',
      alert.status || '',
      alert.location_name || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `disaster_dispatch_alerts_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Triggers GIS Map jump to target and closes modal
  const handleMapJumpClick = (locationName: string) => {
    if (onMapJump) {
      onMapJump(locationName);
    }
    setSelectedAlertForModal(null);
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col">
      
      {/* Dynamic High-Severity Toast Overlay Portal */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-slate-950/95 border border-rose-500/30 shadow-[0_8px_32px_rgba(239,68,68,0.15)] rounded-2xl p-4 text-white pointer-events-auto flex items-start gap-3 backdrop-blur-md"
            >
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black text-rose-400 uppercase tracking-wider">CRITICAL ALERTS DISPATCH</span>
                  <button 
                    onClick={() => dismissToast(toast.id)}
                    className="text-slate-500 hover:text-white transition p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-100 font-bold mb-1.5 leading-normal">
                  {toast.text}
                </p>
                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                  <span className="text-emerald-400">#{toast.channel}</span>
                  <span>•</span>
                  <span>by {toast.user}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* soft red glow in corner */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] ${viewFilter === 'active' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {viewFilter === 'active' ? 'Active Slack Alerts Feed' : 'Archived Slack Alerts Feed'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {viewFilter === 'active' 
              ? 'Incoming FieldBot mentions aggregated for immediate coordinator dispatch'
              : 'Resolved incidents archived for regulatory compliance and telemetry logs'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={alerts.length === 0}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl px-2.5 py-1.5 text-xs font-bold cursor-pointer transition disabled:opacity-40"
            title="Export alerts list to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          
          <div className="bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center justify-between gap-1.5 font-mono">
            <Bell className="w-3.5 h-3.5 text-rose-400" />
            {pendingCount} Active
          </div>
        </div>
      </div>

      {/* Real-time Search Input */}
      <div className="mb-3 relative z-10 flex-shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search keyword, user, channel, or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl py-2 pl-10 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/40 transition font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* View Filter Toggle Switch (Active vs Archived) */}
      <div className="grid grid-cols-2 bg-black/40 border border-white/5 rounded-2xl p-1 mb-4 relative z-10 flex-shrink-0 font-mono text-[11px] font-bold">
        <button
          onClick={() => setViewFilter('active')}
          className={`py-2 px-3 rounded-xl text-center transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            viewFilter === 'active'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-md'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${viewFilter === 'active' ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
          ACTIVE ({pendingCount + acknowledgedCount})
        </button>
        <button
          onClick={() => setViewFilter('archived')}
          className={`py-2 px-3 rounded-xl text-center transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            viewFilter === 'archived'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${viewFilter === 'archived' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
          ARCHIVED ({resolvedCount})
        </button>
      </div>

      {/* Keyboard Shortcut Indicator Prompt */}
      <div className="mb-3 p-2 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between text-[9px] font-mono text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Keyboard className="w-3 h-3 text-slate-500" />
          <span>Quick Keyboard Shortcuts enabled:</span>
        </div>
        <div className="flex items-center gap-2">
          <span><kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700">A</kbd> Ack</span>
          <span><kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700">R</kbd> Resolve</span>
        </div>
      </div>

      {/* Real-time Summary Legend & Select All Row */}
      <div className="mb-4 relative z-10 flex-shrink-0">
        <div className="grid grid-cols-3 gap-2.5 mb-3 p-2.5 bg-black/40 border border-white/5 rounded-2xl text-xs font-mono">
          <div className="bg-slate-900/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Pending</span>
            <span className="text-sm font-black text-rose-400 mt-0.5">{pendingCount}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Acked</span>
            <span className="text-sm font-black text-amber-400 mt-0.5">{acknowledgedCount}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Resolved</span>
            <span className="text-sm font-black text-emerald-400 mt-0.5">{resolvedCount}</span>
          </div>
        </div>

        {/* Multi-Select Toolbar Controls */}
        {activeAlerts.length > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition font-semibold cursor-pointer"
            >
              {activeAlerts.every(a => selectedIds.has(a.id)) ? (
                <CheckSquare className="w-4 h-4 text-rose-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Select All Match ({activeAlerts.length})</span>
            </button>

            {selectedIds.size > 0 && (
              <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-bold px-2 py-0.5 rounded">
                {selectedIds.size} SELECTED
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Controls Banner */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="relative z-10 overflow-hidden flex-shrink-0"
          >
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-relaxed">
              <span className="text-slate-300 font-semibold">
                Bulk Command Center engaged. Run actions on <strong className="text-rose-400">{selectedIds.size} selected alerts</strong>:
              </span>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleBulkAction('acknowledged')}
                  disabled={isBulkProcessing}
                  className="flex items-center gap-1 bg-[#151515] hover:bg-black text-amber-400 font-bold px-2.5 py-1.5 rounded-xl border border-amber-500/20 cursor-pointer disabled:opacity-45"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Acknowledge
                </button>
                <button
                  onClick={() => handleBulkAction('resolved')}
                  disabled={isBulkProcessing}
                  className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-45"
                >
                  <Check className="w-3.5 h-3.5" />
                  Resolve
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  disabled={isBulkProcessing}
                  className="text-slate-400 hover:text-white p-1"
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed Area */}
      {loading ? (
        <div className="py-20 flex-grow flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-4 border-white/5 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Querying live alert records...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="py-20 flex-grow text-center border border-dashed border-white/10 rounded-2xl flex flex-col justify-center items-center">
          <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-400">No matching alerts found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your query or mention @FieldBot in the Slack channel simulator.</p>
        </div>
      ) : (
        <div className="flex-grow space-y-4 overflow-y-auto max-h-[380px] pr-1 relative z-10">
          {filteredAlerts.map((alert, index) => {
            const isSelected = selectedIds.has(alert.id);
            const isUnresolved = alert.status !== 'resolved';
            
            return (
              <motion.div
                key={alert.id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedAlertForModal(alert)}
                className={`p-4 rounded-2xl border transition duration-200 relative overflow-hidden cursor-pointer ${
                  alert.status === 'resolved' 
                    ? 'bg-black/20 border-white/5' 
                    : isSelected
                      ? 'bg-rose-500/10 border-rose-500/30 shadow-md'
                      : alert.severity === 'high' 
                        ? 'bg-rose-950/10 border-rose-900/20 hover:border-rose-900/40'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                
                {/* Colored status strip left side */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  alert.status === 'resolved' 
                    ? 'bg-slate-700' 
                    : alert.severity === 'high' 
                      ? 'bg-rose-500' 
                      : alert.severity === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                }`} />

                <div className="flex items-start justify-between gap-3 mb-2.5 pl-1.5">
                  
                  {/* Selector checkbox and Meta details */}
                  <div className="flex items-center gap-2 flex-grow min-w-0">
                    {isUnresolved && (
                      <button
                        onClick={(e) => handleToggleSelect(alert.id, e)}
                        className="flex-shrink-0 text-slate-500 hover:text-white transition cursor-pointer"
                        title="Toggle selection for bulk operations"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-rose-400 animate-scale" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 font-medium font-mono truncate">
                      <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-300">
                        <Hash className="w-3 h-3 text-emerald-400" />
                        {alert.channel_name}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        {alert.user_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${getSeverityStyle(alert.severity)}`}>
                      {alert.severity} priority
                    </span>
                    {getStatusBadge(alert.status)}
                  </div>

                </div>

                {/* Message Content */}
                <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3 select-all pl-5 break-words">
                  {alert.text}
                </p>

                {/* Location Tag */}
                {alert.location_name && (
                  <div className="inline-flex items-center gap-1 bg-black/40 border border-white/5 px-2 py-1 rounded-lg text-[10px] text-emerald-400 font-semibold mb-3 pl-1.5 ml-5 font-mono">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    Target: {alert.location_name}
                  </div>
                )}

                {/* Actions Footer */}
                <div className="border-t border-white/5 pt-3 flex items-center justify-between pl-5" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>

                  {alert.status !== 'resolved' && (
                    <div className="flex items-center gap-2">
                      {alert.status === 'pending' && (
                        <button
                          onClick={() => onAlertAction(alert.id, 'acknowledged')}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-white/5 hover:bg-amber-500/10 hover:border-amber-500/20 rounded-lg transition duration-150 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => onAlertAction(alert.id, 'resolved')}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 hover:scale-105 active:scale-95 rounded-lg transition duration-150 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Resolve
                      </button>
                    </div>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Expanded Alert Details Modal Dialog */}
      <AnimatePresence>
        {selectedAlertForModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlertForModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative w-full max-w-lg z-10 overflow-hidden"
            >
              {/* Colored status bar top */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                selectedAlertForModal.status === 'resolved'
                  ? 'bg-slate-600'
                  : selectedAlertForModal.severity === 'high'
                    ? 'bg-rose-500'
                    : selectedAlertForModal.severity === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
              }`} />

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-white/5 border border-white/5 text-slate-400 px-2 py-0.5 rounded uppercase">
                    ALERT IN DETAIL
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAlertForModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sender & Channel metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-slate-400 border-b border-white/5 pb-4">
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl text-slate-200 font-mono">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>#{selectedAlertForModal.channel_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>By <strong className="text-slate-300 font-semibold">{selectedAlertForModal.user_name}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(selectedAlertForModal.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Main Log/Alert text */}
              <div className="bg-black/50 border border-white/5 rounded-2xl p-4 mb-5 text-sm text-slate-100 leading-relaxed font-sans break-words select-text">
                {selectedAlertForModal.text}
              </div>

              {/* Severity & Status controls */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Severity Level</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${getSeverityStyle(selectedAlertForModal.severity)}`}>
                      {selectedAlertForModal.severity}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Current Status</span>
                  <div className="mt-1.5 flex items-center">
                    {getStatusBadge(selectedAlertForModal.status)}
                  </div>
                </div>
              </div>

              {/* Map Jump link (if location is specified) */}
              {selectedAlertForModal.location_name ? (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block font-mono">Disaster Sector Linked</span>
                    <strong className="text-white text-xs mt-0.5 block truncate">{selectedAlertForModal.location_name}</strong>
                  </div>
                  <button
                    onClick={() => handleMapJumpClick(selectedAlertForModal.location_name!)}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Map Jump
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-4 mb-6 text-center text-xs text-slate-500">
                  No explicit coordinate location tag recognized in this Slack log.
                </div>
              )}

              {/* Quick Actions & Shortcut Hints */}
              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-5">
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Shortcut keys active in details view</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedAlertForModal.status === 'pending' && (
                    <button
                      onClick={() => {
                        onAlertAction(selectedAlertForModal.id, 'acknowledged');
                        setSelectedAlertForModal(prev => prev ? { ...prev, status: 'acknowledged' } : null);
                      }}
                      className="flex items-center gap-1.5 bg-[#151515] hover:bg-black text-amber-400 border border-amber-500/20 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ack [A]
                    </button>
                  )}
                  {selectedAlertForModal.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        onAlertAction(selectedAlertForModal.id, 'resolved');
                        setSelectedAlertForModal(null);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolve [R]
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
