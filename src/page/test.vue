<template>
  <div class="container">
    <div
      v-loading="loading"
      v-show="isShowLoading"
      element-loading-text="加载中..."
      class="page-wrapper"
    ></div>
    <div
      v-loading="loading"
      v-show="isShowNDVILoading"
      element-loading-text="加载中..."
      class="NDVI-page-wrapper"
    ></div>
    <div class="cascader">
      <el-cascader :options="options" clearable v-model="selectedValue" />
    </div>
    <div id="ndviChart" v-show="isShowNDVI"></div>
    <div class="chart" id="chart" v-show="showChart"></div>
    <el-button class="Inspector" @click="toggleInspector">Inspector</el-button>
    <el-button class="Draw" @click="toggleDraw">draw</el-button>
    <el-button class="clearChart" @click="clear">clearDraw</el-button>
    <div id="map" v-if="showMap"></div>
    <div class="coordinate">{{ mousePosition }}</div>
    <div class="slider-dem-block">
      <el-slider
        show-input
        opacity="0"
        v-model="DEMOpacity"
        vertical
        :show-tooltip="false"
        :step="0.1"
        :min="0"
        :max="1"
        :height="'100px'"
        :width="'20px'"
        @change="changeOpacity"
      />
      <div class="demTag">DEM opacity</div>
    </div>

    <div class="slider-VV-block">
      <el-slider
        show-input
        opacity="0"
        v-model="vvOpacity"
        vertical
        :show-tooltip="false"
        :step="0.1"
        :min="0"
        :max="1"
        :height="'100px'"
        :width="'20px'"
        @change="changeOpacity2"
      />
      <div class="VVTag">VV opacity</div>
    </div>

    <div class="slider-VH-block">
      <el-slider
        show-input
        opacity="0"
        v-model="vhOpacity"
        vertical
        :show-tooltip="false"
        :step="0.1"
        :min="0"
        :max="1"
        :height="'100px'"
        :width="'20px'"
        @change="changeOpacity3"
      />
      <div class="VHTag">VH opacity</div>
    </div>

    <div class="slider-NDVI-block">
      <el-slider
        show-input
        opacity="0"
        v-model="ndviOpacity"
        vertical
        :show-tooltip="false"
        :step="0.1"
        :min="0"
        :max="1"
        :height="'100px'"
        :width="'20px'"
        @change="changeOpacity4"
      />
      <div class="NDVITag">NDVI opacity</div>
    </div>
    <!-- <div class="S1data">
    <div class="flex flex-wrap gap-4 items-center">
    <el-select v-model="S1vaule" placeholder="Sentinel-1 GRD" style="width: 140px ">
      <el-option
        v-for="item in S1Data"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
  </div>
  </div> -->
    <div class="demo-button-style">
      <el-checkbox-group
        v-model="checkboxGroup4"
        size="small"
        @change="changeBox"
      >
        <el-checkbox-button v-for="x in cities" :key="x" :label="x">
          {{ x }}
        </el-checkbox-button>
      </el-checkbox-group>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import * as echarts from "echarts";
import Map from 'ol/Map'
import View from 'ol/View'
import { Feature } from 'ol';
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

// 格式与样式
import GeoJSON from 'ol/format/GeoJSON'
import { toLonLat } from 'ol/proj'
import { Style, Fill, Stroke, Circle } from 'ol/style'
import Draw from 'ol/interaction/Draw.js';
// 控件
import { defaults as defaultControls } from 'ol/control'
import { Delete, Edit, Search, Share, Upload } from '@element-plus/icons-vue'
// 可选 GeoTIFF（如果你真的使用了）
import GeoTIFF from 'geotiff'  // ✅ 仅在你加载本地 .tif 时才需要

import { ElNotification } from 'element-plus'
import { ElMessage } from 'element-plus'
//组件导入
import Aside from '../components/Aside.vue';

