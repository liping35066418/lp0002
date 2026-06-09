<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">服务项目</div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增服务</el-button>
    </div>

    <div class="search-bar">
      <el-select v-model="category" placeholder="分类筛选" clearable style="width: 160px;">
        <el-option label="洗护" value="洗护" />
        <el-option label="美容" value="美容" />
        <el-option label="寄养" value="寄养" />
        <el-option label="SPA" value="SPA" />
      </el-select>
      <el-button type="primary" @click="loadList">筛选</el-button>
      <el-button @click="category = ''; loadList()">重置</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="8" v-for="item in list" :key="item.id">
        <el-card shadow="hover" style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <div style="font-size: 16px; font-weight: 600;">{{ item.name }}</div>
              <el-tag size="small" style="margin-top: 6px;" :type="catTag(item.category)">{{ item.category }}</el-tag>
            </div>
            <el-tag :type="item.is_active ? 'success' : 'info'" size="small">{{ item.is_active ? '启用' : '停用' }}</el-tag>
          </div>
          <el-descriptions :column="2" size="small" style="margin-top: 12px;" border>
            <el-descriptions-item label="时长">{{ item.duration }}分钟</el-descriptions-item>
            <el-descriptions-item label="价格"><b style="color: #f56c6c;">¥{{ item.price }}</b></el-descriptions-item>
          </el-descriptions>
          <div style="color: #909399; font-size: 13px; margin-top: 8px;">{{ item.description || '暂无描述' }}</div>
          <div style="margin-top: 12px; border-top: 1px solid #f0f0f0; padding-top: 12px; display: flex; gap: 8px;">
            <el-button size="small" @click="openDialog(item)">编辑</el-button>
            <el-button size="small" type="danger" @click="toggleActive(item)">{{ item.is_active ? '停用' : '启用' }}</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" :title="editMode ? '编辑服务' : '新增服务'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="服务名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类" required>
              <el-select v-model="form.category" style="width: 100%;">
                <el-option label="洗护" value="洗护" />
                <el-option label="美容" value="美容" />
                <el-option label="寄养" value="寄养" />
                <el-option label="SPA" value="SPA" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时长(分钟)" required>
              <el-input-number v-model="form.duration" :min="10" :step="15" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="价格(元)" required>
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 50%;" />
        </el-form-item>
        <el-form-item label="服务描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.is_active" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api/modules'

const list = ref([])
const category = ref('')

const dialogVisible = ref(false)
const editMode = ref(false)
const currentId = ref(null)
const form = reactive({ name: '', category: '洗护', duration: 60, price: 0, description: '', is_active: 1 })

const catTag = (c) => ({ '洗护': 'success', '美容': 'warning', '寄养': 'info', 'SPA': 'primary' })[c] || ''

const loadList = async () => {
  try {
    const res = await api.services({ category: category.value })
    list.value = res.data
  } catch (e) {}
}

const openDialog = (row) => {
  editMode.value = !!row
  currentId.value = row?.id || null
  if (row) {
    Object.keys(form).forEach(k => form[k] = row[k] ?? form[k])
  } else {
    Object.assign(form, { name: '', category: '洗护', duration: 60, price: 0, description: '', is_active: 1 })
  }
  dialogVisible.value = true
}

const saveItem = async () => {
  if (!form.name || !form.price) return ElMessage.warning('名称和价格必填')
  try {
    if (editMode.value) {
      await api.updateService(currentId.value, form)
      ElMessage.success('更新成功')
    } else {
      await api.addService(form)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {}
}

const toggleActive = async (row) => {
  try {
    await api.updateService(row.id, { ...row, is_active: row.is_active ? 0 : 1 })
    ElMessage.success('状态更新成功')
    loadList()
  } catch (e) {}
}

onMounted(loadList)
</script>
