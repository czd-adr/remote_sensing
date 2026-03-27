<template>

<div class="container">
      <el-button class="Draw" @click="toggleDraw">draw</el-button>
   <div
    style="height: 750px; box-shadow: var(--el-border-color-light) 0px 0px 10px"
  >
        <div class="demo-panel"> 

          <div id="map" v-if="showMap" ></div>
          <div class="coordinate">{{mousePosition}}</div>
          <div class="ml">
              <el-select v-model="MLvalue" placeholder="machine learning algorithm" style="width: 240px" @change="changeBox">
                <el-option
                  v-for="item in MLData"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
            </div>
  </div>
  <div class="right-panel" v-show="rightPanelVisible">
    <div class="closeIconDIV"  v-show="isShowClose"><el-icon color="#409efc" v-show="isShowClose" size="20px" @click="closePanel"><CloseBold /></el-icon></div>
      <div class="table">
            <el-table :data="tableData" border style="width: 320px"  class="custom-table" :row-style="rowState">
                <el-table-column prop="algorithm" label="算法" width="60px" align="center" header-align="center"  />     
                <el-table-column prop="grassType" label="植被类型" width="60px" align="center" header-align="center" />
                <el-table-column prop="coordinate" label="坐标" width="60px" align="center" header-align="center" />
                <el-table-column prop="accuracy" label="分类精度" width="70px" align="center" header-align="center" />
                  <el-table-column prop="kappa" label="kappa" width="70px" align="center" header-align="center" />
              </el-table>
        </div>
     <div class="pie" id="myPieChart"></div>
     <div class="bar" id="bar" v-show="isShowBar"></div>
  </div>
    <div class="openIconDIV"  v-show="isShowOpen"><el-icon color="#409efc" class="openIcon"   size="20px" @click="openPanel"><DArrowLeft /></el-icon></div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import * as echarts from "echarts";
import Map from 'ol/Map'
import View from 'ol/View'

// 图层相关
import TileLayer from 'ol/layer/Tile'
import ImageLayer from 'ol/layer/Image'
import VectorLayer from 'ol/layer/Vector'

// 数据源
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import Static from 'ol/source/ImageStatic'
import ImageWMS from 'ol/source/ImageWMS'
import TileWMS from 'ol/source/TileWMS'
import VectorSource from 'ol/source/Vector'
import Draw from 'ol/interaction/Draw.js';
// 格式与样式
import GeoJSON from 'ol/format/GeoJSON'
import { toLonLat } from 'ol/proj'
import { Style, Fill, Stroke,Circle } from 'ol/style'
// 控件
import { defaults as defaultControls } from 'ol/control'
import { Delete, Edit, Search, Share, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
// 可选 GeoTIFF（如果你真的使用了）
import GeoTIFF from 'geotiff'  // ✅ 仅在你加载本地 .tif 时才需要


//组件导入
import Aside from '../components/Aside.vue';
// import TileLayer from 'ol/layer/Tile';
// import OSM from 'ol/source/OSM';
//跨域
import axios from 'axios'
// import func from '../../vue-temp/vue-editor-bridge';
// import { apiGet } from '@/utils/request'
const $httpUrl = ref('http://localhost:8099');// 假设这是你的基础URL
// export const apiGet = (url, params = {}) => {
//   return axios.get(`${$httpUrl}${url}`, { params })
// }

// export const apiPost = (url, data = {}) => {
//   return axios.post(`${$httpUrl}${url}`, data)
// }
// setInterval(() => {
//   const center = map.getView().getCenter();
//   if (center) {
 
//     console.log('当前地图中心点：', center);
//     console.log('当前缩放级别',map.getView().getZoom());
    
//   }
// }, 5000); // 每 2 秒打印一次
let algorithm = ref('') // 默认选择的算法
let index = ref() // 默认选择的索引
let grassType = ref('') // 默认选择的植被类型
let coordinate = ref([]) // 默认选择的坐标
let accuracy = ref() // 默认选择的精度
let kappa = ref() // 默认选择的Kappa值
let map;

let rightPanelVisible = ref(false) // 控制右侧面板显示隐藏
let DEMOpacity = ref(0) // DEM 图层的透明度
let isDrwaActive = ref(); // 用于存储多边形绘制的监听器
const MLvalue = ref('') // 滑块的初始值
const tableData = ref([])
let isShowClose = ref(true) // 控制关闭按钮显示隐藏
let isShowOpen = ref(false) // 控制打开按钮显示隐藏
let isShowBar = ref(false) // 控制柱状图显示隐藏
let LandCover = ref
const rowState = (arg) => {
  return {
    backgroundColor: '#65cef7',
    color: '#fff' 
  }
}

const MLData = [
  {
    value: 'Stacking_JM',
    label: 'Stacking_JM',
  },
  {
    value: 'RF_JM',
    label: 'RF_JM',
  },
   {
    value: 'SVM',
    label: 'SVM',
  },
  {
    value: 'XGBoost_JM',
    label: 'XGBoost_JM',
  },
  {
    value: 'Sentinel-2',
    label: 'Sentinel-2影像',
  }
]
const checkboxGroup4 = ref(['layer'])
const cities = ['layer', 'dem']
const source1 = new XYZ({     //卫星图层
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
})
const source2 = new XYZ({     //城市矢量图层
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'
})
const source3 = new XYZ({     //卫星图层
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}'
})
const clickValue = ref([])

