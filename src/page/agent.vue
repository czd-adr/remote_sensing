<template>
  <div class="workspace-container">
    <!-- 顶部 Header 导航栏 -->
    <header class="header-bar">
      <div class="left-brand">
        <div class="logo-box">
          <el-icon :size="18" class="text-white"><Aim /></el-icon>
        </div>
        <div class="brand-text">
          <span class="title">RS-AGENT</span>
          <span class="subtitle">遥感智能协同监测平台</span>
        </div>
        <div class="divider"></div>
        <div class="status-tags">
          <span class="tag"><i class="dot"></i> SENTINEL-2 WMS LIVE</span>
          <span class="tag"
            ><i class="dot green"></i> STACKING_JM MODEL READY</span
          >
        </div>
      </div>

      <nav class="nav-links">
        <a href="#" class="active">全景视界</a>
        <a href="#">光谱解译</a>
        <a href="#">时序演变</a>
        <a href="#">地物反演</a>
        <a href="#">智能体管线</a>
      </nav>

      <div class="right-actions">
        <div class="coords-info">
          <span>E: 119°17′00″</span>
          <span class="ml-2">N: 34°45′00″</span>
          <span class="text-gray-500 ml-2">| EPSG:4326</span>
        </div>
        <el-avatar :size="30" class="user-avatar">CZ</el-avatar>
      </div>
    </header>

    <!-- 主体区域：利用 el-splitter 实现左右拖拽改变宽度 -->
    <div class="main-body">
      <el-splitter v-model:size="panelSize" class="custom-splitter">
        <!-- 左侧面板：OpenLayers 地图视窗 -->
        <el-splitter-panel>
          <div class="map-viewport">
            <!-- OpenLayers 地图挂载容器 -->
            <div id="map" class="map-container"></div>

            <!-- 地图上方悬浮图层控制卡片 HUD -->
            <div class="map-hud-layers">
              <div class="hud-header">
                <span class="hud-title"
                  >活动图层 ({{ activeLayers.length }})</span
                >
                <span class="hud-badge">WMS LIVE</span>
              </div>
              <div
                v-for="(layer, index) in activeLayers"
                :key="layer"
                class="layer-item"
              >
                <span
                  :class="index % 2 === 0 ? 'dot-green' : 'dot-blue'"
                ></span>
                <span class="layer-name">{{ formatLayerName(layer) }}</span>
                <el-icon class="eye-icon"><ViewIcon /></el-icon>
                <button
                  class="layer-remove-btn"
                  title="移除该活动图层"
                  @click="handleRemoveLayer(layer)"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- 底部地图坐标状态栏 -->
            <div class="map-footer-bar">
              <span>CRS: EPSG:4326 (WGS84)</span>
              <span>|</span>
              <span>中心点: 119.2834°E, 34.7506°N</span>
              <span>|</span>
              <span class="text-green-400">渲染帧率: 60 FPS (WebGL)</span>
            </div>
          </div>
        </el-splitter-panel>

        <!-- 右侧面板：RS-AGENT 智能体面板 -->
        <el-splitter-panel class="right-panel-wrapper" v-show="isAgentVisible">
          <div class="agent-panel">
            <!-- 智能体头部信息与收起按钮 -->
            <div class="agent-header">
              <div class="agent-title">
                <div class="avatar-box">
                  <el-icon><Cpu /></el-icon>
                  <span class="online-dot"></span>
                </div>
                <div>
                  <div class="name-row">
                    <span class="name">RS-AGENT 协同中枢</span>
                    <span class="status">在线</span>
                  </div>
                  <div class="sub">GeoChat-v3.5 RemoteSensing · 思维链就绪</div>
                </div>
              </div>
              <div class="header-btns">
                <button
                  title="新对话"
                  class="icon-btn"
                  @click="createNewAnalysis"
                >
                  <el-icon><Plus /></el-icon>
                </button>
                <button title="清空对话" class="icon-btn">
                  <el-icon><RefreshRight /></el-icon>
                </button>
                <button title="导出报告" class="icon-btn">
                  <el-icon><Download /></el-icon>
                </button>
                <button
                  title="收起智能体抽屉"
                  class="icon-btn highlight"
                  @click="toggleAgentPanel"
                >
                  <el-icon><DArrowRight /></el-icon>
                </button>
              </div>
            </div>

            <!-- 动态对话消息流区域 -->
            <div ref="chatContainer" class="conversation-stream">
              <div class="time-divider">
                <span>实时遥感监测智能交互中枢</span>
              </div>

              <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="[
                  'message-row',
                  msg.role === 'user' ? 'user-row' : 'bot-row',
                ]"
              >
                <!-- 用户消息 -->
                <template v-if="msg.role === 'user'">
                  <div class="msg-user">
                    <div class="user-avatar">
                      <el-icon><User /></el-icon>
                    </div>
                    <div class="bubble-user">{{ msg.content }}</div>
                  </div>
                </template>

                <!-- AI 助手消息 -->
                <template v-else>
                  <div class="msg-agent">
                    <div class="agent-avatar">
                      <el-icon><Aim /></el-icon>
                    </div>
                    <div class="agent-content">
                      <!-- 纯文本 / 流式文本 -->
                      <div v-if="msg.type !== 'chart'" class="bubble-agent">
                        <div class="cot-tag" v-if="msg.loading || msg.content">
                          <el-icon><Opportunity /></el-icon> 多源遥感反演与
                          Stacking_JM 模型协同推理中
                        </div>
                        <p
                          class="text-sm text-gray-200 mt-2 leading-relaxed stream-text"
                        >
                          {{
                            msg.content &&
                            typeof msg.content === "string" &&
                            msg.content.startsWith("{")
                              ? "NDVI图表分析中..."
                              : msg.content
                          }}
                          <span v-if="msg.loading" class="cursor-blink"></span>
                        </p>
                      </div>

                      <!-- 图表组件渲染 -->
                      <div
                        v-if="msg.type === 'chart'"
                        class="chart-message-wrapper mt-2"
                      >
                        <NDVIChart :chartData="msg.chartData" />
                      </div>

                      <!-- 分析报告生成按钮 -->
                      <div
                        v-if="msg.canGenerateReport && !msg.loading"
                        class="report-actions"
                      >
                        <el-button
                          size="small"
                          type="primary"
                          :loading="msg.generatingReport"
                          @click="handleGenerateReport(index)"
                        >
                          {{
                            msg.generatingReport
                              ? "报告生成中..."
                              : "生成分析报告"
                          }}
                        </el-button>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- 快捷 Prompt 标签 -->
            <div class="prompt-chips">
              <button class="chip" @click="sendQuickPrompt('加载 NDVI 热力图')">
                🍃 加载 NDVI 热力图
              </button>
              <button class="chip" @click="sendQuickPrompt('查看互花米草分布')">
                🌾 查看互花米草分布
              </button>
              <button class="chip" @click="sendQuickPrompt('对比1月与8月差异')">
                🔄 对比1月与8月差异
              </button>
            </div>

            <!-- 底部指令输入框 -->
            <div class="agent-input-area">
              <div class="input-box">
                <textarea
                  v-model="inputMsg"
                  @keyup.enter="handleSend()"
                  placeholder="输入遥感解译指令、查询波段参数或上传影像..."
                  rows="2"
                ></textarea>
                <div class="input-tools">
                  <div class="left-tools">
                    <button class="tool-btn" title="上传影像文件">
                      <el-icon><Upload /></el-icon>
                    </button>
                    <button class="tool-btn" title="地图绘制ROI">
                      <el-icon><EditPen /></el-icon>
                    </button>
                  </div>
                  <button
                    class="send-btn"
                    @click="handleSend()"
                    :disabled="isStreaming"
                  >
                    <span>发送</span>
                    <el-icon><Promotion /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </el-splitter-panel>
      </el-splitter>

      <!-- 当右侧收起时显示的浮动恢复按钮 -->
      <div
        v-if="!isAgentVisible"
        class="restore-agent-btn"
        @click="toggleAgentPanel"
        title="展开 RS-AGENT 智能体"
      >
        <el-icon><DArrowLeft /></el-icon>
        <span>RS-AGENT 协同中枢</span>
      </div>
    </div>

    <!-- 分析报告预览弹窗 -->
    <el-dialog
      v-model="reportDialogVisible"
      :title="currentReport ? currentReport.title : '分析报告'"
      width="860px"
      top="5vh"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="report-toolbar">
        <el-button
          size="small"
          type="primary"
          @click="handleDownloadReport('doc')"
        >
          下载 Word
        </el-button>
        <el-button size="small" @click="handleDownloadReport('md')">
          下载 Markdown
        </el-button>
      </div>
      <iframe
        v-if="currentReport"
        :src="`http://localhost:8099/report/${currentReport.id}/html`"
        class="report-iframe"
        frameborder="0"
      ></iframe>
      <template #footer>
        <el-button @click="reportDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import {
  Aim, Cpu, View as ViewIcon, RefreshRight, Download, DArrowRight, DArrowLeft,
  Opportunity, Upload, EditPen, Promotion, User, Plus
} from '@element-plus/icons-vue'
import { fetchChatStream, fetchChatChart } from "@/api/chat"
import NDVIChart from '@/components/NDVIChart.vue'
import { createAgentTools } from '@/utils/tools'
import { buildLayerRegistry, createGaodeLayer } from '@/utils/mapManager'
import { fetchActiveLayers, addActiveLayer, removeActiveLayer } from '@/utils/activeLayer'
import { generateReport, downloadReport } from '@/api/report'
import { ElMessage } from 'element-plus'

