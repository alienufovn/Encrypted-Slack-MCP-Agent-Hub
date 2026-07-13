/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { App, ExpressReceiver } from '@slack/bolt';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Military-Grade AES-256 Symmetric Encryption System
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'disaster-response-secure-key-2026-bui-anh-kiet';
// Secure 32-byte hash of the key for standard AES-256 compatibility
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
const ALGORITHM = 'aes-256-gcm';

export function encryptText(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = (cipher.getAuthTag() as any).toString('hex');
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed, using raw text:', err);
    return text;
  }
}

export function decryptText(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText; // Not in IV:TAG:CIPHER format, might be legacy plaintext
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return encryptedText; // Decryption failed, fallback to raw text
  }
}

const app = express();
const PORT = 3000;

// Enable JSON parser for standard APIs
app.use(express.json());

// --- IN-MEMORY DATABASE FALLBACK ---
// Pre-seeded environmental logs
let environmentalLogs = [
  {
    id: '1',
    location_name: 'Sector 1 Flood Zone',
    latitude: 14.5500,
    longitude: 121.0000,
    water_potability: 12, // extremely low
    emergency_supplies: '10 MREs, 2 First Aid Kits, 0 Water Filters',
    last_reported: new Date().toISOString(),
    status: 'critical',
    details: 'Severely contaminated floodwaters. High turbidity, elevated coliform levels. Critical shortage of potable water.'
  },
  {
    id: '2',
    location_name: 'Sector 4 Coastal Basin',
    latitude: 14.5995,
    longitude: 120.9842,
    water_potability: 45, // warning level
    emergency_supplies: '120 MREs, 30 First Aid Kits, 15 Water Filters',
    last_reported: new Date().toISOString(),
    status: 'warning',
    details: 'Slight chemical runoff detected from nearby industrial drains. Potability has degraded but filters are functioning.'
  },
  {
    id: '3',
    location_name: 'Sector 7 Mountain Ridge',
    latitude: 14.6200,
    longitude: 121.0500,
    water_potability: 91, // safe
    emergency_supplies: '450 MREs, 120 First Aid Kits, 90 Water Filters',
    last_reported: new Date().toISOString(),
    status: 'safe',
    details: 'Fresh spring source. Regular water safety tests show excellent results. Supply levels optimal.'
  },
  {
    id: '4',
    location_name: 'Sector 9 Refugee Camp',
    latitude: 14.5800,
    longitude: 121.1000,
    water_potability: 76, // safe with filters
    emergency_supplies: '1200 MREs, 300 First Aid Kits, 250 Water Filters',
    last_reported: new Date().toISOString(),
    status: 'safe',
    details: 'Serving 500+ displaced persons. Supply distribution active. Water remains potable via on-site purification units.'
  }
];

// Pre-seeded workspaces
let slackWorkspaces = [
  {
    id: 'w_01',
    team_id: 'T088GOOD',
    enterprise_id: null,
    bot_token: 'xoxb-mock-workspace-eco-token-12345',
    installed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    team_name: 'EcoForce Global'
  },
  {
    id: 'w_02',
    team_id: 'T099RESC',
    enterprise_id: 'E011USA',
    bot_token: 'xoxb-mock-enterprise-res-token-67890',
    installed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    team_name: 'RedCross Disaster Response'
  }
];

// Pre-seeded Slack Alerts
let slackAlerts = [
  {
    id: 'a_01',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    channel_id: 'C_ENV_ALERT_1',
    channel_name: 'disaster-response-hq',
    user_id: 'U_COORD_ALICE',
    user_name: 'Alice Cooper (Field Lead)',
    text: '@FieldBot Sector 1 water supply has collapsed. Potability tested at 12%. Need emergency water purification pills!',
    location_name: 'Sector 1 Flood Zone',
    severity: 'high',
    status: 'pending'
  },
  {
    id: 'a_02',
    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    channel_id: 'C_ENV_ALERT_2',
    channel_name: 'monitoring-coastal',
    user_id: 'U_ENG_BOB',
    user_name: 'Bob Johnson (Hydrologist)',
    text: '@FieldBot Noticed a mild dip in water potability (currently 45%) at Sector 4 Coastal. Runoff is suspect, but not critical yet.',
    location_name: 'Sector 4 Coastal Basin',
    severity: 'medium',
    status: 'acknowledged'
  }
];

