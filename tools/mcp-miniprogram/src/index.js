#!/usr/bin/env node
/**
 * WorkBuddy 连接器 · 小程序搭建运营平台
 * 传输：stdio（WorkBuddy 拉起本进程并交换 JSON-RPC）
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { authMode } from "./auth.js";
import { visibleTools, callTool } from "./tools.js";

// 配置读取本身不再致命：拿不到凭据也照常启动并列出工具，
// 这样连接器面板能正常显示，错误在调用时给出明确指引。
let cfg;
try {
  cfg = loadConfig();
} catch (err) {
  process.stderr.write(`[mcp-miniprogram] 配置读取异常：${err.message}\n`);
  cfg = {
    base: process.env.MP_API_BASE || "https://api.zfculture.site",
    configured: false,
    configError: err.message,
    readOnly: true,
    tenantId: "",
    timeoutMs: 20000,
  };
}

const server = new Server(
  { name: "mcp-miniprogram", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: visibleTools(cfg) }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  return callTool(cfg, name, args || {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const authDesc = cfg.configured ? authMode(cfg) : "未配置凭据（调用时会提示如何修复）";
  process.stderr.write(
    `[mcp-miniprogram] 已启动 · ${cfg.base} · 认证：${authDesc} · ` +
      `工具数：${visibleTools(cfg).length}${cfg.readOnly ? "（只读模式）" : ""}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`[mcp-miniprogram] 启动失败：${err.stack || err.message}\n`);
  process.exit(1);
});
