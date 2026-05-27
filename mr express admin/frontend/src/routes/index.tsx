import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { OrdersPage } from '@/pages/orders/OrdersPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { BannersPage } from '@/pages/banners/BannersPage'
import { DiscountsPage } from '@/pages/discounts/DiscountsPage'
import { ReelsPage } from '@/pages/reels/ReelsPage'
import { GroupBuyPage } from '@/pages/group-buy/GroupBuyPage'
import { PromocodesPage } from '@/pages/promocodes/PromocodesPage'
import { ReviewsPage } from '@/pages/reviews/ReviewsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { NightMarketPage } from '@/pages/night-market/NightMarketPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'banners', element: <BannersPage /> },
      { path: 'discounts', element: <DiscountsPage /> },
      { path: 'reels', element: <ReelsPage /> },
      { path: 'group-buy', element: <GroupBuyPage /> },
      { path: 'promocodes', element: <PromocodesPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
      { path: 'night-market', element: <NightMarketPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
