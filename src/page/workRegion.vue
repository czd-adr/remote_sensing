<template>
  <div class="page-container">
    <!-- 1. 顶部面包屑导航（已去除顶部右侧所有按钮） -->
    <div class="header-bar">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">Dashboard</el-breadcrumb-item>
        <el-breadcrumb-item>主要功能</el-breadcrumb-item>
        <el-breadcrumb-item>地物分类</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 2. 主体内容区域（1:1 左右比例分布） -->
    <div class="content-wrapper">
      <el-row :gutter="16" class="full-row">
        <!-- 左侧区域 (1:1 比例，占据 12/24 栅格) -->
        <el-col :span="12" class="col-flex">
          <div class="left-box">
            <!-- 左上卡片：待预测图像输入区 -->
            <el-card class="box-card input-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="card-title">待预测图像输入区</span>
                </div>
              </template>
              <div class="card-body center-content">
                <el-upload
                  class="upload-demo"
                  drag
                  action="#"
                  :auto-upload="false"
                >
                  <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                  <div class="el-upload__text">
                    将文件拖到此处，或<em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="el-upload__tip">
                      支持 .png / .jpg / .tif 格式影像，单文件不超过 50MB
                    </div>
                  </template>
                </el-upload>
                <div class="action-btn-group">
                  <el-button type="primary" size="large">开始预测</el-button>
                </div>
              </div>
            </el-card>

            <!-- 左下卡片：地物分类结果图像展示区 -->
            <el-card class="box-card result-img-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="card-title">地物分类结果图像展示区</span>
                </div>
              </template>
              <div class="card-body center-content">
                <div class="image-preview-placeholder">
                  <p class="placeholder-text">分类结果图像展示位置</p>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>

        <!-- 右侧区域 (1:1 比例，占据 12/24 栅格，独占整高) -->
        <el-col :span="12" class="col-flex">
          <el-card class="box-card right-full-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title">地物分类结果图表展示区</span>
              </div>
            </template>
            <div class="card-body right-body">
              <!-- 上半部分：饼状图区域 -->
              <div class="chart-section">
                <h4 class="section-subtitle">饼状图</h4>
                <div class="chart-container" id="pieChart">
                  <!-- ECharts 图表绘制挂载区域 -->
                  <p class="placeholder-text">[ ECharts 饼图渲染区域 ]</p>
                </div>
              </div>

              <!-- 下半部分：结果表格信息 -->
              <div class="table-section">
                <h4 class="section-subtitle">结果表格信息</h4>
                <el-table
                  :data="resultTableData"
                  border
                  stripe
                  style="width: 100%"
                >
                  <el-table-column prop="type" label="类型" align="center" />
                  <el-table-column prop="road" label="道路" align="center" />
                  <el-table-column prop="forest" label="林地" align="center" />
                  <el-table-column prop="water" label="水体" align="center" />
                  <el-table-column prop="grass" label="草地" align="center" />
                  <el-table-column
                    prop="background"
                    label="背景"
                    align="center"
                  />
                </el-table>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'

// 模拟右侧结果表格数据
const resultTableData = ref([
  {
    type: '占比结果',
    road: '6.00%',
    forest: '36.29%',
    water: '45.33%',
    grass: '0.00%',
    background: '12.38%'
  }
])
</script>

<style scoped>
/* 1. 页面全局容器：灰蓝背景色与白框形成色彩对比 */
.page-container {
  width: 100%;
  height: 100vh;
  background-color: #f4f6f9; /* 淡灰色背景，突出白色卡片 */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 16px;
  overflow: hidden;
}

/* 2. 顶部面包屑 */
.header-bar {
  background-color: #ffffff;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

/* 3. 主内容区域：利用 Flex 自适应填充高度 */
.content-wrapper {
  flex: 1;
  width: 100%;
  overflow: hidden;
}

.full-row {
  height: 100%;
}

.col-flex {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 4. 左侧上下卡片布局 */
.left-box {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px; /* 上下卡片之间的色彩分割间距 */
}

.input-card,
.result-img-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 5. 通用卡片美化 */
.box-card {
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  border-left: 4px solid #409eff; /* 蓝色左装饰线，增加视觉对比 */
  padding-left: 10px;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.card-body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.center-content {
  justify-content: center;
  align-items: center;
}

.action-btn-group {
  margin-top: 16px;
}

/* 图像占位样式 */
.image-preview-placeholder,
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 180px;
  background-color: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.placeholder-text {
  color: #909399;
  font-size: 14px;
}

/* 6. 右侧整高卡片样式 */
.right-full-card {
  height: 100%;
}

.right-body {
  justify-content: space-between;
  gap: 16px;
}

.chart-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-section {
  flex-shrink: 0;
}

.section-subtitle {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

/* Element Plus 样式覆写（使内部组件自适应卡片高度） */
:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-upload-drag) {
  padding: 20px 40px;
}
</style>