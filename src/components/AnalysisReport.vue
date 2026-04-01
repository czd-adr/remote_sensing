<template>
  <transition name="el-zoom-in-center">
    <div v-if="data" class="report-overlay">
      <div class="report-modal">
        <div class="close-icon" @click="$emit('close')">
          <el-icon><Close /></el-icon>
        </div>

        <div class="report-header">
          <el-icon><DataAnalysis /></el-icon>
          <span>植被差异分析报告</span>
        </div>

        <div class="report-body">
          <div class="time-info">
            <span class="date-tag">{{ data.date1 }}</span>
            <el-icon class="arrow-icon"><Right /></el-icon>
            <span class="date-tag">{{ data.date2 }}</span>
          </div>

          <div class="metrics-grid">
            <div class="metric-item">
              <div class="label">均值 (T1)</div>
              <div class="value">{{ data.mean1.toFixed(4) }}</div>
            </div>
            <div class="metric-item">
              <div class="label">均值 (T2)</div>
              <div class="value">{{ data.mean2.toFixed(4) }}</div>
            </div>
          </div>

          <div class="delta-card" :class="deltaStatus.type">
            <div class="delta-label">指标变化量 (Δ)</div>
            <div class="delta-main">
              <span class="delta-symbol">{{ deltaStatus.symbol }}</span>
              <span class="delta-value">{{
                Math.abs(data.delta).toFixed(4)
              }}</span>
              <el-icon class="status-icon">
                <CaretTop v-if="data.delta > 0" />
                <CaretBottom v-else-if="data.delta < 0" />
                <Minus v-else />
              </el-icon>
            </div>
            <div class="delta-footer">{{ deltaStatus.text }}</div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { DataAnalysis, Right, CaretTop, CaretBottom, Minus, Close } from '@element-plus/icons-vue'

const props = defineProps({
  data: { type: Object, default: null }
})

// 定义关闭事件
defineEmits(['close'])

const deltaStatus = computed(() => {
  const d = props.data?.delta || 0
  if (d > 0) return { type: 'increase', symbol: '+', text: '植被覆盖度上升' }
  if (d < 0) return { type: 'decrease', symbol: '-', text: '植被覆盖度下降' }
  return { type: 'stable', symbol: '', text: '基本无变化' }
})
</script>

<style scoped>
/* 蒙层：用于锁定居中 */
.report-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4); /* 半透明遮罩 */
  z-index: 3000;
  pointer-events: auto;
}

.report-modal {
  position: relative;
  width: 520px;
  background: rgba(21, 23, 27, 0.98);
  border: 1px solid #4c5362;
  border-radius: 12px;
  padding: 24px;
  color: #abb2bf;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(15px);
}

/* 关闭按钮样式 */
.close-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  cursor: pointer;
  font-size: 18px;
  color: #5c6370;
  transition: color 0.2s;
  padding: 4px;
}

.close-icon:hover {
  color: #ff5555;
}

.report-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: bold;
  color: #56b6c2;
  margin-bottom: 20px;
}

.time-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
}

.metric-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.delta-card {
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.delta-card.increase {
  background: rgba(80, 250, 123, 0.1);
  color: #50fa7b;
  border: 1px solid rgba(80, 250, 123, 0.2);
}
.delta-card.decrease {
  background: rgba(255, 85, 85, 0.1);
  color: #ff5555;
  border: 1px solid rgba(255, 85, 85, 0.2);
}
.delta-card.stable {
  background: rgba(171, 178, 191, 0.1);
  color: #abb2bf;
}

.delta-value {
  font-size: 32px;
  font-weight: bold;
}
</style>