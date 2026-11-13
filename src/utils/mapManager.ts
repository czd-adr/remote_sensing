import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import TileWMS from 'ol/source/TileWMS'

// GeoServer WMS 服务地址（工作区 test）
export const GEOSERVER_WMS_URL = 'http://localhost:8080/geoserver/test/wms'

// 高德瓦片底图工厂
// style 取值：6=卫星影像，7=矢量地图，8=注记/标注
export function createGaodeLayer(style: number, options?: { lang?: string }) {
  const query = options?.lang
    ? `lang=${options.lang}&size=1&style=${style}`
    : `style=${style}`
  return new TileLayer({
    source: new XYZ({
      url: `https://wprd0{1-4}.is.autonavi.com/appmaptile?${query}&x={x}&y={y}&z={z}`
    })
  })
}

// GeoServer WMS 瓦片图层工厂
export function createWMSLayer(
  layerName: string,
  options?: { transparent?: boolean; zIndex?: number; format?: string }
) {
  const params: Record<string, unknown> = {
    LAYERS: layerName,
    TILED: true
  }
  if (options?.transparent) {
    params.FORMAT = options.format || 'image/png'
    params.TRANSPARENT = true
  }
  const layer = new TileLayer({
    source: new TileWMS({
      url: GEOSERVER_WMS_URL,
      params,
      serverType: 'geoserver'
    })
  })
  if (options?.zIndex != null) layer.setZIndex(options.zIndex)
  return layer
}

// 构建完整图层注册表（供 tools.ts 的 toggle_layer 按图层名查找操作）
export function buildLayerRegistry(): Record<string, TileLayer<any>> {
  return {
    'test:628yangshi': createWMSLayer('test:628yangshi'),
    'test:DEM': createWMSLayer('test:DEM'),
    'test:vvMean1': createWMSLayer('test:vvMean1', { transparent: true }),
    'test:vhMean': createWMSLayer('test:vhMean', { transparent: true }),
    'test:23_1_NDVI': createWMSLayer('test:23_1_NDVI', { transparent: true }),
    'test:23_NDWI_mean': createWMSLayer('test:23_NDWI_mean', { transparent: true }),
    'test:LSWI_mean': createWMSLayer('test:LSWI_mean', { transparent: true }),
    'test:Stacking': createWMSLayer('test:Stacking', { transparent: true, zIndex: 20 }),
    'test:RF_image': createWMSLayer('test:RF_image', { transparent: true, zIndex: 20 }),
    'test:svm': createWMSLayer('test:svm', { transparent: true, zIndex: 20 }),
    'test:Xg': createWMSLayer('test:Xg', { transparent: true, zIndex: 20 }),
    'test:hhmc_points': createWMSLayer('test:hhmc_points', { transparent: true, zIndex: 10001 }),
    'test:river_points': createWMSLayer('test:river_points', { transparent: true, zIndex: 10002 }),
    'test:jp_points': createWMSLayer('test:jp_points', { transparent: true, zIndex: 10002 }),
    'test:lw_points': createWMSLayer('test:lw_points', { transparent: true, zIndex: 10002 }),
    'test:other_points': createWMSLayer('test:other_points', { transparent: true, zIndex: 10002 })
  }
} 