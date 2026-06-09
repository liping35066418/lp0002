import request from './index'

export const api = {
  dashboard: () => request.get('/statistics/overview'),
  revenueTrend: (params) => request.get('/statistics/revenue-trend', { params }),
  serviceStats: (params) => request.get('/statistics/service-stats', { params }),
  topCustomers: (params) => request.get('/statistics/top-customers', { params }),
  staffStats: (params) => request.get('/statistics/staff-stats', { params }),

  customers: (params) => request.get('/customers', { params }),
  allCustomers: () => request.get('/customers/all'),
  customerDetail: (id) => request.get(`/customers/${id}`),
  addCustomer: (data) => request.post('/customers', data),
  updateCustomer: (id, data) => request.put(`/customers/${id}`, data),
  deleteCustomer: (id) => request.delete(`/customers/${id}`),

  pets: (params) => request.get('/pets', { params }),
  petDetail: (id) => request.get(`/pets/${id}`),
  petServiceHistory: (id) => request.get(`/pets/${id}/service-history`),
  addPet: (data) => request.post('/pets', data),
  updatePet: (id, data) => request.put(`/pets/${id}`, data),
  deletePet: (id) => request.delete(`/pets/${id}`),

  services: (params) => request.get('/services', { params }),
  addService: (data) => request.post('/services', data),
  updateService: (id, data) => request.put(`/services/${id}`, data),
  deleteService: (id) => request.delete(`/services/${id}`),

  staff: () => request.get('/staff'),
  addStaff: (data) => request.post('/staff', data),
  updateStaff: (id, data) => request.put(`/staff/${id}`, data),
  deleteStaff: (id) => request.delete(`/staff/${id}`),

  workstations: (params) => request.get('/workstations', { params }),
  addWorkstation: (data) => request.post('/workstations', data),
  updateWorkstation: (id, data) => request.put(`/workstations/${id}`, data),
  deleteWorkstation: (id) => request.delete(`/workstations/${id}`),

  appointments: (params) => request.get('/appointments', { params }),
  appointmentDetail: (id) => request.get(`/appointments/${id}`),
  availableSlots: (params) => request.get('/appointments/available-slots', { params }),
  upcomingSoonAppointments: () => request.get('/appointments/upcoming-soon'),
  petLastServiceRemark: (petId) => request.get(`/appointments/pet/${petId}/last-service-remark`),
  addAppointment: (data) => request.post('/appointments', data),
  updateAppointment: (id, data) => request.put(`/appointments/${id}`, data),
  updateAppointmentStatus: (id, data) => request.put(`/appointments/${id}/status`, data),
  deleteAppointment: (id) => request.delete(`/appointments/${id}`),

  boardingList: (params) => request.get('/boarding', { params }),
  boardingDetail: (id) => request.get(`/boarding/${id}`),
  boardingReminders: () => request.get('/boarding/reminders'),
  addBoarding: (data) => request.post('/boarding', data),
  updateBoarding: (id, data) => request.put(`/boarding/${id}`, data),
  checkoutBoarding: (id, data) => request.put(`/boarding/${id}/checkout`, data),
  boardingRecords: (id) => request.get(`/boarding/${id}/daily-records`),
  addBoardingRecord: (id, data) => request.post(`/boarding/${id}/daily-records`, data),
  deleteBoarding: (id) => request.delete(`/boarding/${id}`),

  members: (params) => request.get('/members/members', { params }),
  addMember: (data) => request.post('/members', data),
  rechargeMember: (id, data) => request.post(`/members/${id}/recharge`, data),
  exchangePoints: (id, data) => request.post(`/members/${id}/exchange`, data),

  orders: (params) => request.get('/orders', { params }),
  orderDetail: (id) => request.get(`/orders/${id}`),
  checkout: (data) => request.post('/members/checkout', data),
  deleteOrder: (id) => request.delete(`/orders/${id}`),

  products: (params) => request.get('/products', { params }),
  allProducts: () => request.get('/products/all'),
  productDetail: (id) => request.get(`/products/${id}`),
  addProduct: (data) => request.post('/products', data),
  updateProduct: (id, data) => request.put(`/products/${id}`, data),
  updateStock: (id, data) => request.post(`/products/${id}/stock`, data),
  deleteProduct: (id) => request.delete(`/products/${id}`),

  notifications: (params) => request.get('/notifications', { params }),
  unreadNotificationCount: (params) => request.get('/notifications/unread-count', { params }),
  markNotificationRead: (id) => request.put(`/notifications/${id}/read`),
  markAllNotificationsRead: (data) => request.put('/notifications/read-all', data)
}
