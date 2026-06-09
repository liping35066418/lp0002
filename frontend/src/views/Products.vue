<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">商品管理</div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增商品</el-button>
    </div>

    <div class="search-bar">
      <el-input v-model="searchForm.keyword" placeholder="搜索商品名/条码" clearable style="width: 220px;" @keyup.enter="loadList" />
      <el-select v-model="searchForm.category" placeholder="分类" clearable style="width: 140px;">
        <el-option label="主粮" value="主粮" />
        <el-option label="零食" value="零食" />
        <el-option label="药品" value="药品" />
        <el-option label="日用品" value="日用品" />
      </el-select>
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="商品名" min-width="160" />
      <el-table-column prop="category" label="分类" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="catTag(row.category)">{{ row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="barcode" label="条码" width="140" />
      <el-table-column prop="stock" label="库存" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.stock > 10 ? 'success' : row.stock > 0 ? 'warning' : 'danger'">{{ row.stock }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="cost_price" label="成本价" width="100">
        <template #default="{ row }">¥{{ Number(row.cost_price).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="price" label="售价" width="100">
        <template #default="{ row }"><b style="color: #f56c6c;">¥{{ Number(row.price).toFixed(2) }}</b></template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="stockDialog(row)">入库</el-button>
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="removeItem(row)">下架</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; justify-content: flex-end; display: flex;"
      background layout="total, sizes, prev, pager, next"
      :total="total" v-model:current-page="page" v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]" @current-change="loadList" @size-change="loadList"
    />

    <el-dialog v-model="dialogVisible" :title="editMode ? '编辑商品' : '新增商品'" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="商品名" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-select v-model="form.category" style="width: 100%;">
                <el-option label="主粮" value="主粮" />
                <el-option label="零食" value="零食" />
                <el-option label="药品" value="药品" />
                <el-option label="日用品" value="日用品" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位">
              <el-input v-model="form.unit" placeholder="如：袋/盒/瓶" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="条码">
          <el-input v-model="form.barcode" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="库存">
              <el-input-number v-model="form.stock" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="成本价">
              <el-input-number v-model="form.cost_price" :min="0" :precision="2" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="售价" required>
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockVisible" :title="`入库 - ${currentItem?.name}`" width="400px">
      <el-form label-width="90px">
        <el-form-item label="当前库存"><span style="color: #409eff;">{{ currentItem?.stock }}</span></el-form-item>
        <el-form-item label="入库数量" required>
          <el-input-number v-model="stockChange" :min="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="操作原因">
          <el-input v-model="stockReason" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStock">确认入库</el-button>
      </template>
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
const searchForm = reactive({ keyword: '', category: '' })

const dialogVisible = ref(false)
const editMode = ref(false)
const currentId = ref(null)
const form = reactive({ name: '', category: '', barcode: '', stock: 0, price: 0, cost_price: 0, unit: '件' })

const stockVisible = ref(false)
const currentItem = ref(null)
const stockChange = ref(1)
const stockReason = ref('')

const catTag = (c) => ({ '主粮': 'primary', '零食': 'warning', '药品': 'danger', '日用品': 'info' })[c] || ''

const loadList = async () => {
  loading.value = true
  try {
    const res = await api.products({
      page: page.value, pageSize: pageSize.value,
      keyword: searchForm.keyword, category: searchForm.category
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const resetSearch = () => { Object.assign(searchForm, { keyword: '', category: '' }); page.value = 1; loadList() }

const openDialog = (row) => {
  editMode.value = !!row
  currentId.value = row?.id || null
  if (row) {
    Object.keys(form).forEach(k => form[k] = row[k] ?? form[k])
  } else {
    Object.assign(form, { name: '', category: '', barcode: '', stock: 0, price: 0, cost_price: 0, unit: '件' })
  }
  dialogVisible.value = true
}

const saveItem = async () => {
  if (!form.name || !form.price) return ElMessage.warning('商品名和售价必填')
  try {
    if (editMode.value) {
      await api.updateProduct(currentId.value, form)
      ElMessage.success('更新成功')
    } else {
      await api.addProduct(form)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {}
}

const stockDialog = (row) => { currentItem.value = row; stockChange.value = 1; stockReason.value = ''; stockVisible.value = true }

const submitStock = async () => {
  if (!stockChange.value) return ElMessage.warning('请输入数量')
  try {
    await api.updateStock(currentItem.value.id, { change: stockChange.value, reason: stockReason.value })
    ElMessage.success(`入库成功，+${stockChange.value}`)
    stockVisible.value = false
    loadList()
  } catch (e) {}
}

const removeItem = async (row) => {
  try {
    await ElMessageBox.confirm(`确定下架商品【${row.name}】吗？`, '确认', { type: 'warning' })
    await api.deleteProduct(row.id)
    ElMessage.success('已下架')
    loadList()
  } catch (e) {}
}

onMounted(loadList)
</script>
