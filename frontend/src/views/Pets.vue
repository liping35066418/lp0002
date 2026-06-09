<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">宠物档案</div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增档案</el-button>
    </div>

    <div class="search-bar">
      <el-input v-model="searchForm.keyword" placeholder="搜索宠物名/品种" clearable style="width: 220px;" @keyup.enter="loadList">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="searchForm.customerId" placeholder="按客户筛选" clearable filterable style="width: 200px;">
        <el-option v-for="c in customerList" :key="c.id" :label="`${c.name} - ${c.phone}`" :value="c.id" />
      </el-select>
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="照片" width="70" align="center">
        <template #default="{ row }">
          <el-avatar :size="40" v-if="row.photo">{{ row.name?.[0] }}</el-avatar>
          <el-avatar :size="40" v-else>{{ row.name?.[0] || '🐾' }}</el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名字" width="100" />
      <el-table-column prop="species" label="种类" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.species === '猫' ? 'warning' : 'primary'">{{ row.species }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="breed" label="品种" width="120" />
      <el-table-column prop="gender" label="性别" width="70" />
      <el-table-column prop="weight" label="体重(kg)" width="90" />
      <el-table-column prop="body_type" label="体型" width="80" />
      <el-table-column label="主人" width="160">
        <template #default="{ row }">{{ row.customer_name }} · {{ row.customer_phone }}</template>
      </el-table-column>
      <el-table-column prop="special_habit" label="特殊习性" show-overflow-tooltip />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
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

    <el-dialog v-model="dialogVisible" :title="editMode ? '编辑宠物' : '新增宠物'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="主人" required>
          <el-select v-model="form.customer_id" filterable placeholder="请选择主人" style="width: 100%;">
            <el-option v-for="c in customerList" :key="c.id" :label="`${c.name} - ${c.phone}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="宠物名" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="种类" required>
              <el-select v-model="form.species" style="width: 100%;">
                <el-option label="狗" value="狗" />
                <el-option label="猫" value="猫" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="品种">
              <el-input v-model="form.breed" placeholder="如：金毛、英短" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="form.gender" style="width: 100%;">
                <el-option label="公" value="公" />
                <el-option label="母" value="母" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生日">
              <el-date-picker v-model="form.birthday" type="date" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="体重(kg)">
              <el-input-number v-model="form.weight" :precision="2" :min="0" :step="0.1" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="体型">
              <el-select v-model="form.body_type" style="width: 100%;">
                <el-option label="小型" value="小型" />
                <el-option label="中型" value="中型" />
                <el-option label="大型" value="大型" />
                <el-option label="超大型" value="超大型" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="过敏史">
              <el-input v-model="form.allergy" placeholder="药物/食物过敏" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="特殊习性">
          <el-input v-model="form.special_habit" type="textarea" :rows="2" placeholder="性格特点、洗护注意事项等" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" :title="`宠物档案 - ${detail?.name}`" width="780px" top="5vh">
      <el-tabs v-model="detailTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions v-if="detail" :column="2" border>
            <el-descriptions-item label="名字">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="种类">{{ detail.species }}</el-descriptions-item>
            <el-descriptions-item label="品种">{{ detail.breed || '-' }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ detail.gender || '-' }}</el-descriptions-item>
            <el-descriptions-item label="生日">{{ detail.birthday || '-' }}</el-descriptions-item>
            <el-descriptions-item label="体重">{{ detail.weight ? detail.weight + ' kg' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="体型">{{ detail.body_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="过敏史">{{ detail.allergy || '无' }}</el-descriptions-item>
            <el-descriptions-item label="主人" :span="2">{{ detail.customer_name }} · {{ detail.customer_phone }}</el-descriptions-item>
            <el-descriptions-item label="特殊习性" :span="2">{{ detail.special_habit || '无' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="服务记录" name="history">
          <div v-loading="historyLoading" style="min-height: 200px;">
            <el-empty v-if="!serviceHistory.length && !historyLoading" description="暂无服务记录" />
            <el-timeline v-else>
              <el-timeline-item
                v-for="item in serviceHistory" :key="item.id"
                :timestamp="`${item.appointment_date} ${item.start_time}`"
                placement="top"
                :type="timelineType(item.category)"
                :hollow="true"
              >
                <el-card shadow="never" style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <el-tag size="small" :type="categoryType(item.category)">{{ item.category || '服务' }}</el-tag>
                      <span style="font-size: 15px; font-weight: 600;">{{ item.service_name }}</span>
                    </div>
                    <div style="font-size: 15px; font-weight: bold; color: #f56c6c;">¥{{ item.price }}</div>
                  </div>
                  <div style="display: flex; gap: 16px; color: #606266; font-size: 13px; margin-bottom: 8px; flex-wrap: wrap;">
                    <span>美容师：{{ item.staff_name || '-' }}</span>
                    <span>预约号：{{ item.appointment_no }}</span>
                  </div>
                  <el-alert
                    v-if="item.service_remark"
                    :title="item.service_remark"
                    type="warning"
                    :closable="false"
                    show-icon
                    style="margin-top: 8px;"
                  >
                    <template #title>
                      <span style="font-weight: 500;">服务备注：</span>{{ item.service_remark }}
                    </template>
                  </el-alert>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api/modules'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const customerList = ref([])
const searchForm = reactive({ keyword: '', customerId: null })

const dialogVisible = ref(false)
const detailVisible = ref(false)
const editMode = ref(false)
const currentId = ref(null)
const detail = ref(null)
const detailTab = ref('basic')
const serviceHistory = ref([])
const historyLoading = ref(false)
const form = reactive({
  customer_id: null, name: '', species: '', breed: '', gender: '', birthday: '',
  weight: 0, body_type: '', special_habit: '', allergy: '', photo: '', remark: ''
})

const categoryType = (c) => ({ '洗护': 'success', '美容': 'warning', 'SPA': 'info' })[c] || 'primary'
const timelineType = (c) => ({ '洗护': 'success', '美容': 'warning', 'SPA': 'primary' })[c] || ''

const loadList = async () => {
  loading.value = true
  try {
    const res = await api.pets({ page: page.value, pageSize: pageSize.value, keyword: searchForm.keyword, customerId: searchForm.customerId })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const loadCustomers = async () => {
  try {
    const res = await api.allCustomers()
    customerList.value = res.data
  } catch (e) {}
}

const loadServiceHistory = async (petId) => {
  historyLoading.value = true
  try {
    const res = await api.petServiceHistory(petId)
    serviceHistory.value = res.data || []
  } finally {
    historyLoading.value = false
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.customerId = null
  page.value = 1
  loadList()
}

const openDialog = (row) => {
  editMode.value = !!row
  currentId.value = row?.id || null
  if (row) {
    Object.keys(form).forEach(k => form[k] = row[k] ?? form[k])
  } else {
    Object.assign(form, { customer_id: null, name: '', species: '', breed: '', gender: '', birthday: '', weight: 0, body_type: '', special_habit: '', allergy: '', photo: '', remark: '' })
  }
  dialogVisible.value = true
}

const saveItem = async () => {
  if (!form.customer_id || !form.name || !form.species) return ElMessage.warning('请填写必填项')
  try {
    if (editMode.value) {
      await api.updatePet(currentId.value, form)
      ElMessage.success('更新成功')
    } else {
      await api.addPet(form)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {}
}

const removeItem = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除宠物【${row.name}】的档案吗？`, '确认', { type: 'warning' })
    await api.deletePet(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {}
}

const viewDetail = async (row) => {
  try {
    const res = await api.petDetail(row.id)
    detail.value = res.data
    detailTab.value = 'basic'
    detailVisible.value = true
    await loadServiceHistory(row.id)
  } catch (e) {}
}

watch(detailTab, (val) => {
  if (val === 'history' && detail.value) {
    loadServiceHistory(detail.value.id)
  }
})

onMounted(() => {
  loadList()
  loadCustomers()
})
</script>
