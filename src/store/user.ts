// src/store/user.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {

  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

  // 2. 登录成功后调用的方法
  const setLoginInfo = (data: any) => {
    // 假设后端返回的数据对象是 { token: '...', username: '...', id: ... }

    userInfo.value = data

    // 同步到本地存储
    localStorage.setItem('token', data.token)
    localStorage.setItem('userInfo', JSON.stringify(data))
  }

  // 3. 退出登录的方法
  const logout = () => {
    userInfo.value = {}
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { userInfo, setLoginInfo, logout }
})