<template>
  <div class="gradient-legend" :style="{ width: width }">
    <div class="legend-title" v-if="title">{{ title }}</div>

    <div class="color-bar" :style="barStyle"></div>

    <div class="labels">
      <div v-for="(item, index) in stops" :key="index" class="label-item">
        <span class="tick"></span>
        <span class="value">{{ item.label || item.quantity }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: '200px' },
  // 核心数据：[{ color: '#xxx', quantity: 0.1, label: '0.1' }]
  stops: {
    type: Array,
    required: true,
    default: () => []
  }
})

// 计算 CSS 渐变字符串
const barStyle = computed(() => {
  if (props.stops.length === 0) return {}
  // 提取颜色并拼接成 linear-gradient
  const colorStr = props.stops.map(s => s.color).join(', ')
  return {
    background: `linear-gradient(to right, ${colorStr})`
  }
})
</script>

<style scoped>
.gradient-legend {
  padding: 10px;
  background: rgba(21, 23, 27, 0.8);
  border: 1px solid #3e4451;
  border-radius: 4px;
  pointer-events: auto; /* 确保图例上方可以交互 */
}

.legend-title {
  font-size: 10px;
  color: #56b6c2;
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: bold;
}

.color-bar {
  width: 100%;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  position: relative;
}

.label-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

/* 刻度线 */
.tick {
  width: 1px;
  height: 4px;
  background: #3e4451;
}

.value {
  font-size: 9px;
  color: #abb2bf;
  margin-top: 2px;
  white-space: nowrap;
}
</style>