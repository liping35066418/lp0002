<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">预约管理</div>
      <el-button type="primary" @click="openDialog"><el-icon><Plus /></el-icon>新建预约</el-button>
    </div>

    <div class="search-bar">
      <el-date-picker v-model="searchForm.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 180px;" />
      <el-select v-model="searchForm.status" placeholder="状态" clearable style="width: 140px;">
        <el-option label="待确认" value="待确认" />
        <el-option label="已确认" value="已确认" />
        <el-option label="服务中" value="服务中" />
        <el-option label="已完成" value="已完成" />
        <el-option label="已取消" value="已取消" />
      </el-select>
      <el-input v-model="searchForm.keyword" placeholder="客户/宠物/电话" clearable style="width: 200px;" />
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="appointment_no" label="预约号" width="170" />
      <el-table-column prop="appointment_date" label="日期" width="120" />
      <el-table-column label="时段" width="130">
        <template #default="{ row }">{{ row.start_time }} - {{ row.end_time }}</template>
      </el-table-column>
      <el-table-column prop="pet_name" label="宠物" width="90">
        <template #default="{ row }">
          <span>{{ row.pet_name }}</span>
          <el-tag size="small" style="margin-left: 4px;">{{ row.species }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="service_name" label="服务项目" width="110" />
      <el-table-column prop="category" label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.category === '洗护' ? 'success' : row.category === '美容' ? 'warning' : 'info'">{{ row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="客户" width="170">
        <template #default="{ row }">{{ row.customer_name }} · {{ row.customer_phone }}</template>
      </el-table-column>
      <el-table-column prop="staff_name" label="美容师" width="90" />
      <el-table-column prop="workstation_name" label="工位" width="100" />
      <el-table-column prop="service_price" label="金额" width="80">
        <template #default="{ row }">¥{{ row.service_price }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status !== '已完成' && row.status !== '已取消'">
            <el-button link type="success" @click="changeStatus(row, '已确认')" v-if="row.status === '待确认'">确认</el-button>
            <el-button link type="primary" @click="changeStatus(row, '服务中')" v-if="row.status === '已确认'">开始</el-button>
            <el-button link type="success" @click="changeStatus(row, '已完成')" v-if="row.status === '服务中'">完成</el-button>
            <el-button link type="danger" @click="changeStatus(row, '已取消')">取消</el-button>
          </template>
          <el-button link type="warning" @click="goCheckout(row)" v-if="row.status === '已完成'">去结算</el-button>
          <el-button link type="danger" @click="removeItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; justify-content: flex-end; display: flex;"
      background layout="total, sizes, prev, pager, next"
      :total="total" v-model:current-page="page" v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]" @current-change="loadList" @size-change="loadList"
    />

    <el-dialog v-model="dialogVisible" title="新建预约" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="客户" required>
          <el-select v-model="form.customer_id" filterable placeholder="选择客户" style="width: 100%;" @change="onCustomerChange">
            <el-option v-for="c in customerList" :key="c.id" :label="`${c.name} - ${c.phone}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="宠物" required>
          <el-select v-model="form.pet_id" placeholder="选择宠物" style="width: 100%;" :disabled="!form.customer_id">
            <el-option v-for="p in petList" :key="p.id" :label="`${p.name} (${p.species}${p.breed ? '·'+p.breed : ''})`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务项目" required>
          <el-row :gutter="12" style="width: 100%;">
            <el-col :span="16">
              <el-select v-model="form.service_id" placeholder="选择服务" style="width: 100%;" @change="onServiceChange">
                <el-option v-for="s in serviceList" :key="s.id" :label="`${s.name} · ${s.duration}分钟 · ¥${s.price}`" :value="s.id" />
              </el-select>
            </el-col>
            <el-col :span="8" v-if="selectedService">
              <div style="padding: 8px 12px; background: #f5f7fa; border-radius: 4px; border: 1px solid #ebeef5;">
                <div style="color: #606266; font-size: 12px;">预估时长：<b style="color: #303133;">{{ selectedService.duration }}分钟</b></div>
                <div style="color: #606266; font-size: 12px; margin-top: 4px;">预估价格：<b style="color: #f56c6c;">¥{{ selectedService.price }}</b></div>
              </div>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="预约日期" required>
          <el-date-picker v-model="form.appointment_date" type="date" value-format="YYYY-MM-DD" :disabled-date="disabledDate" style="width: 100%;" @change="loadSlots" />
        </el-form-item>
        <el-form-item label="可用时段" required>
          <div v-loading="slotLoading" style="min-height: 100px;">
            <div v-if="!slots.length && !slotLoading" style="color: #909399; text-align: center; padding: 20px;">请先选择服务和日期</div>
            <div v-else style="display: flex; flex-wrap: wrap; gap: 8px;">
              <div
                v-for="slot in slots" :key="slot.start"
                @click="slot.available && (form.start_time = slot.start)"
                :style="{
                  padding: '8px 16px', border: '1px solid ' + (form.start_time === slot.start ? '#409eff' : slot.available ? '#dcdfe6' : '#f0f0f0'),
                  borderRadius: '4px', cursor: slot.available ? 'pointer' : 'not-allowed',
                  background: form.start_time === slot.start ? '#ecf5ff' : slot.available ? '#fff' : '#f5f7fa',
                  color: slot.available ? '#303133' : '#c0c4cc'
                }"
              >
                <div>{{ slot.start }} - {{ slot.end }}</div>
                <div style="font-size: 11px; color: #909399;">
                  <span v-if="slot.available">{{ slot.staffCount }}美容师/{{ slot.workstationCount }}工位</span>
                  <span v-else>已约满</span>
                </div>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem" :disabled="!form.start_time">提交预约</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="conflictVisible" title="预约时段冲突" width="500px">
      <div style="color: #606266; margin-bottom: 12px;">
        <el-alert type="error" :closable="false" show-icon title="所选时段存在以下冲突，无法预约：" />
      </div>
      <el-table :data="conflictList" border stripe size="small">
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column label="冲突详情" prop="detail" />
      </el-table>
      <template #footer>
        <el-button type="primary" @click="conflictVisible = false">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { api } from '@/api/modules'