const sampleTypes = [
  {
    value: 'hhmc',
    label: '互花米草',
  },
  {
    value: 'jp',
    label: '碱蓬',
  },
  {
    value: 'lw',
    label: '芦苇',
  },
  {
    value: 'water',
    label: '水体',
  },
  {
    value: 'other',
    label: '其他',
  },
]
const drawSource = new VectorSource();
const view = new View({
  center: [119.281,34.77934],//
  zoom: 12.4,
  projection: 'EPSG:4326'
})
const center = [114.31, 30.52]
// const map = new Map({
//   target: 'map', // 地图实例挂载id=map的容器
//   view: view,
//   layers: [] // 初始时不添加任何图层
// })
const mousePosition = ref('')
const gaodeLayer = new TileLayer({
  source: source2 // 使用卫星图层
})
const satelliteLayer = new TileLayer({
  source: source1 // 使用卫星图层
})
const marketerLayer = new TileLayer({
  source: source3 // 使用卫星图层
})
 const ditu = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:628yangshi',
      'TILED': true
    },
    serverType: 'geoserver',
     
  })
});
const ditu2 = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:628yangshi',
      'TILED': true
    },
    serverType: 'geoserver',
 
  })
});
const hhmcfill = new Fill({
   color: 'rgba(0,255,255,0.4)',
 });
 const hhmcstroke = new Stroke({
   color: '#3399CC',
   width: 1.25,
 });
 const hhmcstyles = [
   new Style({
     image: new Circle({
       fill: hhmcfill,
       stroke: hhmcstroke,
       radius: 5,
     }),
     fill: hhmcfill,
     stroke: hhmcstroke,
   }),
 ];

const hhmcLayer = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:hhmc_points',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  style: hhmcstyles, // 使用样式
  zIndex: 10001  // 确保叠加在底图之上
});
let pieData = ref([])
let xgData =[{ value: 30554220.497, name: '互花米草' },
            { value: 33293387.791, name: '芦苇' },
            { value: 27720947.472, name: '碱蓬' },
            { value: 45295686.975, name: '水体' },
            { value: 48724259.662, name: '其他' }]
let rfData =[{ value: 21769666.016, name: '互花米草' },
            { value: 27720947.472, name: '芦苇' },
            { value: 23804599.643, name: '碱蓬' },
            { value: 43270826.204, name: '水体' },
            { value: 60391217.555, name: '其他' }]
let stkData =[{ value: 27309129.808, name: '互花米草' },
            { value: 24244824.165, name: '芦苇' },
            { value: 35968123.212, name: '碱蓬' },
            { value: 41496192.490, name: '水体' },
            { value: 55996690.152, name: '其他' }]
const waterLayer = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:river_points',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  style: hhmcstyles, // 使用样式
  zIndex: 10002  // 确保叠加在底图之上
});
const jpLayer = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:jp_points',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 10002  // 确保叠加在底图之上
});
const lwLayer = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:lw_points',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 10002  // 确保叠加在底图之上
});
const otherLayer = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:other_points',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 10002  // 确保叠加在底图之上
});


