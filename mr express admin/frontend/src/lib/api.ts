import axios from 'axios'
import type { OrderStatusValue } from '@/constants/orderStatus'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export interface SelectedVariant {
  name: string
  value: string
}

export interface OrderItem {
  product_id: number
  product_name: string
  image_url: string | null
  quantity: number
  unit_price: number
  old_price: number | null
  subtotal: number
  selected_variants: SelectedVariant[] | null
}

export interface OrderRow {
  id: number
  code: string
  customer_name: string
  telegram_id: number
  total: number
  status: OrderStatusValue
  address: string | null
  phone: string | null
  created_at: string
  items: OrderItem[]
}

export interface CategoryNode {
  id: number
  name: string
  slug: string
  icon: string
  parent_id: number | null
  subcategories: CategoryNode[]
}

export interface ProductRow {
  id: number
  name: string
  description: string | null
  price: number
  old_price: number | null
  stock: number
  category_id: number
  category_name?: string
  images: string[]
  is_featured: boolean
  is_discount: boolean
  attributes?: Record<string, unknown> | null
}

export interface DashboardStats {
  sold_products: number
  daily_revenue: number
  weekly_revenue: number
  monthly_revenue: number
}

export interface UserRow {
  id: number
  telegram_id: number
  username: string | null
  display_name: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_registered: boolean
  is_blocked: boolean
  orders_count: number
  created_at: string | null
}

export interface UserDetail {
  user: UserRow
  orders: { id: number; code: string; total: number; status: string; created_at: string }[]
}

export interface BannerRow {
  id: number
  title: string
  subtitle: string | null
  image_url: string | null
  link_url: string | null
  sort_order: number
  is_active: boolean
  products: { id: number; name: string; price: number; image_url: string | null }[]
}

export interface DiscountRow {
  id: number
  name: string
  percent: number
  valid_from: string | null
  valid_to: string | null
  days_of_week: number[]
  scope_type: 'all' | 'category' | 'product'
  scope_id: number | null
  scope_name: string | null
  is_active: boolean
  created_at: string | null
}

export interface ReelRow {
  id: number
  video_url: string
  thumbnail_url: string | null
  price: number
  product_id: number | null
  product_name: string | null
  product_description: string | null
  product_image_url: string | null
  title?: string | null
  description?: string | null
}

export interface GroupBuyRow {
  id: number
  product_id: number
  product_name: string
  product_image: string | null
  image_url: string | null
  required_participants: number
  current_participants: number
  progress_percent: number
  deadline: string | null
  status: 'active' | 'completed' | 'cancelled'
  participants: {
    id: number
    user_id: number
    telegram_id: number
    name: string
    joined_at: string
  }[]
  created_at: string | null
}

export interface PromocodeRow {
  id: number
  code: string
  discount_percent: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  remaining_uses: number | null
  created_at: string | null
}

export interface ReviewRow {
  id: number
  user_id: number
  product_id: number
  user_name: string | null
  product_name: string | null
  rating: number
  content: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_spam_suspect: boolean
  created_at: string | null
}

