<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">统计报表</div>
      <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
                      range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"
                      @change="loadStats" />
    </div>

    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6" v-for="(c, idx) in cards" :key="idx">
        <el-card>
          <div style="color: #909399; font-size: 13px;">{{ c.label }}</div>
          <div style="font-size: 24px; font-weight: bold; margin-top: 8px; color: #303133;">{{ c.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="14">
        <el-card style="margin-bottom: 16px;">
          <template #header><div style="font-weight: 600;">营收趋势</div></template>
          <div ref="revenueChart" style="height: 350px;"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card style="margin-bottom: 16px;">
          <template #header><div style="font-weight: 600;">订单类型分布</div></template>
          <div ref="pieChart" style="height: 350px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card style="margin-bottom: 16px;">
          <template #header><div style="font-weight: 600;">消费排行 TOP 10</div></template>
          <el-table :data="topCustomers" border stripe size="small">
            <el-table-column type="index" label="排名" width="60" align="center">
              <template #default="{ $index }">
                <el-tag v-if="$index === 0" type="danger" size="small">🥇</el-tag>
                <el-tag v-else-if="$index === 1" type="warning" size="small">🥈</el-tag>
                <el-tag v-else-if="$index === 2" type="success" size="small">🥉</el-tag>
                <span v-else>{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="客户" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="order_count" label="订单数" width="80" align="center" />
            <el-table-column label="累计消费" width="110">
              <template #default="{ row }"><b style="color: #f56c6c;">¥{{ Number(row.total_spent).toFixed(2) }}</b></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div style="font-weight: 600;">美容师业绩</div></template>
          <el-table :data="staffStats" border stripe size="small">
            <el-table-column prop="name" label="美容师" />
            <el-table-column prop="position" label="职位" width="110" />
            <el-table-column prop="service_count" label="服务数" width="80" align="center" />
            <el-table-column label="贡献营收" width="120">
              <template #default="{ row }"><b style="color: #f56c6c;">¥{{ Number(row.total_revenue).toFixed(2) }}</b></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { api } from '@/api/modules'

const dateRange = ref([dayjs().subtract(29, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')])
const revenueChart = ref(null)
const pieChart = ref(null)

const revenueData = ref({ dates: [], revenue: [], orders: [] })
const serviceStats = ref({ by_type: [], by_category: [] })
const topCustomers = ref([])
const staffStats = ref([])

const cards = computed(() => {
  const totalRevenue = revenueData.value.revenue.reduce((s, v) => s + v, 0)
  const totalOrders = revenueData.value.orders.reduce((s, v) => s + v, 0)
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const orderTypes = serviceStats.value.by_type
  const serviceOrders = orderTypes.filter(t => ['appointment', 'boarding', 'mixed'].includes(t.type)).reduce((s, t) => s + t.count, 0)
  return [
    { label: '统计期总营收', value: '¥' + totalRevenue.toFixed(2) },
    { label: '统计期订单数', value: totalOrders + ' 单' },
    { label: '服务订单数', value: serviceOrders + ' 单' },
    { label: '平均客单价', value: '¥' + avgOrder.toFixed(2) }
  ]
})

const renderRevenueChart = () => {
  if (!revenueChart.value) return
  const chart = echarts.init(revenueChart.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['营收', '订单数'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: revenueData.value.dates.map(d => d.slice(5)) },
    yAxis: [{ type: 'value', name: '营收(元)' }, { type: 'value', name: '订单数' }],
    series: [
      { name: '营收', type: 'line', smooth: true, data: revenueData.value.revenue, areaStyle: { opacity: 0.3 }, itemStyle: { color: '#f56c6c' } },
      { name: '订单数', type: 'bar', yAxisIndex: 1, data: revenueData.value.orders, itemStyle: { color: '#409eff', opacity: 0.6 }, barWidth: 15 }
    ]
  })
  window.addEventListener('resize', () => chart.resize())
}

const renderPieChart = () => {
  if (!pieChart.value) return
  const chart = echarts.init(pieChart.value)
  const typeMap = { appointment: '服务订单', boarding: '寄养订单', product: '商品订单', 充值: '充值', mixed: '混合消费' }
  const data = serviceStats.value.by_type.map(t => ({ name: typeMap[t.type] || t.type, value: t.count }))
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

const loadStats = async () => {
  const days = dateRange.value[0] && dateRange.value[1] ? dayjs(dateRange.value[1]).diff(dateRange.value[0], 'day') + 1 : 30
  try {
    const res = await api.revenueTrend({ days })
    revenueData.value = res.data
  } catch (e) {}

  try {
    const res = await api.serviceStats({ startDate: dateRange.value[0], endDate: dateRange.value[1] })
    serviceStats.value = res.data
  } catch (e) {}

  try {
    const res = await api.topCustomers({ limit: 10 })
    topCustomers.value = res.data
  } catch (e) {}

  try {
    const res = await api.staffStats({ startDate: dateRange.value[0], endDate: dateRange.value[1] })
    staffStats.value = res.data
  } catch (e) {}

  nextTick(() => {
    renderRevenueChart()
    renderPieChart()
  })
}

onMounted(loadStats)
watch(dateRange, loadStats)
</script>
