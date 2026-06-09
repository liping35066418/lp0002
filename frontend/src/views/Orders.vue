<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">订单管理</div>
    </div>

    <div class="search-bar">
      <el-select v-model="searchForm.type" placeholder="订单类型" clearable style="width: 140px;">
        <el-option label="服务订单" value="appointment" />
        <el-option label="寄养订单" value="boarding" />
        <el-option label="商品订单" value="product" />
        <el-option label="充值" value="充值" />
      </el-select>
      <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD"
                      range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 260px;" />
      <el-input v-model="searchForm.keyword" placeholder="订单号/客户/电话" clearable style="width: 220px;" />
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="order_no" label="订单号" width="170" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="typeTag(row.type)">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="客户" width="170">
        <template #default="{ row }">{{ row.customer_name || '-' }} · {{ row.phone || '' }}</template>
      </el-table-column>
      <el-table-column prop="total_amount" label="原价" width="90">
        <template #default="{ row }">¥{{ Number(row.total_amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="discount_amount" label="优惠" width="90">
        <template #default="{ row }">-¥{{ Number(row.discount_amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="抵扣" width="140">
        <template #default="{ row }">
          <span v-if="row.use_balance > 0" style="margin-right: 8px;">余额:¥{{ row.use_balance }}</span>
          <span v-if="row.use_points > 0">积分:{{ row.use_points }}</span>
          <span v-if="!row.use_balance && !row.use_points">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="pay_amount" label="实付" width="100">
        <template #default="{ row }"><b style="color: #f56c6c;">¥{{ Number(row.pay_amount).toFixed(2) }}</b></template>
      </el-table-column>
      <el-table-column label="获得积分" width="90">
        <template #default="{ row }">+{{ row.earn_points || 0 }}</template>
      </el-table-column>
      <el-table-column prop="pay_method" label="支付方式" width="90" />
      <el-table-column prop="created_at" label="下单时间" width="170" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; justify-content: flex-end; display: flex;"
      background layout="total, sizes, prev, pager, next"
      :total="total" v-model:current-page="page" v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]" @current-change="loadList" @size-change="loadList"
    />

    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <el-descriptions v-if="detail" :column="2" border size="small">
        <el-descriptions-item label="订单号">{{ detail.order_no }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeLabel(detail.type) }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ detail.customer_name }} · {{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ detail.pay_method }}</el-descriptions-item>
        <el-descriptions-item label="原价">¥{{ Number(detail.total_amount).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="优惠">-¥{{ Number(detail.discount_amount).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="余额抵扣">¥{{ Number(detail.use_balance).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="积分抵扣">{{ detail.use_points }}分</el-descriptions-item>
        <el-descriptions-item label="实付金额"><b style="color: #f56c6c; font-size: 16px;">¥{{ Number(detail.pay_amount).toFixed(2) }}</b></el-descriptions-item>
        <el-descriptions-item label="获得积分">+{{ detail.earn_points }}分</el-descriptions-item>
        <el-descriptions-item label="下单时间" :span="2">{{ detail.created_at }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>明细</el-divider>
      <el-table v-if="detail?.items?.length" :data="detail.items" size="small" border>
        <el-table-column prop="item_name" label="项目" />
        <el-table-column prop="item_type" label="类型" width="80" />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="unit_price" label="单价" width="90">
          <template #default="{ row }">¥{{ Number(row.unit_price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="subtotal" label="小计" width="100">
          <template #default="{ row }">¥{{ Number(row.subtotal).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/api/modules'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const searchForm = reactive({ type: '', dateRange: [], keyword: '' })

const detailVisible = ref(false)
const detail = ref(null)

const typeLabel = (t) => ({ appointment: '服务', boarding: '寄养', product: '商品', 充值: '充值', mixed: '混合' })[t] || t
const typeTag = (t) => ({ appointment: 'primary', boarding: 'success', product: 'warning', 充值: 'info', mixed: '' })[t] || ''

const loadList = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value, pageSize: pageSize.value,
      type: searchForm.type, keyword: searchForm.keyword,
      startDate: searchForm.dateRange?.[0] || '',
      endDate: searchForm.dateRange?.[1] || ''
    }
    const res = await api.orders(params)
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { type: '', dateRange: [], keyword: '' })
  page.value = 1
  loadList()
}

const viewDetail = async (row) => {
  try {
    const res = await api.orderDetail(row.id)
    detail.value = res.data
    detailVisible.value = true
  } catch (e) {}
}

onMounted(loadList)
</script>
