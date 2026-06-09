<template>
  <div>
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6" v-for="(item, idx) in statsCards" :key="idx">
        <el-card shadow="hover">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #909399; font-size: 13px;">{{ item.label }}</div>
              <div style="font-size: 28px; font-weight: bold; color: #303133; margin-top: 8px;">
                {{ item.prefix }}{{ formatValue(item.value, item.type) }}{{ item.suffix }}
              </div>
            </div>
            <el-icon :size="40" :color="item.color"><component :is="item.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div style="font-weight: 600;">营收趋势（近7天）</div>
          </template>
          <div ref="chartRef" style="height: 350px;"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card style="margin-bottom: 16px;">
          <template #header>
            <div style="font-weight: 600;">今日预约</div>
          </template>
          <el-empty v-if="!todayAppointments.length" description="暂无预约" :image-size="80" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="apt in todayAppointments.slice(0, 8)"
              :key="apt.id"
              :timestamp="apt.start_time + ' - ' + apt.end_time"
              :type="apt.status === '已完成' ? 'success' : apt.status === '服务中' ? 'primary' : 'warning'"
            >
              <div style="font-weight: 500;">{{ apt.service_name }}</div>
              <div style="color: #909399; font-size: 12px;">{{ apt.pet_name }} · {{ apt.customer_name }}</div>
              <el-tag size="small" :type="statusType(apt.status)" style="margin-top: 4px;">{{ apt.status }}</el-tag>
            </el-timeline-item>
          </el-timeline>
        </el-card>
        <el-card>
          <template #header>
            <div style="font-weight: 600;">在住宠物</div>
          </template>
          <el-empty v-if="!boardingList.length" description="暂无寄养" :image-size="80" />
          <div v-else>
            <div v-for="b in boardingList.slice(0, 6)" :key="b.id"
                 style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
              <div>
                <div style="font-weight: 500;">🐾 {{ b.pet_name }}</div>
                <div style="color: #909399; font-size: 12px;">{{ b.customer_name }} · {{ b.room_no || '寄养区' }}</div>
              </div>
              <el-tag size="small" type="success">{{ b.expected_check_out_date }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { api } from '@/api/modules'

const chartRef = ref(null)
const overview = ref({})
const revenueData = ref({ dates: [], revenue: [], orders: [] })
const todayAppointments = ref([])
const boardingList = ref([])

const statsCards = computed(() => [
  { label: '今日营收', value: overview.value.today_revenue || 0, prefix: '¥', suffix: '', icon: 'Money', color: '#f56c6c', type: 'money' },
  { label: '本月营收', value: overview.value.month_revenue || 0, prefix: '¥', suffix: '', icon: 'Wallet', color: '#e6a23c', type: 'money' },
  { label: '今日预约', value: overview.value.today_appointments || 0, prefix: '', suffix: '单', icon: 'Calendar', color: '#409eff', type: 'number' },
  { label: '会员总数', value: overview.value.member_count || 0, prefix: '', suffix: '人', icon: 'Medal', color: '#67c23a', type: 'number' }
])

const formatValue = (v, type) => {
  if (type === 'money') return Number(v).toFixed(2)
  return v
}

const statusType = (s) => ({
  '待确认': 'info', '已确认': 'warning', '服务中': 'primary', '已完成': 'success', '已取消': 'danger'
})[s] || 'info'

const loadData = async () => {
  try {
    const res = await api.dashboard()
    overview.value = res.data
  } catch (e) {}

  try {
    const res = await api.revenueTrend({ days: 7 })
    revenueData.value = res.data
    renderChart()
  } catch (e) {}

  try {
    const res = await api.appointments({ date: dayjs().format('YYYY-MM-DD'), pageSize: 50 })
    todayAppointments.value = res.data.list
  } catch (e) {}

  try {
    const res = await api.boardingList({ status: '在住', pageSize: 20 })
    boardingList.value = res.data.list
  } catch (e) {}
}

const renderChart = () => {
  if (!chartRef.value) return
  const chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['营收', '订单数'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: revenueData.value.dates.map(d => d.slice(5)) },
    yAxis: [{ type: 'value', name: '营收(元)' }, { type: 'value', name: '订单数' }],
    series: [
      { name: '营收', type: 'line', smooth: true, data: revenueData.value.revenue, areaStyle: { opacity: 0.3 }, itemStyle: { color: '#f56c6c' } },
      { name: '订单数', type: 'line', smooth: true, yAxisIndex: 1, data: revenueData.value.orders, itemStyle: { color: '#409eff' } }
    ]
  })
  window.addEventListener('resize', () => chart.resize())
}

onMounted(async () => {
  await loadData()
  nextTick(renderChart)
})
</script>
