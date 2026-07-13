/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { SimulationResult, SlackAlert } from '../types';
import { Hash, Send, Cpu, Database, Play, Eye, EyeOff, Code, ChevronRight, Terminal, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SlackSimulatorProps {
  onSimulationSuccess: (alertCreated?: SlackAlert) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  senderName: string;
  avatarColor: string;
  text: string;
  timestamp: Date;
  trace?: SimulationResult;
}

export default function SlackSimulator({ onSimulationSuccess }: SlackSimulatorProps) {
  const [channels] = useState([
    { id: 'c1', name: 'disaster-response-hq', active: true },
    { id: 'c2', name: 'monitoring-coastal', active: false },
    { id: 'c3', name: 'field-logs-auto', active: false }
  ]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm0',
      sender: 'system',
      senderName: 'System Uplink',
      avatarColor: 'bg-[#4a154b]/30 text-[#e01e5a]',
      text: '⚡ Multi-tenant Slack Workspace simulation active. Mention @FieldBot to query rescue metrics and depot supplies via MCP tools.',
      timestamp: new Date(Date.now() - 5 * 60000)
    },
    {
      id: 'm1',
      sender: 'user',
      senderName: 'Alice Cooper (Field Lead)',
      avatarColor: 'bg-purple-600 text-purple-100',
      text: '@FieldBot check the metrics for Sector 1. We are hearing reports of flooding.',
      timestamp: new Date(Date.now() - 4 * 60000)
    },
    {
      id: 'm2',
      sender: 'bot',
      senderName: 'FieldBot',
      avatarColor: 'bg-emerald-500 text-slate-950',
      text: '🤖 *Uplink active.* I queried our Supabase environmental logs for Sector 1 and retrieved the following metrics: \n- *Water Potability:* 12% (Critical contamination/high turbidity)\n- *Coordinates:* LAT: 14.5500, LNG: 121.0000\n- *Depot Stock:* 10 MREs, 2 First Aid Kits, 0 Filters (Critical shortage)\n\n*Observation:* Severely contaminated floodwaters. I strongly recommend immediate dispatch of water purification systems and survival rations.',
      timestamp: new Date(Date.now() - 3.8 * 60000)
    }
  ]);

  const [inputVal, setInputVal] = useState('@FieldBot ');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTrace, setActiveTrace] = useState<SimulationResult | null>(null);
  const [showTracePanel, setShowTracePanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const triggerPreset = (text: string) => {
    setInputVal(`@FieldBot ${text}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text) return;

    // Clear input
    setInputVal('@FieldBot ');

    const userMsg: ChatMessage = {
      id: `sim_${Date.now()}`,
      sender: 'user',
      senderName: 'You (Coordinator)',
      avatarColor: 'bg-blue-600 text-blue-100 font-bold',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/slack/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'disaster-response-hq',
          user: 'You (Coordinator)',
          message: text
        })
      });

      if (!response.ok) {
        throw new Error('Simulation failed on Express gateway');
      }

      const result: SimulationResult = await response.json();
      
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        senderName: 'FieldBot',
        avatarColor: 'bg-emerald-500 text-slate-950',
        text: result.bot_response,
        timestamp: new Date(),
        trace: result
      };

      setMessages(prev => [...prev, botMsg]);
      setActiveTrace(result);
      onSimulationSuccess(result.alert_created);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        sender: 'system',
        senderName: 'Uplink Error',
        avatarColor: 'bg-rose-500',
        text: `⚠️ Bot processing failed: ${err.message || 'Check connection to backend server.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl shadow-2xl overflow-hidden h-[640px] flex flex-col md:flex-row relative">
      
      {/* Slack Sidebar Sim */}
      <div className="w-full md:w-56 bg-black/40 border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <h3 className="font-bold text-slate-100 text-sm tracking-tight truncate font-sans">EcoForce Slack Sim</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Multi-tenant Environment</p>
        </div>

        {/* Channels */}
        <div className="flex-grow p-2 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mb-2 block font-mono">
            Channels
          </span>
          {channels.map(c => (
            <div
              key={c.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                c.active ? 'bg-white/5 border border-white/5 text-white' : 'text-slate-500'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              {c.name}
            </div>
          ))}

          <span className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mt-4 mb-2 block font-mono">
            Suggested Prompts
          </span>
          <div className="px-3 space-y-2">
            <button
              onClick={() => triggerPreset('check environmental metrics in Sector 1')}
              className="w-full text-left bg-black/40 hover:bg-white/5 border border-white/5 p-1.5 rounded-lg text-[10px] text-emerald-400 font-mono font-medium transition line-clamp-1 truncate block cursor-pointer"
            >
              📊 Sector 1 metrics
            </button>
            <button
              onClick={() => triggerPreset('get supply logs for Sector 7')}
              className="w-full text-left bg-black/40 hover:bg-white/5 border border-white/5 p-1.5 rounded-lg text-[10px] text-emerald-400 font-mono font-medium transition line-clamp-1 truncate block cursor-pointer"
            >
              📦 Sector 7 supplies
            </button>
            <button
              onClick={() => triggerPreset('report high water toxicity in Sector 4. Tested potability is 15%. Direct flooding has contaminated the coastal lines.')}
              className="w-full text-left bg-black/40 hover:bg-white/5 border border-white/5 p-1.5 rounded-lg text-[10px] text-emerald-400 font-mono font-medium transition line-clamp-1 truncate block cursor-pointer"
            >
              🚨 Sector 4 toxic reports
            </button>
          </div>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-grow flex flex-col h-full overflow-hidden bg-black/15">
        
        {/* Active Channel Info */}
        <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-200 text-sm font-sans">disaster-response-hq</span>
          </div>

          <button
            onClick={() => setShowTracePanel(!showTracePanel)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-xl text-slate-200 border border-white/5 transition duration-150 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            {showTracePanel ? 'Hide Trace' : 'Show Trace'}
          </button>
        </div>

        {/* Message feed */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map(m => (
            <div 
              key={m.id} 
              className={`flex gap-3 items-start p-2.5 rounded-2xl border transition-colors ${
                m.sender === 'bot' 
                  ? 'bg-emerald-950/10 border-emerald-900/20' 
                  : m.sender === 'system'
                    ? 'bg-black/20 border-white/5'
                    : 'bg-white/5 border-white/5'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${m.avatarColor}`}>
                {m.sender === 'bot' ? '🤖' : m.sender === 'system' ? '⚙️' : <User className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-xs text-slate-200">{m.senderName}</span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed select-all">
                  {m.text}
                </div>

                {/* Inline trace toggle if bot message has trace */}
                {m.trace && (
                  <button
                    onClick={() => {
                      setActiveTrace(m.trace || null);
                      setShowTracePanel(true);
                    }}
                    className="flex items-center gap-1 mt-2.5 text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    Inspect Tool/LLM Trace
                  </button>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-start p-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs animate-bounce">
                🤖
              </div>
              <div className="flex-grow">
                <span className="font-bold text-xs text-slate-200">FieldBot</span>
                <span className="text-[10px] text-emerald-400 italic font-medium ml-2 block mt-1">
                  Typing: Agent routing through Model Context Protocol (MCP) server tools...
                </span>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Box */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-grow bg-black text-xs border border-white/5 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-white placeholder-slate-500 leading-relaxed"
            />
            <button
              type="submit"
              disabled={isTyping}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 active:scale-95 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition duration-150 shadow-lg shadow-emerald-500/15 cursor-pointer flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium flex items-center gap-1 font-mono">
            <span className="text-emerald-400 font-bold">Tip:</span> Your message must contain the word <code className="bg-black border border-white/5 px-1 py-0.5 rounded text-emerald-300 font-mono text-[9px]">@FieldBot</code> to mention the chatbot and invoke the Gemini logic.
          </div>
        </form>
      </div>

      {/* Developer Trace Drawer Panel */}
      <AnimatePresence>
        {showTracePanel && activeTrace && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full md:w-80 bg-[#0f0f0f] border-l border-white/5 flex flex-col h-full flex-shrink-0 z-25 relative"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">MCP Server Trace</span>
              </div>
              <button
                onClick={() => setActiveTrace(null)}
                className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer font-mono"
              >
                Clear
              </button>
            </div>

            {/* Trace logs */}
            <div className="flex-grow p-4 space-y-4 overflow-y-auto font-mono text-[11px] leading-relaxed select-all">
              
              {/* Step 1: Raw Input */}
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block font-mono">1. Slack Payload Received</span>
                <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-slate-300">
                  <div className="text-slate-400">channel: <span className="text-emerald-400">#{activeTrace.raw_payload.channel}</span></div>
                  <div className="text-slate-400">user: <span className="text-emerald-400">{activeTrace.raw_payload.user}</span></div>
                  <div className="text-slate-400 mt-1">message: <span className="text-white">&quot;{activeTrace.raw_payload.message}&quot;</span></div>
                </div>
              </div>

              {/* Step 2: Gemini Thinking */}
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block font-mono">2. LLM Reasoning Model</span>
                <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-slate-300">
                  <div className="text-slate-500 font-bold text-[9px] mb-1 font-mono">trace:</div>
                  <p className="text-emerald-300 leading-normal">{activeTrace.gemini_thinking}</p>
                </div>
              </div>

              {/* Step 3: MCP Tool Call & Supabase fetch */}
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block font-mono">3. MCP Server Tool Executed</span>
                {activeTrace.tool_calls.length === 0 ? (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-slate-500 italic">
                    No tools required for this query. Bypassed direct database lookup.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTrace.tool_calls.map((tc, idx) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-slate-300">
                        <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1 font-mono">
                          <Database className="w-3.5 h-3.5" />
                          {tc.tool_name}()
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1 font-mono">args: {JSON.stringify(tc.args)}</div>
                        
                        <div className="text-[9px] text-slate-500 font-bold mt-2 border-t border-white/5 pt-1 font-mono">output:</div>
                        <pre className="text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-normal mt-0.5 font-mono max-h-48">
                          {tc.result}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 4: Outgoing response block */}
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block font-mono">4. Synthesized Slack Reply</span>
                <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-slate-400 italic">
                  Formatted as Slack Block Kit JSON and returned.
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
