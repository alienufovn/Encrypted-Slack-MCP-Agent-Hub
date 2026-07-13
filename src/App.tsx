/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Droplet, 
  Package, 
  RefreshCw,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  Database
} from 'lucide-react';
import Header from './components/Header';
import EnvironmentalLogsTable from './components/EnvironmentalLogsTable';
import SlackAlertsFeed from './components/SlackAlertsFeed';
import SlackSimulator from './components/SlackSimulator';
import MCPToolsHub from './components/MCPToolsHub';
import WaterTrendLineChart from './components/WaterTrendLineChart';
import DisasterFieldMap from './components/DisasterFieldMap';
import { FeedbackForm } from './components/FeedbackForm';
import { AppTour } from './components/AppTour';
import AlertSeverityPieChart from './components/AlertSeverityPieChart';
import { EnvironmentalLog, SlackAlert } from './types';
import { motion } from 'motion/react';
import { useGlobalAlertShortcuts } from './hooks/useGlobalAlertShortcuts';

export default function App() {
  const [config, setConfig] = useState({
    supabase: { configured: false, url: '' },
    gemini: { configured: false },
    slack: { configured: false, client_id: '' }
  });
  
  const [logs, setLogs] = useState<EnvironmentalLog[]>([]);
  const [alerts, setAlerts] = useState<SlackAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [selectedLocationNameForMap, setSelectedLocationNameForMap] = useState<string | null>(null);
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());

  const handleMapJump = (locationName: string) => {
    setSelectedLocationNameForMap(locationName);
    const mapSection = document.getElementById('disaster-field-map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [configRes, logsRes, alertsRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/logs'),
        fetch('/api/alerts')
      ]);

      if (configRes.ok) {
        const cData = await configRes.json();
        setConfig(cData);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData);
      }
      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setAlerts(aData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (liveMode) {
      intervalId = setInterval(() => {
        setRefreshing(true);
        fetchDashboardData();
      }, 30000); // Fetch latest Supabase data every 30s
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [liveMode]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleAddLog = async (newLog: Partial<EnvironmentalLog>) => {
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Error adding environmental log:', err);
    }
  };

  const handleAlertAction = async (id: string, action: 'acknowledged' | 'resolved') => {
    try {
      const response = await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Error processing alert action:', err);
    }
  };

  // Root level Keyboard Shortcut listener for bulk actions
  useGlobalAlertShortcuts(selectedAlertIds, setSelectedAlertIds, handleAlertAction, alerts);

  const handleSimulationSuccess = (alertCreated?: SlackAlert) => {
    // Re-fetch everything to sync state in real time
    fetchDashboardData();
  };

  // --- KPI CALCULATIONS ---
  const activeHighPriorityAlerts = alerts.filter(a => a.status !== 'resolved' && a.severity === 'high').length;
  const sectorsMonitored = logs.length;
  const criticalWaterZones = logs.filter(l => l.water_potability < 40).length;
  
  // Custom supplies count extractor
  const totalRationsCount = logs.reduce((acc, curr) => {
    const mreMatch = curr.emergency_supplies.match(/(\d+)\s*MRE/i);
    if (mreMatch && mreMatch[1]) {
      return acc + parseInt(mreMatch[1]);
    }
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col pb-16 relative">
      
      {/* App Tour Orchestrator */}
      <AppTour />

      {/* Top Banner and System Status */}
      <Header config={config} alertsCount={alerts.filter(a => a.status === 'pending').length} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 flex-grow w-full space-y-6">
        
        {/* Welcome Section & Refresh Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">Active Dispatch Headquarters</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">Environmental Relief Coordinator Panel</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 self-start md:self-auto">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border rounded-xl transition duration-150 cursor-pointer ${
                liveMode
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-[#0f0f0f] border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
              title="Automatically poll Supabase environmental data every 30 seconds"
            >
              <span className={`w-2 h-2 rounded-full ${liveMode ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`} />
              Live Mode {liveMode ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0f0f0f] border border-white/10 hover:border-white/20 hover:text-white rounded-xl text-slate-300 transition duration-150 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
              Sync Supabase Data
            </button>
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 bg-[#0f0f0f] border border-white/5 px-3 py-2 rounded-xl">
              <Calendar className="w-3.5 h-3.5" />
              SYSTEM UTC: 2026-07-11
            </div>
          </div>
        </div>

        {/* 1. KPI KPI CARD HERO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Active High Alerts */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Critical Emergencies</span>
              <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{activeHighPriorityAlerts}</div>
              <p className="text-[11px] text-slate-500 mt-1">High-severity alerts pending dispatch</p>
            </div>
          </div>

          {/* Card 2: Sectors Monitored */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Sectors Monitored</span>
              <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{sectorsMonitored}</div>
              <p className="text-[11px] text-slate-500 mt-1">Active disaster sectors registered in DB</p>
            </div>
          </div>

          {/* Card 3: Critical Water Safety */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Toxicity Warnings</span>
              <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                <Droplet className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{criticalWaterZones}</div>
              <p className="text-[11px] text-slate-500 mt-1">Sectors with water safety under 40%</p>
            </div>
          </div>

          {/* Card 4: Depot Survival Supplies */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Survival Rations Stock</span>
              <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                <Package className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{totalRationsCount} MREs</div>
              <p className="text-[11px] text-slate-500 mt-1">Total registered food rations at depots</p>
            </div>
          </div>

        </div>

        {/* 2. CENTRAL DATA HUB ROW: logs, metrics, maps vs alerts feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Block (GIS Logs Table) - Span 7 */}
          <div className="lg:col-span-7" id="encryption-vault-toggle">
            <EnvironmentalLogsTable 
              logs={logs} 
              onAddLog={handleAddLog} 
              loading={loading} 
            />
          </div>

          {/* Right Block (Active Alerts Feed) - Span 5 */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <SlackAlertsFeed 
              alerts={alerts} 
              onAlertAction={handleAlertAction} 
              loading={loading} 
              onMapJump={handleMapJump}
              selectedIds={selectedAlertIds}
              setSelectedIds={setSelectedAlertIds}
            />
            <AlertSeverityPieChart alerts={alerts} />
          </div>

        </div>

        {/* Live Visualizations (GIS Coordinate Mapping & Recharts Potability Trends) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch" id="disaster-field-map-section">
          <div className="lg:col-span-6">
            <DisasterFieldMap logs={logs} selectedLocationName={selectedLocationNameForMap} />
          </div>
          <div className="lg:col-span-6">
            <WaterTrendLineChart logs={logs} />
          </div>
        </div>

        {/* 3. SIMULATOR & DEV MCP SERVER INTEGRATION HUB ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Block (Slack Bot Simulator) - Span 7 */}
          <div className="lg:col-span-7" id="slack-agent-status">
            <SlackSimulator onSimulationSuccess={handleSimulationSuccess} />
          </div>

          {/* Right Block (Model Context Protocol server inspect) - Span 5 */}
          <div className="lg:col-span-5" id="mcp-server-logs">
            <MCPToolsHub />
          </div>

        </div>

        {/* 4. FEEDBACK FORM & DATABASE SCHEMA GUIDANCE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Block (User Feedback Form & Profile) - Span 7 */}
          <div className="lg:col-span-7" id="developer-profile-card">
            <FeedbackForm />
          </div>

          {/* Right Block (Database Schema & Table Setup Guidance) - Span 5 */}
          <div className="lg:col-span-5">
            <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-start gap-3 relative z-10">
                <Database className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="w-full">
                  <h3 className="font-bold text-sm text-slate-200">Supabase Schema & Table Setup Guidance</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    If you are deploying this application live to your cloud Supabase workspace, run the SQL script below in your Supabase SQL Editor to provision the exact tables matching this CRM architecture:
                  </p>
                  
                  <div className="mt-4 bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[9px] text-emerald-400 overflow-x-auto max-h-[180px] select-all">
                    <pre>{`-- 1. Slack Workspaces Table (Multi-tenant)
CREATE TABLE public.slack_workspaces (
    id TEXT PRIMARY KEY,
    team_id TEXT UNIQUE NOT NULL,
    enterprise_id TEXT,
    bot_token TEXT NOT NULL,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    team_name TEXT
);

-- 2. Environmental Logs Table (GIS Status Tracker)
CREATE TABLE public.environmental_logs (
    id TEXT PRIMARY KEY,
    location_name TEXT UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    water_potability INTEGER DEFAULT 100,
    emergency_supplies TEXT,
    last_reported TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT CHECK (status IN ('safe', 'warning', 'critical')) NOT NULL,
    details TEXT
);

-- 3. Slack Alerts Feed Table
CREATE TABLE public.slack_alerts (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    text TEXT NOT NULL,
    location_name TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'acknowledged', 'resolved')) NOT NULL
);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.slack_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_alerts ENABLE ROW LEVEL SECURITY;

-- 5. Add Direct Data API Access (SELECT Only)
CREATE POLICY "Allow SELECT for public and authenticated users" 
ON public.slack_workspaces
FOR SELECT 
TO public, authenticated 
USING (true);

CREATE POLICY "Allow SELECT for public and authenticated users" 
ON public.environmental_logs
FOR SELECT 
TO public, authenticated 
USING (true);

CREATE POLICY "Allow SELECT for public and authenticated users" 
ON public.slack_alerts
FOR SELECT 
TO public, authenticated 
USING (true);`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
