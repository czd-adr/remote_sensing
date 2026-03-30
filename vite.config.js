import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // 这里的配置必须和你的 import 路径匹配
      '@': path.resolve(__dirname, './src')
    }
  }
})