// --- SUPABASE CLIENT LAZY INITIALIZATION ---
let supabase: any = null;
const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

function getSupabaseClient() {
  if (!supabase && isSupabaseConfigured) {
    try {
      supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      console.log('Supabase client successfully initialized.');
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }
  return supabase;
}

// --- GEMINI API CLIENT INITIALIZATION ---
let ai: any = null;
const isGeminiConfigured = !!process.env.GEMINI_API_KEY;

function getGeminiClient() {
  if (!ai && isGeminiConfigured) {
    try {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('Gemini AI Client successfully initialized.');
    } catch (err) {
      console.error('Failed to initialize Gemini Client:', err);
    }
  }
  return ai;
}

// --- DATABASE HANDLERS (SUPABASE OR MEMORY) ---
async function fetchEnvironmentalLogs() {
  const client = getSupabaseClient();
  let rawLogs = [];
  if (client) {
    const { data, error } = await client.from('environmental_logs').select('*');
    if (!error && data && data.length > 0) {
      rawLogs = data;
    } else {
      rawLogs = environmentalLogs;
    }
    if (error) {
      console.log('Supabase environmental_logs fetch status: Table not active. Operating in local-fallback mode.');
    }
  } else {
    rawLogs = environmentalLogs;
  }
  return rawLogs.map(l => ({
    ...l,
    details: decryptText(l.details),
    emergency_supplies: decryptText(l.emergency_supplies)
  }));
}

async function saveEnvironmentalLog(log: any) {
  const encryptedLog = {
    ...log,
    details: encryptText(log.details || ''),
    emergency_supplies: encryptText(log.emergency_supplies || '')
  };
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.from('environmental_logs').upsert(encryptedLog).select();
    if (!error && data && data[0]) {
      const saved = data[0];
      return {
        ...saved,
        details: decryptText(saved.details),
        emergency_supplies: decryptText(saved.emergency_supplies)
      };
    }
    console.log('Supabase save status: Table not active. Saving to local-fallback store.');
  }
  const idx = environmentalLogs.findIndex(l => l.id === log.id || l.location_name.toLowerCase() === log.location_name.toLowerCase());
  const newLogRaw = {
    id: log.id || String(environmentalLogs.length + 1),
    location_name: log.location_name,
    latitude: log.latitude || 14.5,
    longitude: log.longitude || 121.0,
    water_potability: log.water_potability ?? 50,
    emergency_supplies: log.emergency_supplies || 'None',
    last_reported: new Date().toISOString(),
    status: log.status || 'warning',
    details: log.details || ''
  };
  const newLogEncrypted = {
    ...newLogRaw,
    details: encryptText(newLogRaw.details),
    emergency_supplies: encryptText(newLogRaw.emergency_supplies)
  };
  if (idx > -1) {
    environmentalLogs[idx] = newLogEncrypted;
  } else {
    environmentalLogs.push(newLogEncrypted);
  }
  return newLogRaw;
}

async function fetchWorkspaces() {
  const client = getSupabaseClient();
  let rawWorkspaces = [];
  if (client) {
    const { data, error } = await client.from('slack_workspaces').select('*');
    if (!error && data && data.length > 0) {
      rawWorkspaces = data;
    } else {
      rawWorkspaces = slackWorkspaces;
    }
  } else {
    rawWorkspaces = slackWorkspaces;
  }
  return rawWorkspaces.map(w => ({
    ...w,
    bot_token: decryptText(w.bot_token)
  }));
}

