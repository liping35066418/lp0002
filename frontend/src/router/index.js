import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '工作台' } },
      { path: 'customers', name: 'Customers', component: () => import('@/views/Customers.vue'), meta: { title: '客户管理' } },
      { path: 'pets', name: 'Pets', component: () => import('@/views/Pets.vue'), meta: { title: '宠物档案' } },
      { path: 'appointments', name: 'Appointments', component: () => import('@/views/Appointments.vue'), meta: { title: '预约管理' } },
      { path: 'boarding', name: 'Boarding', component: () => import('@/views/Boarding.vue'), meta: { title: '寄养管理' } },
      { path: 'checkout', name: 'Checkout', component: () => import('@/views/Checkout.vue'), meta: { title: '费用结算' } },
      { path: 'orders', name: 'Orders', component: () => import('@/views/Orders.vue'), meta: { title: '订单管理' } },
      { path: 'members', name: 'Members', component: () => import('@/views/Members.vue'), meta: { title: '会员管理' } },
      { path: 'products', name: 'Products', component: () => import('@/views/Products.vue'), meta: { title: '商品管理' } },
      { path: 'services', name: 'Services', component: () => import('@/views/Services.vue'), meta: { title: '服务项目' } },
      { path: 'statistics', name: 'Statistics', component: () => import('@/views/Statistics.vue'), meta: { title: '统计报表' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