// 1. 面板宽度控制（默认右侧占比 35%）
const panelSize = ref('65%')
const isAgentVisible = ref(true)

// 2. 交互与对话变量
const inputMsg = ref("")
const messages = ref([])
const isStreaming = ref(false)
const chatContainer = ref(null)
const currentMemoryId = ref("")
const activeLayers = ref([])

// 分析报告相关状态
const reportDialogVisible = ref(false)
const currentReport = ref(null) // { id, title }
const reportLoading = ref(false)

// 3. 地图实例、图层注册表与工具集
let map = null
let agentTools = null
const isInspectorActive = ref(false)

// GeoServer 图层注册表（toggle_layer 可操作的全部备用图层）
const layerRegistry = buildLayerRegistry()
// 高德卫星底图
const satelliteBaseLayer = createGaodeLayer(7)
// 连云港样例底图（test:628yangshi）
const ditu = layerRegistry['test:628yangshi']

const view = new View({
  center: [119.2834, 34.7506],
  zoom: 12.2,
  projection: 'EPSG:4326'
})

onMounted(() => {
  initMap()
  createNewAnalysis()
})

const initMap = () => {
  map = new Map({
    target: 'map',
    view: view,
    layers: [satelliteBaseLayer, ditu]
  })

  agentTools = createAgentTools({
    map,
    view,
    layerRegistry,
    isInspectorActive,
    startDrawInteraction: () => { }
  })
}

