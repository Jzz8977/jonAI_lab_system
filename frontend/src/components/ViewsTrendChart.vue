<template>
  <div class="chart-container">
    <div v-if="data.length === 0" class="empty-chart">
      <el-icon :size="48" color="#C0C4CC">
        <TrendCharts />
      </el-icon>
      <p>No trend data available</p>
    </div>
    <canvas v-else ref="chartCanvas" width="400" height="200"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { ElIcon } from 'element-plus'
import { TrendCharts } from '@element-plus/icons-vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
// Chart.js components are used directly

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ViewsTrendData {
  date: string
  views: number
}

interface Props {
  data: ViewsTrendData[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: ChartJS | null = null

const createChart = () => {
  if (!chartCanvas.value || props.data.length === 0) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  // Prepare data
  const labels = props.data.map(item => {
    const date = new Date(item.date)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  })
  
  const values = props.data.map(item => item.views)

  chartInstance = new ChartJS(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Views',
          data: values,
          borderColor: '#409EFF',
          backgroundColor: 'rgba(64, 158, 255, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#409EFF',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#409EFF',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#409EFF',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex
              const date = new Date(props.data[index].date)
              return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long', 
                day: 'numeric' 
              })
            },
            label: (context) => {
              const value = context.parsed.y
              return `Views: ${value.toLocaleString()}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            color: '#606266',
            font: {
              size: 12
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          border: {
            display: false
          },
          ticks: {
            color: '#606266',
            font: {
              size: 12
            },
            callback: function(value) {
              if (typeof value === 'number') {
                if (value >= 1000000) {
                  return (value / 1000000).toFixed(1) + 'M'
                } else if (value >= 1000) {
                  return (value / 1000).toFixed(1) + 'K'
                }
                return value.toString()
              }
              return value
            }
          }
        }
      },
      elements: {
        point: {
          hoverRadius: 8
        }
      }
    }
  })
}

watch(() => props.data, () => {
  nextTick(() => {
    createChart()
  })
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    createChart()
  })
})
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}

.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-chart p {
  margin: 16px 0 0 0;
  font-size: 14px;
}

canvas {
  max-height: 300px;
}
</style>