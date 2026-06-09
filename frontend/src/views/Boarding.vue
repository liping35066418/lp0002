<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">寄养管理</div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>登记入店</el-button>
    </div>

    <div class="search-bar">
      <el-select v-model="searchForm.status" placeholder="状态" clearable style="width: 140px;">
        <el-option label="在住" value="在住" />
        <el-option label="已离店" value="已离店" />
      </el-select>
      <el-input v-model="searchForm.keyword" placeholder="客户/宠物/电话" clearable style="width: 200px;" />
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="boarding_no" label="寄养单号" width="170" />
      <el-table-column prop="pet_name" label="宠物" width="110">
        <template #default="{ row }">
          <span>{{ row.pet_name }}</span>
          <el-tag size="small" style="margin-left: 4px;">{{ row.species }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="主人" width="170">
        <template #default="{ row }">{{ row.customer_name }} · {{ row.customer_phone }}</template>
      </el-table-column>
      <el-table-column label="入住" width="180">
        <template #default="{ row }">{{ row.check_in_date }} {{ row.check_in_time }}</template>
      </el-table-column>
      <el-table-column label="预计离店" width="180">
        <template #default="{ row }">
          <span>{{ row.expected_check_out_date }} {{ row.expected_check_out_time }}</span>
          <el-tag v-if="row.status === '在住' && isExpired(row)" type="danger" size="small" style="margin-left: 6px;">到期</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="room_no" label="房间" width="90" />
      <el-table-column prop="daily_fee" label="日费" width="80">
        <template #default="{ row }">¥{{ row.daily_fee }}</template>
      </el-table-column>
      <el-table-column label="天数/预估" width="130">
        <template #default="{ row }">
          <div>{{ Math.ceil(row.days) }} 天</div>
          <div style="color: #909399; font-size: 12px;">¥{{ (row.days * row.daily_fee).toFixed(2) }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === '在住' ? 'success' : 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          <el-button link type="primary" @click="addRecord(row)" v-if="row.status === '在住'">每日记录</el-button>
          <el-button link type="warning" @click="checkoutBoarding(row)" v-if="row.status === '在住'">离店结算</el-button>
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

    <el-dialog v-model="dialogVisible" title="寄养入店登记" width="600px">
      <el-form :model="form" label-width="110px">
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
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="入住日期" required>
              <el-date-picker v-model="form.check_in_date" type="date" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入住时间" required>
              <el-time-picker v-model="form.check_in_time" value-format="HH:mm" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="预计离店日" required>
              <el-date-picker v-model="form.expected_check_out_date" type="date" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预计离店时" required>
              <el-time-picker v-model="form.expected_check_out_time" value-format="HH:mm" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="房间号">
              <el-input v-model="form.room_no" placeholder="如：寄养区A01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每日费用(元)" required>
              <el-input-number v-model="form.daily_fee" :min="0" :precision="2" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="押金(元)">
          <el-input-number v-model="form.deposit" :min="0" :precision="2" style="width: 50%;" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="特殊饮食、护理要求等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">确认入店</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="寄养详情" width="700px">
      <el-descriptions v-if="detail" :column="2" border size="small">
        <el-descriptions-item label="寄养单号">{{ detail.boarding_no }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="detail.status === '在住' ? 'success' : 'info'">{{ detail.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="宠物">{{ detail.pet_name }} ({{ detail.species }}/{{ detail.breed }})</el-descriptions-item>
        <el-descriptions-item label="主人">{{ detail.customer_name }} · {{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="入住">{{ detail.check_in_date }} {{ detail.check_in_time }}</el-descriptions-item>
        <el-descriptions-item label="预计离店">{{ detail.expected_check_out_date }} {{ detail.expected_check_out_time }}</el-descriptions-item>
        <el-descriptions-item label="实际离店">{{ detail.actual_check_out_date ? detail.actual_check_out_date + ' ' + detail.actual_check_out_time : '-' }}</el-descriptions-item>
        <el-descriptions-item label="费用">¥{{ detail.daily_fee }}/天 · 共{{ Math.ceil(detail.total_days || 1) }}天 · ¥{{ ((detail.total_days||1) * detail.daily_fee).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider>每日照料记录</el-divider>
      <el-button type="primary" plain size="small" style="margin-bottom: 12px;" @click="recordForm.boarding_id = detail?.id; recordVisible = true">
        <el-icon><Plus /></el-icon>新增记录
      </el-button>
      <el-table v-if="detail?.records?.length" :data="detail.records" size="small" border>
        <el-table-column prop="record_date" label="日期" width="110" />
        <el-table-column prop="food_condition" label="进食情况" />
        <el-table-column prop="mood" label="精神状态" width="100" />
        <el-table-column prop="health_status" label="健康状况" width="100" />
        <el-table-column prop="walk_info" label="遛弯情况" />
        <el-table-column prop="other_notes" label="备注" />
      </el-table>
      <el-empty v-else description="暂无每日记录" />
    </el-dialog>

    <el-dialog v-model="recordVisible" title="新增每日记录" width="550px">
      <el-form :model="recordForm" label-width="100px">
        <el-form-item label="记录日期" required>
          <el-date-picker v-model="recordForm.record_date" type="date" value-format="YYYY-MM-DD" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="进食情况">
          <el-input v-model="recordForm.food_condition" placeholder="如：进食正常，食欲良好" />
        </el-form-item>
        <el-form-item label="精神状态">
          <el-select v-model="recordForm.mood" style="width: 100%;">
            <el-option label="活泼" value="活泼" /><el-option label="正常" value="正常" /><el-option label="萎靡" value="萎靡" />
          </el-select>
        </el-form-item>
        <el-form-item label="健康状况">
          <el-select v-model="recordForm.health_status" style="width: 100%;">
            <el-option label="健康" value="健康" /><el-option label="一般" value="一般" /><el-option label="不适" value="不适" />
          </el-select>
        </el-form-item>
        <el-form-item label="遛弯情况">
          <el-input v-model="recordForm.walk_info" placeholder="遛弯时长、排便情况等" />
        </el-form-item>
        <el-form-item label="其他备注">
          <el-input v-model="recordForm.other_notes" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recordVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRecord">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
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
const searchForm = reactive({ status: '', keyword: '' })

const customerList = ref([])
const petList = ref([])
const detail = ref(null)

const dialogVisible = ref(false)
const detailVisible = ref(false)
const recordVisible = ref(false)

const form = reactive({
  customer_id: null, pet_id: null, check_in_date: '', check_in_time: '09:00',
  expected_check_out_date: '', expected_check_out_time: '18:00', room_no: '', daily_fee: 68, deposit: 0, remark: ''
})

const recordForm = reactive({ boarding_id: null, record_date: '', food_condition: '', mood: '正常', health_status: '健康', walk_info: '', other_notes: '' })

const isExpired = (row) => dayjs(row.expected_check_out_date).isBefore(dayjs().startOf('day'))

const loadList = async () => {
  loading.value = true
  try {
    const res = await api.boardingList({
      page: page.value, pageSize: pageSize.value,
      status: searchForm.status, keyword: searchForm.keyword
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const resetSearch = () => { Object.assign(searchForm, { status: '', keyword: '' }); page.value = 1; loadList() }

const openDialog = () => {
  Object.assign(form, {
    customer_id: null, pet_id: null,
    check_in_date: dayjs().format('YYYY-MM-DD'), check_in_time: dayjs().format('HH:mm'),
    expected_check_out_date: dayjs().add(1, 'day').format('YYYY-MM-DD'), expected_check_out_time: '18:00',
    room_no: '', daily_fee: 68, deposit: 0, remark: ''
  })
  petList.value = []
  dialogVisible.value = true
}

const onCustomerChange = async (cid) => {
  try {
    const res = await api.customerDetail(cid)
    petList.value = res.data.pets || []
    form.pet_id = null
  } catch (e) {}
}

const saveItem = async () => {
  if (!form.customer_id || !form.pet_id || !form.check_in_date || !form.expected_check_out_date) {
    return ElMessage.warning('请完善信息')
  }
  try {
    await api.addBoarding(form)
    ElMessage.success('入店登记成功')
    dialogVisible.value = false
    loadList()
  } catch (e) {}
}

const viewDetail = async (row) => {
  try {
    const res = await api.boardingDetail(row.id)
    detail.value = res.data
    detailVisible.value = true
  } catch (e) {}
}

const addRecord = async (row) => {
  recordForm.boarding_id = row.id
  recordForm.record_date = dayjs().format('YYYY-MM-DD')
  Object.assign(recordForm, { food_condition: '', mood: '正常', health_status: '健康', walk_info: '', other_notes: '' })
  recordVisible.value = true
}

const submitRecord = async () => {
  if (!recordForm.record_date) return ElMessage.warning('请选择日期')
  try {
    await api.addBoardingRecord(recordForm.boarding_id, recordForm)
    ElMessage.success('记录成功')
    recordVisible.value = false
    if (detail.value?.id === recordForm.boarding_id) {
      viewDetail({ id: recordForm.boarding_id })
    }
  } catch (e) {}
}

const checkoutBoarding = (row) => {
  const days = dayjs().diff(dayjs(row.check_in_date), 'day') + 1
  const totalFee = days * row.daily_fee
  router.push({
    path: '/checkout',
    query: {
      type: 'boarding', sourceId: row.id, customerId: row.customer_id,
      serviceName: `寄养${days}天`, price: totalFee, dailyFee: row.daily_fee, days: days, petName: row.pet_name
    }
  })
}

const removeItem = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除寄养记录 ${row.boarding_no} 吗？`, '确认', { type: 'warning' })
    await api.deleteBoarding(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {}
}

onMounted(async () => {
  loadList()
  try { customerList.value = (await api.allCustomers()).data } catch (e) {}
})
</script>
