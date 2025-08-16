<template>
  <div class="metrics-card" :style="{ borderLeftColor: color }">
    <div class="metrics-content">
      <div class="metrics-info">
        <h3 class="metrics-title">{{ title }}</h3>
        <div class="metrics-value">{{ formattedValue }}</div>
      </div>
      <div class="metrics-icon" :style="{ backgroundColor: color }">
        <el-icon :size="24">
          <component :is="iconComponent" />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElIcon } from 'element-plus'
import { 
  Document, 
  View, 
  Star, 
  TrendCharts 
} from '@element-plus/icons-vue'

interface Props {
  title: string
  value: number
  icon: string
  color: string
}

const props = defineProps<Props>()

const iconComponents = {
  Document,
  View,
  Like: Star,
  TrendCharts
}

const iconComponent = computed(() => {
  return iconComponents[props.icon as keyof typeof iconComponents] || Document
})

const formattedValue = computed(() => {
  if (props.value >= 1000000) {
    return (props.value / 1000000).toFixed(1) + 'M'
  } else if (props.value >= 1000) {
    return (props.value / 1000).toFixed(1) + 'K'
  }
  return props.value.toString()
})
</script>

<style scoped>
.metrics-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metrics-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.15);
}

.metrics-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metrics-info {
  flex: 1;
}

.metrics-title {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metrics-value {
  color: #303133;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.metrics-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
}
</style>