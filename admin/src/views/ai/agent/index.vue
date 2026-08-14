<template>
  <div class="agent-page">
    <PageHeader
      kicker="系统 / 智能 Agent"
      title="智能 Agent"
      description="完整生命周期：接入模型 → 编写 Prompt → 上传知识库 → 沙盒测试 → 发布上线 → 监控运营。"
    />

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
                <el-radio-button label="mimo">MiMo</el-radio-button>
                <el-radio-button label="doubao">豆包</el-radio-button>
                <el-radio-button label="custom">自定义</el-radio-button>
              </el-radio-group>
              <div class="model-list">
                <div
                  v-for="m in providerModels"
                  :key="m.id"
                  class="model-item"
                  :class="{ selected: apiConfig.model === m.id }"
                  @click="selectModel(m)"
                >
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
              </el-form>
              <el-button type="primary" style="margin-top:8px" :loading="testingConnection" @click="testConnection">
                🔌 测试连接
              </el-button>
              <el-button type="success" style="margin-top:8px;margin-left:8px" :loading="savingConfig" @click="saveModelConfig">
                保存配置
              </el-button>
              <el-button style="margin-top:8px;margin-left:8px" @click="activeTab = 'prompt'">下一步：Prompt 配置 →</el-button>
              <el-alert type="warning" :closable="false" show-icon style="margin-top:12px">
                <template #title>保存仅创建/更新草稿配置，不会自动发布。请到「发布管理」页签正式上线。</template>
              </el-alert>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="② Prompt 配置" name="prompt">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-card shadow="never">
              <template #header><span>✏️ System Prompt 编写</span></template>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">定义 AI 的角色、能力范围、回答风格与禁止行为</div>
              <el-input type="textarea" v-model="systemPrompt" :rows="12" style="font-size:12px;line-height:1.8" />
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                <el-dropdown trigger="click" @command="applyPromptTemplate">
                  <el-button size="small">
                    加载模板
                    <span style="margin-left:4px;font-size:10px">▾</span>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="tpl in promptTemplates"
                        :key="tpl.id"
                        :command="tpl.id"
                      >
                        {{ tpl.name }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button size="small" @click="estimateCost">估算费用</el-button>
                <el-button size="small" type="success" :loading="savingConfig" @click="savePromptConfig">保存 Prompt 与策略</el-button>
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
                  <div>
                    <el-switch v-model="behavior.enableRecommend" active-text="开启" inactive-text="关闭" />
                    <div class="policy-hint">
                      {{ behavior.enableRecommend ? '沙盒/上线对话可引用在售商品' : '禁止推荐具体商品，仅解答规则与咨询' }}
                    </div>
                  </div>
                </el-form-item>
                <el-form-item label="主动引导">
                  <div>
                    <el-switch v-model="behavior.enableProactive" active-text="开启" inactive-text="关闭" />
                    <div class="policy-hint">只控制是否追问下一步，不会单独打开商品推荐</div>
                  </div>
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
                <template #title>
                  「商品推荐」关闭后，即使开启主动引导也不会推商品。「无法回答时」会在知识不足时走转人工/留言/通用话术。改完可到沙盒用「推荐一款礼物」验证。
                </template>
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
              <el-upload
                :show-file-list="false"
                accept=".pdf,.doc,.docx,.txt,.md,.markdown,.csv"
                :disabled="uploadingKnowledge"
                :http-request="handleKnowledgeUpload"
              >
                <el-button size="small" type="primary" :loading="uploadingKnowledge">+ 上传知识文档</el-button>
              </el-upload>
            </div>
          </template>
          <el-alert type="info" :closable="false" show-icon style="margin-bottom:14px">
            <template #title>支持 PDF / Word / Markdown / TXT。文件会先上传到服务器再登记；向量化尚未实现，状态先为 pending。</template>
          </el-alert>
          <el-upload
            drag
            class="knowledge-uploader"
            :show-file-list="false"
            accept=".pdf,.doc,.docx,.txt,.md,.markdown,.csv"
            :disabled="uploadingKnowledge"
            :http-request="handleKnowledgeUpload"
          >
            <div class="knowledge-uploader__text">
              {{ uploadingKnowledge ? '正在上传…' : '将知识文档拖到此处，或点击选择文件' }}
            </div>
            <div class="knowledge-uploader__hint">单文件不超过 10MB</div>
          </el-upload>
          <el-table :data="knowledgeList" stripe style="width:100%" v-loading="loadingKnowledge">
            <el-table-column label="文件名" prop="fileName" min-width="200" />
            <el-table-column label="大小" width="100">
              <template #default="{ row }">
                {{ formatFileSize(row.fileSize) }}
              </template>
            </el-table-column>
            <el-table-column label="向量化状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.vectorStatus === 'done' ? 'success' : 'warning'" size="small">
                  {{ statusLabel(row.vectorStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="召回权重" width="200">
              <template #default="{ row }">
                <el-slider
                  v-model="row.weightUi"
                  :min="0"
                  :max="100"
                  style="width:120px"
                  @change="(val) => onWeightChange(row, Number(val))"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button size="small" link @click="previewKnowledge(row)">预览</el-button>
                <el-button size="small" link type="danger" @click="removeKnowledge(row)">移除</el-button>
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
              <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                  <span>🧪 对话沙盒</span>
                  <el-tag v-if="sandboxMode" size="small" type="info">{{ sandboxMode }}</el-tag>
                </div>
              </template>
              <el-alert v-if="sandboxHint" type="info" :closable="false" show-icon style="margin-bottom:10px">
                <template #title>{{ sandboxHint }}</template>
              </el-alert>
              <div class="chat-box">
                <div v-for="(msg, i) in chatMessages" :key="i" :class="msg.role === 'ai' ? 'msg-ai' : 'msg-user'">
                  <div class="msg-avatar">{{ msg.role === 'ai' ? '🤖' : '你' }}</div>
                  <div class="msg-bubble">{{ msg.content }}</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                <el-input
                  v-model="chatInput"
                  placeholder="输入问题测试 AI 回答..."
                  :disabled="sendingChat"
                  @keyup.enter="sendChat"
                />
                <el-button type="primary" :loading="sendingChat" @click="sendChat">发送测试</el-button>
              </div>
              <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                <span style="font-size:11px;color:var(--text-muted)">快捷测试：</span>
                <el-button size="small" :disabled="sendingChat" @click="quickTest('金卡会员有什么权益？')">金卡会员有什么权益？</el-button>
                <el-button size="small" :disabled="sendingChat" @click="quickTest('推荐一款礼物')">推荐一款礼物</el-button>
                <el-button size="small" :disabled="sendingChat" @click="quickTest('有优惠券吗？')">有优惠券吗？</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card shadow="never">
              <template #header><span>📊 沙盒测试评估</span></template>
              <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px" title="评估卡片为演示占位，正式评测流程尚未接入。" />
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
                    <div class="version-title">当前配置</div>
                    <div class="version-meta">
                      {{ apiConfig.id ? `ID ${apiConfig.id}` : '尚未保存' }}
                      · 版本 v{{ activeVersionLabel }}
                      · {{ apiConfig.model || '未选模型' }}
                    </div>
                  </div>
                  <el-tag :type="apiConfig.id ? 'success' : 'info'">{{ apiConfig.id ? '已保存' : '草稿' }}</el-tag>
                </div>
                <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
                  {{ apiConfig.name || '未命名 Agent' }}
                </div>
              </div>
              <el-form label-width="80px" style="margin-top:14px">
                <el-form-item label="发布方式">
                  <el-select v-model="publishMode" style="width:100%">
                    <el-option label="全量发布（立即生效）" value="full" />
                    <el-option label="灰度发布（10% 用户先行）" value="gray" disabled />
                    <el-option label="定时发布" value="scheduled" disabled />
                  </el-select>
                </el-form-item>
              </el-form>
              <div style="display:flex;gap:8px;margin-top:10px">
                <el-button type="primary" style="flex:1" :loading="publishing" @click="doPublish">
                  {{ apiConfig.id ? '🚀 发布当前配置' : '🚀 保存并发布' }}
                </el-button>
              </div>
              <el-alert type="info" :closable="false" show-icon style="margin-top:12px">
                <template #title>
                  {{ apiConfig.id ? '灰度与定时发布暂未接入，当前仅支持全量发布。' : '当前还是草稿，点击将先保存再全量发布。' }}
                </template>
              </el-alert>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>📋 版本历史</span></template>
              <el-table :data="versionHistory" stripe style="width:100%" size="small" v-loading="loadingVersions">
                <el-table-column label="版本" width="100">
                  <template #default="{ row }">
                    <b>v{{ row.version }}</b>
                    <el-tag v-if="row.status === 1" type="success" size="small" style="margin-left:4px">线上</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="时间" min-width="120">
                  <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="变更" prop="changelog" min-width="120" show-overflow-tooltip />
                <el-table-column label="操作" width="100">
                  <template #default="{ row }">
                    <el-button size="small" link type="warning" :loading="rollingBack" @click="doRollback(row.version)">
                      回滚
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="!loadingVersions && versionHistory.length === 0" description="暂无版本记录，发布后将出现在此" :image-size="64" />
              <el-button size="small" type="primary" style="margin-top:12px" @click="activeTab = 'monitor'">查看运营数据 →</el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="⑥ 运营监控" name="monitor">
        <el-alert type="warning" :closable="false" show-icon style="margin-bottom:16px">
          <template #title>对话列表来自真实记录；顶部指标与意图分布仍为演示</template>
        </el-alert>

        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="8">
            <el-card shadow="never" style="text-align:center;padding:10px">
              <div style="font-size:28px;margin-bottom:4px">🤖</div>
              <div style="font-size:22px;font-weight:700;color:#7c3aed">1,240</div>
              <div style="font-size:12px;color:var(--text-muted)">昨日对话 <span style="color:var(--success)">↑ 15%</span></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" style="text-align:center;padding:10px">
              <div style="font-size:28px;margin-bottom:4px">🛍️</div>
              <div style="font-size:22px;font-weight:700;color:var(--brand)">¥3,580</div>
              <div style="font-size:12px;color:var(--text-muted)">推荐成交额 <span style="color:var(--success)">转化率 4.2%</span></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" style="text-align:center;padding:10px">
              <div style="font-size:28px;margin-bottom:4px">😊</div>
              <div style="font-size:22px;font-weight:700;color:var(--success)">4.6/5</div>
              <div style="font-size:12px;color:var(--text-muted)">用户满意度 <span style="color:var(--success)">差评率 2.1%</span></div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>💬 对话监控</span>
              <el-button size="small" @click="loadConversations">刷新</el-button>
            </div>
          </template>
          <el-table :data="conversationLog" stripe style="width:100%" size="small" v-loading="loadingConversations">
            <el-table-column label="用户" prop="user" width="100" show-overflow-tooltip />
            <el-table-column label="提问" prop="question" min-width="140" show-overflow-tooltip />
            <el-table-column label="AI 回复摘要" prop="answer" min-width="160" show-overflow-tooltip />
            <el-table-column label="意图" prop="intent" width="100" />
            <el-table-column label="转化" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.action" size="small">{{ row.action }}</el-tag>
                <span v-else style="color:var(--text-muted)">—</span>
              </template>
            </el-table-column>
            <el-table-column label="时间" prop="time" width="90" />
          </el-table>
          <el-empty v-if="!loadingConversations && conversationLog.length === 0" description="暂无对话记录" :image-size="64" />
        </el-card>

        <el-card shadow="never">
          <template #header><span>🔥 高频意图分布（演示）</span></template>
          <div class="intent-list">
            <div v-for="item in intents" :key="item.name" class="intent-item">
              <span style="width:60px;font-size:12px">{{ item.name }}</span>
              <el-progress :percentage="item.pct" :stroke-width="10" style="flex:1" />
              <span style="font-size:12px;color:var(--text-muted);width:36px">{{ item.pct }}%</span>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  addAgentKnowledge,
  createAgentConfig,
  deleteAgentKnowledge,
  getActiveAgentConfig,
  getAgentConfigs,
  getAgentKnowledge,
  getAgentRecentConversations,
  getAgentVersions,
  publishAgentConfig,
  rollbackAgentVersion,
  sandboxAgentChat,
  testAgentConnection,
  updateAgentConfig,
  updateAgentKnowledgeWeight,
} from '@/api/agent'
import { uploadFile } from '@/api/system'
import type { AgentConfigPayload, AgentKnowledgeItem, AgentVersionItem } from '@/types/agent'

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
    desc: 'MiniMax 主力模型，适合复杂 Agent、工具调用与中文客服',
    baseUrl: 'https://api.minimaxi.com/v1',
    reasoning: 'medium',
    maxTokens: 8192,
  },
  {
    provider: 'minimax',
    id: 'MiniMax-M2.5-highspeed',
    name: 'MiniMax M2.5 Highspeed',
    desc: 'MiniMax 高速版，更低延迟，适合高频对话与实时推荐',
    baseUrl: 'https://api.minimaxi.com/v1',
    reasoning: 'none',
    maxTokens: 4096,
  },
  {
    provider: 'minimax',
    id: 'MiniMax-M2.5-Lightning',
    name: 'MiniMax M2.5 Lightning',
    desc: 'MiniMax 轻量版，成本更低，适合简单问答与大并发',
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
    provider: 'mimo',
    id: 'mimo-v2.5-pro',
    name: 'MiMo V2.5 Pro',
    desc: '小米 MiMo 旗舰模型，适合复杂推理、长文档与 Agent 任务',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    reasoning: 'high',
    maxTokens: 8192,
  },
  {
    provider: 'mimo',
    id: 'mimo-v2.5',
    name: 'MiMo V2.5',
    desc: '小米 MiMo 全模态模型，支持文本与多模态理解',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    reasoning: 'medium',
    maxTokens: 8192,
  },
  {
    provider: 'mimo',
    id: 'mimo-v2-flash',
    name: 'MiMo V2 Flash',
    desc: '小米 MiMo 高速版，低成本、低延迟，适合客服与高并发',
    baseUrl: 'https://api.xiaomimimo.com/v1',
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

interface KnowledgeRow extends AgentKnowledgeItem {
  weightUi: number
}

interface ConversationRow {
  user: string
  question: string
  answer: string
  intent: string
  action: string
  time: string
}

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
  version: 0,
})

const savingConfig = ref(false)
const testingConnection = ref(false)
const publishing = ref(false)
const rollingBack = ref(false)
const loadingKnowledge = ref(false)
const uploadingKnowledge = ref(false)
const loadingVersions = ref(false)
const loadingConversations = ref(false)
const sendingChat = ref(false)

const providerModels = computed(() => modelCatalog.filter(item => item.provider === apiConfig.value.modelProvider))
const activeVersionLabel = computed(() => apiConfig.value.version || 0)

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
  memory: '10',
})

