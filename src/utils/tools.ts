import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import { Ref } from 'vue'

// 定义工具集接口类型定义
interface ToolArguments {
  [key: string]: any
}

// 前端工具执行结果
export interface ToolResult {
  success: boolean
  message: string
  data?: any
}

// 前端工具运行上下文
export interface AgentToolContext {
  map: Map | null
  view: View | null
  layerRegistry: Record<string, TileLayer<any>>
  isInspectorActive: Ref<boolean>
  startDrawInteraction: () => void
}

export function createAgentTools(ctx: AgentToolContext) {
  const { map, view, layerRegistry, isInspectorActive, startDrawInteraction } = ctx

  // 根据 layerName 在注册表中查找图层实例（全名/短名/大小写不敏感/分号冒号兼容匹配）
  const findLayer = (layerName: string): { key: string; layer: TileLayer<any> } | null => {
    if (!layerName) return null
    // 归一化：分号转冒号、去空格、转小写
    const normalize = (s: string) => String(s).replace(/;/g, ':').replace(/\s+/g, '').toLowerCase()
    const target = normalize(layerName)
    const keys = Object.keys(layerRegistry)
    const exact = keys.find((k) => normalize(k) === target)
    if (exact) return { key: exact, layer: layerRegistry[exact] }
    const short = keys.find((k) => {
      const nk = normalize(k)
      const shortName = nk.split(':').pop() || ''
      return nk === target || target === shortName || nk.endsWith(target) || target.endsWith(shortName)
    })
    return short ? { key: short, layer: layerRegistry[short] } : null
  }

  const clientTools: Record<string, (args: ToolArguments) => ToolResult> = {
    // ① 图层显隐切换
    toggle_layer: ({ layerName, visible }) => {
      const found = findLayer(layerName)
      if (!found) {
        return { success: false, message: `未找到图层 [${layerName}]，请检查图层注册表` }
      }
      const targetVisible = visible !== false
      if (targetVisible && map) {
        if (!map.getLayers().getArray().includes(found.layer)) {
          map.addLayer(found.layer)
        }
      }
      found.layer.setVisible(targetVisible)
      return {
        success: true,
        message: `已成功将图层 [${found.key}] 设置为 ${targetVisible ? '显示' : '隐藏'}`,
        data: { layerName: found.key, visible: targetVisible }
      }
    },

    // ② 像元多波段点查
    trigger_inspector: () => {
      isInspectorActive.value = true
      return {
        success: true,
        message: '已为您开启地图像元点查模式，请在左侧地图上点击任意位置查看波段数值。',
        data: { mode: 'inspector' }
      }
    },

    // ③ ROI 区域框选绘制
    trigger_draw_roi: ({ mode = 'polygon' }) => {
      if (typeof startDrawInteraction === 'function') {
        startDrawInteraction()
        return {
          success: true,
          message: `已开启 ${mode} 区域绘制工具，请在地图上圈定分析范围。`,
          data: { mode }
        }
      }
      return { success: false, message: 'ROI 绘制工具未注册触发函数，无法开启' }
    },

    // ④ 地图视角聚焦
    focus_bounds: ({ minLon, minLat, maxLon, maxLat }) => {
      if (!view) return { success: false, message: '地图视图实例不可用' }
      const bounds = [Number(minLon), Number(minLat), Number(maxLon), Number(maxLat)]
      if (bounds.some((v) => isNaN(v))) {
        return { success: false, message: '聚焦范围参数不合法，需提供 minLon/minLat/maxLon/maxLat' }
      }
      view.fit(bounds, { duration: 500, padding: [20, 20, 20, 20] })
      return {
        success: true,
        message: '已聚焦并平移地图至指定区域',
        data: { bounds }
      }
    }
  }

  // 统一的工具分发执行器
  const executeClientTool = (toolName: string, args: ToolArguments = {}): ToolResult => {
    if (clientTools[toolName]) {
      try {
        return clientTools[toolName](args)
      } catch (err: any) {
        console.error(`前端工具 [${toolName}] 执行报错:`, err)
        return { success: false, message: `工具执行异常: ${err.message}` }
      }
    } else {
      console.warn(`未找到匹配的前端工具编码: ${toolName}`)
      return { success: false, message: `未识别的工具指令: ${toolName}` }
    }
  }

  return {
    executeClientTool,
    listTools: () => Object.keys(clientTools)
  }
}