<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <div class="date-range-picker">
        <el-select v-model="selectedDateRange" @change="handleDateRangeChange" placeholder="Select date range">
          <el-option label="Last 7 days" value="7d" />
          <el-option label="Last 30 days" value="30d" />
          <el-option label="All time" value="all" />
        </el-select>
      </div>
    </div>

    <div v-loading="loading" class="dashboard-content">
      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <MetricsCard
          title="Total Articles"
          :value="metrics?.total_articles || 0"
          icon="Document"
          color="#409EFF"
        />
        <MetricsCard
          title="Total Views"
          :value="metrics?.total_views || 0"
          icon="View"
          color="#67C23A"
        />
        <MetricsCard
          title="Total Likes"
          :value="metrics?.total_likes || 0"
          icon="Like"
          color="#E6A23C"
        />
        <MetricsCard
          title="Avg. Views per Article"
          :value="averageViews"
          icon="TrendCharts"
          color="#F56C6C"
        />
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-container">
          <h3>Views Trend</h3>
          <ViewsTrendChart :data="metrics?.views_trend || []" />
        </div>
      </div>

      <!-- Content Sections -->
      <div class="content-grid">
        <!-- Top Articles -->
        <div class="content-section">
          <h3>Top Performing Articles</h3>
          <TopArticlesRanking :articles="metrics?.top_articles || []" />
        </div>

        <!-- Recent Activity -->
        <div class="content-section">
          <h3>Recent Activity</h3>
          <RecentActivityFeed :articles="metrics?.recent_articles || []" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElSelect, ElOption } from 'element-plus'
import { analyticsService } from '@/services/analytics'
import { useFetch } from '@/composables/useApi'
import { notificationService } from '@/services/notifications'
import type { DashboardMetrics } from '@/types'
import MetricsCard from '@/components/MetricsCard.vue'
import TopArticlesRanking from '@/components/TopArticlesRanking.vue'
import RecentActivityFeed from '@/components/RecentActivityFeed.vue'
import ViewsTrendChart from '@/components/ViewsTrendChart.vue'

const selectedDateRange = ref<'7d' | '30d' | 'all'>('30d')

// Use enhanced API composable for better error handling and loading states
const {
  data: metrics,
  loading,
  error,
  refresh: loadDashboardData
} = useFetch(
  () => analyticsService.getDashboardMetrics(selectedDateRange.value),
  {
    showErrorMessage: true,
    loadingMessage: 'Loading dashboard data...'
  }
)

const averageViews = computed(() => {
  if (!metrics.value || metrics.value.total_articles === 0) return 0
  return Math.round(metrics.value.total_views / metrics.value.total_articles)
})

const handleDateRangeChange = () => {
  loadDashboardData()
}

// Show success message when data loads successfully
const handleDataLoaded = () => {
  if (metrics.value) {
    notificationService.success('Dashboard data updated successfully')
  }
}

onMounted(() => {
  // Data is automatically loaded by useFetch with immediate: true
  // We can add additional initialization here if needed
})
</script>

<style scoped>
.dashboard {
  padding: 24px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-header h1 {
  margin: 0;
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.date-range-picker {
  width: 200px;
}

.dashboard-content {
  min-height: 400px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.charts-section {
  margin-bottom: 32px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.content-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.content-section h3 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .date-range-picker {
    width: 100%;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>