// 展开/收起右侧智能体面板
const toggleAgentPanel = () => {
  isAgentVisible.value = !isAgentVisible.value
  nextTick(() => {
    if (map) map.updateSize()
  })
}

// 监听 splitter 拖动，动态调整 OpenLayers 尺寸
watch(panelSize, () => {
  if (map) map.updateSize()
})

// 滚动到底部方法
const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

// 从流式文本中解析工具调用
const parseToolCall = (text) => {
  if (!text || typeof text !== 'string') return null

  // 优先：提取 ```json 代码块
  const jsonBlock = text.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlock) {
    const parsed = tryParseToolJson(jsonBlock[1].trim())
    if (parsed) return parsed
  }

  // 新增：提取裸 JSON 对象（无代码块包裹，如 {"layerName":"test;dem","visible":true}）
  const bareMatches = text.match(/\{[^{}]*\}/g)
  if (bareMatches) {
    for (const m of bareMatches) {
      const parsed = tryParseToolJson(m)
      if (parsed) return parsed
    }
  }

  // 兼容旧格式：【执行工具】tool_code 【参数】{...}
  const toolMatch = text.match(/【执行工具】\s*([A-Za-z_][\w]*)/)
  if (toolMatch) {
    let args = {}
    const argsMatch = text.match(/【参数】\s*(\{[\s\S]*?\})/)
    if (argsMatch) {
      try { args = JSON.parse(argsMatch[1]) } catch (e) { console.warn('工具参数 JSON 解析失败:', e) }
    }
    return { toolName: toolMatch[1], args }
  }
  return null
}

// 尝试把一段 JSON 字符串解析为工具调用
const tryParseToolJson = (jsonStr) => {
  try {
    const data = JSON.parse(jsonStr)
    if (!data || typeof data !== 'object') return null
    const toolName = data.tool || data.toolName || data.tool_code
    if (toolName) {
      return { toolName, args: data.arguments || data.args || data }
    }
    if (data.layerName !== undefined || data.visible !== undefined) {
      return { toolName: 'toggle_layer', args: data }
    }
    return null
  } catch (e) {
    return null
  }
}

