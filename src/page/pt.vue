<template>

<div class="container">

   <div
    style="height: 750px; box-shadow: var(--el-border-color-light) 0px 0px 10px"
  >
    <el-splitter layout="vertical">
      <el-splitter-panel>
        <div class="demo-panel"> <div id="map" v-if="showMap" ></div>
    <div class="coordinate">{{mousePosition}}</div>
  <div class="legend">
  <div class="item"><span class="shape triangle1"></span>互花米草</div>
  <div class="item"><span class="shape triangle2"></span>芦苇</div>
  <div class="item"><span class="shape circle"></span>碱蓬</div>
  <div class="item"><span class="shape star"></span>水体</div>
  <div class="item"><span class="shape circle2"></span>其他</div>
</div>


<div class="ml">
    <el-select v-model="MLvalue" placeholder="machine learning algorithm" style="width: 240px" @change="changeBox">
      <el-option
        v-for="item in MLData"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
  </div></div>
    </el-splitter-panel>

      <el-splitter-panel>
        <div class="demo-panel">

          <div class="panel_header"></div>

        </div>
      </el-splitter-panel>
    </el-splitter>
  </div>


 
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

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

// 格式与样式
import GeoJSON from 'ol/format/GeoJSON'
import { toLonLat } from 'ol/proj'
import { Style, Fill, Stroke,Circle } from 'ol/style'
// 控件
import { defaults as defaultControls } from 'ol/control'
import { Delete, Edit, Search, Share, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 可选 GeoTIFF（如果你真的使用了）
import GeoTIFF from 'geotiff'  // ✅ 仅在你加载本地 .tif 时才需要


//组件导入
import Aside from '../components/Aside.vue';
// import TileLayer from 'ol/layer/Tile';
// import OSM from 'ol/source/OSM';

let map;
let DEMOpacity = ref(0) // DEM 图层的透明度
const MLvalue = ref('') // 滑块的初始值

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
    value: 'XGBoost',
    label: 'XGBoost',
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
const value1 = ref([])

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
    setupGetFeatureInfo(map, Stacking_JM,RF_JM,SVM_JM); // 设置 GetFeatureInfo 事件监听
    // controlLayer()
})
function changeBox(){
    console.log(MLvalue.value);
    const layers = map.getLayers().getArray();
  if (MLvalue.value.includes('Stacking_JM')) {
    if (!layers.includes(Stacking_JM)) {
      map.addLayer(Stacking_JM); // 添加城市矢量图层
    }
  } else {
    if (layers.includes(Stacking_JM)) {
      map.removeLayer(Stacking_JM); // 移除城市矢量图层
    }
  }

  // 控制 dem 图层
  if (MLvalue.value.includes('RF_JM')) {
      map.addLayer(RF_JM); // 添加 DEM 图层
     if (!layers.includes(RF_JM)) {
   }
  } else {
    if (layers.includes(RF_JM)) {
      map.removeLayer(RF_JM); // 移除 DEM 图层
    }
  }

   if (MLvalue.value.includes('SVM')) {
      map.addLayer(SVM_JM); // 添加 DEM 图层
     if (!layers.includes(SVM_JM)) {
   }
  } else {
    if (layers.includes(SVM_JM)) {
      map.removeLayer(SVM_JM); // 移除 DEM 图层
    }
  }
}
function setupGetFeatureInfo(map, wmsLayer1, wmsLayer2,wmsLayer3) {
  console.log("tete");
    console.log("当前选择的算法是：", MLData[0].value);  
  console.log(wmsLayer1);
  console.log(wmsLayer2);
  console.log(wmsLayer3);
  
  
  
  map.on('click', function (evt) {
    const viewResolution = map.getView().getResolution(); // ✅ 注意这里是 map.getView()
    
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
    let url = null; // 初始化 url 变量
    if(MLvalue.value==='Stacking_JM') {
      url = url1;
      console.log(url);
      
    } else if(MLvalue.value==='RF_JM') {
      url = url2;
      console.log(url);
    } else if(MLvalue.value==='SVM') {
      url = url3;
      console.log(url);
    } else {
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
            alert(`植被类型：${labelMap[value] || '未知'}`);
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
   map.addLayer(hhmcLayer)
   map.addLayer(waterLayer)
   map.addLayer(jpLayer)
   map.addLayer(lwLayer)
   map.addLayer(otherLayer)
   //hhmcLayer.setIndex(10000)
  //  map.addLayer(realDT) // 添加矢量图层
 map.addLayer(ditu) // 添加矢量图层
    // map.addLayer(Stacking_JM)   
    // map.addLayer(RF_JM)
    //console.log(ditu);
   
    // map.addLayer(dem) // 添加矢量图层
 
}
 
function goBJ() {
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

function goBJ2() {
  // 北京经纬度：[116.38, 39.90]
   view.animate({//平滑过渡
  center: [116.38, 39.90], // 新中心坐标（注意 EPSG 坐标系）
  duration: 1000 ,           // 动画时长（毫秒）
  zoom: 8 // 可选：设置缩放级别
})
}
function changeOpacity(val){
 dem.setOpacity(val) // 设置 DEM 图层的透明度
}

function toggleMap() {
  showMap.value = !showMap.value
  console.log(showMap.value);
  
}
function removeLayer() {
  map.removeLayer(gaodeLayer); // 移除城市矢量图层

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
function toUp() {
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
  position: absolute;
  top: 2px;
  left: 0;
  width: 100%;
  height: 30px;
  background-color: #ededf0;
  border-radius: 5px;
  
}
</style>
