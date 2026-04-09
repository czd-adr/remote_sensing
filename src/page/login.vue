<template>
  <div class="login-container">
    <el-card class="login-box">
      <template #header>
        <h3>系统登录</h3>
      </template>

      <el-form :model="loginForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            @click="handleLogin"
            :loading="loading"
            style="width: 100%"
          >
            立即登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请填写完整信息')
    return
  }

  loading.value = true
  try {
    // 注意：这里的 URL 要对应你后端的端口，通常是 8080
    // 如果配置了 proxy，直接写 /api/user/login
    const res = await axios.post('http://localhost:8099/user/login', loginForm)

    // 对应你后端 Map 里的 status 字段
    if (res.data.status === 'success') {
      ElMessage.success('登录成功！')

      // 保存用户信息和 Token（如果有的话）
      localStorage.setItem('userInfo', JSON.stringify(res.data.data))

      // 跳转到分析主页
      router.push('/index')
    } else {
      ElMessage.error(res.data.msg || '登录失败')
    }
  } catch (error) {
    console.error('接口请求异常:', error)
    ElMessage.error('无法连接到服务器，请检查后端是否启动')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}
.login-box {
  width: 400px;
}
</style>