import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './routers'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from 'axios'
axios.defaults.baseURL = 'http://localhost:8099' // 设置 axios 的默认 baseURL

// ✅ 正确：先赋值给 app，再注册 router、ElementPlus，再挂载
const app = createApp(App)
Object.keys(ElementPlusIconsVue).forEach(key => {
    app.component(key, ElementPlusIconsVue[key])
  })
app.use(router)
app.use(ElementPlus)  // 注册 Element Plus
app.config.globalProperties.$axios = axios
app.mount('#app')     // 最后挂载
