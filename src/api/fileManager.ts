import axios from "axios";

const baseUrl = 'http://localhost:8099';

/**
 * 上传文件（multipart/form-data，表单字段名 file）
 * 例：POST /fileManager/upload
 */
export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return axios({
    url: `${baseUrl}/fileManager/upload`,
    method: 'post',
    data: formData
    // 注意：不手动设置 Content-Type，让浏览器/axios 自动带上 boundary
  });
}

/**
 * 文件列表
 * 例：GET /fileManager/list
 */
export function getFileList() {
  return axios({
    url: `${baseUrl}/fileManager/list`,
    method: 'get',
    headers: {
      'Accept': 'application/json'
    }
  });
}

/**
 * 删除文件
 * 例：DELETE /fileManager/{fileName}
 */
export function deleteFile(fileName: string) {
  return axios({
    url: `${baseUrl}/fileManager/${encodeURIComponent(fileName)}`,
    method: 'delete'
  });
}
