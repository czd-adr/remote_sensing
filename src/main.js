import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './routers'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from 'axios'
import { createPinia } from 'pinia'
import { useUserStore } from '@/store/user'
axios.defaults.baseURL = 'http://localhost:8099' // 设置 axios 的默认 baseURL

// ✅ 正确：先赋值给 app，再注册 router、ElementPlus，再挂载
const app = createApp(App)
const pinia = createPinia()
Object.keys(ElementPlusIconsVue).forEach(key => {
    app.component(key, ElementPlusIconsVue[key])
  })
app.use(router)
app.use(pinia)
app.use(ElementPlus)  // 注册 Element Plus
app.config.globalProperties.$axios = axios
app.mount('#app')     // 最后挂载
axios.interceptors.request.use(config => {
  // 每次请求发出前，从 Store 中获取最新的 Token
  const userStore = useUserStore()
  
  if (userStore.token) {
    // 后端拦截器 JwtAuthenticationTokenFilter 会读取这个 Authorization 头
    config.headers.Authorization = userStore.token
  }
  return config
}, error => {
  return Promise.reject(error)
})