const router = useRouter()
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const searchForm = reactive({ date: null, status: '', keyword: '' })

const customerList = ref([])
const petList = ref([])
const serviceList = ref([])
const slots = ref([])
const slotLoading = ref(false)

const dialogVisible = ref(false)
const conflictVisible = ref(false)
const conflictList = ref([])

const form = reactive({ customer_id: null, pet_id: null, service_id: null, appointment_date: '', start_time: '', remark: '' })

const selectedService = computed(() => {
  if (!form.service_id) return null
  return serviceList.value.find(s => s.id === form.service_id) || null
})

const statusType = (s) => ({ '待确认': 'warning', '已确认': 'primary', '服务中': 'success', '已完成': 'info', '已取消': 'danger' })[s] || 'info'

const disabledDate = (d) => {
  const date = d instanceof Date ? d : (d && typeof d.toDate === 'function' ? d.toDate() : d)
  return dayjs(date).isBefore(dayjs().startOf('day'))
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await api.appointments({
      page: page.value, pageSize: pageSize.value,
      date: searchForm.date, status: searchForm.status, keyword: searchForm.keyword
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { date: null, status: '', keyword: '' })
  page.value = 1
  loadList()
}

const openDialog = () => {
  Object.assign(form, { customer_id: null, pet_id: null, service_id: null, appointment_date: '', start_time: '', remark: '' })
  petList.value = []
  slots.value = []
  dialogVisible.value = true
}

const onCustomerChange = async (cid) => {
  try {
    const res = await api.customerDetail(cid)
    petList.value = res.data.pets || []
    form.pet_id = null
  } catch (e) {
    console.error('加载客户宠物失败', e)
  }
}

const onServiceChange = () => {
  loadSlots()
}

const loadSlots = async () => {
  if (!form.service_id || !form.appointment_date) return
  slotLoading.value = true
  form.start_time = ''
  try {
    const res = await api.availableSlots({ date: form.appointment_date, serviceId: form.service_id })
    slots.value = res.data
  } catch (e) {
    console.error('加载时段失败', e)
  } finally {
    slotLoading.value = false
  }
}

const saveItem = async () => {
  if (!form.customer_id || !form.pet_id || !form.service_id || !form.appointment_date || !form.start_time) {
    return ElMessage.warning('请完善预约信息')
  }
  try {
    await api.addAppointment(form)
    ElMessage.success('预约成功')
    dialogVisible.value = false
    loadList()
  } catch (e) {
    if (e && e.conflicts && e.conflicts.length) {
      conflictList.value = e.conflicts.map(c => ({ detail: c }))
      conflictVisible.value = true
    }
  }
}

const changeStatus = async (row, status) => {
  try {
    const actionText = { '已确认': '确认预约', '服务中': '开始服务', '已完成': '完成服务', '已取消': '取消预约' }[status] || '变更状态'
    await ElMessageBox.confirm(`确定【${actionText}】吗？`, '确认操作')
    const res = await api.updateAppointmentStatus(row.id, { status })
    ElMessage.success(res.message || '状态更新成功')
    if (status === '已完成' && res.orderCreated) {
      ElMessage.info('已自动生成待结算订单，可在订单管理中查看')
    }
    loadList()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('状态变更失败', e)
    }
  }
}

const goCheckout = (row) => {
  router.push({ path: '/checkout', query: { type: 'appointment', sourceId: row.id, customerId: row.customer_id, serviceName: row.service_name, price: row.service_price } })
}

const removeItem = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除预约 ${row.appointment_no} 吗？`, '确认', { type: 'warning' })
    await api.deleteAppointment(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败', e)
    }
  }
}

onMounted(async () => {
  loadList()
  try { customerList.value = (await api.allCustomers()).data } catch (e) { console.error(e) }
  try { serviceList.value = (await api.services({ active: 1 })).data } catch (e) { console.error(e) }
})
</script>