const knowledgeList = ref<KnowledgeRow[]>([])
const versionHistory = ref<AgentVersionItem[]>([])
const conversationLog = ref<ConversationRow[]>([])

const chatMessages = ref<{ role: 'ai' | 'user'; content: string }[]>([
  { role: 'ai', content: behavior.value.welcome },
])
const chatInput = ref('')
const sandboxMode = ref('')
const sandboxHint = ref('')

const publishMode = ref('full')

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

function inferProvider(model: string) {
  const normalized = (model || '').toLowerCase()
  if (normalized.startsWith('qwen')) return 'qwen'
  if (normalized.startsWith('claude')) return 'anthropic'
  if (normalized.startsWith('deepseek')) return 'deepseek'
  if (normalized.startsWith('doubao') || normalized.startsWith('ep-')) return 'doubao'
  if (normalized.startsWith('mimo')) return 'mimo'
  if (normalized.startsWith('minimax') || normalized.startsWith('abab')) return 'minimax'
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
    welcomeMessage: behavior.value.welcome,
    fallbackStrategy: behavior.value.fallback,
    enableRecommend: behavior.value.enableRecommend,
    enableProactive: behavior.value.enableProactive,
    memoryType: behavior.value.memory,
  }
}

function applyConfigToForm(config: {
  id: number
  name?: string
  modelProvider?: string
  model?: string
  apiBaseUrl?: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: string
  systemPrompt?: string
  welcomeMessage?: string
  fallbackStrategy?: string
  enableRecommend?: boolean
  enableProactive?: boolean
  memoryType?: string
  version?: number
}) {
  apiConfig.value.id = config.id
  apiConfig.value.name = config.name || apiConfig.value.name
  apiConfig.value.modelProvider = config.modelProvider || inferProvider(config.model || '')
  apiConfig.value.model = config.model || apiConfig.value.model
  apiConfig.value.apiBaseUrl = config.apiBaseUrl || defaultBaseUrl(apiConfig.value.modelProvider)
  apiConfig.value.apiKey = config.apiKey || ''
  apiConfig.value.temperature = config.temperature ?? apiConfig.value.temperature
  apiConfig.value.maxTokens = config.maxTokens ?? apiConfig.value.maxTokens
  apiConfig.value.reasoningEffort = config.reasoningEffort || apiConfig.value.reasoningEffort
  apiConfig.value.version = config.version ?? apiConfig.value.version
  if (config.systemPrompt) systemPrompt.value = config.systemPrompt
  if (config.welcomeMessage) behavior.value.welcome = config.welcomeMessage
  if (config.fallbackStrategy) behavior.value.fallback = config.fallbackStrategy
  if (config.enableRecommend != null) behavior.value.enableRecommend = config.enableRecommend
  if (config.enableProactive != null) behavior.value.enableProactive = config.enableProactive
  if (config.memoryType) behavior.value.memory = config.memoryType
  if (chatMessages.value.length === 1 && chatMessages.value[0].role === 'ai') {
    chatMessages.value[0].content = behavior.value.welcome
  }
}

