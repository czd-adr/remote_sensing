<template>
  <div class="rs-container">
    <!-- 左侧侧边栏：固定宽度，内容可滚动 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-section">
          <span class="logo-text">RS-Agent</span>
        </div>
        <button @click="createNewAnalysis" class="btn-new">
          <span class="plus">+</span> New Analysis
        </button>
      </div>

      <!-- 历史会话列表：设置滚动 -->
      <div class="history-scroll-area">
        <p class="section-title">Recent Sessions</p>
        <div
          v-for="session in sessionList"
          :key="session.memoryId"
          :class="[
            'history-item',
            { active: currentMemoryId === session.memoryId },
          ]"
          @click="handleSelectSession(session.memoryId)"
        >
          <div class="history-icon">🕒</div>
          <div class="history-info">
            <p class="history-name">{{ session.title }}</p>
            <p class="history-time">{{ session.time }}</p>
          </div>
          <button
            class="delete-btn"
            @click.stop="confirmDelete(session.memoryId)"
          >
            ×
          </button>
        </div>

        <!-- 模拟较多数据以测试滚动 -->
      </div>
    </aside>

    <!-- 右侧主界面：包含顶部、中间聊天流、底部固定输入 -->
    <main class="main-content">
      <header class="top-header">
        <div class="search-container">
          <input
            type="text"
            placeholder="Search datasets..."
            class="search-input"
          />
        </div>
        <button class="icon-btn">⚙️</button>
      </header>

      <!-- 聊天内容区域：自动占据剩余空间，且内容可滚动 -->
      <section ref="chatContainer" class="chat-viewport">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-row', msg.role === 'user' ? 'user-row' : 'bot-row']"
        >
          <div class="message-wrapper">
            <div
              :class="[
                'avatar',
                msg.role === 'user' ? 'user-avatar' : 'bot-avatar',
              ]"
            >
              {{ msg.role === "user" ? "👤" : "🤖" }}
            </div>

            <div
              v-if="msg.type !== 'chart'"
              :class="[
                'bubble',
                msg.role === 'user' ? 'user-bubble' : 'bot-bubble',
              ]"
            >
              <div class="sender-name">
                {{ msg.role === "user" ? "You" : "RS-Agent" }}
              </div>
              <div class="text-content">
                {{
                  msg.content &&
                  typeof msg.content === "string" &&
                  msg.content.startsWith("{")
                    ? "NDVI图表分析中..."
                    : msg.content
                }}
                <span v-if="msg.loading" class="cursor-blink"></span>
              </div>
            </div>

            <div
              v-if="msg.type === 'chart'"
              class="chart-message-wrapper"
              style="margin-left: 56px"
            >
              <NDVIChart :chartData="msg.chartData" />
            </div>
          </div>
        </div>
      </section>

      <!-- 底部固定输入区域 -->
      <footer class="input-footer">
        <div class="input-box">
          <span class="file-icon">📄</span>
          <input
            v-model="userInput"
            @keyup.enter="handleSend()"
            type="text"
            placeholder="Ask for an analysis, coordinates, or dataset comparison..."
          />
          <button
            @click="handleSend()"
            :disabled="isStreaming"
            class="send-btn"
          >
            Send 🚀
          </button>
        </div>
        <div class="footer-info">
          <span>Sentinel-2, Landsat-8, and MODIS data supported</span>
          <span>Current view: Latitude -3.46, Longitude -62.21</span>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { fetchChatStream, fetchChatSessions, fetchChatHistory, deleteChatSession, fetchChatChart } from "@/api/chat";
