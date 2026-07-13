/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Database, Cpu, HelpCircle, Activity, Globe } from 'lucide-react';

interface HeaderProps {
  config: {
    supabase: { configured: boolean; url: string };
    gemini: { configured: boolean };
    slack: { configured: boolean; client_id: string };
  };
  alertsCount: number;
}

export default function Header({ config, alertsCount }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-[#4a154b] p-2.5 rounded-xl border border-white/10 shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Eco-Response Hub</h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                SLACK AGENT FOR GOOD
              </span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Slack Agent for Good • v2.0.4</p>
          </div>
        </div>

        {/* Real-time Infrastructure Badges */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Supabase Status */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Supabase DB:</span>
            {config.supabase.configured ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                In-Memory
              </span>
            )}
          </div>

          {/* Gemini Status */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Gemini LLM:</span>
            {config.gemini.configured ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Parser
              </span>
            )}
          </div>

          {/* Slack Webhook Status */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Slack Bolt:</span>
            {config.slack.configured ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                Simulated
              </span>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