const VectorLayer1 = new VectorLayer({
  source: new VectorSource({
    url: 'https://geo.datav.aliyun.com/areas_v3/bound/320000.json', // 替换为你的 GeoJSON URL
    format: new GeoJSON()
  }),
  style: new Style({
    fill: new Fill({
      color: 'rgba(221, 255, 0, 0.6)' // 设置填充颜色
    }),
    stroke: new Stroke({
      color: 'rgba(255, 0, 0, 1)', // 设置边框颜色
      width: 1 // 设置边框宽度
    }),
    opacity: 0.8 // 设置透明度
  })
})
  const Stacking_JM = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:Stacking',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 20  // 确保叠加在底图之上
});
const RF_JM = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:RF_image',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 20  // 确保叠加在底图之上
});
const SVM_JM = new TileLayer({
 source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:svm',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 20  // 确保叠加在底图之上
}); 
const XGBoost_JM = new TileLayer({
 source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:Xg',
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,  // <-- 加上这句
    
    },
    serverType: 'geoserver'
  }),
  zIndex: 20  // 确保叠加在底图之上
}); 
const VectorLayer2 = new VectorLayer({
  source: new VectorSource({
    url: 'https://geo.datav.aliyun.com/areas_v3/bound/320707.json', // 替换为你的 GeoJSON URL
    format: new GeoJSON()
  }),
   style: new Style({
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.6)' // 设置填充颜色
    }),
    stroke: new Stroke({
      color: 'rgba(213, 0, 0, 1)', // 设置边框颜色
      width: 2 // 设置边框宽度
    }),
    opacity: 0.8 // 设置透明度
  })
})
const extent= [center[0]-1,center[1]-1, center[0]+1, center[1]+1] // 定义图片的范围
const staticImaggeLayer = new ImageLayer({
  source: new Static({
    url: '/png/test.png', // 替换为你的图片 URL
    imageExtent: extent // 替换为你的图片范围
  })
})
 // 添加静态图片图层
const showMap = ref(true) // 控制地图显示的变量
onMounted(() => {

    initMap()
    setupGetFeatureInfo(map, Stacking_JM,RF_JM,SVM_JM,XGBoost_JM); // 设置 GetFeatureInfo 事件监听
    loadPie() // 加载饼图
    // loadBar() // 加载柱状图
    // controlLayer()
})
const drawInteraction = new Draw({
  source: drawSource,
  type: 'Polygon'  // 支持 'Point', 'LineString', 'Polygon', 'Circle'
});
const modelMap = {
  'Stacking_JM': { data: stkData, api: '/api/stacking/area' },
  'RF_JM':       { data: rfData,   api: '/api/rf/area' },
  'XGBoost_JM':  { data: xgData,   api: '/api/xgboost/area' }
}
const getAllArea = (type) => {
  return axios.get($httpUrl.value + '/RF/Area', { params: { type } })
    .then(res => {
      const result = res.data;
      if (result.code === 200) {
        Area.value = result.data;
        console.log('获取面积成功:', Area.value);
        return {
          success: true,
          data: result.data,
          message: result.msg,
        };
      } else {
        return {
          success: false,
          message: result.msg || '获取面积失败'
        };
      }
    })
    .catch(error => {
      console.error('请求失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '网络错误，请稍后重试'
      };
    });
};
function closePanel() {
  rightPanelVisible.value = false;
  isShowClose.value = false;
  isShowOpen.value = true;
}
function openPanel() {
  rightPanelVisible.value = true;
  isShowClose.value = true;
  isShowOpen.value = false;
}
watch(isDrwaActive, (newVal) => {
if(newVal) {
    // 如果开启绘制，添加绘制交互
    map.addInteraction(drawInteraction);
  } else {
    // 如果关闭绘制，移除绘制交互
    map.removeInteraction(drawInteraction);
  }

})
function getRfAllArea(){
   return axios.get($httpUrl.value + '/RF/getRfAllArea')
    .then(res => {
      const result = res.data;
      if (result.code === 200) {
        pieData.value = result.data;
        return {
          success: true,
          data: result.data,
          message: result.msg,
        };
      } else {
        return {
          success: false,
          message: result.msg || '获取面积失败'
        };
      }
    })
    .catch(error => {
      console.error('请求失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '网络错误，请稍后重试'
      };
    });
}
function getStkArea(){
   return axios.get($httpUrl.value + '/RF/getStkAllArea')
    .then(res => {
      const result = res.data;
      if (result.code === 200) {
        pieData.value = result.data;
        return {
          success: true,
          data: result.data,
          message: result.msg,
        };
      } else {
        return {
          success: false,
          message: result.msg || '获取面积失败'
        };
      }
    })
    .catch(error => {
      console.error('请求失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '网络错误，请稍后重试'
      };
    });
}
function getXgArea(){
   return axios.get($httpUrl.value + '/RF/getXgAllArea')
    .then(res => {
      const result = res.data;
      if (result.code === 200) {
        pieData.value = result.data;
        return {
          success: true,
          data: result.data,
          message: result.msg,
        };
      } else {
        return {
          success: false,
          message: result.msg || '获取面积失败'
        };
      }
    })
    .catch(error => {
      console.error('请求失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '网络错误，请稍后重试'
      };
    });
}
function loadBar(areaArray) {
  const chartDom = document.getElementById('bar');
  if (!chartDom) return;

  echarts.dispose(chartDom);
  const myChart = echarts.init(chartDom);

  const colors = ['#EAF03B', '#ff423b', '#83d726', '#66edff', '#cdceb7'];
  const labels = ['互花米草', '碱蓬', '芦苇', '水体', '其他'];

  const data = areaArray.map((value, index) => ({
    value,
    itemStyle: {
      color: colors[index]
    }
  }));

  const option = {
      tooltip: {
    trigger: 'item', // 或者 'axis'，视需求而定
    formatter: '{b}: {c}' // {b} 是类目名，{c} 是数值
  },
     grid: {
    left: '9px',     // 🔍 给 Y 轴留足空间（默认是 '10%' 可能太小）
    right: '20px',    // 🔍 避免右侧空太多
    top: '40px',
    bottom: '40px',
    containLabel: true  // ✅ 自动考虑 axisLabel 大小
  },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        interval: 0,
        rotate: 0,
        fontSize: 14
      }
    },
    yAxis: {
  type: 'value',
  axisLabel: {
    formatter: function (value) {
      // 自动格式化大数，比如显示为 "2k"、"5M"
      if (value >= 1e6) return (value / 1e6) + 'M';
      if (value >= 1e3) return (value / 1e3) + 'k';
      return value;
    },
    fontSize: 14,
    margin: 10  // 控制与坐标轴的距离，避免贴边
  },
  name: '面积 / m²',
  nameTextStyle: {
    fontSize: 14,
    padding: [0, 0, 0, 10]  // [top, right, bottom, left]
  }
},
    series: [
      {
        type: 'bar',
        data: data,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(180, 180, 180, 0.2)'
        }
      }
    ]
  };

  myChart.setOption(option);
}

