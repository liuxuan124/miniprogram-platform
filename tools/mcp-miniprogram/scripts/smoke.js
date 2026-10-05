#!/usr/bin/env node
/**
 * 冒烟验证：拉起 MCP server，跑 initialize → tools/list → 一次只读调用。
 * 用法：node scripts/smoke.js [toolName] [jsonArgs]
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(here, "../src/index.js");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  env: { ...process.env },
});

const client = new Client({ name: "smoke-test", version: "1.0.0" }, { capabilities: {} });

try {
  await client.connect(transport);
  console.log("✅ 连接成功（stdio 握手通过）");

  const { tools } = await client.listTools();
  console.log(`✅ 工具清单：${tools.length} 个`);
  for (const t of tools) console.log(`   - ${t.name}`);

  const toolName = process.argv[2];
  if (toolName) {
    const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};
    console.log(`\n▶ 调用 ${toolName} ${JSON.stringify(args)}`);
    const res = await client.callTool({ name: toolName, arguments: args });
    if (res.isError) {
      console.log("❌ 返回错误：", res.content?.[0]?.text);
      process.exitCode = 1;
    } else {
      const text = res.content?.[0]?.text || "";
      console.log("✅ 返回：", text.length > 1200 ? text.slice(0, 1200) + "\n…(已截断)" : text);
    }
  }
} catch (err) {
  console.error("❌ 冒烟失败：", err.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
