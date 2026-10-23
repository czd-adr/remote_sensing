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
                  :on-change="handleUpload"
                >
                  <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                  <div class="el-upload__text">
                    将文件拖到此处，或<em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="el-upload__tip">
                      请上传影像文件(zip格式)，单文件不超过 50MB
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
              <div class="card-body result-body">
                <div id="resultMap" class="map-container"></div>
                <div v-if="predicting" class="loading-mask">
                  <el-icon class="loading-icon" :size="40"><Loading /></el-icon>
                  <span>正在预测...</span>
                </div>
                <div
                  v-else-if="!resultVisible"
                  class="image-preview-placeholder map-mask"
                >
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
                <div
                  v-if="predicted"
                  class="chart-container"
                  id="pieChart"
                ></div>
                <div v-else class="chart-container">
                  <p class="placeholder-text">上传文件后可查看饼状图</p>
                </div>
              </div>

              <!-- 下半部分：结果表格信息 -->
              <div class="table-section">
                <h4 class="section-subtitle">结果表格信息</h4>
                <el-table
                  v-if="predicted"
                  :data="resultTableData"
                  border
                  stripe
                  style="width: 100%"
                >
                  <el-table-column prop="type" label="类型" align="center" />
                  <el-table-column
                    prop="hhmc"
                    label="互花米草"
                    align="center"
                  />
                  <el-table-column prop="lw" label="芦苇" align="center" />
                  <el-table-column prop="jp" label="碱蓬" align="center" />
                  <el-table-column prop="water" label="水体" align="center" />
                  <el-table-column prop="other" label="其他" align="center" />
                </el-table>
                <div v-else class="chart-container table-placeholder">
                  <p class="placeholder-text">上传文件后可查看结果</p>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { UploadFilled, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
// OpenLayers
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import TileWMS from 'ol/source/TileWMS'

// 地物分类面积数据（参考 ml.vue stkData）
const stkData = [
  { value: 27309129.808, name: '互花米草', key: 'hhmc' },
  { value: 24244824.165, name: '芦苇', key: 'lw' },
  { value: 35968123.212, name: '碱蓬', key: 'jp' },
  { value: 41496192.490, name: '水体', key: 'water' },
  { value: 55996690.152, name: '其他', key: 'other' }
]
const totalArea = stkData.reduce((sum, d) => sum + d.value, 0)

// 结果表格数据：各分类面积占比
const resultTableData = computed(() => {
  const row = { type: '占比结果' }
  stkData.forEach(d => {
    row[d.key] = ((d.value / totalArea) * 100).toFixed(2) + '%'
  })
  return [row]
})

// ============ 地物分类结果地图 ============
const resultVisible = ref(false) // 是否已展示结果地图
const predicting = ref(false) // 是否正在预测（控制加载动画）
const predicted = ref(false) // 是否已完成预测（控制饼图/表格显示）
let resultMap = null

// 卫星底图
const satelliteSource = new XYZ({
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
})
const satelliteLayer = new TileLayer({ source: satelliteSource })

// Stacking_JM 分类结果图层（参考 ml.vue）
const Stacking_JM = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:Stacking',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true
    },
    serverType: 'geoserver'
  }),
  zIndex: 20
})

const resultView = new View({
  center: [119.281, 34.77934],
  zoom: 12.4,
  projection: 'EPSG:4326'
})

onMounted(async () => {
  await nextTick()
  resultMap = new Map({
    target: 'resultMap',
    view: resultView,
    layers: [satelliteLayer]
  })
})

// 饼图渲染（参考 ml.vue loadPie）
let pieChart = null
const renderPie = () => {
  const dom = document.getElementById('pieChart')
  if (!dom) return
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(dom)
  pieChart.setOption({
    title: { text: '地物分类面积分布', subtext: '单位：m²', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '地物类型',
        type: 'pie',
        radius: '50%',
        data: stkData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  })
}

// 上传文件：0.5s 上传提示 -> 1.5s 预测提示（加载动画）-> 展示结果
const handleUpload = () => {
  const uploadMsg = ElMessage({ message: '正在上传...', type: 'info', duration: 0 })
  setTimeout(() => {
    uploadMsg.close()
    // 进入预测阶段：显示加载动画，暂不渲染结果地图
    predicting.value = true
    const predictMsg = ElMessage({ message: '正在预测...', type: 'info', duration: 0 })
    setTimeout(() => {
      predictMsg.close()
      predicting.value = false
      // 预测结束：渲染结果地图、饼图、表格
      resultVisible.value = true
      if (resultMap) {
        if (!resultMap.getLayers().getArray().includes(Stacking_JM)) {
          resultMap.addLayer(Stacking_JM)
        }
        resultMap.updateSize()
      }
      predicted.value = true
      nextTick(() => renderPie())
      ElMessage({ message: '预测完成', type: 'success' })
    }, 1500)
  }, 500)
}
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

.input-card {
  flex: 4.5;
  display: flex;
  flex-direction: column;
}

.result-img-card {
  flex: 5.5;
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

/* 结果地图容器 */
.result-body {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.map-container {
  width: 100%;
  height: 100%;
}
.map-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  color: #409eff;
  font-size: 14px;
}
.loading-mask .loading-icon {
  animation: loading-rotate 1s linear infinite;
}
@keyframes loading-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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

.table-placeholder {
  min-height: 120px;
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