async function loadActiveConfig() {
  const res = await getActiveAgentConfig()
  if (res.data) {
    applyConfigToForm(res.data)
    return
  }
  // 无已发布配置时，加载最新一条草稿，避免保存后刷新丢失
  try {
    const listRes = await getAgentConfigs({ current: 1, size: 1 })
    const first = listRes.data?.records?.[0] || listRes.data?.list?.[0]
    if (first) applyConfigToForm(first)
  } catch {
    // ignore
  }
}

async function persistConfig() {
  const payload = buildConfigPayload()
  const res = apiConfig.value.id
    ? await updateAgentConfig(apiConfig.value.id, payload)
    : await createAgentConfig(payload)
  applyConfigToForm(res.data)
  return res.data
}

async function testConnection() {
  if (!apiConfig.value.model || !apiConfig.value.apiBaseUrl) {
    ElMessage.warning('请先填写模型 ID 和 Base URL')
    return
  }
  testingConnection.value = true
  try {
    const res = await testAgentConnection(buildConfigPayload())
    const data = res.data
    if (data?.ok) {
      ElMessage.success(data.message || `连接成功${data.mode ? `（${data.mode}）` : ''}`)
    } else {
      ElMessage.warning(data?.message || '连接测试未通过')
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '连接测试失败'
    ElMessage.error(msg)
  } finally {
    testingConnection.value = false
  }
}

async function saveModelConfig() {
  if (!apiConfig.value.model) {
    ElMessage.warning('请先选择或输入模型 ID')
    return
  }
  savingConfig.value = true
  try {
    await persistConfig()
    ElMessage.success('模型配置已保存（未发布）。请到「发布管理」上线。')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存失败'
    ElMessage.error(msg)
  } finally {
    savingConfig.value = false
  }
}

async function savePromptConfig() {
  savingConfig.value = true
  try {
    await persistConfig()
    ElMessage.success('Prompt 与策略已保存（未发布）')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存失败'
    ElMessage.error(msg)
  } finally {
    savingConfig.value = false
  }
}

const promptTemplates = [
  {
    id: 'ecommerce',
    name: '电商客服',
    welcome: '您好！我是专属智能管家，有什么可以帮您？',
    fallback: 'human',
    enableRecommend: true,
    enableProactive: true,
    prompt: `你是「品牌小程序」的专属智能客服助手。

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
- 涉及退换货问题，引导转接人工客服`,
  },
  {
    id: 'activity',
    name: '活动预约助手',
    welcome: '您好！我可以帮您查询活动、报名和预约名额。',
    fallback: 'message',
    enableRecommend: false,
    enableProactive: true,
    prompt: `你是「品牌小程序」的活动预约助手。

【你的职责】
1. 介绍近期活动主题、时间、地点和名额
2. 协助用户完成报名或预约
3. 说明取消/改期规则
4. 无法确认名额时引导用户留言或转人工

【回答风格】
- 清晰、按步骤说明
- 优先给出时间与名额信息
- 回复控制在 200 字以内

【禁止行为】
- 不得虚构活动场次或剩余名额
- 不得代替用户完成支付
- 涉及退款争议时转人工处理`,
  },
  {
    id: 'member',
    name: '会员顾问',
    welcome: '您好！我是会员顾问，可以帮您查询等级、积分和权益。',
    fallback: 'human',
    enableRecommend: false,
    enableProactive: false,
    prompt: `你是「品牌小程序」的会员顾问。

【你的职责】
1. 解答会员等级、成长值与积分规则
2. 介绍各等级权益与升级路径
3. 说明优惠券领取与使用条件
4. 生日礼、积分兑换等权益咨询

【回答风格】
- 专业、准确、少用夸张语气
- 不确定时明确说明以会员中心展示为准
- 回复控制在 200 字以内

【禁止行为】
- 不得承诺未配置的权益或积分到账
- 不得泄露其他用户信息
- 涉及账户异常时引导转人工`,
  },
  {
    id: 'content',
    name: '内容导览',
    welcome: '您好！我可以帮您找文章、教程和品牌故事。',
    fallback: 'generic',
    enableRecommend: true,
    enableProactive: false,
    prompt: `你是「品牌小程序」的内容导览助手。

【你的职责】
1. 根据用户兴趣推荐文章、教程或品牌故事
2. 概括内容要点并给出阅读建议
3. 引导用户进入对应内容页
4. 必要时补充相关活动或商品入口

【回答风格】
- 轻松、有条理
- 先给结论再给推荐理由
- 回复控制在 200 字以内

【禁止行为】
- 不得编造不存在的文章或作者
- 不得把营销硬推销放在内容推荐之前`,
  },
] as const

function applyPromptTemplate(id: string) {
  const tpl = promptTemplates.find((item) => item.id === id)
  if (!tpl) return
  systemPrompt.value = tpl.prompt
  behavior.value.welcome = tpl.welcome
  behavior.value.fallback = tpl.fallback
  behavior.value.enableRecommend = tpl.enableRecommend
  behavior.value.enableProactive = tpl.enableProactive
  if (chatMessages.value.length === 1 && chatMessages.value[0].role === 'ai') {
    chatMessages.value[0].content = tpl.welcome
  }
  ElMessage.success(`已应用模板：${tpl.name}`)
}

function estimateCost() {
  const tokens = Math.max(80, Math.round(systemPrompt.value.length / 2))
  ElMessage.success(`Token 估算：约 ${tokens} token / 次回复（粗略）`)
}

function mapKnowledgeRows(items: AgentKnowledgeItem[]): KnowledgeRow[] {
  return (items || []).map(item => ({
    ...item,
    weightUi: Math.round((item.recallWeight ?? 1) * 100),
  }))
}

async function loadKnowledge() {
  loadingKnowledge.value = true
  try {
    const res = await getAgentKnowledge(apiConfig.value.id || undefined)
    knowledgeList.value = mapKnowledgeRows(res.data || [])
  } catch {
    knowledgeList.value = []
  } finally {
    loadingKnowledge.value = false
  }
}

const KNOWLEDGE_ACCEPT = ['pdf', 'doc', 'docx', 'txt', 'md', 'markdown', 'csv']
const KNOWLEDGE_MAX_SIZE = 10 * 1024 * 1024

async function handleKnowledgeUpload(options: { file: File }) {
  const file = options.file
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!KNOWLEDGE_ACCEPT.includes(ext)) {
    ElMessage.warning('请上传 PDF / Word / Markdown / TXT / CSV')
    return
  }
  if (file.size > KNOWLEDGE_MAX_SIZE) {
    ElMessage.warning('文件不能超过 10MB')
    return
  }
  uploadingKnowledge.value = true
  try {
    const res = await uploadFile(file)
    const data = (res.data || {}) as Record<string, unknown>
    const url = String(data.url || '')
    if (!url) throw new Error('上传返回地址为空')
    const fileName = String(data.originalFileName || data.originalName || file.name)
    const fileSize = Number(data.fileSize || data.size || file.size) || file.size
    await addAgentKnowledge({
      fileName,
      fileUrl: url,
      fileSize,
      recallWeight: 1,
    })
    ElMessage.success(`已上传「${fileName}」`)
    await loadKnowledge()
  } catch {
    // 具体错误由请求拦截器提示，避免重复弹窗
  } finally {
    uploadingKnowledge.value = false
  }
}

