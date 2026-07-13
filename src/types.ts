/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EnvironmentalLog {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  water_potability: number; // percentage (0 - 100)
  emergency_supplies: string; // e.g., "500 MREs, 100 First Aid Kits, 50 Water Filters"
  last_reported: string; // ISO string
  status: 'safe' | 'warning' | 'critical';
  details?: string;
}

export interface SlackWorkspace {
  id: string;
  team_id: string;
  enterprise_id: string | null;
  bot_token: string;
  installed_at: string;
  team_name?: string;
}

export interface SlackAlert {
  id: string;
  timestamp: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  text: string;
  location_name: string | null;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'acknowledged' | 'resolved';
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface SimulationPayload {
  channel: string;
  user: string;
  message: string;
}

export interface SimulationResult {
  raw_payload: any;
  gemini_thinking: string;
  tool_calls: {
    tool_name: string;
    args: any;
    result: string;
  }[];
  bot_response: string;
  alert_created?: SlackAlert;
}
