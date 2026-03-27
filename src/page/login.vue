<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2>{{ isLogin ? '用户登录' : '用户注册' }}</h2>

      <el-form :model="form" class="auth-form">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" placeholder="请输入密码" show-password />
        </el-form-item>

        <el-button
          type="primary"
          class="auth-btn"
          @click="handleSubmit"
          :loading="loading"
        >
          {{ isLogin ? '登录' : '注册' }}
        </el-button>

        <div class="switch-mode" @click="isLogin = !isLogin">
          {{ isLogin ? '没有账号？去注册 →' : '已有账号？去登录 →' }}
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 后端接口基础路径
const BASE_URL = 'http://localhost:8080'  // 你的 Spring Boot 服务地址

const isLogin = ref(true)
const loading = ref(false)
const form = ref({
  username: '',
  password: ''
})

const handleSubmit = async () => {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true

  try {
    if (isLogin.value) {
      // 登录请求
      const res = await axios.post(`${BASE_URL}/auth/login`, form.value)
      const token = res.data.data?.token
      if (token) {
        localStorage.setItem('token', token)
        ElMessage.success('登录成功')
        // 跳转首页或其他页面
        window.location.href = '/home'
      } else {
        ElMessage.error('登录失败')
      }
    } else {
      // 注册请求
      await axios.post(`${BASE_URL}/auth/register`, form.value)
      ElMessage.success('注册成功，请登录')
      isLogin.value = true
    }
  } catch (error) {
    console.error(error)
    ElMessage.error(error.response?.data?.message || '请求失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #a2c2e1, #f6f9fc);
}

.auth-card {
  width: 360px;
  padding: 40px 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.auth-btn {
  width: 100%;
  margin-top: 10px;
}

.switch-mode {
  text-align: center;
  margin-top: 15px;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
}
</style>