async function saveWorkspace(workspace: any) {
  const encryptedWorkspace = {
    ...workspace,
    bot_token: encryptText(workspace.bot_token || '')
  };
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.from('slack_workspaces').upsert(encryptedWorkspace).select();
    if (!error && data && data[0]) {
      const saved = data[0];
      return {
        ...saved,
        bot_token: decryptText(saved.bot_token)
      };
    }
  }
  const existingIdx = slackWorkspaces.findIndex(w => w.team_id === workspace.team_id);
  const newWSRaw = {
    id: workspace.id || `w_${Date.now()}`,
    team_id: workspace.team_id,
    enterprise_id: workspace.enterprise_id || null,
    bot_token: workspace.bot_token,
    installed_at: new Date().toISOString(),
    team_name: workspace.team_name || 'Simulated Slack Workspace'
  };
  const newWSEncrypted = {
    ...newWSRaw,
    bot_token: encryptText(newWSRaw.bot_token)
  };
  if (existingIdx > -1) {
    slackWorkspaces[existingIdx] = newWSEncrypted;
  } else {
    slackWorkspaces.push(newWSEncrypted);
  }
  return newWSRaw;
}

async function fetchSlackAlerts() {
  const client = getSupabaseClient();
  let rawAlerts = [];
  if (client) {
    const { data, error } = await client.from('slack_alerts').select('*').order('timestamp', { ascending: false });
    if (!error && data && data.length > 0) {
      rawAlerts = data;
    } else {
      rawAlerts = slackAlerts;
    }
  } else {
    rawAlerts = slackAlerts;
  }
  const sorted = [...rawAlerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return sorted.map(a => ({
    ...a,
    text: decryptText(a.text)
  }));
}

async function saveSlackAlert(alert: any) {
  const encryptedAlert = {
    ...alert,
    text: encryptText(alert.text || '')
  };
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.from('slack_alerts').upsert(encryptedAlert).select();
    if (!error && data && data[0]) {
      const saved = data[0];
      return {
        ...saved,
        text: decryptText(saved.text)
      };
    }
  }
  const idx = slackAlerts.findIndex(a => a.id === alert.id);
  const updatedAlertRaw = {
    ...alert,
    id: alert.id || `a_${Date.now()}`,
    timestamp: alert.timestamp || new Date().toISOString()
  };
  const updatedAlertEncrypted = {
    ...updatedAlertRaw,
    text: encryptText(updatedAlertRaw.text)
  };
  if (idx > -1) {
    slackAlerts[idx] = updatedAlertEncrypted;
  } else {
    slackAlerts.push(updatedAlertEncrypted);
  }
  return updatedAlertRaw;
}


// --- MODEL CONTEXT PROTOCOL (MCP) TOOL DEFINITIONS & SERVER ROUTING ---
const mcpToolsRegistry = [
  {
    name: 'query_environmental_metrics',
    description: 'Fetch real-time disaster response, climate metrics, and water potability levels for environmental sectors.',
    inputSchema: {
      type: 'OBJECT',
      properties: {
        location_name: {
          type: Type.STRING,
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
          type: Type.STRING,
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
          type: Type.STRING,
          description: 'The location or sector where the incident is occurring.'
        },
        latitude: {
          type: Type.NUMBER,
          description: 'Numerical latitude coordinate.'
        },
        longitude: {
          type: Type.NUMBER,
          description: 'Numerical longitude coordinate.'
        },
        water_potability: {
          type: Type.NUMBER,
          description: 'Current water potability safety rating percentage (0 - 100).'
        },
        details: {
          type: Type.STRING,
          description: 'Detailed field observations of contamination, flooding, or equipment failure.'
        },
        supplies_status: {
          type: Type.STRING,
          description: 'Current stock of critical survival supplies at location.'
        }
      },
      required: ['location_name', 'water_potability', 'details']
    }
  }
];

