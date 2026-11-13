import axios from "axios";

const baseUrl = 'http://localhost:8099';

/**
 * 活动图层列表
 * GET /active-layer/list?memoryId=xx
 */
export function fetchActiveLayers(memoryId: string) {
  return axios({
    url: `${baseUrl}/active-layer/list`,
    method: 'get',
    params: { memoryId }
  });
}

/**
 * 新增活动图层
 * POST /active-layer/add?memoryId=xx&layerName=xxx
 */
export function addActiveLayer(memoryId: string, layerName: string) {
  return axios({
    url: `${baseUrl}/active-layer/add`,
    method: 'post',
    params: { memoryId, layerName }
  });
}

/**
 * 删除活动图层
 * DELETE /active-layer/remove?memoryId=xx&layerName=xxx
 */
export function removeActiveLayer(memoryId: string, layerName: string) {
  return axios({
    url: `${baseUrl}/active-layer/remove`,
    method: 'delete',
    params: { memoryId, layerName }
  });
}