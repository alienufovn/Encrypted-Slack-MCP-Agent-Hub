/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { EnvironmentalLog } from '../types';
import { Map, Compass, CheckCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DisasterFieldMapProps {
  logs: EnvironmentalLog[];
  selectedLocationName?: string | null;
}

export default function DisasterFieldMap({ logs, selectedLocationName }: DisasterFieldMapProps) {
  const [selectedLog, setSelectedLog] = useState<EnvironmentalLog | null>(null);
  const [hoveredLog, setHoveredLog] = useState<EnvironmentalLog | null>(null);

  // Auto-select log when a Map Jump is triggered from the alerts feed modal
  useEffect(() => {
    if (selectedLocationName) {
      const match = logs.find(log => 
        log.location_name.toLowerCase().trim() === selectedLocationName.toLowerCase().trim()
      );
      if (match) {
        setSelectedLog(match);
      }
    }
  }, [selectedLocationName, logs]);

  // Compute dynamic scale and offset based on coordinate extremes
  const bounds = useMemo(() => {
    if (logs.length === 0) {
      return {
        minLat: 14.4,
        maxLat: 14.7,
        minLng: 120.9,
        maxLng: 121.2,
      };
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    logs.forEach(log => {
      if (log.latitude < minLat) minLat = log.latitude;
      if (log.latitude > maxLat) maxLat = log.latitude;
      if (log.longitude < minLng) minLng = log.longitude;
      if (log.longitude > maxLng) maxLng = log.longitude;
    });

    // Ensure a minimal spread to prevent division by zero and look visually appealing
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const padding = 0.05;

    if (latDiff < 0.02) {
      minLat -= padding;
      maxLat += padding;
    } else {
      minLat -= latDiff * 0.15;
      maxLat += latDiff * 0.15;
    }

    if (lngDiff < 0.02) {
      minLng -= padding;
      maxLng += padding;
    } else {
      minLng -= lngDiff * 0.15;
      maxLng += lngDiff * 0.15;
    }

    return { minLat, maxLat, minLng, maxLng };
  }, [logs]);

  // Project geographical (lat, lng) to SVG container percentage coordinates (0 to 100)
  // Remember: SVG y increases downwards, so lat (which increases upwards) needs to be inverted.
  const project = (latitude: number, longitude: number) => {
    const latRange = bounds.maxLat - bounds.minLat;
    const lngRange = bounds.maxLng - bounds.minLng;

    const x = ((longitude - bounds.minLng) / lngRange) * 100;
    const y = (1 - (latitude - bounds.minLat) / latRange) * 100;

    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const downloadCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['id', 'location_name', 'latitude', 'longitude', 'water_potability', 'emergency_supplies', 'status', 'details', 'last_reported'];
    const rows = logs.map(log => [
      log.id || '',
      log.location_name || '',
      log.latitude || '',
      log.longitude || '',
      log.water_potability || 0,
      log.emergency_supplies || '',
      log.status || '',
      log.details || '',
      log.last_reported || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gis_field_telemetry_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between min-h-[360px]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <h2 className="text-sm font-bold text-white tracking-tight">Disaster Relief Field Telemetry Map</h2>
          </div>
          <p className="text-[11px] text-slate-400">Dynamic coordinate plot mapping real-time field deployments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full whitespace-nowrap animate-pulse">
            LIVE MONITORING
          </span>
          <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
            AUTO-PROJECTED
          </span>
        </div>
      </div>

      {/* Map Plot Area */}
      <div className="relative flex-grow min-h-[220px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden group/map flex items-center justify-center">
        {/* Floating Download CSV Action Button */}
        <button
          onClick={downloadCSV}
          disabled={logs.length === 0}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] shadow-[0_4px_14px_rgba(6,182,212,0.4)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.6)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition duration-150 cursor-pointer uppercase tracking-wider font-mono border border-cyan-300/30"
          title="Download all visible coordinates as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>

        {/* Dynamic Coordinate Grid Overlay */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none opacity-20">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border-t border-l border-white/10" />
          ))}
        </div>

        {/* Center Compass Crosshairs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <div className="w-24 h-24 border border-dashed border-white rounded-full" />
          <div className="absolute h-full w-[1px] bg-white" />
          <div className="absolute w-full h-[1px] bg-white" />
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 relative z-10 text-center">
            <Map className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 font-semibold">No location markers logged</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Pins will display automatically upon adding field logs.</p>
          </div>
        ) : (
          <div className="relative w-full h-full p-4">
            {/* Compass Scale Info */}
            <div className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-500 bg-black/60 px-2 py-1 rounded border border-white/5 pointer-events-none flex flex-col gap-0.5 z-20">
              <span>LAT RANGE: {bounds.minLat.toFixed(3)}° to {bounds.maxLat.toFixed(3)}°</span>
              <span>LNG RANGE: {bounds.minLng.toFixed(3)}° to {bounds.maxLng.toFixed(3)}°</span>
            </div>

            {/* Render the SVG map coordinate pins */}
            <svg className="w-full h-full relative z-10" style={{ overflow: 'visible' }}>
              {/* Lines connecting consecutive coordinates to trace sector path */}
              {logs.length > 1 && (
                <polyline
                  points={logs.map(log => {
                    const { x, y } = project(log.latitude, log.longitude);
                    return `${x}%,${y}%`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.15)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Individual Markers */}
              {logs.map((log, index) => {
                const { x, y } = project(log.latitude, log.longitude);
                const isSelected = selectedLog?.id === log.id;
                const isHovered = hoveredLog?.id === log.id;

                return (
                  <g key={log.id || index}>
                    {/* Ring animation on hover or selection */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="14"
                        className={`fill-none stroke-current animate-ping ${
                          log.status === 'critical' ? 'text-rose-500' : log.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'
                        }`}
                        style={{ opacity: 0.3 }}
                      />
                    )}

                    {/* Outer glow ring */}
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r={isSelected ? '10' : '6'}
                      className={`fill-transparent stroke-current transition-all duration-300 ${
                        log.status === 'critical' ? 'text-rose-500/20' : log.status === 'warning' ? 'text-amber-500/20' : 'text-emerald-500/20'
                      }`}
                      strokeWidth="2"
                    />

                    {/* Main Interactive Pin Dot */}
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r={isSelected ? '6' : '4'}
                      onClick={() => setSelectedLog(isSelected ? null : log)}
                      onMouseEnter={() => setHoveredLog(log)}
                      onMouseLeave={() => setHoveredLog(null)}
                      className={`cursor-pointer transition-all duration-300 ${
                        log.status === 'critical' ? 'fill-rose-500 hover:fill-rose-400 stroke-rose-950' :
                        log.status === 'warning' ? 'fill-amber-500 hover:fill-amber-400 stroke-amber-950' :
                        'fill-emerald-500 hover:fill-emerald-400 stroke-emerald-950'
                      }`}
                      strokeWidth="1"
                    />

                    {/* Hover tooltip label */}
                    {isHovered && !isSelected && (
                      <foreignObject
                        x={`calc(${x}% + 10px)`}
                        y={`calc(${y}% - 15px)`}
                        width="140"
                        height="40"
                        className="pointer-events-none"
                      >
                        <div className="bg-slate-950/90 border border-white/10 text-white rounded px-2 py-1 text-[10px] font-semibold truncate shadow-lg">
                          {log.location_name}
                          <span className="block text-[8px] text-slate-400 font-mono">
                            Potability: {log.water_potability}%
                          </span>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Selected Marker Overlay Details panel */}
        <AnimatePresence>
          {selectedLog && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-2 right-2 left-2 p-3 bg-slate-950/95 border border-white/10 rounded-xl relative z-20 shadow-2xl flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white truncate max-w-[200px]">{selectedLog.location_name}</span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-white transition cursor-pointer text-[10px] font-mono px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded border border-white/5"
                >
                  CLOSE
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px] font-mono bg-white/5 p-2 rounded-lg border border-white/5 text-slate-300">
                <div>
                  <span className="text-slate-500 block">COORDINATES</span>
                  <span>{selectedLog.latitude.toFixed(4)}, {selectedLog.longitude.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">WATER POTABILITY</span>
                  <span className={
                    selectedLog.water_potability >= 70 ? 'text-emerald-400 font-bold' :
                    selectedLog.water_potability >= 40 ? 'text-amber-400 font-bold' :
                    'text-rose-400 font-bold'
                  }>
                    {selectedLog.water_potability}% Status
                  </span>
                </div>
                <div className="col-span-2 border-t border-white/5 pt-1 mt-1">
                  <span className="text-slate-500 block">RESERVE SUPPLIES</span>
                  <span className="text-slate-200 truncate block">{selectedLog.emergency_supplies || 'None logged'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Legend */}
      <div className="mt-4 pt-3.5 border-t border-white/5 relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Safe Zone</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Warning Zone</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Critical Zone</span>
        </span>
      </div>
    </div>
  );
}
