/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Database, Play, ChevronDown, ChevronUp, Layers, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export default function MCPToolsHub() {
  const [tools] = useState<MCPTool[]>([
    {
      name: 'query_environmental_metrics',
      description: 'Fetch real-time disaster response, climate metrics, and water potability levels for environmental sectors.',
      inputSchema: {
        type: 'OBJECT',
        properties: {
          location_name: {
            type: 'STRING',
            description: 'The environmental sector or location name (e.g., "Sector 1", "Sector 4"). Leave blank to query all sectors.'
          }
        }
      }
    },
    {
      name: 'get_disaster_supply_logs',
      description: 'Query available emergency supply inventories (food, water filtration, medicine) stored at the rescue depots.',
      inputSchema: {
        type: 'OBJECT',
        properties: {
          location_name: {
            type: 'STRING',
            description: 'Specific region/sector supply log requested.'
          }
        }
      }
    },
    {
      name: 'report_field_incident',
      description: 'Submit an emergency environmental safety report or incident. This creates/updates environmental logs and broadcasts a high-priority Slack alert for coordinators.',
      inputSchema: {
        type: 'OBJECT',
        properties: {
          location_name: {
            type: 'STRING',
            description: 'The location or sector where the incident is occurring.'
          },
          water_potability: {
            type: 'NUMBER',
            description: 'Current water potability safety rating percentage (0 - 100).'
          },
          details: {
            type: 'STRING',
            description: 'Detailed field observations of contamination, flooding, or equipment failure.'
          }
        },
        required: ['location_name', 'water_potability', 'details']
      }
    }
  ]);

  const [expandedTool, setExpandedTool] = useState<string | null>('query_environmental_metrics');
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  
  // Forms inputs state
  const [inputs, setInputs] = useState<Record<string, Record<string, any>>>({
    query_environmental_metrics: { location_name: '' },
    get_disaster_supply_logs: { location_name: '' },
    report_field_incident: { location_name: 'Sector 4 Coastal Basin', water_potability: 25, details: 'Turbidity meter showing high organic sedimentation.' }
  });

  const handleInputChange = (toolName: string, field: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [field]: value
      }
    }));
  };

  const handleRunTool = async (toolName: string) => {
    setLoading(toolName);
    try {
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolName,
          arguments: inputs[toolName]
        })
      });

      if (!response.ok) {
        throw new Error('Tool execution failed');
      }

      const data = await response.json();
      setResults(prev => ({
        ...prev,
        [toolName]: data
      }));
    } catch (err: any) {
      console.error(err);
      setResults(prev => ({
        ...prev,
        [toolName]: { error: err.message || 'Server connection error' }
      }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative h-full">
      <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="bg-blue-500/10 border border-white/5 p-2 rounded-xl">
          <Layers className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Model Context Protocol Tools Registry
          </h2>
          <p className="text-xs text-slate-400">
            Secure client-to-server routing registry enabling LLMs to execute structured Supabase database queries
          </p>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl mb-6 text-xs text-slate-300 leading-relaxed relative z-10">
        <p className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>What is MCP?</strong> Model Context Protocol is an open standard that allows foundation models like <strong>Gemini 3.5</strong> to discover and run local server tools. In our multi-tenant setup, Gemini analyzes Slack message intent, invokes the matching MCP tool, fetches state from Supabase, and posts synthesized reports back to Slack.
          </span>
        </p>
      </div>

      {/* Tools List */}
      <div className="space-y-4 relative z-10 overflow-y-auto max-h-[460px] pr-1">
        {tools.map((tool) => {
          const isExpanded = expandedTool === tool.name;
          const hasResult = !!results[tool.name];

          return (
            <div
              key={tool.name}
              className={`border rounded-2xl overflow-hidden transition-colors ${
                isExpanded ? 'border-blue-500/30 bg-black/40' : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Tool Header bar */}
              <button
                onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                className="w-full flex items-center justify-between p-4 text-left bg-black/10 hover:bg-black/20 transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{tool.name}</span>
                    <span className="bg-white/5 border border-white/5 text-[9px] font-semibold text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                      Database Tool
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-1">{tool.description}</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Tool Content body */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-4 space-y-4 text-xs text-slate-300">
                      
                      {/* Tool Parameters Schema */}
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 font-mono">Parameters Definition</span>
                        <div className="bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-slate-400 max-h-32 overflow-y-auto">
                          <pre>{JSON.stringify(tool.inputSchema.properties, null, 2)}</pre>
                        </div>
                      </div>

                      {/* Interactive Run Form */}
                      <div className="bg-black/20 border border-white/5 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2.5 font-mono">Execute Parameter Payload</span>
                        
                        <div className="space-y-3">
                          {Object.entries(tool.inputSchema.properties).map(([fieldName, fieldSchema]: [string, any]) => (
                            <div key={fieldName}>
                              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                {fieldName} {tool.inputSchema.required?.includes(fieldName) && <span className="text-rose-400">*</span>}
                              </label>
                              <input
                                type={fieldSchema.type === 'NUMBER' ? 'number' : 'text'}
                                required={tool.inputSchema.required?.includes(fieldName)}
                                value={inputs[tool.name]?.[fieldName] ?? ''}
                                onChange={(e) => handleInputChange(tool.name, fieldName, fieldSchema.type === 'NUMBER' ? parseFloat(e.target.value) : e.target.value)}
                                placeholder={fieldSchema.description || `Enter value...`}
                                className="w-full bg-black border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          ))}

                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleRunTool(tool.name)}
                              disabled={loading === tool.name}
                              className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition active:scale-95 shadow-lg shadow-blue-500/10"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              {loading === tool.name ? 'Running...' : 'Run Local Tool'}
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Output results terminal */}
                      {hasResult && (
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1 font-mono">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            JSON RPC Response
                          </span>
                          <div className="bg-black/60 border border-white/5 rounded-xl p-3 max-h-56 overflow-y-auto select-all">
                            <pre className="font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {JSON.stringify(results[tool.name], null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