// Execute MCP Tool Routing Logic
async function executeMCPTool(toolName: string, args: any) {
  console.log(`[MCP Router] Executing tool '${toolName}' with arguments:`, args);
  const logs = await fetchEnvironmentalLogs();

  switch (toolName) {
    case 'query_environmental_metrics': {
      const loc = args.location_name ? String(args.location_name).toLowerCase() : '';
      const filtered = loc 
        ? logs.filter(l => l.location_name.toLowerCase().includes(loc))
        : logs;
      
      if (filtered.length === 0) {
        return JSON.stringify({ error: `No environmental metrics found for '${args.location_name}'` });
      }
      return JSON.stringify(filtered.map(l => ({
        location: l.location_name,
        water_potability: `${l.water_potability}%`,
        status: l.status,
        last_reported: l.last_reported,
        details: l.details
      })));
    }

    case 'get_disaster_supply_logs': {
      const loc = args.location_name ? String(args.location_name).toLowerCase() : '';
      const filtered = loc 
        ? logs.filter(l => l.location_name.toLowerCase().includes(loc))
        : logs;
      
      return JSON.stringify(filtered.map(l => ({
        location: l.location_name,
        supplies: l.emergency_supplies,
        status: l.status
      })));
    }

    case 'report_field_incident': {
      const { location_name, latitude, longitude, water_potability, details, supplies_status } = args;
      
      // Determine status from potability
      let status: 'safe' | 'warning' | 'critical' = 'safe';
      if (water_potability < 30) status = 'critical';
      else if (water_potability < 70) status = 'warning';

      // Find or create
      const existing = logs.find(l => l.location_name.toLowerCase().includes(location_name.toLowerCase()));
      const updatedLog = {
        id: existing?.id || String(logs.length + 1),
        location_name: existing?.location_name || location_name,
        latitude: latitude || existing?.latitude || 14.56,
        longitude: longitude || existing?.longitude || 121.02,
        water_potability,
        emergency_supplies: supplies_status || existing?.emergency_supplies || 'None',
        last_reported: new Date().toISOString(),
        status,
        details
      };

      // Save to Database
      const savedLog = await saveEnvironmentalLog(updatedLog);

      // Create high-priority Slack Alert triggered from this field incident report
      const newAlert = {
        id: `a_${Date.now()}`,
        timestamp: new Date().toISOString(),
        channel_id: 'C_FIELD_AUTO',
        channel_name: 'field-incidents-auto',
        user_id: 'U_FIELD_BOT',
        user_name: 'Field Agent Automated Uplink',
        text: `[MCP TRIGGERED INCIDENT] Critical report for "${savedLog.location_name}". Water potability: ${water_potability}%. Observation: ${details}`,
        location_name: savedLog.location_name,
        severity: 'high',
        status: 'pending'
      };

      const savedAlert = await saveSlackAlert(newAlert);

      return JSON.stringify({
        success: true,
        message: 'Disaster incident reported, database log updated, and Slack coordinator alert dispatched.',
        environmental_log: savedLog,
        alert_dispatched: savedAlert
      });
    }

    default:
      throw new Error(`MCP tool '${toolName}' not found in registry.`);
  }
}


// --- SLACK BOT EVENTS & OAUTH (BOLT APP INTEGRATION) ---
let boltReceiver: any = null;
let boltApp: any = null;

