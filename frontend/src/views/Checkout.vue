<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">费用结算</div>
    </div>

    <el-card style="margin-bottom: 20px;">
      <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
        <el-select v-model="currentCustomerId" filterable placeholder="选择客户" style="width: 280px;" @change="onCustomerChange">
          <el-option v-for="c in customerList" :key="c.id" :label="`${c.name} - ${c.phone}`" :value="c.id" />
        </el-select>
        <template v-if="customerInfo">
          <el-tag v-if="customerInfo.member_no" type="success">{{ customerInfo.member_level }}会员</el-tag>
          <span v-if="customerInfo.member_no">余额: <b style="color: #f56c6c;">¥{{ Number(customerInfo.balance || 0).toFixed(2) }}</b></span>
          <span v-if="customerInfo.member_no">积分: <b style="color: #e6a23c;">{{ customerInfo.points || 0 }}</b></span>
        </template>
      </div>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card style="margin-bottom: 16px;">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 600;">消费项目</div>
              <div>
                <el-button size="small" @click="showServicePicker = true">添加服务</el-button>
                <el-button size="small" @click="showProductPicker = true">添加商品</el-button>
              </div>
            </div>
          </template>
          <el-table :data="orderItems" border>
            <el-table-column label="项目" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tag size="small" style="margin-right: 6px;">{{ row.item_type }}</el-tag>
                {{ row.item_name }}
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100">
              <template #default="{ row }">¥{{ Number(row.unit_price).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.quantity" :min="1" size="small" @change="updateSubtotal($index)" />
              </template>
            </el-table-column>
            <el-table-column label="小计" width="120">
              <template #default="{ row }">¥{{ Number(row.subtotal).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="orderItems.splice($index, 1)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!orderItems.length" description="请添加消费项目" />
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header><div style="font-weight: 600;">结算信息</div></template>
          <el-form label-width="90px">
            <el-form-item label="消费类型">
              <el-select v-model="orderType" style="width: 100%;">
                <el-option label="服务消费" value="appointment" />
                <el-option label="寄养消费" value="boarding" />
                <el-option label="商品销售" value="product" />
                <el-option label="混合消费" value="mixed" />
              </el-select>
            </el-form-item>
            <el-divider style="margin: 8px 0;" />
            <div style="padding: 8px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>商品合计</span>
                <span>¥{{ totalAmount.toFixed(2) }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
                <span>折扣减免</span>
                <el-input-number v-model="discountAmount" :min="0" :max="totalAmount" size="small" :precision="2" style="width: 140px;" />
              </div>
              <el-divider style="margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;" v-if="customerInfo?.member_no">
                <span>余额抵扣</span>
                <el-input-number v-model="useBalance" :min="0" :max="Number(customerInfo.balance || 0)" size="small" :precision="2" style="width: 140px;" />
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;" v-if="customerInfo?.member_no && customerInfo.points > 0">
                <span>积分抵扣(1积分=1元)</span>
                <el-input-number v-model="usePoints" :min="0" :max="customerInfo.points" size="small" style="width: 140px;" />
              </div>
              <el-divider style="margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>支付方式</span>
                <el-select v-model="payMethod" style="width: 140px;">
                  <el-option label="现金" value="现金" />
                  <el-option label="微信" value="微信" />
                  <el-option label="支付宝" value="支付宝" />
                  <el-option label="银行卡" value="银行卡" />
                </el-select>
              </div>
              <el-divider style="margin: 8px 0;" />
              <div style="padding: 12px; background: #fdf6ec; border-radius: 4px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 600;">应付金额</span>
                  <span style="font-size: 22px; font-weight: bold; color: #f56c6c;">¥{{ payAmount.toFixed(2) }}</span>
                </div>
                <div v-if="earnPoints > 0" style="font-size: 12px; color: #909399;">本单预计获得积分: +{{ earnPoints }}</div>
              </div>
              <el-form-item label="备注">
                <el-input v-model="remark" type="textarea" :rows="2" />
              </el-form-item>
            </div>
          </el-form>
          <el-button type="primary" style="width: 100%;" @click="submitCheckout" :disabled="!currentCustomerId || !orderItems.length || payAmount < 0">
            <el-icon><Money /></el-icon>确认结算
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showServicePicker" title="选择服务项目" width="500px">
      <el-table :data="serviceList" border>
        <el-table-column prop="name" label="服务名" />
        <el-table-column prop="category" label="类型" width="80" />
        <el-table-column prop="duration" label="时长" width="80">
          <template #default="{ row }">{{ row.duration }}分钟</template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" @click="addService(row)">添加</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="showProductPicker" title="选择商品" width="500px">
      <el-table :data="productList" border>
        <el-table-column prop="name" label="商品名" />
        <el-table-column prop="category" label="分类" width="80" />
        <el-table-column prop="stock" label="库存" width="70" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" @click="addProduct(row)">添加</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { api } from '@/api/modules'

const route = useRoute()
const customerList = ref([])
const customerInfo = ref(null)
const currentCustomerId = ref(null)
const serviceList = ref([])
const productList = ref([])

const showServicePicker = ref(false)
const showProductPicker = ref(false)

const orderItems = ref([])
const orderType = ref('mixed')
const discountAmount = ref(0)
const useBalance = ref(0)
const usePoints = ref(0)
const payMethod = ref('现金')
const remark = ref('')
const sourceId = ref(null)

const totalAmount = computed(() => orderItems.value.reduce((s, i) => s + (i.unit_price || 0) * (i.quantity || 1), 0))
const payAmount = computed(() => Math.max(0, totalAmount.value - discountAmount.value - useBalance.value - usePoints.value))
const earnPoints = computed(() => Math.floor(payAmount.value * 0.05))

const updateSubtotal = (idx) => {
  orderItems.value[idx].subtotal = orderItems.value[idx].unit_price * orderItems.value[idx].quantity
}

const addService = (s) => {
  orderItems.value.push({
    item_name: s.name, item_type: s.category, quantity: 1, unit_price: s.price, subtotal: s.price
  })
  if (orderType.value === 'mixed' || orderType.value === 'product') orderType.value = orderItems.value.some(i => i.item_type === '商品') ? 'mixed' : 'appointment'
  showServicePicker.value = false
}

const addProduct = (p) => {
  if (p.stock <= 0) return ElMessage.warning('库存不足')
  orderItems.value.push({
    item_name: p.name, item_type: '商品', quantity: 1, unit_price: p.price, subtotal: p.price, product_id: p.id
  })
  if (orderType.value === 'mixed' || orderType.value === 'appointment') orderType.value = orderItems.value.some(i => i.item_type !== '商品') ? 'mixed' : 'product'
  showProductPicker.value = false
}

const onCustomerChange = async (cid) => {
  try {
    const res = await api.customerDetail(cid)
    customerInfo.value = res.data
    useBalance.value = 0
    usePoints.value = 0
  } catch (e) {}
}

const submitCheckout = async () => {
  if (!currentCustomerId.value) return ElMessage.warning('请选择客户')
  if (!orderItems.value.length) return ElMessage.warning('请添加消费项目')
  try {
    const res = await api.checkout({
      customer_id: currentCustomerId.value,
      type: orderType.value,
      source_id: sourceId.value,
      items: orderItems.value,
      pay_method: payMethod.value,
      use_balance: useBalance.value,
      use_points: usePoints.value,
      discount_amount: discountAmount.value,
      remark: remark.value
    })
    ElMessage.success(`结算成功！订单号：${res.data.order_no}`)
    orderItems.value = []
    discountAmount.value = 0
    useBalance.value = 0
    usePoints.value = 0
    remark.value = ''
    onCustomerChange(currentCustomerId.value)
  } catch (e) {}
}

onMounted(async () => {
  try { customerList.value = (await api.allCustomers()).data } catch (e) {}
  try { serviceList.value = (await api.services({ active: 1 })).data } catch (e) {}
  try { productList.value = (await api.allProducts()).data } catch (e) {}

  if (route.query.customerId) {
    currentCustomerId.value = Number(route.query.customerId)
    onCustomerChange(currentCustomerId.value)
  }
  if (route.query.sourceId) {
    sourceId.value = Number(route.query.sourceId)
  }
  if (route.query.type) {
    orderType.value = route.query.type
  }
  if (route.query.serviceName && route.query.price) {
    orderItems.value.push({
      item_name: route.query.serviceName + (route.query.petName ? `(${route.query.petName})` : ''),
      item_type: route.query.type === 'boarding' ? '寄养' : '服务',
      quantity: 1,
      unit_price: Number(route.query.price),
      subtotal: Number(route.query.price)
    })
  }
})
</script>