function loadPie() {
  const chartDom = document.getElementById('myPieChart');
  if (!chartDom) return;

  echarts.dispose(chartDom);
  const myChart = echarts.init(chartDom);

  const option = {
    title: {
      text: '地物分类面积分布',
      subtext: '单位：m²',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'right'
    },
    series: [
      {
        name: '地物类型',
        type: 'pie',
        radius: '50%',
        data: [], // 👈 初始为空，待后端数据到达后填充
         labelLine: {
        show: false  // 👈 关闭引导线
      },
      label: {
        show:false // 标签显示在扇形内部
},
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  const model = MLvalue.value;

  // 选择不同的模型，获取对应的数据
  if (model.includes('Stacking_JM')) {
    getStkArea().then(res => {
      if (res.success && res.data) {
      // ✅ 将对象转为数组格式 [{name: '1', value: xxx}, ...]
      const dataArray = Object.entries(res.data).map(([key, value]) => ({
        name: key,
        value: value
      }));

      option.series[0].data = dataArray;

      console.log("转换后的饼图数据:", dataArray); // ✅ 看这个是否正常

      myChart.setOption(option); // ✅ 渲染饼图
    }
    });
  } else if (model.includes('RF_JM')) {
   getRfAllArea().then(res => {
    if (res.success && res.data) {
      // ✅ 将对象转为数组格式 [{name: '1', value: xxx}, ...]
      const dataArray = Object.entries(res.data).map(([key, value]) => ({
        name: key,
        value: value
      }));

      option.series[0].data = dataArray;

      console.log("转换后的饼图数据:", dataArray); // ✅ 看这个是否正常

      myChart.setOption(option); // ✅ 渲染饼图
    }
  });
  } else if (model.includes('XGBoost_JM')) {
    getXgArea().then(res => {
      if (res.success && res.data) {
      // ✅ 将对象转为数组格式 [{name: '1', value: xxx}, ...]
      const dataArray = Object.entries(res.data).map(([key, value]) => ({
        name: key,
        value: value
      }));

      option.series[0].data = dataArray;

      console.log("转换后的饼图数据:", dataArray); // ✅ 看这个是否正常

      myChart.setOption(option); // ✅ 渲染饼图
    }
    });
  } else {
    pieData.value = [];
  }
}
function toggleDraw() {
  isDrwaActive.value = !isDrwaActive.value//开关Inspector功能
}
function changeBox(){
    rightPanelVisible.value = true // 显示右侧面板
    map.getView().setCenter([119.2827448, 34.7742104]);
    map.getView().setZoom(13.10); // 例如设置为10级
    console.log(MLvalue.value);
    const layers = map.getLayers().getArray();
  if (MLvalue.value.includes('Stacking_JM')) {
    if (!layers.includes(Stacking_JM)) {
      map.addLayer(Stacking_JM); // 添加城市矢量图层
      accuracy.value = 94.39
      kappa.value = 88.35
      loadPie() // 重新加载饼图
    }
  } else {
    if (layers.includes(Stacking_JM)) {
      map.removeLayer(Stacking_JM); // 移除城市矢量图层
    }
  }

  // 控制 dem 图层
  if (MLvalue.value.includes('RF_JM')) {
      map.addLayer(RF_JM); // 添加 DEM 图层
      accuracy.value = 87.39
      kappa.value = 79
        loadPie() // 重新加载饼图
     if (!layers.includes(RF_JM)) {
   }
  } else {
    if (layers.includes(RF_JM)) {
      map.removeLayer(RF_JM); // 移除 DEM 图层
    }
  }

   if (MLvalue.value.includes('SVM')) {
      map.addLayer(SVM_JM); // 添加 DEM 图层
      accuracy.value = 72.73
      kappa.value = 59.58
     if (!layers.includes(SVM_JM)) {
   }
  } else {
    if (layers.includes(SVM_JM)) {
      map.removeLayer(SVM_JM); // 移除 DEM 图层
    }
  }
  if (MLvalue.value.includes('XGBoost_JM')) {
      map.addLayer(XGBoost_JM); // 添加 DEM 图层
      accuracy.value = 90.00
      kappa.value = 81.57
        loadPie() // 重新加载饼图
     if (!layers.includes(XGBoost_JM)) {
   }
  } else {
    if (layers.includes(XGBoost_JM)) {
      map.removeLayer(XGBoost_JM); // 移除 DEM 图层
    }
  }

   if (MLvalue.value.includes('Sentinel-2')) {
      if (layers.includes(Stacking_JM)) {
      map.removeLayer(Stacking_JM); // 移除城市矢量图层
    }
     if (layers.includes(RF_JM)) {
      map.removeLayer(RF_JM); // 移除城市矢量图层
    }
     if (layers.includes(SVM_JM)) {
      map.removeLayer(SVM_JM); // 移除城市矢量图层
    }
     if (layers.includes(XGBoost_JM)) {
      map.removeLayer(XGBoost_JM); // 移除城市矢量图层
    }
      accuracy.value = null
      kappa.value = null
    

  rightPanelVisible.value = false
  isShowClose.value = false
  isShowOpen.value = false
   }
 
}
drawInteraction.on('drawend', function (evt) {
  isDrwaActive.value = false; // 关闭绘制功能
  const feature = evt.feature;
  const geometry = feature.getGeometry();
  console.log(geometry);
  
  console.log('绘制完成的多边形:', geometry.getCoordinates());
    map.removeInteraction(drawInteraction);

  // 你的分析逻辑放这里，比如获取 WKT、GeoJSON，发送给后端或本地分析
   const olFeature = new Feature({ geometry: geometry });
  // console.log("Feature"+olFeature);
  
    const featureGeoJSON = new GeoJSON().writeFeatureObject(olFeature);
// console.log(featureGeoJSON);

    // 2. 转成字符串（后端接收 String 类型）
    const geoJSONString = JSON.stringify(featureGeoJSON.geometry);
  // console.log(geoJSONString);
  
    draw(geoJSONString)
});
const draw = (geoJSONString) => {
  console.log("2313123314");
  let param_Al={}
    if(MLvalue.value.includes('Stacking_JM')){
      param_Al='stk_aug'
      }
      else if(MLvalue.value.includes('RF_JM')){
        param_Al='rf_aug'
      }
      else if(MLvalue.value.includes('XGBoost_JM')){
        param_Al='xg_aug'
      }else if(MLvalue.value.includes('SVM')){
        param_Al='svm_aug'
      }
    return axios.post(`${$httpUrl.value}/LC/areaStats?algorithm=${param_Al}`, geoJSONString, {
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      const areaArray = [0, 0, 0, 0, 0];
      res.data.forEach(item => {
        const index = item.index;
        const area = item.area;
        if (index >= 1 && index <= 5) {
          areaArray[index - 1] = area;
        }
      });
      console.log(areaArray);  
      isShowBar.value = true
      loadBar(areaArray) 
    })
    .catch(error => {
        console.error('请求失败:', error);
        return { success: false, message: '网络错误' };
    })
     .finally(() => {
     
  })
};
function setupGetFeatureInfo(map, wmsLayer1, wmsLayer2,wmsLayer3,wmsLayer4) {
  
  map.on('click', function (evt) {
    if(isDrwaActive.value){
    return; // 如果绘制功能开启，直接返回，不设置点击事件
  }
    const viewResolution = map.getView().getResolution(); // ✅ 注意这里是 map.getView()
    console.log('坐标', evt.coordinate);
    coordinate.value=evt.coordinate; // 获取当前点击的坐标
    const url1 = wmsLayer1.getSource().getFeatureInfoUrl(
      evt.coordinate,
      viewResolution,
      'EPSG:4326', // ⚠️ 一定确保和你的地图坐标系一致
      {
        INFO_FORMAT: 'application/json',
        QUERY_LAYERS: 'test:Stacking' // 替换为你在 GeoServer 中的图层名称
      }
    );
    const url2 = wmsLayer2.getSource().getFeatureInfoUrl(
      evt.coordinate,
      viewResolution,
      'EPSG:4326', // ⚠️ 一定确保和你的地图坐标系一致
      {
        INFO_FORMAT: 'application/json',
        QUERY_LAYERS: 'test:RF_image' // 替换为你在 GeoServer 中的图层名称
      }
    );
    const url3 = wmsLayer3.getSource().getFeatureInfoUrl(
      evt.coordinate,
      viewResolution,
      'EPSG:4326', // ⚠️ 一定确保和你的地图坐标系一致
      {
        INFO_FORMAT: 'application/json',
        QUERY_LAYERS: 'test:svm' // 替换为你在 GeoServer 中的图层名称
      }
    );
    const url4 = wmsLayer4.getSource().getFeatureInfoUrl(
      evt.coordinate,
      viewResolution,
      'EPSG:4326', // ⚠️ 一定确保和你的地图坐标系一致
      {
        INFO_FORMAT: 'application/json',
        QUERY_LAYERS: 'test:Xg' // 替换为你在 GeoServer 中的图层名称
      }
    );
    let url = null; // 初始化 url 变量
    if(MLvalue.value==='Stacking_JM') {
      console.log('当前选择的算法是：', MLvalue.value);
      url = url1;
      console.log(url);
      
    } else if(MLvalue.value==='RF_JM') {
      console.log('当前选择的算法是：', MLvalue.value);
      url = url2;
      console.log(url);
    } else if(MLvalue.value==='SVM') {
      console.log('当前选择的算法是：', MLvalue.value);
      url = url3;
      console.log(url);
    } else if(MLvalue.value==='XGBoost_JM') {
      console.log('当前选择的算法是：', MLvalue.value);
      url = url4;
      console.log(url);
    }else 
    {
      alert('超出坐标范围！');
      return;
    }
    if (url) {
      fetch(url)
        .then(response => response.json())
        .then(data => {
          console.log('获取到的Feature信息：', data);

          const value = data.features[0]?.properties?.GRAY_INDEX;

          const labelMap = {
            1: '互花米草',
            2: '碱蓬',
            3: '芦苇',
            4: '水体',
            5: '其他'
          };

          if (value !== undefined) {
            // alert(`植被类型：${labelMap[value] || '未知'}`);
            console.log("index"+value);
            console.log("植被类型"+labelMap[value]);
            grassType.value = labelMap[value]; // 更新植被类型
            tableData.value = [{
            algorithm: MLvalue.value,  // 直接用当前算法选中的值
            index: value,
            grassType: labelMap[value],
            coordinate: `${evt.coordinate[0].toFixed(4)}, ${evt.coordinate[1].toFixed(4)}`,
             accuracy: accuracy.value, // 使用响应式变量
             kappa: kappa.value, // 使用响应式变量
                                }]
          } else {
            alert('超出坐标范围！');
          }
        })
        .catch(err => {
          console.error('查询失败', err);
        });
    }
  });
}
function searchSample() {
   const layers=map.getLayers().getArray()
    console.log(value1.value);
    
      if (value1.value.includes('hhmc')) {
    if (!layers.includes(hhmcLayer)) map.addLayer(hhmcLayer);
  } else {
    if (layers.includes(hhmcLayer)) map.removeLayer(hhmcLayer);
  }

  // 控制 river 图层
  if (value1.value.includes('water')) {
    if (!layers.includes(waterLayer)) map.addLayer(waterLayer);
  } else {
    if (layers.includes(waterLayer)) map.removeLayer(waterLayer);
  }

  // 控制 jp 图层
  if (value1.value.includes('jp')) {
    if (!layers.includes(jpLayer)) map.addLayer(jpLayer);
  } else {
    if (layers.includes(jpLayer)) map.removeLayer(jpLayer);
  }

  // 控制 lw 图层
  if (value1.value.includes('lw')) {
    if (!layers.includes(lwLayer)) map.addLayer(lwLayer);
  } else {
    if (layers.includes(lwLayer)) map.removeLayer(lwLayer);
  }

  // 控制 other 图层
  if (value1.value.includes('other')) {
    if (!layers.includes(otherLayer)) map.addLayer(otherLayer);
  } else {
    if (layers.includes(otherLayer)) map.removeLayer(otherLayer);
  }
}
function controlLayer(){
  console.log(checkboxGroup4.value);
  
  if (checkboxGroup4.includes('layer')) {
    map.addLayer(gaodeLayer); // 添加城市矢量图层
  } else {
    map.removeLayer(gaodeLayer); // 移除城市矢量图层
  }
  if (checkboxGroup4.includes('dem')) {
    map.addLayer(dem); // 添加 DEM 图层
  } else {
    map.removeLayer(dem); // 移除 DEM 图层
  }
}

function clearSample(){
  value1.value=[]
}
function initMap(){
     // 设置 GetFeatureInfo 事件监听
console.log('initMap called');
   map=new Map({
    target: 'map',//地图实例挂载id=map的容器
    view: view,
    layers: [
        gaodeLayer,satelliteLayer ]
  }) 

  map.on('click', (event) => {
  const [lon, lat] = event.coordinate; // EPSG:4326 下已经是经纬度
//   alert(`点击坐标：经度：${lon.toFixed(6)}，纬度：${lat.toFixed(6)}`);
});
console.log(checkboxGroup4.value);  
 map.on('pointermove', (event) => {
    const [lon, lat] = event.coordinate
    
    mousePosition.value = `${lon.toFixed(6)},${lat.toFixed(6)}`
    // console.log(mousePosition);
    
  })
  console.log(map);
  // realDT.setZIndex(4); // 设置矢量图层的 z-index
  //  map.addLayer(VectorLayer1)
  //  map.addLayer(VectorLayer2)
  //  map.addLayer(hhmcLayer)
  //  map.addLayer(waterLayer)
  //  map.addLayer(jpLayer)
  //  map.addLayer(lwLayer)
  //  map.addLayer(otherLayer)

   //hhmcLayer.setIndex(10000)
  //  map.addLayer(realDT) // 添加矢量图层
 map.addLayer(ditu) // 添加矢量图层
    // map.addLayer(Stacking_JM)   
    // map.addLayer(RF_JM)
    //console.log(ditu);
   
    // map.addLayer(dem) // 添加矢量图层
 
}
 
watch(showMap, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initMap()
    }, 0) // 等 DOM 渲染完成再执行
  }
})