async function onWeightChange(row: KnowledgeRow, val: number) {
  const weight = Math.min(1, Math.max(0, val / 100))
  try {
    await updateAgentKnowledgeWeight(row.id, weight)
    row.recallWeight = weight
    ElMessage.success('权重已更新')
  } catch (e: unknown) {
    row.weightUi = Math.round((row.recallWeight ?? 1) * 100)
    const msg = e instanceof Error ? e.message : '权重更新失败'
    ElMessage.error(msg)
  }
}

function previewKnowledge(row: KnowledgeRow) {
  if (row.fileUrl) {
    window.open(row.fileUrl, '_blank')
    return
  }
  ElMessage.warning('该记录没有文件地址，请重新上传')
}

async function removeKnowledge(row: KnowledgeRow) {
  try {
    await ElMessageBox.confirm(`确认移除「${row.fileName}」？`, '移除知识文档', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })
    await deleteAgentKnowledge(row.id)
    ElMessage.success('已移除')
    await loadKnowledge()
  } catch (e: unknown) {
    if (e === 'cancel' || e === 'close') return
    const msg = e instanceof Error ? e.message : '移除失败'
    ElMessage.error(msg)
  }
}

function testRecall() {
  ElMessage.info('向量化尚未实现，召回测试暂不可用')
}

