<template>
  <el-container style="height: 100vh;">
    <el-aside width="220px" style="background: #001529;">
      <div style="color: #fff; padding: 20px; text-align: center; border-bottom: 1px solid #1f2d3d;">
        <div style="font-size: 18px; font-weight: bold;">🐾 宠物门店</div>
        <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">管理系统</div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#b7bec9"
        active-text-color="#ffd04b"
        style="border: none;"
      >
        <el-menu-item index="/dashboard"><el-icon><DataLine /></el-icon><span>工作台</span></el-menu-item>
        <el-menu-item index="/customers"><el-icon><User /></el-icon><span>客户管理</span></el-menu-item>
        <el-menu-item index="/pets"><el-icon><Star /></el-icon><span>宠物档案</span></el-menu-item>
        <el-menu-item index="/appointments"><el-icon><Calendar /></el-icon><span>预约管理</span></el-menu-item>
        <el-menu-item index="/boarding"><el-icon><House /></el-icon><span>寄养管理</span></el-menu-item>
        <el-menu-item index="/checkout"><el-icon><Money /></el-icon><span>费用结算</span></el-menu-item>
        <el-menu-item index="/orders"><el-icon><Document /></el-icon><span>订单管理</span></el-menu-item>
        <el-menu-item index="/members"><el-icon><Medal /></el-icon><span>会员管理</span></el-menu-item>
        <el-menu-item index="/products"><el-icon><Goods /></el-icon><span>商品管理</span></el-menu-item>
        <el-menu-item index="/services"><el-icon><Service /></el-icon><span>服务项目</span></el-menu-item>
        <el-menu-item index="/statistics"><el-icon><PieChart /></el-icon><span>统计报表</span></el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #e6e6e6; display: flex; align-items: center; justify-content: space-between;">
        <div style="font-size: 16px; font-weight: 600;">{{ currentTitle }}</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <el-badge v-if="unreadMsgCount > 0" :value="unreadMsgCount" :max="99" class="msg-badge">
            <el-button type="primary" plain size="small" @click="openMessageCenter">
              <el-icon><Bell /></el-icon>消息中心
            </el-button>
          </el-badge>
          <el-badge v-else>
            <el-button type="primary" plain size="small" @click="openMessageCenter">
              <el-icon><Bell /></el-icon>消息中心
            </el-button>
          </el-badge>
          <el-badge v-if="reminderCount > 0" :value="reminderCount" :max="99" class="item">
            <el-button type="warning" plain size="small" @click="showReminders">
              <el-icon><House /></el-icon>寄养提醒
            </el-button>
          </el-badge>
          <span style="color: #909399; font-size: 13px;">{{ today }}</span>
        </div>
      </el-header>
      <el-main style="background: #f5f7fa; padding: 20px;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="reminderVisible" title="寄养到期提醒" width="500px">
    <el-table :data="reminders" size="small" v-if="reminders.length">
      <el-table-column prop="pet_name" label="宠物" width="100" />
      <el-table-column prop="customer_name" label="主人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="expected_check_out_date" label="预计离店" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.days_left <= 0" type="danger">已到期</el-tag>
          <el-tag v-else type="warning">明天到期</el-tag>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无到期提醒" />
  </el-dialog>

  <el-drawer v-model="msgDrawerVisible" title="消息中心" size="480px" direction="rtl">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <el-tabs v-model="msgTab" @tab-change="onMsgTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="寄养日报" name="boarding_daily" />
        <el-tab-pane label="预约提醒" name="appointment_reminder" />
      </el-tabs>
      <el-button type="primary" link size="small" @click="markAllRead" v-if="unreadMsgCount > 0">全部已读</el-button>
    </div>
    <div v-loading="msgLoading" style="min-height: 300px;">
      <el-empty v-if="!msgList.length && !msgLoading" description="暂无消息" />
      <div v-else style="display: flex; flex-direction: column; gap: 10px;">
        <div
          v-for="msg in msgList" :key="msg.id"
          @click="handleMsgClick(msg)"
          :style="{
            padding: '12px 16px',
            border: '1px solid ' + (msg.is_read ? '#ebeef5' : '#409eff'),
            borderRadius: '8px',
            background: msg.is_read ? '#fff' : '#ecf5ff',
            cursor: 'pointer'
          }"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <el-tag size="small" :type="msgTypeColor(msg.type)">{{ msgTypeName(msg.type) }}</el-tag>
              <span style="font-weight: 600; color: #303133;">{{ msg.title }}</span>
            </div>
            <el-tag v-if="!msg.is_read" size="small" type="danger" effect="plain">未读</el-tag>
          </div>
          <div style="color: #606266; font-size: 13px; line-height: 1.6; margin-bottom: 6px;">{{ msg.content }}</div>
          <div style="color: #909399; font-size: 12px; display: flex; justify-content: space-between;">
            <span v-if="msg.customer_name">{{ msg.customer_name }}{{ msg.pet_name ? ' · ' + msg.pet_name : '' }}</span>
            <span>{{ formatTime(msg.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
    <el-pagination
      v-if="msgTotal > pageSize"
      style="margin-top: 16px; justify-content: center; display: flex;"
      background layout="prev, pager, next"
      :total="msgTotal" v-model:current-page="msgPage" :page-size="pageSize"
      @current-change="loadMessages"
    />
  </el-drawer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import request from '@/api'
import { api } from '@/api/modules'
import { ElMessage } from 'element-plus'

const route = useRoute()
const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '')
const today = dayjs().format('YYYY年MM月DD日 dddd')

const reminderVisible = ref(false)
const reminderCount = ref(0)
const reminders = ref([])

const msgDrawerVisible = ref(false)
const msgTab = ref('all')
const msgList = ref([])
const msgTotal = ref(0)
const msgPage = ref(1)
const msgLoading = ref(false)
const unreadMsgCount = ref(0)
const pageSize = 20

const msgTypeColor = (type) => ({
  'boarding_daily': 'success',
  'appointment_reminder': 'warning'
})[type] || 'info'

const msgTypeName = (type) => ({
  'boarding_daily': '寄养日报',
  'appointment_reminder': '预约提醒'
})[type] || '系统消息'

const formatTime = (t) => dayjs(t).format('MM-DD HH:mm')

const loadReminders = async () => {
  try {
    const res = await request.get('/boarding/reminders')
    reminders.value = res.data || []
    reminderCount.value = reminders.value.length
  } catch (e) {}
}

const loadUnreadCount = async () => {
  try {
    const res = await api.unreadNotificationCount()
    unreadMsgCount.value = res.data.count || 0
  } catch (e) {}
}

const loadMessages = async () => {
  msgLoading.value = true
  try {
    const params = { page: msgPage.value, pageSize }
    if (msgTab.value !== 'all') params.type = msgTab.value
    const res = await api.notifications(params)
    msgList.value = res.data.list || []
    msgTotal.value = res.data.total || 0
  } finally {
    msgLoading.value = false
  }
}

const onMsgTabChange = () => {
  msgPage.value = 1
  loadMessages()
}

const openMessageCenter = () => {
  msgPage.value = 1
  msgTab.value = 'all'
  loadMessages()
  msgDrawerVisible.value = true
}

const handleMsgClick = async (msg) => {
  if (!msg.is_read) {
    try {
      await api.markNotificationRead(msg.id)
      msg.is_read = 1
      await loadUnreadCount()
    } catch (e) {}
  }
}

const markAllRead = async () => {
  try {
    await api.markAllNotificationsRead()
    await loadUnreadCount()
    await loadMessages()
    ElMessage.success('已全部标记为已读')
  } catch (e) {}
}

const showReminders = () => {
  loadReminders()
  reminderVisible.value = true
}

watch(msgDrawerVisible, (val) => {
  if (val) {
    loadUnreadCount()
  }
})

onMounted(() => {
  loadReminders()
  loadUnreadCount()
  setInterval(() => {
    loadReminders()
    loadUnreadCount()
  }, 60000)
})
</script>

<style scoped>
.msg-badge :deep(.el-badge__content) {
  background-color: #f56c6c;
}
</style>