if (process.env.SLACK_SIGNING_SECRET && (process.env.SLACK_CLIENT_ID || process.env.SLACK_BOT_TOKEN)) {
  try {
    if (process.env.SLACK_BOT_TOKEN) {
      console.log('Initializing Slack Bolt in Single-Workspace Mode with SLACK_BOT_TOKEN...');
      boltReceiver = new ExpressReceiver({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        endpoints: '/slack/events',
        processBeforeResponse: true,
      });

      boltApp = new App({
        receiver: boltReceiver,
        token: process.env.SLACK_BOT_TOKEN,
      });
    } else {
      console.log('Initializing Slack Bolt in Multi-Workspace Mode with OAuth...');
      boltReceiver = new ExpressReceiver({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        stateSecret: process.env.SLACK_STATE_SECRET || 'environmental-disaster-rescue-state-secret',
        scopes: ['app_mentions:read', 'chat:write', 'channels:read'],
        endpoints: '/slack/events',
        processBeforeResponse: true,
        installationStore: {
          storeInstallation: async (installation) => {
            if (installation.team && installation.bot) {
              await saveWorkspace({
                team_id: installation.team.id,
                enterprise_id: installation.enterprise?.id || null,
                bot_token: installation.bot.token,
                team_name: installation.team.name || 'Installed Slack Org'
              });
            }
          },
          fetchInstallation: async (installQuery) => {
            const wsList = await fetchWorkspaces();
            const match = wsList.find(w => w.team_id === installQuery.teamId);
            if (match) {
              return {
                bot: {
                  token: match.bot_token,
                  scopes: ['app_mentions:read', 'chat:write'],
                  id: 'U_MOCK_BOT'
                },
                team: { id: match.team_id, name: match.team_name },
                enterprise: match.enterprise_id ? { id: match.enterprise_id } : undefined,
                authenticatedActorType: 'bot'
              } as any;
            }
            throw new Error('No installation found for team ' + installQuery.teamId);
          }
        }
      });

      boltApp = new App({
        receiver: boltReceiver,
      });
    }

    // Chatbot Mentions Handler
    boltApp.event('app_mention', async ({ event, say, client }: any) => {
      console.log('Received Slack app_mention event:', event.text);
      try {
        const text = event.text;
        const userId = event.user;
        const channelId = event.channel;

        // Fetch user info for a rich experience
        let userName = 'Slack Coordinator';
        try {
          const userResult = await client.users.info({ user: userId });
          if (userResult.user?.profile?.real_name) {
            userName = userResult.user.profile.real_name;
          }
        } catch (uErr) {
          console.warn('Failed to retrieve real user name from Slack:', uErr);
        }

        // Run Gemini + MCP loop
        const result = await processBotUplink(text, userId, userName, channelId);

        // Post result back to Slack
        await say({
          text: result.bot_response,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: result.bot_response
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `🛡️ *Agent Rescue Uplink* | Model: \`gemini-3.5-flash\` | Tools triggered: ${result.tool_calls.map(tc => `\`${tc.tool_name}\``).join(', ') || 'none'}`
                }
              ]
            }
          ]
        });
      } catch (err: any) {
        console.error('Error processing Slack Mention Event:', err);
        await say(`Emergency Bot uplink error: ${err.message}`);
      }
    });

    console.log('Slack Bolt app configured successfully on ExpressReceiver.');
  } catch (err) {
    console.error('Failed to configure Slack Bolt agent:', err);
  }
}


// --- CORE AI AGENT PROCESSING PIPELINE (GEMINI + MCP INTERNALS) ---
async function processBotUplink(
  userText: string,
  userId: string,
  userName: string,
  channelId: string = 'C_MOCK_CHANNEL'
) {
  const cleanMsg = userText.replace(/<@U[A-Z0-9]+>/g, '').trim();
  console.log(`[Bot Pipeline] Processing message from user '${userName}': "${cleanMsg}"`);

  // Log incoming Slack message as an Alert in our dashboard (real-time CRM connection!)
  // Check if location is mentioned
  let location_name: string | null = null;
  if (cleanMsg.toLowerCase().includes('sector 1')) location_name = 'Sector 1 Flood Zone';
  else if (cleanMsg.toLowerCase().includes('sector 4')) location_name = 'Sector 4 Coastal Basin';
  else if (cleanMsg.toLowerCase().includes('sector 7')) location_name = 'Sector 7 Mountain Ridge';
  else if (cleanMsg.toLowerCase().includes('sector 9')) location_name = 'Sector 9 Refugee Camp';

  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low';
  const lowerMsg = cleanMsg.toLowerCase();
  if (lowerMsg.includes('critical') || lowerMsg.includes('emergency') || lowerMsg.includes('danger') || lowerMsg.includes('collapsed') || lowerMsg.includes('toxicity') || lowerMsg.includes('poison')) {
    severity = 'high';
  } else if (lowerMsg.includes('warning') || lowerMsg.includes('degraded') || lowerMsg.includes('falling') || lowerMsg.includes('shortage')) {
    severity = 'medium';
  }

  const generatedAlert = {
    id: `a_${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel_id: channelId,
    channel_name: 'simulated-slack-feed',
    user_id: userId,
    user_name: userName,
    text: userText,
    location_name,
    severity,
    status: 'pending' as const
  };

  await saveSlackAlert(generatedAlert);

  // Initialize Trace Data
  const traceToolCalls: { tool_name: string; args: any; result: string; }[] = [];
  let geminiThinking = 'Analyzing environmental mention text to map disaster rescue contexts...';
  let botResponse = '';

  const gemini = getGeminiClient();

  if (!gemini) {
    // Graceful offline simulated responder in case GEMINI_API_KEY is not defined
    geminiThinking = '[OFFLINE MODE] Configured tools matched via local text analysis. Gemini is bypassed.';
    let mockResponse = '';

    if (lowerMsg.includes('metric') || lowerMsg.includes('water') || lowerMsg.includes('potability') || lowerMsg.includes('test')) {
      const toolRes = await executeMCPTool('query_environmental_metrics', { location_name });
      traceToolCalls.push({
        tool_name: 'query_environmental_metrics',
        args: { location_name },
        result: toolRes
      });
      mockResponse = `Hello ${userName}! I queried the Supabase database using query_environmental_metrics for local status in real time: \n${toolRes}\nLet me know if we need to deploy field supplies!`;
    } else if (lowerMsg.includes('supply') || lowerMsg.includes('food') || lowerMsg.includes('ration') || lowerMsg.includes('kit')) {
      const toolRes = await executeMCPTool('get_disaster_supply_logs', { location_name });
      traceToolCalls.push({
        tool_name: 'get_disaster_supply_logs',
        args: { location_name },
        result: toolRes
      });
      mockResponse = `Hello ${userName}! I executed the Supabase MCP supply tool get_disaster_supply_logs: \n${toolRes}\nPlease distribute emergency provisions immediately.`;
    } else if (lowerMsg.includes('report') && location_name) {
      const toolRes = await executeMCPTool('report_field_incident', {
        location_name,
        water_potability: 20,
        details: `Simulated report: ${cleanMsg}`
      });
      traceToolCalls.push({
        tool_name: 'report_field_incident',
        args: { location_name, water_potability: 20, details: cleanMsg },
        result: toolRes
      });
      mockResponse = `Affirmative! Incident for ${location_name} logged. High-priority coordinator notification dispatched.`;
    } else {
      mockResponse = `Understood, ${userName}. Active disaster relief agent standing by. I can assist with checking water potability (query_environmental_metrics), emergency depots (get_disaster_supply_logs), or logging critical status updates (report_field_incident). Try mentioning "water potability" or "supplies".`;
    }
    return {
      raw_payload: { message: cleanMsg, user: userName, channel: channelId },
      gemini_thinking: geminiThinking,
      tool_calls: traceToolCalls,
      bot_response: mockResponse,
      alert_created: generatedAlert
    };
  }

  try {
    // Parse Gemini Tool configurations
    const mcpFunctionDeclarations = mcpToolsRegistry.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: t.inputSchema.type,
        properties: t.inputSchema.properties,
        required: t.inputSchema.required || []
      }
    }));

    geminiThinking = 'Dispatched request to gemini-3.5-flash with function definitions...';

    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are the Field Rescue Slack Bot Agent. The user "${userName}" asked: "${cleanMsg}". If they are asking for environmental status, water metrics, or emergency supply logs, you MUST run the appropriate tool. If they are reporting an incident, run report_field_incident.`,
      config: {
        systemInstruction: 'You are the official "Slack Agent for Good" coordinator chatbot. You have direct access to Supabase databases via Model Context Protocol (MCP) server tools. Answer concisely, emphasizing environmental preservation, life safety, and disaster relief logistics.',
        tools: [{ functionDeclarations: mcpFunctionDeclarations }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const fCalls = response.functionCalls;
    if (fCalls && fCalls.length > 0) {
      console.log('[Gemini Bot] Model invoked tool call:', fCalls[0]);
      const activeCall = fCalls[0];
      const toolName = activeCall.name;
      const toolArgs = activeCall.args;

      geminiThinking = `Model selected tool: ${toolName}. Executing payload in database...`;

      // Execute tool
      let toolResultText = '';
      try {
        toolResultText = await executeMCPTool(toolName, toolArgs);
      } catch (tErr: any) {
        toolResultText = JSON.stringify({ error: tErr.message });
      }

      traceToolCalls.push({
        tool_name: toolName,
        args: toolArgs,
        result: toolResultText
      });

      // Synthesis step: Give Gemini the output to format perfectly.
      geminiThinking = `Tool output received. Synthesizing final natural language response for Slack...`;
      const synthesisResponse = await gemini.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: cleanMsg }] },
          { role: 'model', parts: [{ text: `Executing tool ${toolName} with parameters: ${JSON.stringify(toolArgs)}` }] },
          { role: 'user', parts: [{ text: `Here is the real-time Supabase output from the MCP tool: ${toolResultText}. Please formulate a highly reassuring, direct response for the Slack channel telling them about this data.` }] }
        ],
        config: {
          systemInstruction: 'You are the Field Rescue Slack Bot Agent. Frame details around coordinating rescue crews and supply drops immediately.'
        }
      });

      botResponse = synthesisResponse.text || 'No response formulated.';
    } else {
      geminiThinking = 'No specific tools matched; formulating direct natural language reply.';
      botResponse = response.text || 'Standing by to coordinate field team assets.';
    }

    return {
      raw_payload: { message: cleanMsg, user: userName, channel: channelId },
      gemini_thinking: geminiThinking,
      tool_calls: traceToolCalls,
      bot_response: botResponse,
      alert_created: generatedAlert
    };

  } catch (aiErr: any) {
    console.error('Gemini processing pipeline error:', aiErr);
    return {
      raw_payload: { message: cleanMsg, user: userName, channel: channelId },
      gemini_thinking: `Pipeline Error: ${aiErr.message}`,
      tool_calls: traceToolCalls,
      bot_response: `⚠️ Emergency chatbot uplink degraded. Raw fallback matches: Water Potability drops to critical in Sector 1. Supplies standing by. Error details: ${aiErr.message}`,
      alert_created: generatedAlert
    };
  }
}

// Function to push real-time alerts from your backend into your Slack channel
async function sendSlackWebhookAlert(messageText: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("Missing SLACK_WEBHOOK_URL in environment variables.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: messageText, // This is the payload structure Slack expects
      }),
    });

    if (response.ok) {
      console.log("🚀 Webhook alert dispatched successfully to Slack!");
    } else {
      console.error(`Failed to send webhook status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error executing incoming webhook request:", error);
  }
}

