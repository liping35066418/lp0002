<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">客户管理</div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增客户</el-button>
    </div>

    <div class="search-bar">
      <el-input v-model="searchForm.keyword" placeholder="搜索姓名/手机号" clearable style="width: 240px;" @clear="loadList" @keyup.enter="loadList">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="address" label="地址" show-overflow-tooltip />
      <el-table-column label="会员信息" width="240">
        <template #default="{ row }">
          <template v-if="row.member_no">
            <el-tag type="success" size="small">{{ row.member_level }}</el-tag>
            <span style="margin-left: 8px;">余额:¥{{ Number(row.balance).toFixed(2) }}</span>
            <span style="margin-left: 8px;">{{ row.points }}积分</span>
          </template>
          <el-tag v-else type="info" size="small">非会员</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="pet_count" label="宠物数" width="80" align="center" />
      <el-table-column prop="created_at" label="登记时间" width="170" />
      <el-table-column label="操作" width="200" fixed="right">
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

    <el-dialog v-model="dialogVisible" :title="editMode ? '编辑客户' : '新增客户'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入客户姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" :title="`客户详情 - ${detail?.name}`" width="650px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ detail.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="会员号">{{ detail.member_no || '非会员' }}</el-descriptions-item>
        <el-descriptions-item label="会员等级">{{ detail.member_level || '-' }}</el-descriptions-item>
        <el-descriptions-item label="余额">¥{{ Number(detail.balance || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="积分">{{ detail.points || 0 }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>关联宠物</el-divider>
      <el-table v-if="detail?.pets?.length" :data="detail.pets" size="small">
        <el-table-column prop="name" label="名字" />
        <el-table-column prop="species" label="品种" />
        <el-table-column prop="breed" label="种类" />
        <el-table-column prop="gender" label="性别" />
        <el-table-column prop="weight" label="体重(kg)" />
      </el-table>
      <el-empty v-else description="暂无宠物档案" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api/modules'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const searchForm = reactive({ keyword: '' })

const dialogVisible = ref(false)
const detailVisible = ref(false)
const editMode = ref(false)
const currentId = ref(null)
const detail = ref(null)
const form = reactive({ name: '', phone: '', address: '', remark: '' })

const loadList = async () => {
  loading.value = true
  try {
    const res = await api.customers({ page: page.value, pageSize: pageSize.value, keyword: searchForm.keyword })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  page.value = 1
  loadList()
}

const openDialog = (row) => {
  editMode.value = !!row
  currentId.value = row?.id || null
  if (row) {
    Object.assign(form, { name: row.name, phone: row.phone, address: row.address || '', remark: row.remark || '' })
  } else {
    Object.assign(form, { name: '', phone: '', address: '', remark: '' })
  }
  dialogVisible.value = true
}

const saveItem = async () => {
  if (!form.name || !form.phone) return ElMessage.warning('姓名和手机号必填')
  try {
    if (editMode.value) {
      await api.updateCustomer(currentId.value, form)
      ElMessage.success('更新成功')
    } else {
      await api.addCustomer(form)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {}
}

const removeItem = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除客户【${row.name}】吗？`, '确认', { type: 'warning' })
    await api.deleteCustomer(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {}
}

const viewDetail = async (row) => {
  try {
    const res = await api.customerDetail(row.id)
    detail.value = res.data
    detailVisible.value = true
  } catch (e) {}
}

onMounted(loadList)
</script>
