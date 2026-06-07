<template>
  <div class="agent-page">
    <div class="page-header">
      <h2>AI Agent 配置中心</h2>
      <p class="page-desc">完整的 AI Agent 生命周期管理：接入模型 → 编写 Prompt → 上传知识库 → 沙盒测试 → 发布上线 → 监控运营。</p>
    </div>

    <el-tabs v-model="activeTab" class="agent-tabs">
      <el-tab-pane label="① 模型接入" name="model">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>🔌 选择接入模型</span></template>
                <el-radio-group v-model="apiConfig.modelProvider" style="margin-bottom:12px" @change="handleProviderChange">
                  <el-radio-button label="openai">OpenAI</el-radio-button>
                  <el-radio-button label="qwen">Qwen</el-radio-button>
                  <el-radio-button label="anthropic">Claude</el-radio-button>
                  <el-radio-button label="deepseek">DeepSeek</el-radio-button>
                  <el-radio-button label="minimax">MiniMax</el-radio-button>
                  <el-radio-button label="doubao">豆包</el-radio-button>
                  <el-radio-button label="custom">自定义</el-radio-button>
                </el-radio-group>
              <div class="model-list">
                <div v-for="m in providerModels" :key="m.id" class="model-item" :class="{ selected: apiConfig.model === m.id }" @click="selectModel(m)">
                  <div>
                    <div class="model-name">{{ m.name }}</div>
                    <div class="model-desc">{{ m.desc }}</div>
                  </div>
                  <el-tag v-if="apiConfig.model === m.id" type="success" size="small">已选用</el-tag>
                  <el-button v-else size="small">切换</el-button>
                </div>
              </div>
              <el-alert type="info" :closable="false" show-icon style="margin-top:12px">
                <template #title>内置列表会随版本更新；如果服务商发布新模型，可在右侧直接输入模型 ID。</template>
              </el-alert>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>⚙️ API 密钥配置</span></template>
              <el-form label-width="90px">
                <el-form-item label="配置名称">
                  <el-input v-model="apiConfig.name" placeholder="如：生产客服 Agent" />
                </el-form-item>
                <el-form-item label="Base URL">
                  <el-input v-model="apiConfig.apiBaseUrl" placeholder="OpenAI 兼容接口地址" />
                </el-form-item>
                <el-form-item label="API Key">
                  <el-input type="password" v-model="apiConfig.apiKey" show-password placeholder="请输入服务商 API Key" />
                </el-form-item>
                <el-form-item label="模型 ID">
                  <el-select
                    v-model="apiConfig.model"
                    filterable
                    allow-create
                    default-first-option
                    style="width:100%"
                    placeholder="选择或输入模型 ID"
                  >
                    <el-option v-for="m in providerModels" :key="m.id" :label="`${m.name} · ${m.id}`" :value="m.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="推理强度">
                  <el-select v-model="apiConfig.reasoningEffort" style="width:100%">
                    <el-option label="none / 最快响应" value="none" />
                    <el-option label="low / 轻量推理" value="low" />
                    <el-option label="medium / 平衡" value="medium" />
                    <el-option label="high / 深度推理" value="high" />
                    <el-option label="xhigh / 最高推理" value="xhigh" />
                  </el-select>
                </el-form-item>
                <el-form-item label="温度参数">
                  <el-input-number v-model="apiConfig.temperature" :min="0" :max="1" :step="0.1" style="width:100%" />
                </el-form-item>
                <el-form-item label="最大回复">
                  <el-input-number v-model="apiConfig.maxTokens" :min="100" :max="128000" style="width:100%" />
                </el-form-item>
                <el-form-item label="环境">
                  <el-switch v-model="apiConfig.production" active-text="生产" inactive-text="沙盒" />
                </el-form-item>
              </el-form>
              <el-button type="primary" style="margin-top:8px" @click="testConnection">🔌 测试连接</el-button>
              <el-button type="success" style="margin-top:8px;margin-left:8px" :loading="savingConfig" @click="saveModelConfig">保存配置</el-button>
              <el-button style="margin-top:8px;margin-left:8px" @click="activeTab = 'prompt'">下一步：Prompt 配置 →</el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="② Prompt 配置" name="prompt">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-card shadow="never">
              <template #header><span>✏️ System Prompt 编写</span></template>
              <div style="font-size:12px;color:#999;margin-bottom:8px">定义 AI 的角色、能力范围、回答风格与禁止行为</div>
              <el-input type="textarea" v-model="systemPrompt" :rows="12" style="font-size:12px;line-height:1.8" />
              <div style="margin-top:10px;display:flex;gap:8px">
                <el-button size="small" @click="loadTemplate">加载模板</el-button>
                <el-button size="small" @click="estimateCost">估算费用</el-button>
                <el-button size="small" type="primary" @click="activeTab = 'knowledge'">下一步：知识库 →</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card shadow="never">
              <template #header><span>🎛️ 行为策略配置</span></template>
              <el-form label-width="100px">
                <el-form-item label="欢迎语">
                  <el-input v-model="behavior.welcome" />
                </el-form-item>
                <el-form-item label="无法回答时">
                  <el-select v-model="behavior.fallback" style="width:100%">
                    <el-option label="引导转人工客服" value="human" />
                    <el-option label="引导用户留言" value="message" />
                    <el-option label="回复通用话术" value="generic" />
                  </el-select>
                </el-form-item>
                <el-form-item label="商品推荐">
                  <el-switch v-model="behavior.enableRecommend" />
                </el-form-item>
                <el-form-item label="主动引导">
                  <el-switch v-model="behavior.enableProactive" />
                </el-form-item>
                <el-form-item label="对话记忆">
                  <el-select v-model="behavior.memory" style="width:100%">
                    <el-option label="记忆最近 10 条" value="10" />
                    <el-option label="记忆最近 20 条" value="20" />
                    <el-option label="仅记忆当次" value="1" />
                  </el-select>
                </el-form-item>
              </el-form>
              <el-alert type="info" :closable="false" show-icon style="margin-top:10px">
                <template #title>开启「主动引导」后，AI 将在合适时机主动推荐商品或引导报名活动。</template>
              </el-alert>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="③ 知识库" name="knowledge">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>📚 知识库文件管理</span>
              <el-button size="small" type="primary" @click="uploadKnowledge">+ 上传知识文档</el-button>
            </div>
          </template>
          <div style="margin-bottom:14px">
            <el-progress :percentage="85" />
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#999;margin-top:4px">
              <span>知识库向量化进度：3/4 文件已完成</span><span>85%</span>
            </div>
          </div>
          <el-table :data="knowledgeList" stripe style="width:100%">
            <el-table-column label="文件名" prop="name" min-width="200" />
            <el-table-column label="大小" prop="size" width="80" />
            <el-table-column label="向量化状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.status === 'done' ? 'success' : 'warning'" size="small">
                  {{ row.status === 'done' ? '已完成' : '处理中' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="召回权重" width="180">
              <template #default="{ row }">
                <el-slider v-model="row.weight" :min="0" :max="100" style="width:100px" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default>
                <el-button size="small" link>预览</el-button>
                <el-button size="small" link type="danger">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:12px;display:flex;gap:8px">
            <el-button size="small" @click="testRecall">🔍 召回测试</el-button>
            <el-button size="small" type="primary" @click="activeTab = 'sandbox'">下一步：沙盒测试 →</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="④ 沙盒测试" name="sandbox">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-card shadow="never" style="display:flex;flex-direction:column">
              <template #header><span>🧪 对话沙盒</span></template>
              <div class="chat-box">
                <div v-for="(msg, i) in chatMessages" :key="i" :class="msg.role === 'ai' ? 'msg-ai' : 'msg-user'">
                  <div class="msg-avatar">{{ msg.role === 'ai' ? '🤖' : '你' }}</div>
                  <div class="msg-bubble">{{ msg.content }}</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                <el-input v-model="chatInput" placeholder="输入问题测试 AI 回答..." />
                <el-button type="primary" @click="sendChat">发送测试</el-button>
              </div>
              <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                <span style="font-size:11px;color:#999">快捷测试：</span>
                <el-button size="small" @click="quickTest('金卡会员有什么权益？')">金卡会员有什么权益？</el-button>
                <el-button size="small" @click="quickTest('推荐一款礼物')">推荐一款礼物</el-button>
                <el-button size="small" @click="quickTest('有优惠券吗？')">有优惠券吗？</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card shadow="never">
              <template #header><span>📊 沙盒测试评估</span></template>
              <div class="eval-list">
                <div class="eval-item eval-pass">
                  <div class="eval-title">✅ 已通过测试</div>
                  <div class="eval-desc">产品咨询 · 会员权益 · 活动引导</div>
                </div>
                <div class="eval-item eval-warn">
                  <div class="eval-title">⚠️ 待优化</div>
                  <div class="eval-desc">退换货政策问题回答不够精准，建议补充知识库</div>
                </div>
                <div class="eval-item eval-pending">
                  <div class="eval-title">📝 未测试</div>
                  <div class="eval-desc">价格异议处理 · 竞品对比场景</div>
                </div>
              </div>
              <el-button type="primary" style="width:100%;margin-top:14px" @click="activeTab = 'publish'">测试满意，去发布 →</el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="⑤ 发布管理" name="publish">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>🚀 发布管理</span></template>
              <div class="version-card current">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div class="version-title">当前线上版本</div>
                    <div class="version-meta">v2.1 · 2026-05-01 上线 · GPT-4o</div>
                  </div>
                  <el-tag type="success">运行中</el-tag>
                </div>
                <div style="margin-top:8px;font-size:12px;color:#999">已服务对话：12,840 次 · 平均满意度：4.6/5</div>
              </div>
              <div class="version-card pending">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div class="version-title" style="color:#1769ff">待发布版本 v3.0</div>
                    <div class="version-meta">已完成沙盒测试 · 知识库新增2文件 · Prompt优化</div>
                  </div>
                  <el-tag type="warning">待发布</el-tag>
                </div>
              </div>
              <el-form label-width="80px" style="margin-top:14px">
                <el-form-item label="发布方式">
                  <el-select v-model="publishMode" style="width:100%">
                    <el-option label="全量发布（立即生效）" value="full" />
                    <el-option label="灰度发布（10% 用户先行）" value="gray" />
                    <el-option label="定时发布" value="scheduled" />
                  </el-select>
                </el-form-item>
              </el-form>
              <div style="display:flex;gap:8px;margin-top:10px">
                <el-button type="primary" style="flex:1" @click="doPublish">🚀 发布 v3.0</el-button>
                <el-button @click="doRollback">↩ 回滚 v2.1</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>📋 版本历史</span></template>
              <el-table :data="versionHistory" stripe style="width:100%" size="small">
                <el-table-column label="版本" width="80">
                  <template #default="{ row }">
                    <b>{{ row.version }}</b>
                    <el-tag v-if="row.current" type="success" size="small" style="margin-left:4px">线上</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="上线时间" prop="date" width="80" />
                <el-table-column label="模型" prop="model" width="80" />
                <el-table-column label="主要变更" prop="change" min-width="100" />
                <el-table-column label="操作" width="100">
                  <template #default>
                    <el-button size="small" link>查看</el-button>
                    <el-button size="small" link>回滚</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-button size="small" type="primary" style="margin-top:12px" @click="activeTab = 'monitor'">查看运营数据 →</el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="⑥ 运营监控" name="monitor">
        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="8">
            <el-card shadow="never" style="text-align:center;padding:10px">
              <div style="font-size:28px;margin-bottom:4px">🤖</div>
              <div style="font-size:22px;font-weight:700;color:#7c3aed">1,240</div>
              <div style="font-size:12px;color:#999">昨日对话 <span style="color:#0faa6e">↑ 15%</span></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" style="text-align:center;padding:10px">
              <div style="font-size:28px;margin-bottom:4px">🛍️</div>
              <div style="font-size:22px;font-weight:700;color:#1769ff">¥3,580</div>
              <div style="font-size:12px;color:#999">推荐成交额 <span style="color:#0faa6e">转化率 4.2%</span></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" style="text-align:center;padding:10px">
              <div style="font-size:28px;margin-bottom:4px">😊</div>
              <div style="font-size:22px;font-weight:700;color:#0faa6e">4.6/5</div>
              <div style="font-size:12px;color:#999">用户满意度 <span style="color:#0faa6e">差评率 2.1%</span></div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>💬 对话监控</span>
              <el-button size="small">对话分析</el-button>
            </div>
          </template>
          <el-table :data="conversationLog" stripe style="width:100%" size="small">
            <el-table-column label="用户" prop="user" width="80" />
            <el-table-column label="提问" prop="question" min-width="140" />
            <el-table-column label="AI 回复摘要" prop="answer" min-width="160" />
            <el-table-column label="意图" prop="intent" width="90" />
            <el-table-column label="转化" width="90">
              <template #default="{ row }">
                <el-tag size="small">{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" prop="time" width="70" />
          </el-table>
        </el-card>

        <el-card shadow="never">
          <template #header><span>🔥 高频意图分布</span></template>
          <div class="intent-list">
            <div v-for="item in intents" :key="item.name" class="intent-item">
              <span style="width:60px;font-size:12px">{{ item.name }}</span>
              <el-progress :percentage="item.pct" :stroke-width="10" style="flex:1" />
              <span style="font-size:12px;color:#999;width:36px">{{ item.pct }}%</span>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createAgentConfig, getActiveAgentConfig, publishAgentConfig, updateAgentConfig } from '@/api/agent'
import type { AgentConfigPayload } from '@/types/agent'

const activeTab = ref('model')

interface ModelOption {
  provider: string
  id: string
  name: string
  desc: string
  baseUrl: string
  reasoning: string
  maxTokens: number
}

const modelCatalog: ModelOption[] = [
  {
    provider: 'openai',
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    desc: 'OpenAI 最新前沿主力模型，适合复杂 Agent、工具调用和专业任务',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: 'medium',
    maxTokens: 4096,
  },
  {
    provider: 'openai',
    id: 'gpt-5.4-pro',
    name: 'GPT-5.4 Pro',
    desc: '更高性能版本，适合复杂推理和高价值场景',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: 'high',
    maxTokens: 4096,
  },
  {
    provider: 'openai',
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    desc: '更低成本、更低延迟，适合高频客服对话',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: 'none',
    maxTokens: 2048,
  },
  {
    provider: 'qwen',
    id: 'qwen3.6-max-preview',
    name: 'Qwen3.6-Max Preview',
    desc: '通义千问 Max 预览模型，支持思考模式，适合复杂中文 Agent 场景',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    reasoning: 'high',
    maxTokens: 4096,
  },
  {
    provider: 'qwen',
    id: 'qwen3.6-plus',
    name: 'Qwen3.6-Plus',
    desc: '通义千问 Plus 主力模型，适合中文客服、内容推荐和运营场景',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    reasoning: 'medium',
    maxTokens: 4096,
  },
  {
    provider: 'qwen',
    id: 'qwen3.6-flash',
    name: 'Qwen3.6-Flash',
    desc: '高吞吐、低延迟，适合大并发咨询',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    reasoning: 'none',
    maxTokens: 2048,
  },
  {
    provider: 'anthropic',
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    desc: 'Claude 官方高能力模型，适合复杂推理和 Agent 场景',
    baseUrl: 'https://api.anthropic.com',
    reasoning: 'high',
    maxTokens: 4096,
  },
  {
    provider: 'anthropic',
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    desc: '速度与智能平衡，适合生产客服和内容场景',
    baseUrl: 'https://api.anthropic.com',
    reasoning: 'medium',
    maxTokens: 4096,
  },
  {
    provider: 'deepseek',
    id: 'deepseek-v4-pro',
    name: 'DeepSeek-V4-Pro',
    desc: 'DeepSeek 官方 V4 高能力模型，适合复杂推理、长上下文和质量敏感场景',
    baseUrl: 'https://api.deepseek.com',
    reasoning: 'high',
    maxTokens: 8192,
  },
  {
    provider: 'deepseek',
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4-Flash',
    desc: 'DeepSeek 官方 V4 高性价比模型，适合客服、推荐、内容生成和高并发场景',
    baseUrl: 'https://api.deepseek.com',
    reasoning: 'medium',
    maxTokens: 8192,
  },
  {
    provider: 'minimax',
    id: 'MiniMax-M2.5',
    name: 'MiniMax M2.5',
    desc: 'MiniMax MiMo 系列主力模型，适合复杂 Agent、工具调用与中文客服',
    baseUrl: 'https://api.minimaxi.com/v1',
    reasoning: 'medium',
    maxTokens: 8192,
  },
  {
    provider: 'minimax',
    id: 'MiniMax-M2.5-highspeed',
    name: 'MiniMax M2.5 Highspeed',
    desc: 'MiMo 高速版，更低延迟，适合高频对话与实时推荐',
    baseUrl: 'https://api.minimaxi.com/v1',
    reasoning: 'none',
    maxTokens: 4096,
  },
  {
    provider: 'minimax',
    id: 'MiniMax-M2.5-Lightning',
    name: 'MiniMax M2.5 Lightning',
    desc: 'MiMo 轻量 Mini 版，成本更低，适合简单问答与大并发',
    baseUrl: 'https://api.minimaxi.com/v1',
    reasoning: 'none',
    maxTokens: 2048,
  },
  {
    provider: 'minimax',
    id: 'abab6.5s-chat',
    name: 'abab6.5s-chat',
    desc: 'MiniMax 经典对话模型，稳定可靠，适合通用客服场景',
    baseUrl: 'https://api.minimaxi.com/v1',
    reasoning: 'none',
    maxTokens: 4096,
  },
  {
    provider: 'doubao',
    id: 'doubao-1-5-pro-32k',
    name: '豆包 1.5 Pro',
    desc: '字节跳动豆包 Pro，适合复杂推理、长上下文与 Agent 任务',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    reasoning: 'high',
    maxTokens: 8192,
  },
  {
    provider: 'doubao',
    id: 'doubao-1-5-lite-32k',
    name: '豆包 1.5 Lite',
    desc: '豆包 Lite 轻量版，性价比高，适合日常客服与内容生成',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    reasoning: 'none',
    maxTokens: 4096,
  },
  {
    provider: 'doubao',
    id: 'doubao-1-5-flash',
    name: '豆包 1.5 Flash',
    desc: '豆包 Flash Mini 版，超低延迟，适合高并发咨询',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    reasoning: 'none',
    maxTokens: 2048,
  },
  {
    provider: 'doubao',
    id: 'doubao-seed-1-6',
    name: '豆包 Seed 1.6',
    desc: '豆包新一代多模态模型，适合图文混合问答（模型 ID 可填火山方舟 Endpoint ID）',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    reasoning: 'medium',
    maxTokens: 8192,
  },
  {
    provider: 'custom',
    id: 'custom-model-id',
    name: '自定义模型',
    desc: '用于未来新模型或私有化模型，直接填写模型 ID 和 Base URL',
    baseUrl: '',
    reasoning: 'none',
    maxTokens: 2048,
  },
]

const apiConfig = ref({
  id: 0,
  name: '生产客服 Agent',
  modelProvider: 'openai',
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-5.4',
  reasoningEffort: 'medium',
  temperature: 0.7,
  maxTokens: 800,
  production: false
})
const savingConfig = ref(false)

const providerModels = computed(() => modelCatalog.filter(item => item.provider === apiConfig.value.modelProvider))

const systemPrompt = ref(`你是「品牌小程序」的专属智能客服助手。

【你的职责】
1. 解答用户关于品牌产品、材质工艺、使用方法的问题
2. 介绍会员等级体系与积分规则
3. 推荐适合用户的商品
4. 引导用户参与活动和预约服务

【回答风格】
- 亲切自然，简洁有力
- 使用中文，适当使用 emoji
- 回复控制在 200 字以内

【禁止行为】
- 不得回答与品牌无关的问题
- 不得承诺无法核实的优惠
- 涉及退换货问题，引导转接人工客服`)

const behavior = ref({
  welcome: '您好！我是专属智能管家，有什么可以帮您？',
  fallback: 'human',
  enableRecommend: true,
  enableProactive: true,
  memory: '10'
})

const knowledgeList = ref([
  { name: '2026品牌手册.pdf', size: '2.4MB', status: 'done', weight: 90 },
  { name: '产品FAQ大全.md', size: '45KB', status: 'done', weight: 100 },
  { name: '会员权益规则.pdf', size: '1.1MB', status: 'done', weight: 80 },
  { name: '2024活动合集.pdf', size: '3.8MB', status: 'processing', weight: 50 },
])

const chatMessages = ref([
  { role: 'ai', content: '您好！我是品牌专属智能客服。请问有什么可以帮您的？可咨询产品信息、会员权益或最新活动。' },
  { role: 'user', content: '品牌文创礼盒是什么材质的？' },
  { role: 'ai', content: '🎁 品牌文创礼盒采用 300g 高克重特种纸盒，内衬环保植绒，配合手工烫金工艺。品质扎实，非常适合商务送礼。\n\n目前售价 ¥199，五一期间有优惠，需要我帮您了解详情吗？' },
])

const chatInput = ref('')

const publishMode = ref('full')

const versionHistory = ref([
  { version: 'v2.1', date: '05-01', model: 'GPT-4o', change: '优化推荐逻辑', current: true },
  { version: 'v2.0', date: '04-15', model: 'GPT-4o', change: '新增知识库', current: false },
  { version: 'v1.0', date: '03-20', model: 'GPT-3.5', change: '初始上线', current: false },
])

const conversationLog = ref([
  { user: '张小明', question: '礼盒的材质？', answer: '采用高克重特种纸，手工烫金工艺...', intent: '产品咨询', action: '查看商品', time: '10:21' },
  { user: '李小红', question: '怎么升金卡？', answer: '累计成长值达到 5000 即可升级...', intent: '会员咨询', action: '了解权益', time: '09:15' },
  { user: '王大力', question: '有优惠券吗？', answer: '目前有新人满100减20优惠券...', intent: '营销咨询', action: '领券成功', time: '08:45' },
])

const intents = ref([
  { name: '产品咨询', pct: 68 },
  { name: '会员权益', pct: 52 },
  { name: '营销活动', pct: 38 },
  { name: '售后退款', pct: 18 },
])

function selectModel(model: ModelOption) {
  apiConfig.value.modelProvider = model.provider
  apiConfig.value.model = model.id
  apiConfig.value.apiBaseUrl = model.baseUrl
  apiConfig.value.reasoningEffort = model.reasoning
  apiConfig.value.maxTokens = model.maxTokens
  ElMessage.success(`已切换至 ${model.name}`)
}

function handleProviderChange() {
  const firstModel = providerModels.value[0]
  if (firstModel) {
    selectModel(firstModel)
  }
}

async function loadActiveConfig() {
  const res = await getActiveAgentConfig()
  if (!res.data) return
  const config = res.data
  apiConfig.value.id = config.id
  apiConfig.value.name = config.name || apiConfig.value.name
  apiConfig.value.modelProvider = config.modelProvider || inferProvider(config.model)
  apiConfig.value.model = config.model || apiConfig.value.model
  apiConfig.value.apiBaseUrl = config.apiBaseUrl || defaultBaseUrl(apiConfig.value.modelProvider)
  apiConfig.value.apiKey = config.apiKey || ''
  apiConfig.value.temperature = config.temperature ?? apiConfig.value.temperature
  apiConfig.value.maxTokens = config.maxTokens ?? apiConfig.value.maxTokens
  apiConfig.value.reasoningEffort = config.reasoningEffort || apiConfig.value.reasoningEffort
  systemPrompt.value = config.systemPrompt || systemPrompt.value
}

function inferProvider(model: string) {
  const normalized = model.toLowerCase()
  if (normalized.startsWith('qwen')) return 'qwen'
  if (normalized.startsWith('claude')) return 'anthropic'
  if (normalized.startsWith('deepseek')) return 'deepseek'
  if (normalized.startsWith('doubao') || normalized.startsWith('ep-')) return 'doubao'
  if (
    normalized.startsWith('minimax')
    || normalized.startsWith('mimo')
    || normalized.startsWith('abab')
  ) return 'minimax'
  if (normalized.startsWith('gpt')) return 'openai'
  return 'custom'
}

function defaultBaseUrl(provider: string) {
  return modelCatalog.find(item => item.provider === provider)?.baseUrl || ''
}

function buildConfigPayload(): AgentConfigPayload {
  return {
    name: apiConfig.value.name,
    model: apiConfig.value.model,
    modelProvider: apiConfig.value.modelProvider,
    apiBaseUrl: apiConfig.value.apiBaseUrl,
    apiKey: apiConfig.value.apiKey,
    systemPrompt: systemPrompt.value,
    temperature: apiConfig.value.temperature,
    maxTokens: apiConfig.value.maxTokens,
    reasoningEffort: apiConfig.value.reasoningEffort,
  }
}

function testConnection() {
  if (!apiConfig.value.model || !apiConfig.value.apiBaseUrl) {
    ElMessage.warning('请先填写模型 ID 和 Base URL')
    return
  }
  ElMessage.success(`配置格式通过：${apiConfig.value.model}`)
}

async function saveModelConfig() {
  if (!apiConfig.value.model) {
    ElMessage.warning('请先选择或输入模型 ID')
    return
  }
  savingConfig.value = true
  try {
    const payload = buildConfigPayload()
    const res = apiConfig.value.id
      ? await updateAgentConfig(apiConfig.value.id, payload)
      : await createAgentConfig(payload)
    apiConfig.value.id = res.data.id
    await publishAgentConfig(res.data.id)
    ElMessage.success('AI Agent 模型配置已保存并发布')
  } finally {
    savingConfig.value = false
  }
}

function loadTemplate() {
  ElMessage.success('已应用模板：电商客服')
}

function estimateCost() {
  ElMessage.success('Token 估算：约 280 token / 次回复')
}

function uploadKnowledge() {
  ElMessage.success('请选择 PDF / Markdown / TXT 文件')
}

function testRecall() {
  ElMessage.success('知识库召回测试：输入问题，查看相关文档')
}

function sendChat() {
  const question = chatInput.value.trim()
  if (!question) return
  chatMessages.value.push({ role: 'user', content: question })
  chatMessages.value.push({ role: 'ai', content: buildSandboxReply(question) })
  chatInput.value = ''
}

function quickTest(q: string) {
  chatInput.value = q
  sendChat()
}

function buildSandboxReply(question: string): string {
  const q = question.toLowerCase()

  if (q.includes('会员') || q.includes('金卡') || q.includes('积分')) {
    return '👑 金卡会员可享受积分加速、专属折扣和活动优先报名。\n\n建议您先查看会员中心的等级规则，我也可以按您当前积分给出升级建议。'
  }

  if (q.includes('优惠') || q.includes('券') || q.includes('折扣')) {
    return '🎟️ 当前可用优惠包含新人券与满减券，具体以结算页可领取券为准。\n\n如果您告诉我预算区间，我可以帮您匹配更划算的商品组合。'
  }

  if (q.includes('活动') || q.includes('预约') || q.includes('报名')) {
    return '🎪 近期有活动报名与预约服务两类场景，建议先看活动页日期和名额，再完成报名。\n\n需要的话我可以直接给您推荐最适合的新手活动。'
  }

  if (q.includes('礼物') || q.includes('推荐') || q.includes('商品')) {
    return '🛍️ 推荐先看「高复购礼盒」和「轻量体验装」两类商品：前者适合送礼，后者适合首次尝试。\n\n告诉我您是自用还是送人，我再给到更精确的清单。'
  }

  return '✅ 已收到您的问题。基于当前知识库，我建议先从商品、会员和活动三个方向筛选需求。\n\n如果您补充预算、用途或目标人群，我可以给出更精准的建议。'
}

function doPublish() {
  ElMessage.success('AI Agent v3.0 已发布上线，小程序端实时生效')
}

function doRollback() {
  ElMessage.success('已回滚至 v2.1')
}

onMounted(() => {
  loadActiveConfig().catch(() => {
    ElMessage.warning('未读取到已发布 Agent 配置，可直接保存新配置')
  })
})
</script>

<style scoped lang="scss">
.agent-page {
  padding: 20px;
}
.page-header {
  margin-bottom: 16px;
  h2 { margin: 0 0 4px; font-size: 20px; }
  .page-desc { margin: 0; font-size: 13px; color: #999; }
}
.agent-tabs {
  :deep(.el-tabs__item) { font-size: 13px; }
  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}
.model-list {
  display: grid;
  gap: 10px;
}
.model-item {
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: .14s;
  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .model-name { font-weight: 700; font-size: 13px; }
  .model-desc { font-size: 11px; color: #999; margin-top: 2px; }
}
.chat-box {
  background: #f0f2f5;
  border-radius: 12px;
  padding: 12px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msg-ai, .msg-user {
  display: flex;
  gap: 8px;
}
.msg-user {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: var(--el-color-primary-light-9);
}
.msg-user .msg-avatar {
  background: var(--el-color-primary);
  color: #fff;
  font-size: 14px;
}
.msg-bubble {
  padding: 10px 12px;
  border-radius: 0 12px 12px 12px;
  font-size: 12px;
  max-width: 80%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,.04);
  white-space: pre-wrap;
}
.msg-user .msg-bubble {
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 12px 0 12px 12px;
}
.eval-list {
  display: grid;
  gap: 12px;
}
.eval-item {
  padding: 12px;
  border-radius: 10px;
  border-left: 4px solid;
  .eval-title { font-weight: 700; font-size: 12px; margin-bottom: 4px; }
  .eval-desc { font-size: 11px; color: #999; }
}
.eval-pass { background: #f0fdf4; border-color: #0faa6e; }
.eval-warn { background: #fff8e6; border-color: #f59e0b; }
.eval-pending { background: #f1f4fa; border-color: #999; }
.version-card {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
  &.current { background: #f8faff; border: 1px solid var(--el-border-color); }
  &.pending { background: var(--el-color-primary-light-9); border: 1px solid var(--el-color-primary); }
  .version-title { font-weight: 700; font-size: 13px; }
  .version-meta { font-size: 11px; color: #999; margin-top: 2px; }
}
.intent-list {
  display: grid;
  gap: 8px;
}
.intent-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