// 执行流式文本中携带的工具调用，返回执行结果
const executeToolFromText = async (text) => {
  const call = parseToolCall(text)
  if (!call || !agentTools) return null
  const result = agentTools.executeClientTool(call.toolName, call.args)
  // 仅在图层真正切换成功且为"显示"时，才同步后端 add 并刷新列表
  if (result && result.success && call.toolName === 'toggle_layer' && result.data && result.data.visible) {
    await syncAddActiveLayer(result.data.layerName)
  }
  return result
}

// 图层名展示：去掉命名空间前缀
const formatLayerName = (name) => {
  return name && name.includes(':') ? name.split(':').pop() : name
}

// 加载活动图层列表
const loadActiveLayers = async () => {
  if (!currentMemoryId.value) return
  try {
    const res = await fetchActiveLayers(currentMemoryId.value)
    const result = res.data
    if (result && result.code === 200) {
      activeLayers.value = result.data || []
    }
  } catch (e) {
    console.error('加载活动图层失败:', e)
  }
}

// 新增活动图层（成功后刷新列表）
const syncAddActiveLayer = async (layerName) => {
  try {
    const res = await addActiveLayer(currentMemoryId.value, layerName)
    const result = res.data
    if (result && result.code === 200) {
      await loadActiveLayers()
    }
  } catch (e) {
    console.error('新增活动图层失败:', e)
  }
}

// 删除活动图层（成功后同步隐藏地图图层并刷新列表）
const handleRemoveLayer = async (layerName) => {
  try {
    const res = await removeActiveLayer(currentMemoryId.value, layerName)
    const result = res.data
    if (result && result.code === 200) {
      if (agentTools) {
        agentTools.executeClientTool('toggle_layer', { layerName, visible: false })
      }
      await loadActiveLayers()
    }
  } catch (e) {
    console.error('删除活动图层失败:', e)
  }
}

// 创建新对话
const createNewAnalysis = () => {
  currentMemoryId.value = `session_${Date.now()}`
  messages.value = []
  activeLayers.value = []
  loadActiveLayers()
}

// 判断是否为分析类问题（用于决定是否展示【生成分析报告】按钮）
const isAnalysisQuestion = (text) => {
  return /对比|趋势|长势|差异|变化|分析/.test(text || '')
}

// 生成分析报告
const handleGenerateReport = async (index) => {
  const msg = messages.value[index]
  if (!msg || !msg.question || reportLoading.value) return

  reportLoading.value = true
  msg.generatingReport = true
  try {
    const res = await generateReport(currentMemoryId.value, msg.question)
    const result = res.data
    if (result && result.code === 200) {
      const report = result.data
      currentReport.value = { id: report.reportId, title: report.title || '分析报告' }
      reportDialogVisible.value = true
    } else {
      ElMessage.error((result && result.msg) || '生成报告失败')
    }
  } catch (e) {
    console.error('生成报告失败:', e)
    ElMessage.error('生成报告失败')
  } finally {
    reportLoading.value = false
    msg.generatingReport = false
  }
}

// 下载报告（format: doc | md）
const handleDownloadReport = async (format) => {
  if (!currentReport.value) return
  try {
    const res = await downloadReport(currentReport.value.id, format)
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentReport.value.title}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('下载报告失败:', e)
    ElMessage.error('下载报告失败')
  }
}

// 发送消息核心逻辑
const handleSend = async (customMsg = null) => {
  const text = customMsg || inputMsg.value
  if (!text || (isStreaming.value && !customMsg)) return

  if (!customMsg) {
    messages.value.push({ role: 'user', content: text })
    inputMsg.value = ""
  }

  const isChartRequest = /图表|趋势图|曲线|可视化|分析图|画图|chart/.test(text)

  if (isChartRequest) {
    await handleChartWorkflow(text)
  } else {
    await handleNormalChatWorkflow(text)
  }
}