// This function replicates the exact logic of your sample curl request
async function sendHelloWorldAlert() {
  // Pulls the secure URL you saved in Step 1
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("Missing SLACK_WEBHOOK_URL variable.");
    return;
  }

  try {
    // Executes the HTTP POST request with the JSON payload, matching your curl parameters
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Matches -H 'Content-type: application/json'
      },
      body: JSON.stringify({
        text: "Hello, World!" // Matches --data '{"text":"Hello, World!"}'
      }),
    });

    if (response.ok) {
      console.log("🚀 'Hello, World!' message successfully posted to Slack channel!");
    } else {
      console.error(`Failed to post message. Status status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error executing webhook dispatch:", error);
  }
}


// --- REST API ENDPOINTS ---

// POST feedback endpoint
app.post('/api/feedback', async (req, res) => {
  const { feedbackText } = req.body;
  
  // 1. Process and save the feedback data to your database here...
  
  // 2. Instantly notify your Slack channel using the new webhook function
  await sendSlackWebhookAlert(`📝 *New User Feedback Submitted!* \n"${feedbackText}"`);
  
  res.status(200).json({ success: true });
});

// GET Environmental Logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await fetchEnvironmentalLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Environmental Logs (Manual update/add)
app.post('/api/logs', async (req, res) => {
  try {
    const updated = await saveEnvironmentalLog(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Active Workspaces
app.get('/api/workspaces', async (req, res) => {
  try {
    const workspaces = await fetchWorkspaces();
    res.json(workspaces);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Active Workspaces (Manual install simulated)
app.post('/api/workspaces', async (req, res) => {
  try {
    const saved = await saveWorkspace(req.body);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Slack Alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await fetchSlackAlerts();
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Acknowledge / Resolve Alerts
app.post('/api/alerts/action', async (req, res) => {
  try {
    const { id, action } = req.body; // action = 'acknowledged' or 'resolved'
    const alerts = await fetchSlackAlerts();
    const alert = alerts.find(a => a.id === id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    alert.status = action;
    const saved = await saveSlackAlert(alert);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET MCP Tools Registry (for inspection)
app.get('/api/mcp/tools', (req, res) => {
  res.json({
    mcp_endpoint: '/api/mcp/execute',
    tools: mcpToolsRegistry
  });
});

// POST Execute MCP Tool
app.post('/api/mcp/execute', async (req, res) => {
  try {
    const { tool, arguments: args } = req.body;
    if (!tool) {
      return res.status(400).json({ error: 'Tool parameter is required.' });
    }
    const result = await executeMCPTool(tool, args);
    res.json(JSON.parse(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Simulate Slack Chatbot Mention
app.post('/api/slack/simulate', async (req, res) => {
  try {
    const { channel, user, message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required for simulation.' });
    }
    const result = await processBotUplink(message, 'U_SIM_USER', user || 'Field Operator', channel || 'disaster-hq');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET System Health/Configs
app.get('/api/config', (req, res) => {
  res.json({
    supabase: {
      configured: isSupabaseConfigured,
      url: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 15)}...` : 'Not Configured'
    },
    gemini: {
      configured: isGeminiConfigured
    },
    slack: {
      configured: !!process.env.SLACK_SIGNING_SECRET && (!!process.env.SLACK_CLIENT_ID || !!process.env.SLACK_BOT_TOKEN),
      client_id: process.env.SLACK_CLIENT_ID ? `${process.env.SLACK_CLIENT_ID.substring(0, 10)}...` : 'Not Configured',
      bot_token_configured: !!process.env.SLACK_BOT_TOKEN,
      mode: process.env.SLACK_BOT_TOKEN ? 'single-workspace' : (process.env.SLACK_CLIENT_ID ? 'multi-workspace' : 'none')
    }
  });
});


// --- INTEGRATING SLACK BOLT ROUTER AS SUB-APP ---
if (boltReceiver) {
  app.use(boltReceiver.router);
}


// --- PRODUCTION BUNDLE AND ASSET SERVING ---
if (process.env.NODE_ENV !== 'production') {
  // Vite Dev Server Middleware setup
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Boot listener after Vite middleware is attached
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[DEV MODE] Server boot complete. Listening on http://localhost:${PORT}`);
      sendHelloWorldAlert();
    });
  };
  startVite();
} else {
  // Serve static distribution files in production
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PRODUCTION MODE] Standing by on port ${PORT}`);
    sendHelloWorldAlert();
  });
}
