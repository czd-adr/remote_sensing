// src/api/diff.ts
import axios from "axios";

const baseUrl = 'http://localhost:8099';

// 封装接口
export function diffNDVI(date1: string, date2: string) {
  const params = new URLSearchParams();
  params.append('date1', date1);
  params.append('date2', date2);

  return axios({
    url: `${baseUrl}/diff/NDVIByDate`,
    method: 'post',
    data: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
}