// 复合链路逻辑（图表 + 文本流）
const handleChartWorkflow = async (text) => {
  const aiTextIndex = messages.value.push({
    role: 'assistant',
    type: 'text',
    content: "",
    loading: true,
    question: text,
    canGenerateReport: isAnalysisQuestion(text)
  }) - 1

  isStreaming.value = true
  await scrollToBottom()

  const chartPromise = fetchChatChart(currentMemoryId.value, text)

  try {
    await fetchChatStream(
      currentMemoryId.value,
      text,
      (token) => {
        messages.value[aiTextIndex].content += token
        scrollToBottom()
      },
      async () => {
        messages.value[aiTextIndex].loading = false
        try {
          const res = await chartPromise
          const rawData = res.data
          let chartData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
          messages.value.push({
            role: 'assistant',
            type: 'chart',
            chartData: chartData,
            content: '',
            loading: false
          })
          await scrollToBottom()
        } catch (chartErr) {
          console.error("图表数据加载异常:", chartErr)
        }
        isStreaming.value = false
        const result = await executeToolFromText(messages.value[aiTextIndex].content)
        if (result) {
          messages.value.push({
            role: 'assistant',
            content: result.success ? `✅ ${result.message}` : `⚠️ ${result.message}`,
            loading: false
          })
        }
        await scrollToBottom()
      },
      (err) => {
        console.error("流式接口报错:", err)
        messages.value[aiTextIndex].loading = false
        isStreaming.value = false
      }
    )
  } catch (e) {
    console.error("handleChartWorkflow 错误:", e)
    isStreaming.value = false
  }
}

// 普通纯文字流式链路
const handleNormalChatWorkflow = async (text) => {
  const aiIndex = messages.value.push({
    role: 'assistant',
    content: "",
    loading: true,
    question: text,
    canGenerateReport: isAnalysisQuestion(text)
  }) - 1
  isStreaming.value = true
  await scrollToBottom()

  try {
    await fetchChatStream(
      currentMemoryId.value,
      text,
      (token) => {
        messages.value[aiIndex].content += token
        scrollToBottom()
      },
      async () => {
        messages.value[aiIndex].loading = false
        isStreaming.value = false
        const result = await executeToolFromText(messages.value[aiIndex].content)
        if (result) {
          messages.value.push({
            role: 'assistant',
            content: result.success ? `✅ ${result.message}` : `⚠️ ${result.message}`,
            loading: false
          })
        }
        await scrollToBottom()
      },
      (err) => {
        console.error("流式接口报错:", err)
        messages.value[aiIndex].loading = false
        isStreaming.value = false
      }
    )
  } catch (e) {
    console.error("handleNormalChatWorkflow 错误:", e)
    isStreaming.value = false
  }
}

// 快捷 Prompt 发送
const sendQuickPrompt = (txt) => {
  inputMsg.value = txt
  handleSend()
}
</script>

<style scoped>
.workspace-container {
  width: 100vw;
  height: 100vh;
  background-color: #0b1326;
  color: #dae2fd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
}

.header-bar {
  height: 52px;
  background-color: #060e20;
  border-bottom: 1px solid #171f33;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 50;
  flex-shrink: 0;
}

.left-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-box {
  width: 30px;
  height: 30px;
  background: #2563eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-text .title {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
  color: #ffffff;
  line-height: 1;
}

.brand-text .subtitle {
  font-size: 10px;
  color: #4edea3;
  margin-top: 3px;
}

.divider {
  width: 1px;
  height: 18px;
  background-color: #2d3449;
  margin: 0 4px;
}

.status-tags {
  display: flex;
  gap: 8px;
}

.status-tags .tag {
  font-size: 11px;
  background: #131b2e;
  padding: 2px 8px;
  border-radius: 4px;
  color: #c3c6d7;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2563eb;
}
.dot.green {
  background: #4edea3;
}

.nav-links {
  display: flex;
  gap: 8px;
  background: #131b2e;
  padding: 3px 6px;
  border-radius: 6px;
}

