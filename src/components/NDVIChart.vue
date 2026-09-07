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

// 🎯 新增：学术级遥感植被中英文翻译字典，完美匹配论文格式
const plantTranslation = {
  '芦苇': 'Phragmites australis',
  '互花米草': 'Spartina alterniflora',
  '碱蓬': 'Suaeda salsa',
  '水体': 'Water Body',
  '其他': 'Others'
};

const initChart = async () => {
  if (!chartDom.value || !props.chartData) return;

  const observer = new ResizeObserver(() => {
    // 只有当宽高都大于 0 时才真正初始化
    if (chartDom.value.clientWidth > 0 && chartDom.value.clientHeight > 0) {
      if (!myChart) {
        myChart = echarts.init(chartDom.value);
      }

      const { plantName, color, year, data } = props.chartData;

      // 🎯 核心修改点 1：将后端返回的中文名转换为拉丁学术名（若字典中未匹配则降级保留原名）
      const englishPlantName = plantTranslation[plantName] || plantName;

      const option = {
        title: {
          // 🎯 核心修改点 2：将表头文字彻底重构为英文学术标题
          text: `NDVI Temporal Trajectory of ${englishPlantName} (${year})`,
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 14,
            color: '#111827',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis',
          // 🎯 核心修改点 3：优化悬浮框格式器，确保学术展示干净整洁
          formatter: '{b}: <b>{c}</b>'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '18%', // 稍微拉大顶部间距，给较长的英文学术标题留出空间
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: true,
          // 🎯 核心修改点 4：将 X 轴月份标签替换为国际标准英文缩写形式
          data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          axisLabel: {
            interval: 0, // 强制显示所有月份，防止挤压隐藏
            fontSize: 11,
            color: '#4B5563',
            fontFamily: 'Arial, sans-serif'
          }
        },
        yAxis: {
          type: 'value',
          name: 'NDVI', // 🎯 核心修改点 5：Y 轴度量标识国际化
          nameTextStyle: {
            color: '#4B5563',
            fontFamily: 'Arial, sans-serif',
            padding: [0, 0, 0, -10]
          },
          min: -0.2,
          max: 0.75
        },
        series: [
          {
            name: englishPlantName, // 🎯 核心修改点 6：数据序列映射名国际化
            type: 'line',
            smooth: true,
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
              opacity: 0.25 // 稍微降低透明度，让折线在浅色主题下更有层次
            }
          }
        ]
      };

      myChart.setOption(option, true); // 传入 true 代表清除之前的所有配置，完全重绘
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
  padding: 16px; /* 适当增大内边距，提升论文配图的留白感 */
  border: 1px solid #e5e7eb;

  width: 100%;
  min-width: 480px; /* 稍微调大最小宽度，确保英文字体不会在低分辨率下换行 */
  max-width: 650px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.ndvi-chart-instance {
  width: 100%;
  height: 350px;
}
</style>