export const api = {
  getOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ items: OrderRow[]; total: number }>('/orders', { params }),

  patchOrderStatus: (id: number, status: OrderStatusValue) =>
    apiClient.patch<{ id: number; status: string }>(`/orders/${id}`, { status }),

  getDashboardStats: () => apiClient.get<DashboardStats>('/dashboard/stats'),

  getRevenueChart: (days = 30) =>
    apiClient.get<{ day: string; revenue: number; orders: number }[]>(
      `/dashboard/revenue-chart?days=${days}`,
    ),

  getRecentOrders: () =>
    apiClient.get<{
      items: { id: string; customer: string; amount: number; status: string }[]
    }>('/dashboard/recent-orders'),

  getCategories: () =>
    apiClient.get<{ items: CategoryNode[]; flat: CategoryNode[] }>('/catalog/categories'),

  getProducts: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ items: ProductRow[]; total: number }>('/catalog/products', { params }),

  createProduct: (formData: FormData) =>
    apiClient.post<{ item: ProductRow; images: string[] }>('/catalog/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProduct: (id: number, formData: FormData) =>
    apiClient.put<{ item: ProductRow }>(`/catalog/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteProduct: (id: number) =>
    apiClient.delete<{ ok: boolean }>(`/catalog/products/${id}`),

  getUsers: (params?: { q?: string; page?: number; limit?: number }) =>
    apiClient.get<{ items: UserRow[]; total: number }>('/users', { params }),

  getUser: (id: number) => apiClient.get<UserDetail>(`/users/${id}`),

  patchUser: (id: number, body: { is_blocked?: boolean }) =>
    apiClient.patch<{ item: UserRow }>(`/users/${id}`, body),

  exportUsersCsv: () =>
    apiClient.get('/users/export', { responseType: 'blob' }),

  getBanners: () => apiClient.get<{ items: BannerRow[]; total: number }>('/banners'),

  createBanner: (formData: FormData) =>
    apiClient.post<{ item: BannerRow }>('/banners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  patchBanner: (id: number, body: Partial<BannerRow>) =>
    apiClient.patch<{ item: BannerRow }>(`/banners/${id}`, body),

  deleteBanner: (id: number) => apiClient.delete(`/banners/${id}`),

  linkBannerProducts: (id: number, product_ids: number[]) =>
    apiClient.post<{ item: BannerRow }>(`/banners/${id}/products`, { product_ids }),

  getDiscounts: () => apiClient.get<{ items: DiscountRow[]; total: number }>('/discounts'),

  getDiscountProducts: () =>
    apiClient.get<{ items: ProductRow[]; total: number }>('/catalog/products', {
      params: { is_discount: 1, limit: 100 },
    }),

  createDiscount: (body: Omit<DiscountRow, 'id' | 'scope_name' | 'created_at'>) =>
    apiClient.post<{ item: DiscountRow }>('/discounts', body),

  createDiscountProduct: (formData: FormData) =>
    apiClient.post<{ product_id: number; discount_id: number; images: string[] }>(
      '/discounts/product',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),

  patchDiscount: (id: number, body: Partial<DiscountRow>) =>
    apiClient.patch<{ item: DiscountRow }>(`/discounts/${id}`, body),

  deleteDiscount: (id: number) => apiClient.delete(`/discounts/${id}`),

  getReels: () => apiClient.get<{ items: ReelRow[]; total: number }>('/reels'),

  createReel: (formData: FormData) =>
    apiClient.post<{ item: ReelRow }>('/reels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteReel: (id: number) => apiClient.delete(`/reels/${id}`),

  getGroupBuys: () => apiClient.get<{ items: GroupBuyRow[]; total: number }>('/group-buys'),

  createGroupBuy: (form: FormData) =>
    apiClient.post<{ item: GroupBuyRow }>('/group-buys', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  patchGroupBuy: (
    id: number,
    body: { required_participants?: number; deadline?: string | null; status?: string },
  ) => apiClient.patch<{ item: GroupBuyRow }>(`/group-buys/${id}`, body),

  deleteGroupBuy: (id: number) => apiClient.delete(`/group-buys/${id}`),

  getPromocodes: () => apiClient.get<{ items: PromocodeRow[]; total: number }>('/promocodes'),

  createPromocode: (body: {
    code?: string
    discount_percent: number
    max_uses?: number | null
    expires_at?: string | null
    is_active?: boolean
  }) => apiClient.post<{ item: PromocodeRow }>('/promocodes', body),

  generatePromocode: (body: {
    code?: string
    discount_percent: number
    max_uses?: number | null
    expires_at?: string | null
  }) => apiClient.post<{ item: PromocodeRow }>('/promocodes/generate', body),

  patchPromocode: (id: number, body: Partial<PromocodeRow>) =>
    apiClient.patch<{ item: PromocodeRow }>(`/promocodes/${id}`, body),

  deletePromocode: (id: number) => apiClient.delete(`/promocodes/${id}`),

  getPromocodeStats: (id: number) =>
    apiClient.get<{
      item: PromocodeRow
      applications: { used_at: string; user_name: string; telegram_id: number }[]
    }>(`/promocodes/${id}/stats`),

  getReviews: (params?: { status?: string; rating?: number; q?: string }) =>
    apiClient.get<{ items: ReviewRow[]; total: number }>('/reviews', { params }),

  approveReview: (id: number) => apiClient.patch<{ item: ReviewRow }>(`/reviews/${id}/approve`),

  rejectReview: (id: number) => apiClient.patch<{ item: ReviewRow }>(`/reviews/${id}/reject`),

  deleteReview: (id: number) => apiClient.delete(`/reviews/${id}`),
}

export function mediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return url.startsWith('/') ? url : `/${url}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