import { ElMessageBox, ElMessage } from 'element-plus';
//自定义组件
import NDVIChart from '@/components/NDVIChart.vue'
//获取用户登陆信息
import { useUserStore } from '@/store/user'
import { storeToRefs } from 'pinia'
const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const userInput = ref("");
const messages = ref([]);
const isStreaming = ref(false);
const chatContainer = ref(null);
const currentMemoryId = ref("");
const sessionList = ref([]);
const loading = ref(false);
const historySessions = ref([
  { id: 1, title: 'Amazon Deforestation 2024', time: 'Updated 2h ago' },
  { id: 2, title: 'Sahara Dust Storm Track', time: 'Updated 1d ago' },
  { id: 3, title: 'Urban Expansion Tokyo', time: 'Updated 3d ago' }
]);
const confirmDelete = async (memoryId) => {
  // 1. 使用 ElMessageBox 进行二次确认
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该聊天会话及其历史记录, 是否继续?',
      '提示',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        // 也可以开启按钮的危险样式
        confirmButtonClass: 'el-button--danger',
      }
    );

    // 2. 如果用户点击确定，执行删除逻辑
    try {
      await deleteChatSession(memoryId);

      // 3. 结果反馈：删除成功
      ElMessage({
        type: 'success',
        message: '会话已成功删除',
      });

      // 4. 刷新列表
      await loadSessions();

      // 5. 如果删掉的是当前正在看的会话，清空界面
      if (currentMemoryId.value === memoryId) {
        messages.value = [];
        currentMemoryId.value = "";
        // loadSessions 内部逻辑会自动选中剩余的第一个（如果你之前的代码里写了的话）
      }
    } catch (error) {
      console.error("后端删除接口报错:", error);
      ElMessage.error("删除失败，服务器响应异常");
    }

  } catch (cancel) {
    // 用户点击取消或关闭弹窗
    console.log('用户取消了删除');
  }
};
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    });
  }
};
const loadSessions = async () => {
  loading.value = true;
  try {
    const res = await fetchChatSessions();
    sessionList.value = res.data;

    // --- 核心逻辑：默认选中第一个 ---
    if (sessionList.value.length > 0) {
      const firstSessionId = sessionList.value[0].memoryId;
      // 只有在没有选中任何会话的情况下，才自动加载第一个
      if (!currentMemoryId.value) {
        handleSelectSession(firstSessionId);
      }
    } else {
      // 如果没有任何历史会话，则开启一个全新的分析
      createNewAnalysis();
    }
    // ----------------------------

  } catch (error) {
    console.error("加载会话列表失败:", error);
  } finally {
    loading.value = false;
  }
};
const handleSend = async (customMsg = null) => {
  const text = customMsg || userInput.value;
  if (!text || (isStreaming.value && !customMsg)) return;

  if (!customMsg) {
    messages.value.push({ role: 'user', content: text });
    userInput.value = "";
  }

  // 1. 意图预判
  const isChartRequest = /图表|趋势图|曲线|可视化|分析图|画图/.test(text);

  if (isChartRequest) {
    // 逻辑 A: 复合链路
    await handleChartWorkflow(text);
  } else {
    // 逻辑 B: 纯文字链路
    await handleNormalChatWorkflow(text);
  }
};

// 复合链路逻辑修正
const handleChartWorkflow = async (text) => {
  const aiTextIndex = messages.value.push({
    role: 'assistant',
    type: 'text',
    content: "",
    loading: true
  }) - 1;

  isStreaming.value = true;
  await scrollToBottom();

  console.log("🚀 [节点1] 发起并行请求:", { text, memoryId: currentMemoryId.value });
  const chartPromise = fetchChatChart(currentMemoryId.value, text);

  try {
    await fetchChatStream(
      currentMemoryId.value,
      text,
      (token) => {
        messages.value[aiTextIndex].content += token;
        scrollToBottom();
      },
      async () => {
        console.log("✅ [节点2] 文字流结束，准备处理图表数据...");
        messages.value[aiTextIndex].loading = false;

        try {
          const res = await chartPromise;
          console.log("📦 [节点3] 图表接口原始响应:", res);

          // 关键排查点：res.data 是不是预期的 DTO 对象？
          const rawData = res.data;
          console.log("🔍 [节点4] data 内容类型:", typeof rawData, rawData);

          let chartData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          console.log("📊 [节点5] 解析后的 chartData:", chartData);

          // 插入图表消息
          const chartMsg = {
            role: 'assistant',
            type: 'chart',
            chartData: chartData,
            content: '',
            loading: false
          };

          messages.value.push(chartMsg);
          console.log("✨ [节点6] 图表消息已推入 messages 数组", messages.value);

          await scrollToBottom();
        } catch (chartErr) {
          console.error("❌ [异常] 图表接口调用或解析失败:", chartErr);
        }

        isStreaming.value = false;
        await loadSessions();
      },
      (err) => {
        console.error("❌ [异常] 流式接口报错:", err);
        messages.value[aiTextIndex].loading = false;
        isStreaming.value = false;
      }
    );
  } catch (e) {
    console.error("❌ [异常] handleChartWorkflow 执行错误:", e);
    isStreaming.value = false;
  }
};

// 普通流式链路（保持你原来的逻辑）
const handleNormalChatWorkflow = async (text) => {
  const aiIndex = messages.value.push({ role: 'assistant', content: "", loading: true }) - 1;
  isStreaming.value = true;
  await fetchChatStream(
    currentMemoryId.value, text,
    (token) => { messages.value[aiIndex].content += token; scrollToBottom(); },
    async () => {
      messages.value[aiIndex].loading = false;
      isStreaming.value = false;
      await loadSessions();
    }
  );
};

