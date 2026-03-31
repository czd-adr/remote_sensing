import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 1. 必须导入 path 模块

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()], // 2. 别忘了把 vue 插件放回来，否则 .vue 文件无法解析
  resolve: {
    alias: {
      // 3. 配置 @ 别名指向 src 目录
      '@': path.resolve(__dirname, './src')
    }
  }
})