function toggleMap() {
  showMap.value = !showMap.value
  console.log(showMap.value);
  
}
function changeMapTogaode() {
gaodeLayer.setZIndex(3); // 设置城市矢量图层的 z-index
satelliteLayer.setZIndex(2); // 设置卫星图层的 z-index
marketerLayer.setZIndex(1);
}
function changeMapTomarket() {
gaodeLayer.setZIndex(1); // 设置城市矢量图层的 z-index
satelliteLayer.setZIndex(2); // 设置卫星图层的 z-index
marketerLayer.setZIndex(3);
}
</script>

<style scoped>
#map {
  width: 100vw;
  height: 100vh;
}
.btn {
  position: fixed;
 left: 100px;
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
}
.btn2 {
  position: fixed;
 left: 140px;
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
}
.btn3 {
  position: fixed;
 left: 200px;
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
}
.btn4 {
  position: fixed;
 left: 240px;
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
}
.btn5 {
  position: fixed;
 left: 270px;
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
}
.btn6 {
  position: fixed;
 left: 370px;   
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
}
.btn7 {
  position: fixed;
 left: 450px;   
 top:10px;
  color: black;
    width: 20px;
    height: 20px;
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

.legend {
  position: absolute;
  top: 4px;
  right: 10px;
  color: black;
  width: 200px;
  height: 50px;
}
.item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.demo-panel {
  position: relative; /* 让内部 absolute 元素相对定位 */
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.shape {
  width: 12px;
  height: 12px;
  margin-right: 8px;
  display: inline-block;
  background-color: #f56c6c;
}

/* 圆形 */
.circle {
  border-radius: 50%;
   background-color: #f6f855;
}
.circle2 {
  border-radius: 50%;
   background-color: #efefef;
}
/* 正方形（默认其实就是）*/
.square {
  background-color: #f7f955;
}

/* 三角形 */
.triangle1 {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 14px solid #ef2f01;
  background-color: transparent;
}
.triangle2 {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 14px solid #06e862;
  background-color: transparent;
}

/* 菱形 */
.diamond {
  transform: rotate(45deg);
  background-color: #e6a23c;
}

/* ⭐ 星形（使用 clip-path）*/
.star {
    width: 12;
  height: 12;
  background-color: #42c4f7;   
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
}
.right-panel{
  position: absolute;
  top: 0px;
  right: 0px;
  max-width: 600px;
  background-color: rgba(255, 255, 255, 0.75);
  width: 330px;
  height: 100%;
 box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2); 
}
.slider-demo-block .el-slider {
  margin-top: 5;
  margin-left: 0px;
  /* 确保滑块在地图上方 */
}
.checkList{
   position: absolute;
  top: 10px;
  left: 112px;
  max-width: 600px;
  color: black;
}
.my-checkbox1 .el-checkbox__label {
  color: red;
}
.demo-button-style {
   position: absolute;
  top: 4px;
  left: 40px;
}
.ml {
  position: absolute;
  top: 4px;
  left: 30px;
  max-width: 600px;
  color: black;
  width: 200px;
  height: 50px;
}
.pie {
  position: absolute;
  top: 25px;
  right: 5px;
 width:  330px;
height: 270px;   

}
.table{
  position: absolute;
  bottom: 0px;
  left: 5px;
}
.container {
  position: relative; /* 关键 */
  height: 100%;
  overflow: hidden;
}
.sample_wz{
  margin-left: 10px;
}
.search_btn {
  position: absolute;
  left: 288px;
   top: 0px;
}
.delete_btn{
    position: absolute;
  left: 229px;
   top: 0px;
}
.panel_header {
  display: flex;
    justify-content: center;
  align-items: center;
  position: absolute;
  top: 2px;
  left: 0;
  width: 100%;
  height: 30px;
  background-color: #ededf0;
  border-radius: 5px;
  
}
.test{

  background-color: rgba(145, 62, 62, 0.8);
  margin-bottom: 10px;
  width: 100px;
  height: 40px;
}
.openIcon{
  position: absolute;
  top: 0px;
  right: 0px;
}
.openIconDIV{
  position: absolute;
  top: 0px;
  right: 0px;
  background-color: rgba(247, 244, 244, 0.8);
  width: 22px;
  height: 22px;
}
.closeIconDIV{
  position: absolute;
  top: 0px;
  right: 305px;
  background-color: rgb(255, 255, 255);
  width: 22px;
  height: 22px;
}
.Draw{
  position: absolute;
    left: 2px;
    top: 60px;
    z-index: 1000;
    width: 40px;
    height: 20px;
}
.bar{
  position: absolute;
  right: 0px;
  bottom: 160px;
  background-color: rgba(255, 255, 255, 0.9);
  width: 320px;
  height: 300px;
}
</style>
