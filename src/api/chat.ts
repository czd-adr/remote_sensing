import axios from "axios";

const baseUrl = 'http://localhost:8099';

/**
 * 这里的普通的 axios 封装仅用于非流式测试
 * 注意：由于后端返回 text/event-stream，建议使用下方定义的流式方法
 */
export function chatBase(memoryId: string, message: string) {
  const params = new URLSearchParams();
  params.append('memoryId', memoryId);
  params.append('message', message);

  return axios({
    url: `${baseUrl}/WebGISAgent/chat`,
    method: 'post',
    data: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    // 如果非要用 axios 接收流，需要设置响应类型
    responseType: 'stream'
  });
}
export function fetchChatSessions() {
  return axios({
    url: `${baseUrl}/WebGISAgent/sessions`, // ⚠️ 注意：这里确保路径与你后端 Controller 的 RequestMapping 一致
    method: 'get',
    headers: {
      'Accept': 'application/json'
    }
  });
}
/**
 * 推荐：流式对话接口封装
 * 用于实现打字机效果
 */
export async function fetchChatStream(
  memoryId: string,
  message: string,
  onMessage: (token: string) => void,
  onDone?: () => void,
  onError?: (error: any) => void
) {
  const params = new URLSearchParams();
  params.append('memoryId', memoryId);
  params.append('message', message);

  try {
    const response = await fetch(`${baseUrl}/WebGISAgent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // 将解析出的字符块传给回调函数
        onMessage(chunk);
      }
      onDone?.();
    }
  } catch (error) {
    if (onError) onError(error);
    else console.error("Streaming error:", error);
  }
}
/**
 * 获取指定会话的历史记录
 */
export function fetchChatHistory(memoryId: string) {
  return axios({
    url: `${baseUrl}/WebGISAgent/history`, // 路径需与后端一致
    method: 'get',
    params: { memoryId }
  });
}
export function deleteChatSession(memoryId: string) {
  return axios({
    url: `${baseUrl}/WebGISAgent/session/${memoryId}`,
    method: 'delete'
  });
}

export function fetchChatChart(memoryId: string, message: string) {
  return axios({
    url: `${baseUrl}/WebGISAgent/chatChart`,
    method: 'get',
    params: { memoryId, message },
    headers: {
      'Accept': 'application/json'
    }
  });
}