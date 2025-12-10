/**
 * Debug script to list available MCP tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

async function listMCPTools(serverName, command, args, env = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Inspecting ${serverName} MCP Server`);
  console.log('='.repeat(60));

  const client = new Client({
    name: 'debug-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  const transport = new StdioClientTransport({
    command,
    args,
    env: { ...process.env, ...env }
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected successfully\n');

    const tools = await client.listTools();
    console.log(`📋 Available tools (${tools.tools.length}):\n`);

    tools.tools.forEach((tool, i) => {
      console.log(`${i + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   Description: ${tool.description}`);
      }
      if (tool.inputSchema) {
        console.log(`   Input Schema:`, JSON.stringify(tool.inputSchema, null, 2).split('\n').map((line, idx) => idx === 0 ? line : '   ' + line).join('\n'));
      }
      console.log('');
    });

    await client.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

async function main() {
  // List MS365 (Planner) tools
  await listMCPTools(
    'MS365 Planner',
    'npx',
    ['-y', '@softeria/ms-365-mcp-server']
  );

  // List ClickUp tools
  await listMCPTools(
    'ClickUp',
    'npx',
    ['-y', '@taazkareem/clickup-mcp-server'],
    {
      CLICKUP_API_KEY: process.env.CLICKUP_API_KEY || '',
      CLICKUP_TEAM_ID: process.env.CLICKUP_TEAM_ID || ''
    }
  );

  console.log('='.repeat(60));
  console.log('✅ MCP Tool Inspection Complete');
  console.log('='.repeat(60) + '\n');
}

main();
