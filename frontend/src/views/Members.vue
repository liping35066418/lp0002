<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">会员管理</div>
      <el-button type="primary" @click="openMemberDialog"><el-icon><Plus /></el-icon>开卡</el-button>
    </div>

    <div class="search-bar">
      <el-input v-model="searchForm.keyword" placeholder="搜索姓名/手机号/会员号" clearable style="width: 260px;" @keyup.enter="loadList">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="member_no" label="会员号" width="170" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="level" label="等级" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="levelType(row.level)">{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="balance" label="余额" width="120">
        <template #default="{ row }"><b style="color: #f56c6c;">¥{{ Number(row.balance).toFixed(2) }}</b></template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="100">
        <template #default="{ row }"><b style="color: #e6a23c;">{{ row.points }}</b></template>
      </el-table-column>
      <el-table-column prop="join_date" label="入会时间" width="170" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openRecharge(row)">充值</el-button>
          <el-button link type="warning" @click="openExchange(row)">积分兑换</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; justify-content: flex-end; display: flex;"
      background layout="total, sizes, prev, pager, next"
      :total="total" v-model:current-page="page" v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]" @current-change="loadList" @size-change="loadList"
    />

    <el-dialog v-model="memberDialogVisible" title="会员开卡" width="500px">
      <el-form :model="memberForm" label-width="90px">
        <el-form-item label="选择客户" required>
          <el-select v-model="memberForm.customer_id" filterable placeholder="请选择客户" style="width: 100%;">
            <el-option v-for="c in nonMembers" :key="c.id" :label="`${c.name} - ${c.phone}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始充值">
          <el-input-number v-model="memberForm.balance" :min="0" :precision="2" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMember">确认开卡</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rechargeVisible" :title="`充值 - ${currentMember?.name}`" width="450px">
      <el-form label-width="90px">
        <el-form-item label="当前余额">
          <span style="color: #f56c6c; font-size: 16px; font-weight: bold;">¥{{ Number(currentMember?.balance || 0).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="充值金额" required>
          <el-select v-model="rechargeAmount" placeholder="选择充值金额" style="width: 100%;">
            <el-option :value="100" label="100元" />
            <el-option :value="300" label="300元 (送30)" />
            <el-option :value="500" label="500元 (送80)" />
            <el-option :value="1000" label="1000元 (送200)" />
          </el-select>
        </el-form-item>
        <el-form-item label="自定义金额">
          <el-input-number v-model="customAmount" :min="0" :precision="2" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRecharge">确认充值</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="exchangeVisible" :title="`积分兑换 - ${currentMember?.name}`" width="450px">
      <el-form label-width="90px">
        <el-form-item label="当前积分">
          <b style="color: #e6a23c; font-size: 16px;">{{ currentMember?.points || 0 }} 分</b>
        </el-form-item>
        <el-form-item label="兑换商品" required>
          <el-radio-group v-model="selectedExchange">
            <div v-for="ex in exchangeList" :key="ex.points" style="padding: 8px; border: 1px solid #e4e7ed; border-radius: 4px; margin-bottom: 8px;">
              <el-radio :label="ex.points" :disabled="currentMember?.points < ex.points">
                <b>{{ ex.reward }}</b> · <span style="color: #e6a23c;">{{ ex.points }}分</span>
              </el-radio>
            </div>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exchangeVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedExchange" @click="submitExchange">确认兑换</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api/modules'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const searchForm = reactive({ keyword: '' })
const nonMembers = ref([])

const memberDialogVisible = ref(false)
const memberForm = reactive({ customer_id: null, balance: 0 })

const rechargeVisible = ref(false)
const rechargeAmount = ref(null)
const customAmount = ref(0)
const currentMember = ref(null)

const exchangeVisible = ref(false)
const selectedExchange = ref(0)
const exchangeList = [
  { points: 100, reward: '宠物零食礼包' },
  { points: 200, reward: '免费基础洗护1次' },
  { points: 500, reward: '免费精致洗护1次' },
  { points: 1000, reward: '免费造型美容1次' },
  { points: 2000, reward: '3天免费寄养' }
]

const levelType = (l) => ({ '普通': 'info', '银卡': '', '金卡': 'warning', '钻石': 'success' })[l] || 'info'

const loadList = async () => {
  loading.value = true
  try {
    const res = await api.members({ page: page.value, pageSize: pageSize.value, keyword: searchForm.keyword })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const loadNonMembers = async () => {
  try {
    const res = await api.customers({ pageSize: 9999 })
    const members = (await api.members({ pageSize: 9999 })).data.list.map(m => m.customer_id)
    nonMembers.value = res.data.list.filter(c => !members.includes(c.id))
  } catch (e) {}
}

const resetSearch = () => { searchForm.keyword = ''; page.value = 1; loadList() }

const openMemberDialog = () => { loadNonMembers(); memberForm.customer_id = null; memberForm.balance = 0; memberDialogVisible.value = true }

const submitMember = async () => {
  if (!memberForm.customer_id) return ElMessage.warning('请选择客户')
  try {
    await api.addMember(memberForm)
    ElMessage.success('开卡成功')
    memberDialogVisible.value = false
    loadList()
  } catch (e) {}
}

const openRecharge = (row) => { currentMember.value = row; rechargeAmount.value = null; customAmount.value = 0; rechargeVisible.value = true }

const submitRecharge = async () => {
  const amount = customAmount.value || rechargeAmount.value
  if (!amount || amount <= 0) return ElMessage.warning('请输入充值金额')
  try {
    await api.rechargeMember(currentMember.value.id, { amount })
    ElMessage.success(`充值成功，已充值¥${amount}`)
    rechargeVisible.value = false
    loadList()
  } catch (e) {}
}

const openExchange = (row) => { currentMember.value = row; selectedExchange.value = 0; exchangeVisible.value = true }

const submitExchange = async () => {
  if (!selectedExchange.value) return ElMessage.warning('请选择兑换项目')
  const reward = exchangeList.find(e => e.points === selectedExchange.value)?.reward
  try {
    await api.exchangePoints(currentMember.value.id, { points: selectedExchange.value, reward })
    ElMessage.success(`兑换成功：${reward}`)
    exchangeVisible.value = false
    loadList()
  } catch (e) {}
}

onMounted(loadList)
</script>
