<template>
  <div class="analysis-container">
    <div class="map-wrapper left-map">
      <div id="map-left" class="map-instance"></div>
      <div class="map-label">TIME PERIOD 1</div>
    </div>

    <div class="static-divider">
      <div class="divider-line"></div>
      <div class="center-logo"></div>
    </div>

    <div class="map-wrapper right-map">
      <div id="map-right" class="map-instance"></div>
      <div class="map-label">TIME PERIOD 2</div>
    </div>

    <div class="filter-panel">
      <div class="panel-title">PRIMARY SOURCE</div>
      <div class="filter-item">
        <label>BAND SELECTION</label>
        <el-select v-model="config.bands" size="small">
          <el-option label="NDVI (Vegetation)" value="ndvi" />
          <el-option label="RGB (Natural Color)" value="rgb" />
        </el-select>
      </div>
      <div class="filter-item">
        <label>TIME PERIOD 1 (LEFT)</label>
        <el-date-picker v-model="config.date1" type="month" size="small" />
      </div>
      <div class="filter-item">
        <label>TIME PERIOD 2 (RIGHT)</label>
        <el-date-picker v-model="config.date2" type="month" size="small" />
      </div>
      <el-button type="primary" class="generate-btn" @click="updateComparison">
        GENERATE DELTA REPORT
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, nextTick } from 'vue'

import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'

const isCollapsed = ref(false) // 控制面板是否折叠
const config = reactive({
  bands: 'ndvi',
  date1: '2026-02',
  date2: '2026-06'
})
const test = ''
let mapLeft, mapRight

const initMaps = () => {
  // 1. 创建一个共享的 View 实例，这是联动的核心
  const sharedView = new View({
    center: [119.1925068226449,
      34.78110354166833],
    zoom: 12.606060592924596,
    projection: 'EPSG:4326'
  })
  sharedView.on('change:center', () => {
    const center = sharedView.getCenter();
    console.log('Map Center Changed:', center);
  });

  // 监听缩放级别改变 (滚动或点击+-按钮)
  sharedView.on('change:resolution', () => {
    const zoom = sharedView.getZoom();
    console.log('Map Zoom Level:', zoom);
  });
  // 2. 初始化左侧地图
  mapLeft = new Map({
    target: 'map-left',
    layers: [
      new TileLayer({
        source: new TileWMS({
          url: 'http://localhost:8080/geoserver/test/wms',
          params: { 'LAYERS': 'test:628yangshi', 'TILED': true },
          serverType: 'geoserver'
        })
      })
    ],
    view: sharedView // 使用共享视图
  })

  // 3. 初始化右侧地图
  mapRight = new Map({
    target: 'map-right',
    layers: [
      new TileLayer({
        source: new TileWMS({
          url: 'http://localhost:8080/geoserver/test/wms',
          params: { 'LAYERS': 'test:628yangshi', 'TILED': true },
          serverType: 'geoserver'
        })
      })
    ],
    view: sharedView // 使用同一个共享视图
  })
}

const updateComparison = () => {
  console.log('执行对比请求', config)
}

onMounted(() => {
  nextTick(() => {
    initMaps()
  })
})
</script>

<style scoped>
.analysis-container {
  display: flex; /* 使用 Flex 布局平分左右 */
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
  background-color: #0b0e14;
  overflow: hidden;
}

.map-wrapper {
  position: relative;
  flex: 1; /* 左右各占 50% */
  height: 100%;
  border: 1px solid #1a1d23;
}

.map-instance {
  width: 100%;
  height: 100%;
}

.map-label {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #56b6c2;
  padding: 4px 12px;
  font-size: 10px;
  border-radius: 20px;
  z-index: 10;
  border: 1px solid #3e4451;
}

/* 固定中轴线 */
.static-divider {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none; /* 防止遮挡地图点击 */
}

.divider-line {
  height: 100%;
  width: 100%;
  background: #409eff;
  box-shadow: 0 0 15px #409eff;
}

.center-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #1a1d23;
  color: #409eff;
  padding: 8px;
  border: 2px solid #409eff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.filter-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 260px;
  background: rgba(21, 23, 27, 0.95);
  border: 1px solid #3e4451;
  padding: 20px;
  z-index: 200;
  color: #abb2bf;
}

.panel-title {
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #56b6c2;
}

.filter-item {
  margin-bottom: 15px;
}

.filter-item label {
  display: block;
  font-size: 10px;
  margin-bottom: 5px;
}

.generate-btn {
  width: 100%;
  background: #235fa7;
  border: none;
}
</style>