function statusLabel(status?: string) {
  if (status === 'done') return '已完成'
  if (status === 'processing') return '处理中'
  return 'pending'
}

function formatFileSize(size?: number) {
  if (size == null || size <= 0) return '—'
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

function formatDate(value?: string) {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

function localSandboxReply(question: string): string {
  const q = question.toLowerCase()
  const recommend = behavior.value.enableRecommend
  const proactive = behavior.value.enableProactive
  const fallback = behavior.value.fallback

  if (q.includes('会员') || q.includes('金卡') || q.includes('积分')) {
    const text = '👑 金卡会员可享受积分加速、专属折扣和活动优先报名。建议先查看会员中心的等级规则。'
    return proactive ? `${text}\n需要的话我可以按您当前积分说明升级路径。` : text
  }
  if (q.includes('优惠') || q.includes('券') || q.includes('折扣')) {
    return '🎟️ 当前可用优惠以结算页可领取券为准。'
  }
  if (q.includes('活动') || q.includes('预约') || q.includes('报名')) {
    const text = '🎪 近期有活动报名与预约服务，建议先确认日期和名额再报名。'
    return proactive ? `${text}\n需要我帮您看最适合新手的场次吗？` : text
  }
  if (q.includes('礼物') || q.includes('推荐') || q.includes('商品') || q.includes('买')) {
    if (!recommend) {
      if (fallback === 'message') return '当前已关闭商品推荐。这个问题我暂时无法确认，建议您留言。'
      if (fallback === 'generic') return '当前已关闭商品推荐。您可以到商品页自行浏览。'
      return '当前已关闭商品推荐。我可以解答规则、活动或会员问题；选购请到商品页自行浏览。'
    }
    return proactive
      ? '🛍️ 商品推荐已开启。告诉我预算或用途，我再帮您缩小范围。'
      : '🛍️ 商品推荐已开启。可先从礼盒和体验装两类看起。'
  }
  return '✅ 已收到您的问题。请补充用途或目标人群，我可以给出更准确的说明。'
}

async function sendChat() {
  const question = chatInput.value.trim()
  if (!question || sendingChat.value) return
  chatMessages.value.push({ role: 'user', content: question })
  chatInput.value = ''
  sendingChat.value = true
  try {
    const res = await sandboxAgentChat({
      question,
      systemPrompt: systemPrompt.value,
      enableRecommend: behavior.value.enableRecommend,
      enableProactive: behavior.value.enableProactive,
      fallbackStrategy: behavior.value.fallback,
    })
    const data = res.data
    sandboxMode.value = data?.mode || ''
    sandboxHint.value = data?.hint || ''
    chatMessages.value.push({ role: 'ai', content: data?.answer || '（无回复）' })
  } catch {
    sandboxMode.value = 'mock'
    sandboxHint.value = '服务端沙盒不可用，已按当前策略本地模拟回复'
    chatMessages.value.push({ role: 'ai', content: localSandboxReply(question) })
  } finally {
    sendingChat.value = false
  }
}

function quickTest(q: string) {
  chatInput.value = q
  void sendChat()
}

async function doPublish() {
  if (!apiConfig.value.model) {
    ElMessage.warning('请先在「模型接入」选择模型')
    return
  }
  publishing.value = true
  try {
    if (!apiConfig.value.id) {
      await persistConfig()
    }
    if (!apiConfig.value.id) {
      throw new Error('保存配置失败，无法发布')
    }
    const res = await publishAgentConfig(apiConfig.value.id)
    applyConfigToForm(res.data)
    ElMessage.success(`已发布 v${res.data.version}`)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    const msg = err.response?.data?.message || err.message || '发布失败'
    ElMessage.error(msg)
    publishing.value = false
    return
  }
  try {
    await loadVersions()
    await loadActiveConfig()
    if (versionHistory.value.length === 0 && apiConfig.value.version) {
      versionHistory.value = [{
        id: apiConfig.value.id,
        version: apiConfig.value.version,
        changelog: `发布 ${apiConfig.value.name || 'Agent'}`,
        status: 1,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }]
    }
  } catch {
    // 发布已成功，刷新列表失败不覆盖成功提示
  } finally {
    publishing.value = false
  }
}

async function doRollback(version: number) {
  try {
    await ElMessageBox.confirm(`确认回滚到 v${version}？当前线上配置将被替换。`, '版本回滚', {
      type: 'warning',
      confirmButtonText: '回滚',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  rollingBack.value = true
  try {
    const res = await rollbackAgentVersion(version)
    applyConfigToForm(res.data)
    ElMessage.success(`已回滚至 v${version}`)
    await Promise.all([loadActiveConfig(), loadVersions()])
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '回滚失败'
    ElMessage.error(msg)
  } finally {
    rollingBack.value = false
  }
}

async function loadVersions() {
  loadingVersions.value = true
  try {
    const res = await getAgentVersions()
    versionHistory.value = res.data || []
  } catch {
    versionHistory.value = []
  } finally {
    loadingVersions.value = false
  }
}

function pickField(row: Record<string, string>, keys: string[], fallback = '') {
  for (const key of keys) {
    if (row[key]) return row[key]
  }
  return fallback
}

async function loadConversations() {
  loadingConversations.value = true
  try {
    const res = await getAgentRecentConversations(20)
    const rows = res.data || []
    conversationLog.value = rows.map((row) => ({
      user: pickField(row, ['user', 'userName', 'nickname', 'userId'], '用户'),
      question: pickField(row, ['question', 'query', 'input', 'userMessage'], '—'),
      answer: pickField(row, ['answer', 'reply', 'output', 'assistantMessage'], '—'),
      intent: pickField(row, ['intent', 'intentName'], '—'),
      action: pickField(row, ['action', 'conversion', 'result'], ''),
      time: pickField(row, ['time', 'createdAt', 'updatedAt'], '—').replace('T', ' ').slice(0, 16),
    }))
  } catch {
    conversationLog.value = []
  } finally {
    loadingConversations.value = false
  }
}

onMounted(() => {
  void Promise.allSettled([
    loadActiveConfig(),
    loadKnowledge(),
    loadVersions(),
    loadConversations(),
  ])
})
</script>

<style scoped lang="scss">
.agent-page {
  padding: 20px;
}
.agent-tabs {
  :deep(.el-tabs__item) { font-size: 13px; }
  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}
.knowledge-uploader {
  margin-bottom: 14px;
  :deep(.el-upload-dragger) {
    padding: 18px 12px;
  }
}
.knowledge-uploader__text {
  font-size: 13px;
  color: #303133;
}
.knowledge-uploader__hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
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
  .model-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
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
  .eval-desc { font-size: 11px; color: var(--text-muted); }
}
.eval-pass { background: #f0fdf4; border-color: var(--success); }
.eval-warn { background: #fff8e6; border-color: var(--warning); }
.eval-pending { background: #f1f4fa; border-color: var(--text-muted); }
.version-card {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
  &.current { background: var(--bg-page); border: 1px solid var(--el-border-color); }
  &.pending { background: var(--el-color-primary-light-9); border: 1px solid var(--el-color-primary); }
  .version-title { font-weight: 700; font-size: 13px; }
  .version-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
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
