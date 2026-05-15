<template>
  <div class="chart-wrapper">
    <div ref="chartDom" class="ndvi-chart-instance"></div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue';
import * as echarts from 'echarts';

const props = defineProps(['chartData']);
const chartDom = ref(null);
let myChart = null;

const initChart = async () => {
  if (!chartDom.value || !props.chartData) return;

  const observer = new ResizeObserver(() => {
    // 只有当宽高都大于 0 时才真正初始化
    if (chartDom.value.clientWidth > 0 && chartDom.value.clientHeight > 0) {
      if (!myChart) {
        myChart = echarts.init(chartDom.value);
      }

      // --- 关键：在这里定义 option ---
      const { plantName, color, year, data } = props.chartData;

      const option = {
        title: {
          text: `${plantName} NDVI 变化趋势 (${year})`,
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14, color: '#333' }
        },
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: <b>{c}</b>'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: true,
          data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
          axisLabel: {
            interval: 0, // 👈 强制显示所有月份标签，不自动隐藏
            fontSize: 11,
            color: '#666'
          }
        },
        yAxis: {
          type: 'value',
          name: 'NDVI',
          min: -0.2,
          max: 0.75
        },
        series: [
          {
            name: plantName,
            type: 'line',
            smooth: true, // 平滑曲线
            data: data,
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: { color: color },
            lineStyle: { width: 3 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: color },
                { offset: 1, color: 'rgba(255, 255, 255, 0)' }
              ]),
              opacity: 0.3
            }
          }
        ]
      };

      myChart.setOption(option);
      myChart.resize();
      observer.disconnect(); // 初始化完成后断开监听
    }
  });

  observer.observe(chartDom.value);
};

onMounted(initChart);

// 监听数据变化，当用户切换会话或重新生成图表时刷新
watch(() => props.chartData, (newData) => {
  if (newData) {
    initChart();
  }
}, { deep: true });
</script>

<style scoped>
.chart-wrapper {
  margin-top: 12px;
  background: white;
  border-radius: 12px;
  padding: 12px; /* 稍微缩小内边距 */
  border: 1px solid #e5e7eb;

  /* 关键：确保在对话流中占据足够宽度 */
  width: 100%;
  min-width: 450px; /* 设定一个最小宽度，防止月份挤在一起 */
  max-width: 650px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.ndvi-chart-instance {
  width: 100%;
  height: 350px;
}
</style>