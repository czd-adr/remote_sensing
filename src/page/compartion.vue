<template>
  <div class="analysis-container">
    <div class="map-wrapper left-map">
      <div id="map-left" class="map-instance"></div>
      <div class="map-label">TIME PERIOD 1</div>
    </div>
    <div class="coordinate">{{ mousePosition }}</div>
    <div class="static-divider">
      <div class="divider-line"></div>
      <div class="center-logo"></div>
    </div>

    <div class="map-wrapper right-map">
      <div id="map-right" class="map-instance"></div>
      <div class="map-label">TIME PERIOD 2</div>
    </div>

    <div class="filter-panel" :class="{ 'is-collapsed': isCollapsed }">
      <div class="panel-header">
        <span class="panel-title">主要数据源</span>
        <div class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <el-icon>
            <ArrowUp v-if="!isCollapsed" />
            <ArrowDown v-else />
          </el-icon>
        </div>
      </div>

      <transition name="el-zoom-in-top">
        <div v-show="!isCollapsed" class="panel-content">
          <div class="filter-item">
            <label>波段选择</label>
            <el-select v-model="config.bands" size="small">
              <el-option label="NDVI (Vegetation)" value="ndvi" />
              <el-option label="RGB (Natural Color)" value="rgb" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>时相 1(左)</label>
            <el-date-picker
              v-model="config.date1"
              type="month"
              size="small"
              value-format="YYYY-MM"
            />
          </div>
          <div class="filter-item">
            <label>时相 2(右)</label>
            <el-date-picker
              v-model="config.date2"
              type="month"
              size="small"
              value-format="YYYY-MM"
            />
          </div>
          <div class="button-group">
            <el-button
              type="primary"
              class="generate-btn"
              @click="updateComparison"
            >
              对比生成
            </el-button>
            <el-button type="primary" class="reset-btn" @click="resetForm">
              重置
            </el-button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, nextTick } from 'vue'
import axios from 'axios'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { diffNDVI } from '../api/diff'

const isCollapsed = ref(false) // 控制面板是否折叠
const config = reactive({

})
const mousePosition = ref('')
let currentLeftLayer = null;
let currentRightLayer = null;
let mapLeft, mapRight
const createTestLayer = (layerName) => {
  return new TileLayer({
    zIndex: 1000,
    source: new TileWMS({
      url: 'http://localhost:8080/geoserver/test/wms', // 建议统一用 wms 结尾
      params: {
        'LAYERS': `test:${layerName}`,
        'TILED': true,
        'FORMAT': 'image/png' // 确保支持透明
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous' // 避免跨域画布污染
    })
  });
};
const initMaps = () => {
  // 1. 创建一个共享的 View 实例，这是联动的核心
  const sharedView = new View({
    center: [119.20167290618058,
      34.78598950513149],
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
      }), // 你的底图
    ],
    view: sharedView
  });


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
  mapLeft.on('pointermove', (event) => {
    const [lon, lat] = event.coordinate

    mousePosition.value = `${lon.toFixed(6)},${lat.toFixed(6)}`


  })
  mapRight.on('pointermove', (event) => {
    const [lon, lat] = event.coordinate

    mousePosition.value = `${lon.toFixed(6)},${lat.toFixed(6)}`


  })
}
const NDVI_23_1 = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/23_1_NDVI',
    params: {
      'LAYERS': 'test:23_1_NDVI',
      'TILED': true
    },
    serverType: 'geoserver',

  })
});
const NDVI_23_2 = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/23_2_NDVI',
    params: {
      'LAYERS': 'test:23_2_NDVI',
      'TILED': true
    },
    serverType: 'geoserver',

  })
})
const updateComparison = async () => {
  // --- 非空检查 (保持你原有的逻辑) ---
  if (!config.bands || !config.date1 || !config.date2) {
    ElMessage.error('Please complete selection');
    return;
  }

  // 2. 转换日期格式为 GeoServer 图层名规则 (例如: 2023-01 -> 23_1_NDVI)
  const getLayerNameByDate = (dateStr) => {
    const [year, month] = dateStr.split('-');
    const yearShort = year.substring(2); // "2023" -> "23"
    const monthInt = parseInt(month);    // "01" -> "1"
    return `${yearShort}_${monthInt}_NDVI`;
  };

  const layerNameLeft = getLayerNameByDate(config.date1);
  const layerNameRight = getLayerNameByDate(config.date2);

  // 3. 更新左侧地图图层
  if (currentLeftLayer) mapLeft.removeLayer(currentLeftLayer); // 移除旧的
  currentLeftLayer = createTestLayer(layerNameLeft);          // 创建新的
  mapLeft.addLayer(currentLeftLayer);

  // 4. 更新右侧地图图层
  if (currentRightLayer) mapRight.removeLayer(currentRightLayer);
  currentRightLayer = createTestLayer(layerNameRight);
  mapRight.addLayer(currentRightLayer);

  // 5. 调用后端接口进行数据分析 (保持你原有的 axios 逻辑)
  try {
    const res = await diffNDVI(config.date1, config.date2);
    if (res.status === 200) {
      ElMessage.success('Analysis report generated');
    }
  } catch (error) {
    console.error('API Error:', error);
  }
};

const resetForm = () => {
  config.bands = ''
  config.date1 = ''
  config.date2 = ''
  if (currentLeftLayer) {
    mapLeft.removeLayer(currentLeftLayer);
  }
  if (currentRightLayer) {
    mapRight.removeLayer(currentRightLayer);
  }
};

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
  flex: 2;
  background: #235fa7;
  border: none;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.reset-btn {
  flex: 1;
  background: #235fa7;
  border: none;
  font-size: 12px;
  padding: 4px 8px;
}

.coordinate {
  height: 20px;
  width: 180px;
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 1px;
  border-radius: 5px;
}
</style>