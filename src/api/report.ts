import axios from "axios";

const baseUrl = 'http://localhost:8099';

/**
 * 生成分析报告
 * POST /report/generate
 * body: {"memoryId":"xx","message":"对比2026年3月和9月的NDVI"}
 */
export function generateReport(memoryId: string, message: string) {
  return axios({
    url: `${baseUrl}/report/generate`,
    method: 'post',
    data: { memoryId, message },
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 报告列表（可按会话过滤）
 * GET /report/list?memoryId=xx
 */
export function fetchReportList(memoryId?: string) {
  return axios({
    url: `${baseUrl}/report/list`,
    method: 'get',
    params: memoryId ? { memoryId } : {}
  });
}

/**
 * 报告详情（Markdown 原文）
 * GET /report/{id}
 */
export function fetchReportDetail(id: number) {
  return axios({
    url: `${baseUrl}/report/${id}`,
    method: 'get'
  });
}

/**
 * 报告 HTML 预览
 * GET /report/{id}/html
 */
export function fetchReportHtml(id: number) {
  return axios({
    url: `${baseUrl}/report/${id}/html`,
    method: 'get'
  });
}

/**
 * 报告下载
 * GET /report/{id}/download?format=doc|md
 * 返回 blob，供前端触发浏览器下载
 */
export function downloadReport(id: number, format: 'doc' | 'md' = 'doc') {
  return axios({
    url: `${baseUrl}/report/${id}/download`,
    method: 'get',
    params: { format },
    responseType: 'blob'
  });
}

/**
 * 逻辑删除报告
 * DELETE /report/{id}
 */
export function deleteReport(id: number) {
  return axios({
    url: `${baseUrl}/report/${id}`,
    method: 'delete'
  });
}