const createNewAnalysis = () => {
  const userId = userInfo.value.id;
  currentMemoryId.value = `${userId}_${Date.now()}`;
  messages.value = [];
  // 只有真正发送第一条消息后，后端 updateMessages 才会把这个 ID 存入列表
};
// 1. 处理点击切换会话
const handleSelectSession = async (memoryId) => {
  if (isStreaming.value) return;
  loading.value = true;
  currentMemoryId.value = memoryId;

  try {
    const res = await fetchChatHistory(memoryId);

    messages.value = res.data.map(msg => {
      const isAI = msg.role === 'ai' || msg.role === 'assistant';
      const content = msg.content || "";

      // 核心逻辑：尝试判断这条历史消息是不是图表
      let type = 'text';
      let chartData = null;

      if (isAI && content.includes('"type":"CHART_NDVI"')) {
        try {
          // 如果内容本身就是 JSON 字符串，尝试解析它
          chartData = JSON.parse(content);
          type = 'chart';
        } catch (e) {
          console.warn("历史记录中的JSON解析失败", e);
        }
      }

      return {
        role: isAI ? 'assistant' : 'user',
        type: type,
        content: type === 'chart' ? '' : content, // 如果是图表，清空 content 避免显示源码
        chartData: chartData,
        loading: false
      };
    });

    await scrollToBottom();
  } catch (error) {
    console.error("加载历史记录失败:", error);
    messages.value = [];
  } finally {
    loading.value = false;
  }
};
onMounted(() => {
  loadSessions()
  createNewAnalysis();
});
</script>

<style scoped>
/* 1. 基础布局：强制铺满屏幕，禁止 Body 滚动 */
.rs-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden; /* 防止整页滚动 */
  background-color: #f9fafb;
}

/* 2. 侧边栏：独立滚动设计 */
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column; /* 垂直排列 */
  height: 100%;
}
.sidebar-header {
  flex-shrink: 0; /* 禁止头部压缩 */
}
.logo-section {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}
.logo-text {
  color: #ea580c;
  font-weight: 800;
  font-size: 1.25rem;
}
.btn-new {
  display: block;
  width: calc(100% - 2rem);
  margin: 1rem;
  padding: 0.7rem;
  background: #ea580c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* 侧边栏滚动区域 */
.history-scroll-area {
  flex: 1; /* 占据剩余高度 */
  overflow-y: auto; /* 开启内容滚动 */
  padding: 0 0.5rem 1.5rem;
}
.section-title {
  font-size: 0.75rem;
  color: #9ca3af;
  padding: 1rem 0.75rem 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* --- 历史项基础样式 --- */
.history-item {
  position: relative; /* 为删除按钮定位 */
  display: flex;
  padding: 0.8rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0 0.5rem 0.2rem;
  border-left: 4px solid transparent;
}

.history-item:hover {
  background: #f3f4f6;
}

/* --- 高亮状态样式 --- */
.history-item.active {
  background: #fff7ed; /* 浅橙色背景 */
  border-left: 4px solid #ea580c; /* 左侧主题色高亮条 */
}

.history-item.active .history-icon {
  color: #ea580c;
}

.history-item.active .history-name {
  color: #ea580c;
  font-weight: 600;
}

.history-icon {
  margin-right: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
}
.history-info {
  flex: 1;
  overflow: hidden; /* 防止文字溢出撑开容器 */
  padding-right: 20px; /* 为删除按钮留出空间 */
}
.history-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-time {
  font-size: 0.7rem;
  color: #9ca3af;
}

/* --- 删除按钮样式 --- */
.delete-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 1.1rem;
  cursor: pointer;
  opacity: 0; /* 默认隐藏 */
  transition: all 0.2s;
  padding: 4px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.history-item:hover .delete-btn {
  opacity: 1; /* 悬停显示 */
}

.delete-btn:hover {
  color: #ef4444; /* 悬停变红 */
  background: rgba(239, 68, 68, 0.1); /* 轻微背景提示 */
}

/* 3. 主界面布局：顶部+中间(滚动)+底部(固定) */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.top-header {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 2rem;
  background: white;
  border-bottom: 1px solid #f3f4f6;
}
.search-input {
  background: #f3f4f6;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 20px;
  width: 260px;
  font-size: 0.85rem;
}

/* 聊天视口：中间可滚动区域 */
.chat-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: transparent;
  scroll-behavior: smooth;
}

/* 消息行样式 */
.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 1.5rem;
}
.bot-row {
  justify-content: flex-start;
}
.user-row {
  justify-content: flex-end;
}
.message-wrapper {
  display: flex;
  max-width: 75%;
  gap: 1rem;
}
.user-row .message-wrapper {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-avatar {
  background: #374151;
}
.bot-avatar {
  background: #ea580c;
}

.bubble {
  padding: 1rem;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.bot-bubble {
  background: white;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}
.user-bubble {
  background: #1f2937;
  color: white;
  border-bottom-right-radius: 4px;
}
.sender-name {
  font-size: 0.65rem;
  font-weight: 700;
  opacity: 0.6;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
}

/* 底部固定区 */
.input-footer {
  flex-shrink: 0;
  padding: 1.5rem 2rem;
  background: white;
  border-top: 1px solid #f3f4f6;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.02);
}
.input-box {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #d1d5db;
  padding: 0.6rem 1.2rem;
  border-radius: 14px;
}
.input-box input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.4rem;
  font-size: 0.95rem;
}
.send-btn {
  background: #ea580c;
  color: white;
  border: none;
  padding: 0.6rem 1.4rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.footer-info {
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  margin-top: 0.8rem;
  font-size: 0.7rem;
  color: #9ca3af;
}

.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: #ea580c;
  animation: blink 1s infinite;
  vertical-align: middle;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* 自定义滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>