//跨域
import axios from 'axios'
const $httpUrl = ref('http://localhost:8099'); // 假设这是你的基础URL
let map;
let selectedValue = ref([]);
let DEMOpacity = ref(1) // DEM 图层的透明度
let vvOpacity = ref(1) // VV 图层的透明度
let vhOpacity = ref(1) // VH 图层的透明度
let ndviOpacity = ref(1) // NDVI 图层的透明度
let isDrwaActive = ref(); // 用于存储多边形绘制的监听器
let ndviValue = ref(null) // NDVI 的初始值
let lswiValue = ref(null)
let ndwiValue = ref(null) // NDWI 的初始值
let B2Value = ref(null)
let B3Value = ref(null)
let B4Value = ref(null)
let isShowNDVILoading = ref(false) // 控制 NDVI 图表加载动画的变量
let monthNDVIs = ref() // 月份 NDVI 数据
let isShowLoading = ref(false) // 控制加载动画的变量
let isShowNDVI = ref(false) // 控制 NDVI 图表加载动画的变量s
let months = ref([]) // ["Jul", "Oct", "Feb", ...]
let monthsValues = ref([])
const loading = ref(true)
const showChart = ref(false) // 控制图表显示的变量
const drawSource = new VectorSource();
const drawLayer = new VectorLayer({
  source: drawSource,
  style: new Style({
    stroke: new Stroke({ color: 'red', width: 2 }),
    fill: new Fill({ color: 'rgba(255,0,0,0.2)' })
  })
});
const drawInteraction = new Draw({
  source: drawSource,
  type: 'Polygon'  // 支持 'Point', 'LineString', 'Polygon', 'Circle'
});
const getMean = () => {
  ElMessage({
    message: '数据获取成功',
    type: 'success',
  })
}
const value = ref(0) // 滑块的初始值
const S1vaule = ref('') // Sentinel-1 GRD 的初始值
const S1Data = [
  {
    value: 'vvMean',
    label: 'vvMean',
  },
  {
    value: 'vhMean',
    label: 'vhMean',
  }
]
const checkboxGroup4 = ref(['Sentinel-2'])
const cities = ['Sentinel-2', 'dem', 'VV', 'VH', 'NDVI']
const source1 = new XYZ({     //卫星图层
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
})
const source2 = new XYZ({     //城市矢量图层
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'
})
const source3 = new XYZ({     //卫星图层
  url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}'
})
const value1 = ref([])
const isInspectorActive = ref(false)
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
const view = new View({
  center: [119.2834, 34.7506],//119.271564，纬度：34.752339  研究区域中心
  zoom: 12.2,
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
const dem = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:DEM',
      'TILED': true,
      // 'FORMAT': 'image/png',// 设置图像格式为 PNG,
      // 'TRANSPARENT': true // 设置透明背景
    },
    serverType: 'geoserver',

  })
});
let Area = ref()
const vh = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:vhMean',
      'TILED': true,
      'SRS': 'EPSG:4326',
      'FORMAT': 'image/png',
      'TRANSPARENT': true,
      // 'FORMAT': 'image/png',// 设置图像格式为 PNG,
      // 'TRANSPARENT': true // 设置透明背景
    },
    serverType: 'geoserver',

  })
});
const vv = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:vvMean1',
      'TILED': true,
      'SRS': 'EPSG:4326',
      'FORMAT': 'image/png',
      'TRANSPARENT': true,
      // 'FORMAT': 'image/png',// 设置图像格式为 PNG,
      // 'TRANSPARENT': true // 设置透明背景
    },
    serverType: 'geoserver',

  })
});
const ndvi = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:23NDVI_mean',
      'TILED': true,
      'SRS': 'EPSG:4326',
      'FORMAT': 'image/png',
      'TRANSPARENT': true,
      // 'FORMAT': 'image/png',// 设置图像格式为 PNG,
      // 'TRANSPARENT': true // 设置透明背景
    },
    serverType: 'geoserver',

  })
});
const ndwi = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:23_NDWI_mean',
      'TILED': true,
      'SRS': 'EPSG:4326',
      'FORMAT': 'image/png',
      'TRANSPARENT': true,
      // 'FORMAT': 'image/png',// 设置图像格式为 PNG,
      // 'TRANSPARENT': true // 设置透明背景
    },
    serverType: 'geoserver',

  })
});
const lswi = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/test/wms',
    params: {
      'LAYERS': 'test:LSWI_mean',
      'TILED': true,
      'SRS': 'EPSG:4326',
      'FORMAT': 'image/png',
      'TRANSPARENT': true,
      // 'FORMAT': 'image/png',// 设置图像格式为 PNG,
      // 'TRANSPARENT': true // 设置透明背景
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
const extent = [center[0] - 1, center[1] - 1, center[0] + 1, center[1] + 1] // 定义图片的范围
const staticImaggeLayer = new ImageLayer({
  source: new Static({
    url: '/png/test.png', // 替换为你的图片 URL
    imageExtent: extent // 替换为你的图片范围
  })
})
// 添加静态图片图层
const showMap = ref(true) // 控制地图显示的变量
onMounted(() => {
  // console.log(axios);

  initMap()
  loadChart()
  getArea(1)
  loadNDVIchart()
  // controlLayer()
})
let clickHandler = null;  // 保存监听器引用
watch(isDrwaActive, (newVal) => {
  if (newVal) {
    // 如果开启绘制，添加绘制交互
    map.addInteraction(drawInteraction);
  } else {
    // 如果关闭绘制，移除绘制交互
    map.removeInteraction(drawInteraction);
  }

})

drawInteraction.on('drawend', function (evt) {
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
watch(isInspectorActive, (newVal) => {
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    if (newVal) {
      mapContainer.classList.add('cursor-inspector');

      // 如果已经绑定了，先解绑，避免重复绑定
      if (clickHandler) {
        map.un('click', clickHandler);
      }

      clickHandler = function (evt) {
        const viewResolution = map.getView().getResolution();
        const coordinate = evt.coordinate;

        const layers = [
          { layer: ndwi, name: 'NDWI' },
          { layer: dem, name: 'DEM' },
          { layer: vv, name: 'VV' },
          { layer: vh, name: 'VH' },
          { layer: ndvi, name: 'NDVI' },
          { layer: lswi, name: 'LSWI' }
        ];

        const rgbLayer = { layer: ditu, name: 'RGB' };  // 你的RGB图层

        // 处理单波段 DEM、VV、VH、NDVI
        const fetchSingleBand = layers.map(({ layer, name }) => {
          const url = layer.getSource().getFeatureInfoUrl(
            coordinate,
            viewResolution,
            'EPSG:4326',
            {
              INFO_FORMAT: 'application/json',
              QUERY_LAYERS: layer.getSource().getParams().LAYERS
            }
          );
          return fetch(url)
            .then(res => res.json())
            .then(data => ({
              name,
              value: data.features[0]?.properties?.GRAY_INDEX.toFixed(3) ?? '无数据'
            }))
            .catch(() => ({ name, value: '查询失败' }));
        });

        // 专门处理 RGB 三通道
        const fetchRGB = (() => {
          const url = rgbLayer.layer.getSource().getFeatureInfoUrl(
            coordinate,
            viewResolution,
            'EPSG:4326',
            {
              INFO_FORMAT: 'application/json',
              QUERY_LAYERS: rgbLayer.layer.getSource().getParams().LAYERS
            }
          );
          return fetch(url)
            .then(res => res.json())
            .then(data => {
              const props = data.features[0]?.properties;
              return {
                name: rgbLayer.name,
                value: props
                  ? `R: ${(props.RED_BAND).toFixed(3)}, G: ${(props.GREEN_BAND).toFixed(3)}, B: ${(props.BLUE_BAND).toFixed(3)}`
                  : '无数据'
              };
            })
            .catch(() => ({ name: rgbLayer.name, value: '查询失败' }));
        })();

        // 同步处理所有
        Promise.all([...fetchSingleBand, fetchRGB]).then(results => {
          console.log('坐标：', coordinate.map(c => c.toFixed(4)).join(', '));
          console.table(results);
          open(results, coordinate.map(c => c.toFixed(4)).join(', '));  // ✅ 弹窗展示
          isInspectorActive.value = false;
        });
      };


      map.on('click', clickHandler);
    }
    else {
      mapContainer.classList.remove('cursor-inspector');
      if (clickHandler) {
        map.un('click', clickHandler);  // ✅ 解绑
        clickHandler = null;
      }
    }
  }
});
const open = (results, coordinate) => {
  ElNotification.success({
    title: '查询点信息',
    message: `坐标:${coordinate} <br>
    RGB: ${results[6].value} <br>
    NDVI: ${results[4].value}<br>
    NDWI: ${results[0].value} <br>
    LSWI: ${results[5].value} <br>
    DEM: ${results[1].value} <br>
     VVmean: ${results[2].value} dB <br>
      VHmean: ${results[3].value} dB <br>
      `,

    offset: 100,
    duration: 5000, // 持续时间
    opacity: 0.8, // 透明度
    dangerouslyUseHTMLString: true,
  })
}
const options = [
  {
    value: 2023,
    label: '2023',
    children: [
      {
        value: 1,
        label: '互花米草',
      },
      {
        value: 2,
        label: '碱蓬',
      },
      {
        value: 3,
        label: '芦苇',
      },
    ],
  },
  {
    value: 2022,
    label: '2022',
    children: [
      {
        value: 1,
        label: '互花米草',
      },
      {
        value: 2,
        label: '碱蓬',
      },
      {
        value: 3,
        label: '芦苇',
      },
    ],
  },
]
const getArea = (type) => {
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
const draw = async (geoJSONString) => {
  isShowLoading.value = true;
  try {
    const res = await axios.post($httpUrl.value + '/sample-points/means', geoJSONString, {
      headers: { 'Content-Type': 'application/json' }
    });

    const result = res.data;
    ndviValue.value = result.NDVI;
    lswiValue.value = result.LSWI;
    ndwiValue.value = result.NDWI;
    B2Value.value = result.R;
    B3Value.value = result.G;
    B4Value.value = result.B;
    getMean();
    showChart.value = true;
    console.log('后端返回:', result);

    ElMessage.success('数据获取成功');
    return result;
  } catch (error) {
    console.error('请求失败:', error);
    ElMessage.error('数据获取失败，请稍后重试');
    return { success: false, message: '网络错误' };
  } finally {
    isShowLoading.value = false;
  }
};
function fetchNDVI (year, grass) {
  isShowNDVILoading.value = true;
  return axios.post($httpUrl.value + '/sample-points/monthNDVIs', null, {
    params: {
      year: year,
      grass: grass
    }
  })
    .then(res => {
      console.log('NDVI结果:', res.data);
      monthNDVIs.value = res.data;
      months.value = Object.keys(monthNDVIs.value); // ["Jul", "Oct", "Feb", ...]
      monthsValues.value = Object.values(monthNDVIs.value);
      console.log(monthsValues.value);

      isShowNDVI.value = true; // 显示 NDVI 图表加载动画
      loadNDVIchart(grass, year)
    })
    .catch(error => {
      console.error('获取NDVI失败:', error);
    }).finally(() => {
      isShowNDVILoading.value = false; // 👉 结束加载，隐藏 loading 动画
    });
}

function searchSample () {
  const layers = map.getLayers().getArray()
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
// function controlLayer(){
//   console.log(checkboxGroup4.value);

//   if (checkboxGroup4.includes('layer')) {
//     map.addLayer(gaodeLayer); // 添加城市矢量图层
//   } else {
//     map.removeLayer(gaodeLayer); // 移除城市矢量图层
//   }
//   if (checkboxGroup4.includes('dem')) {
//     map.addLayer(dem); // 添加 DEM 图层
//   } else {
//     map.removeLayer(dem); // 移除 DEM 图层
//   }
// }
function clear () {
  if (isShowLoading.value) {
    isShowLoading.value = false; // 隐藏加载动画
  }
  if (showChart.value) {
    showChart.value = false; // 隐藏图表
  }
  if (isShowNDVI.value) {
    isShowNDVI.value = false; // 隐藏 NDVI 图表加载动画
  }
  if (isShowNDVILoading.value) {
    isShowNDVILoading.value = false; // 隐藏 NDVI 图表加载动画
  }
}
function changeBox () {
  console.log(checkboxGroup4.value);

  // 控制 gaodeLayer 图层
  const layers = map.getLayers().getArray();
  if (checkboxGroup4.value.includes('Sentinel-2')) {
    if (!layers.includes(ditu)) {
      map.addLayer(ditu); // 添加城市矢量图层
    }
  } else {
    if (layers.includes(ditu)) {
      map.removeLayer(ditu); // 移除城市矢量图层
    }
  }

  // 控制 dem 图层
  if (checkboxGroup4.value.includes('dem')) {
    if (!layers.includes(dem)) {
      map.addLayer(dem); // 添加 DEM 图层
    }
  } else {
    if (layers.includes(dem)) {
      map.removeLayer(dem); // 移除 DEM 图层
    }
  }

  if (checkboxGroup4.value.includes('VV')) {
    if (!layers.includes(vv)) {
      map.addLayer(vv); // 添加 DEM 图层
    }
  } else {
    if (layers.includes(vv)) {
      map.removeLayer(vv); // 移除 DEM 图层
    }
  }

  if (checkboxGroup4.value.includes('VH')) {
    if (!layers.includes(vh)) {
      map.addLayer(vh); // 添加 DEM 图层
    }
  } else {
    if (layers.includes(vh)) {
      map.removeLayer(vh); // 移除 DEM 图层
    }
  }

  if (checkboxGroup4.value.includes('NDVI')) {
    if (!layers.includes(ndvi)) {
      map.addLayer(ndvi); // 添加 DEM 图层
    }
  } else {
    if (layers.includes(ndvi)) {
      map.removeLayer(ndvi); // 移除 DEM 图层
    }
  }
}
watch(ndviValue, (newVal) => {
  loadChart(); // NDVI 更新后重新加载图表
});
watch(selectedValue, (newVal) => {
  isShowNDVI.value = false; // 隐藏 NDVI 图表加载动画
  fetchNDVI(newVal[0], newVal[1]);
  console.log(newVal[0], newVal[1]);

});
function loadNDVIchart (grass, year) {
  const ndviChart = echarts.init(document.getElementById('ndviChart'));

  const vegetationMap = {
    1: { name: '互花米草', color: '#66ff66' },
    2: { name: '碱蓬', color: '#ff9966' },
    3: { name: '芦苇', color: '#3399ff' }
  };

  const info = vegetationMap[grass] || { name: '未知植被', color: '#999999' };
  const legendName = `NDVI - ${info.name}`;
  const titleText = `${info.name} NDVI 月度变化 (${year}年)`;


  const option = {
    color: [info.color],
    title: {
      text: titleText,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    grid: {
      right: '20%'
    },
    toolbox: {
      feature: {
        dataView: { show: true, readOnly: false },
        restore: { show: true },
        saveAsImage: { show: true }
      }
    },
    legend: {
      data: [legendName],
      top: '10%'
    },
    xAxis: [
      {
        type: 'category',
        axisTick: { alignWithLabel: true },
        data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'NDVI',
        position: 'left',
        axisLine: { show: true },
        axisLabel: { formatter: '{value}' }
      }
    ],
    series: [
      {
        name: legendName,
        type: 'line',
        yAxisIndex: 0,
        data: monthsValues.value
      }
    ]
  };

  ndviChart.setOption(option);
}
function loadChart () {
  var chartDom = document.getElementById('chart');
  var myChart = echarts.init(chartDom);
  var option;

  option = {
    title: {
      text: '植被指数与波段特征柱状图',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['B2', 'B3', 'B4', 'NDVI', 'NDWI', 'LSWI']
    },
    yAxis: {
      type: 'value',
      min: -0.5,
      max: 0.6
    },
    series: [
      {
        type: 'bar',
        name: '特征值',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          fontSize: 14
        },
        data: [
          { value: B2Value.value, itemStyle: { color: '#F90000' } },
          { value: B3Value.value, itemStyle: { color: '#00FF31' } },
          { value: B4Value.value, itemStyle: { color: '#5470C6' } },
          { value: ndviValue.value, itemStyle: { color: '#73D637' } },
          { value: ndwiValue.value, itemStyle: { color: '#73C0DE' } },
          { value: lswiValue.value, itemStyle: { color: '#96A162' } }
        ]
      }
    ]
  };

  option && myChart.setOption(option);
}
function clearSample () {
  value1.value = []
}
function toggleInspector () {
  isInspectorActive.value = !isInspectorActive.value//开关Inspector功能


}
function toggleDraw () {
  isDrwaActive.value = !isDrwaActive.value//开关Inspector功能
  console.log(isDrwaActive.value);


}
function initMap () {
  console.log('initMap called');
  map = new Map({
    target: 'map',//地图实例挂载id=map的容器
    view: view,
    layers: [
      gaodeLayer, satelliteLayer]
  })
  map.on('click', (event) => {
    const [lon, lat] = event.coordinate; // EPSG:4326 下已经是经纬度
    // alert(`点击坐标：经度：${lon.toFixed(6)}，纬度：${lat.toFixed(6)}`);
  });

  console.log(checkboxGroup4.value);
  map.on('pointermove', (event) => {
    const [lon, lat] = event.coordinate

    mousePosition.value = `${lon.toFixed(6)},${lat.toFixed(6)}`


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
  //  map.addLayer(vh)
  //  map.addLayer(vv)
  vh.setZIndex(5); // 设置 vh 图层的 z-index
  vv.setZIndex(6); // 设置 vv 图层的 z-index
  console.log(vh);
  console.log(vv);


  //  map.addLayer(vh) // 添加vh
  //  vh.setZIndex(11218); // 设置 vh 图层的 z-index
  //hhmcLayer.setIndex(10000)
  //  map.addLayer(realDT) // 添加矢量图层
  map.addLayer(ditu) // 添加矢量图层
  // map.addLayer(ndvi)
  ndvi.setZIndex(5); // 设置 ndvi 图层的 z-index
  //console.log(ditu);
  dem.setOpacity(0) // 设置 DEM 图层的透明度
  dem.setZIndex(4); // 设置 DEM 图层的 z-index
  ditu.setZIndex(3); // 设置静态图片图层的 z-index
  // map.addLayer(dem) // 添加矢量图层

}

function goBJ () {
  // 北京经纬度：[116.38, 39.90]
  view.setCenter([116.38, 39.90]);
}
watch(showMap, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initMap()
    }, 0) // 等 DOM 渲染完成再执行
  }
})

function goBJ2 () {
  // 北京经纬度：[116.38, 39.90]
  view.animate({//平滑过渡
    center: [116.38, 39.90], // 新中心坐标（注意 EPSG 坐标系）
    duration: 1000,           // 动画时长（毫秒）
    zoom: 8 // 可选：设置缩放级别
  })
}
function changeOpacity (val) {
  dem.setOpacity(val) // 设置 DEM 图层的透明度
}
function changeOpacity2 (val) {
  vv.setOpacity(val) // 设置 DEM 图层的透明度
}
function changeOpacity3 (val) {
  vh.setOpacity(val) // 设置 DEM 图层的透明度
}
function changeOpacity4 (val) {
  ndvi.setOpacity(val) // 设置 DEM 图层的透明度
}
function toggleMap () {
  showMap.value = !showMap.value
  console.log(showMap.value);

}
function removeLayer () {
  map.removeLayer(gaodeLayer); // 移除城市矢量图层

}
function changeMapTogaode () {
  gaodeLayer.setZIndex(3); // 设置城市矢量图层的 z-index
  satelliteLayer.setZIndex(2); // 设置卫星图层的 z-index
  marketerLayer.setZIndex(1);
}
function changeMapTomarket () {
  gaodeLayer.setZIndex(1); // 设置城市矢量图层的 z-index
  satelliteLayer.setZIndex(2); // 设置卫星图层的 z-index
  marketerLayer.setZIndex(3);
}
function toUp () {
  const center = view.getCenter(); // 假设 view 是全局变量或提前声明
  const newCenter = [center[0], center[1] + 0.1]; // 创建新的坐标数组
  view.setCenter(newCenter); // 重新设置中心点
  console.log(newCenter);
}

</script>

<style scoped>
#map {
  width: 100vw;
  height: 100vh;
}
.chart {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 400px;
  height: 400px;
  background-color: rgba(255, 255, 255, 0.8); /* 半透明背景 */
  z-index: 12323; /* 确保图表在地图之上 */
}
.container {
  position: relative; /* 关键 */
  height: 100%;
  overflow: hidden;
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

.slider-dem-block {
  position: absolute;
  top: 60px;
  left: -5px;
  max-width: 600px;
  /* z-index: 1001; */
}
.slider-VV-block {
  position: absolute;
  top: 200px;
  left: -5px;
  max-width: 600px;
  /* z-index: 1001; */
}
.slider-VH-block {
  position: absolute;
  top: 340px;
  left: -5px;
  max-width: 600px;
  /* z-index: 1001; */
}
.slider-NDVI-block {
  position: absolute;
  top: 480px;
  left: -5px;
  max-width: 600px;
  /* z-index: 1001; */
}
.S1data {
  position: absolute;
  top: 3px;
  left: 170px;
  max-width: 150px;
  background-color: aliceblue;
  /* z-index: 1001; */
}
.slider-dem-block .el-slider {
  margin-top: 5;
  margin-left: 0px;
  /* 确保滑块在地图上方 */
}
.demTag {
  margin-top: -27px;
  margin-left: 69px;
  color: ghostwhite;
  font-size: 14px;
  width: 100px;
  height: 20px;
}
.VVTag {
  margin-top: -27px;
  margin-left: 69px;
  color: ghostwhite;
  font-size: 14px;
  width: 100px;
  height: 20px;
}
.VHTag {
  margin-top: -27px;
  margin-left: 69px;
  color: ghostwhite;
  font-size: 14px;
  width: 100px;
  height: 20px;
}
.NDVITag {
  margin-top: -27px;
  margin-left: 69px;
  color: ghostwhite;
  font-size: 14px;
  width: 100px;
  height: 20px;
}
.checkList {
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
.sample {
  position: absolute;
  top: 4px;
  left: 200px;
  max-width: 600px;
  color: black;
  width: 200px;
  height: 50px;
}
.sample_wz {
  margin-left: 10px;
}
.search_btn {
  position: absolute;
  left: 288px;
  top: 0px;
}
.delete_btn {
  position: absolute;
  left: 229px;
  top: 0px;
}
.cursor-inspector {
  cursor: crosshair;
}
.Inspector {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 1000;
  width: 60px;
  height: 20px;
  opacity: 0.6;
}
.page-wrapper {
  width: 400px;
  height: 400px;
  position: absolute;
  bottom: 0px;
  right: 0px;
  background-color: rgba(255, 255, 255, 0.8); /* 半透明背景 */
}
.NDVI-page-wrapper {
  width: 600px;
  height: 400px;
  position: absolute;
  bottom: 0px;
  right: 0px;
  background-color: rgba(255, 255, 255, 0.8); /* 半透明背景 */
}
.Draw {
  position: absolute;
  right: 150px;
  top: 10px;
  z-index: 1000;
  width: 60px;
  height: 20px;
  opacity: 0.6;
}
.clearChart {
  position: absolute;
  right: 75px;
  top: 10px;
  z-index: 1000;
  width: 70px;
  height: 20px;
  opacity: 0.6;
}
#ndviChart {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 600px;
  height: 400px;
  background-color: rgba(255, 255, 255, 0.9); /* 半透明背景 */
  z-index: 12323; /* 确保图表在地图之上 */
}
.cascader {
  position: absolute;
  right: 745px;
  top: 4px;
  z-index: 1000;
  width: 200px;
  height: 25px;
}
</style>