.nav-links a {
  padding: 4px 14px;
  font-size: 13px;
  color: #8d90a0;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-links a.active,
.nav-links a:hover {
  background: #222a3d;
  color: #ffffff;
  font-weight: 500;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.coords-info {
  font-family: monospace;
  font-size: 11px;
  color: #b4c5ff;
}

.user-avatar {
  background: #2563eb;
  color: #fff;
  font-size: 12px;
}

.main-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.custom-splitter {
  height: 100% !important;
  background-color: #0b1326;
}

:deep(.el-splitter__resizer) {
  background-color: #171f33 !important;
  width: 5px !important;
  transition: background-color 0.2s;
}
:deep(.el-splitter__resizer:hover) {
  background-color: #2563eb !important;
}

.map-viewport {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #060e20;
}

.map-hud-layers {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(11, 19, 38, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid #2d3449;
  padding: 10px 14px;
  border-radius: 8px;
  width: 240px;
  z-index: 10;
}

.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #171f33;
}

.hud-title {
  font-size: 12px;
  font-weight: 600;
  color: #dae2fd;
}

.hud-badge {
  font-size: 10px;
  background: rgba(78, 222, 163, 0.15);
  color: #4edea3;
  padding: 1px 6px;
  border-radius: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c3c6d7;
  margin-top: 6px;
}

.dot-green {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4edea3;
}
.dot-blue {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
}

.layer-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eye-icon {
  cursor: pointer;
  color: #4edea3;
}

.layer-remove-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #8d90a0;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  transition: color 0.2s;
}
.layer-remove-btn:hover {
  color: #ef4444;
}

.map-footer-bar {
  position: absolute;
  bottom: 8px;
  left: 12px;
  background: rgba(6, 14, 32, 0.8);
  backdrop-filter: blur(8px);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  color: #8d90a0;
  display: flex;
  gap: 10px;
  z-index: 10;
}

.right-panel-wrapper {
  height: 100%;
  background-color: #131b2e;
}

.agent-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #131b2e;
}

.agent-header {
  padding: 12px 16px;
  background: #171f33;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2d3449;
  flex-shrink: 0;
}

.agent-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-box {
  position: relative;
  width: 32px;
  height: 32px;
  background: #2563eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.online-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #4edea3;
  border-radius: 50%;
  border: 2px solid #171f33;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name-row .name {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}
.name-row .status {
  font-size: 10px;
  background: rgba(78, 222, 163, 0.15);
  color: #4edea3;
  padding: 1px 5px;
  border-radius: 4px;
}
.agent-title .sub {
  font-size: 11px;
  color: #8d90a0;
  margin-top: 2px;
}

.header-btns {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: #222a3d;
  border: none;
  color: #c3c6d7;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #2d3449;
  color: #fff;
}
.icon-btn.highlight {
  background: rgba(37, 99, 235, 0.2);
  color: #b4c5ff;
}

.conversation-stream {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-divider {
  text-align: center;
  font-size: 11px;
  color: #8d90a0;
  margin: 4px 0;
}

.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 1.25rem;
}
.user-row {
  justify-content: flex-end;
}
.bot-row {
  justify-content: flex-start;
}

.msg-user {
  display: flex;
  flex-direction: row-reverse;
  gap: 10px;
  max-width: 85%;
}

.msg-user .user-avatar {
  width: 28px;
  height: 28px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bubble-user {
  background: #222a3d;
  padding: 10px 14px;
  border-radius: 12px 0 12px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #ffffff;
}

.msg-agent {
  display: flex;
  gap: 10px;
  width: 100%;
}

.agent-avatar {
  width: 28px;
  height: 28px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
}

.agent-content {
  flex: 1;
}

.bubble-agent {
  background: #171f33;
  border: 1px solid #2d3449;
  padding: 12px;
  border-radius: 0 12px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cot-tag {
  font-size: 11px;
  color: #4edea3;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stream-text {
  font-size: 13px;
  line-height: 1.7;
  color: #e5e7eb;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: #4edea3;
  animation: blink 1s infinite;
  vertical-align: middle;
  margin-left: 2px;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

.chart-message-wrapper {
  margin-left: 38px;
}

.report-actions {
  margin-top: 6px;
  margin-left: 38px;
}

.report-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.report-iframe {
  width: 100%;
  height: 60vh;
  border: 1px solid #2d3449;
  border-radius: 6px;
  background: #ffffff;
}

.prompt-chips {
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  background: #171f33;
}

.chip {
  background: #222a3d;
  border: none;
  color: #b4c5ff;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  background: #2563eb;
  color: #fff;
}

.agent-input-area {
  padding: 12px 16px;
  background: #131b2e;
  border-top: 1px solid #2d3449;
}

.input-box {
  background: #0b1326;
  border: 1px solid #2d3449;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.input-box textarea {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 13px;
  resize: none;
  outline: none;
}

.input-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.left-tools {
  display: flex;
  gap: 6px;
}

.tool-btn {
  background: transparent;
  border: none;
  color: #8d90a0;
  cursor: pointer;
  font-size: 16px;
}

.tool-btn:hover {
  color: #fff;
}

.send-btn {
  background: #2563eb;
  border: none;
  color: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.restore-agent-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #171f33;
  border: 1px solid #2563eb;
  color: #b4c5ff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 99;
}

.restore-agent-btn:hover {
  background: #2563eb;
  color: #fff;
}
</style>