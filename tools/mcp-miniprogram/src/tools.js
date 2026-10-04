import { ADMIN_API } from "./config.js";
import { request, uploadFile } from "./api.js";

const C = `${ADMIN_API}/contents`;
const P = `${ADMIN_API}/pages`;
const A = `${ADMIN_API}/assets`;

/** 工具声明：name / description / inputSchema 三件套 */
export const TOOLS = [
  // ========== 读 ==========
  {
    name: "mp_list_contents",
    description:
      "列出小程序后台的内容（文章/视频/图集等）。可按关键词、状态、类型、分类筛选，支持分页。返回标题、状态、类型、更新时间。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "标题关键词" },
        status: { type: "string", description: "状态：draft 草稿 / published 已发布 / offline 已下架，不传查全部" },
        contentType: { type: "string", description: "内容类型，如 article / video / gallery" },
        categoryId: { type: "number", description: "分类 ID" },
        current: { type: "number", description: "页码，默认 1" },
        size: { type: "number", description: "每页条数，默认 10，最大 100" },
      },
    },
  },
  {
    name: "mp_get_content",
    description: "按 ID 读取一条内容的完整详情，含正文 content、封面、附件、标签等全部字段。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "内容 ID" } },
      required: ["id"],
    },
  },
  {
    name: "mp_list_pages",
    description: "列出装修页面（首页/内容页/商城页等），返回页面 ID、名称、类型、路径、发布状态。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "页面名称关键词" },
        current: { type: "number", description: "页码，默认 1" },
        size: { type: "number", description: "每页条数，默认 20" },
      },
    },
  },
  {
    name: "mp_get_page",
    description: "读取页面详情，包含 DSL 装修结构与发布状态。改页面前先读这个拿最新结构。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "页面 ID" } },
      required: ["id"],
    },
  },
  {
    name: "mp_list_assets",
    description: "列出素材库中的文件（图片/视频等），返回可直接在内容与页面中引用的相对路径。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "文件名关键词" },
        current: { type: "number", description: "页码，默认 1" },
        size: { type: "number", description: "每页条数，默认 20" },
      },
    },
  },

  // ========== 写 ==========
  {
    name: "mp_create_content",
    description:
      "新建一条内容（默认草稿，不直接对外可见）。需要发布时再调 mp_publish_content。",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "标题" },
        content: { type: "string", description: "正文，支持 HTML" },
        contentType: { type: "string", description: "类型：article / video / gallery，默认 article" },
        categoryId: { type: "number", description: "分类 ID" },
        summary: { type: "string", description: "摘要" },
        coverImage: { type: "string", description: "封面图，必须是 /uploads/... 相对路径" },
        videoUrl: { type: "string", description: "视频地址" },
        images: { type: "array", items: { type: "string" }, description: "图集图片路径数组" },
        tags: { type: "array", items: { type: "string" }, description: "标签数组" },
        author: { type: "string", description: "作者" },
        visibility: { type: "string", description: "可见性：public / member / planet" },
        sortOrder: { type: "number", description: "排序值，越大越靠前" },
      },
      required: ["title"],
    },
  },
  {
    name: "mp_update_content",
    description: "按 ID 更新已有内容。只传要改的字段，未传字段保持原值（内部先读后写合并）。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "内容 ID" },
        title: { type: "string" },
        content: { type: "string", description: "正文，支持 HTML" },
        contentType: { type: "string" },
        categoryId: { type: "number" },
        summary: { type: "string" },
        coverImage: { type: "string" },
        videoUrl: { type: "string" },
        images: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        author: { type: "string" },
        visibility: { type: "string" },
        sortOrder: { type: "number" },
        confirmOverwrite: { type: "boolean", description: "覆盖他人锁定编辑时置 true" },
      },
      required: ["id"],
    },
  },
  {
    name: "mp_publish_content",
    description: "发布指定内容，使其对小程序端可见。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "内容 ID" } },
      required: ["id"],
    },
  },
  {
    name: "mp_unpublish_content",
    description: "下架指定内容，小程序端不再展示（内容保留在后台）。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "内容 ID" } },
      required: ["id"],
    },
  },
  {
    name: "mp_save_page_draft",
    description:
      "把 DSL 结构存为页面草稿。存草稿不会改动线上版本，必须再调 mp_publish_page 才会生效。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "页面 ID" },
        dslContent: { type: "string", description: "页面 DSL JSON 字符串" },
        expectedVersion: { type: "number", description: "乐观锁版本号，冲突时报错" },
      },
      required: ["id", "dslContent"],
    },
  },
  {
    name: "mp_publish_page",
    description: "发布指定装修页面，让最新草稿对小程序端生效。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "页面 ID" } },
      required: ["id"],
    },
  },
  {
    name: "mp_upload_file",
    description:
      "上传本地文件到后台素材库，返回可引用的 /uploads/... 相对路径。用于给内容配封面图、给页面配图。",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "本地文件绝对路径" },
      },
      required: ["filePath"],
    },
  },
];

/** 会产生副作用的工具：MP_READ_ONLY=1 时全部隐藏并拒绝调用 */
export const WRITE_TOOLS = new Set([
  "mp_create_content",
  "mp_update_content",
  "mp_publish_content",
  "mp_unpublish_content",
  "mp_save_page_draft",
  "mp_publish_page",
  "mp_upload_file",
]);

export function visibleTools(cfg) {
  return cfg.readOnly ? TOOLS.filter((t) => !WRITE_TOOLS.has(t.name)) : TOOLS;
}

function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(err) {
  return {
    isError: true,
    content: [{ type: "text", text: `调用失败：${err?.message || String(err)}` }],
  };
}

/** 工具分发 */
export async function callTool(cfg, name, args = {}) {
  try {
    if (cfg.readOnly && WRITE_TOOLS.has(name)) {
      return fail(new Error(`当前为只读模式（MP_READ_ONLY=1），${name} 已禁用`));
    }
    switch (name) {
      // ---- 读 ----
      case "mp_list_contents":
        return ok(await request(cfg, { path: C, query: args }));
      case "mp_get_content":
        return ok(await request(cfg, { path: `${C}/${args.id}` }));
      case "mp_list_pages":
        return ok(await request(cfg, { path: P, query: args }));
      case "mp_get_page":
        return ok(await request(cfg, { path: `${P}/${args.id}` }));
      case "mp_list_assets":
        return ok(await request(cfg, { path: A, query: args }));

      // ---- 写 ----
      case "mp_create_content":
        return ok(await request(cfg, { method: "POST", path: C, body: args }));

      case "mp_update_content": {
        const { id, ...patch } = args;
        const current = await request(cfg, { path: `${C}/${id}` });
        return ok(
          await request(cfg, { method: "PUT", path: `${C}/${id}`, body: { ...current, ...patch } })
        );
      }

      case "mp_publish_content":
        return ok(await request(cfg, { method: "PUT", path: `${C}/${args.id}/publish` }));
      case "mp_unpublish_content":
        return ok(await request(cfg, { method: "PUT", path: `${C}/${args.id}/unpublish` }));

      case "mp_save_page_draft": {
        const { id, dslContent, expectedVersion } = args;
        return ok(
          await request(cfg, {
            method: "POST",
            path: `${P}/${id}/draft`,
            body: { dslContent, expectedVersion },
          })
        );
      }
      case "mp_publish_page":
        return ok(await request(cfg, { method: "POST", path: `${P}/${args.id}/publish` }));

      case "mp_upload_file":
        return ok(await uploadFile(cfg, args.filePath));

      default:
        return fail(new Error(`未知工具：${name}`));
    }
  } catch (err) {
    return fail(err);
  }
}
