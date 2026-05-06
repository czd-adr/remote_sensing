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
          v-for="session in historySessions"
          :key="session.id"
          class="history-item"
        >
          <div class="history-icon">🕒</div>
          <div class="history-info">
            <p class="history-name">{{ session.title }}</p>
            <p class="history-time">{{ session.time }}</p>
          </div>
        </div>
        <!-- 模拟较多数据以测试滚动 -->
        <div v-for="i in 10" :key="'mock-' + i" class="history-item">
          <div class="history-icon">🕒</div>
          <div class="history-info">
            <p class="history-name">Old Analysis Archive {{ i }}</p>
            <p class="history-time">Updated 1 month ago</p>
          </div>
        </div>
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
              :class="[
                'bubble',
                msg.role === 'user' ? 'user-bubble' : 'bot-bubble',
              ]"
            >
              <div class="sender-name">
                {{ msg.role === "user" ? "You" : "RS-Agent" }}
              </div>
              <div class="text-content">
                {{ msg.content }}
                <span v-if="msg.loading" class="cursor-blink"></span>
              </div>
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
import { fetchChatStream } from "@/api/chat";

const userInput = ref("");
const messages = ref([]);
const isStreaming = ref(false);
const chatContainer = ref(null);
const currentMemoryId = ref("");

const historySessions = ref([
  { id: 1, title: 'Amazon Deforestation 2024', time: 'Updated 2h ago' },
  { id: 2, title: 'Sahara Dust Storm Track', time: 'Updated 1d ago' },
  { id: 3, title: 'Urban Expansion Tokyo', time: 'Updated 3d ago' }
]);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    });
  }
};

const handleSend = async (customMsg = null) => {
  const text = customMsg || userInput.value;
  if (!text || (isStreaming.value && !customMsg)) return;

  if (!customMsg) {
    messages.value.push({ role: 'user', content: text });
    userInput.value = "";
  }

  const aiMessageIndex = messages.value.push({ role: 'assistant', content: "", loading: true }) - 1;
  isStreaming.value = true;
  await scrollToBottom();

  try {
    await fetchChatStream(
      currentMemoryId.value,
      text,
      (token) => {
        messages.value[aiMessageIndex].content += token;
        scrollToBottom();
      },
      () => {
        messages.value[aiMessageIndex].loading = false;
        isStreaming.value = false;
      },
      (err) => {
        messages.value[aiMessageIndex].content = "服务连接异常，请重试。";
        messages.value[aiMessageIndex].loading = false;
        isStreaming.value = false;
      }
    );
  } catch (e) {
    isStreaming.value = false;
  }
};

const createNewAnalysis = () => {
  const userId = "user_77";
  currentMemoryId.value = `${userId}_${Date.now()}`;
  messages.value = [];
  handleSend("你是谁？");
};

onMounted(() => {
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
.history-item {
  display: flex;
  padding: 0.8rem;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 0.2rem;
}
.history-item:hover {
  background: #f3f4f6;
}
.history-icon {
  margin-right: 0.75rem;
  color: #9ca3af;
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

/* 3. 主界面布局：顶部+中间(滚动)+底部(固定) */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.top-header {
  flex-shrink: 0; /* 固定高度 */
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
  flex: 1; /* 自动撑开占据剩余空间 */
  overflow-y: auto; /* 允许滚动 */
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
  flex-shrink: 0; /* 固定在底部，不参与滚动 */
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