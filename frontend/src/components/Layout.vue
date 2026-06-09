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
          <el-badge v-if="reminderCount > 0" :value="reminderCount" :max="99" class="item">
            <el-button type="warning" plain size="small" @click="showReminders">
              <el-icon><Bell /></el-icon>寄养提醒
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import request from '@/api'

const route = useRoute()
const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '')
const today = dayjs().format('YYYY年MM月DD日 dddd')

const reminderVisible = ref(false)
const reminderCount = ref(0)
const reminders = ref([])

const loadReminders = async () => {
  try {
    const res = await request.get('/boarding/reminders')
    reminders.value = res.data || []
    reminderCount.value = reminders.value.length
  } catch (e) {}
}

const showReminders = () => {
  loadReminders()
  reminderVisible.value = true
}

onMounted(() => {
  loadReminders()
  setInterval(loadReminders, 60000)
})
</script>
