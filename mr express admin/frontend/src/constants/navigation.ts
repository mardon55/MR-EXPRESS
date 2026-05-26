import type { ComponentType, SVGProps } from 'react'
import {
  Squares2X2Icon,
  UsersIcon,
  ShoppingBagIcon,
  CubeIcon,
  PhotoIcon,
  TagIcon,
  FilmIcon,
  UserGroupIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline'
import {
  Squares2X2Icon as Squares2X2Solid,
  UsersIcon as UsersSolid,
  ShoppingBagIcon as ShoppingBagSolid,
  CubeIcon as CubeSolid,
  PhotoIcon as PhotoSolid,
  TagIcon as TagSolid,
  FilmIcon as FilmSolid,
  UserGroupIcon as UserGroupSolid,
  TicketIcon as TicketSolid,
  ChatBubbleLeftRightIcon as ChatBubbleSolid,
  CreditCardIcon as CreditCardSolid,
} from '@heroicons/react/24/solid'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export interface NavItem {
  id: string
  label: string
  description: string
  path: string
  icon: IconComponent
  iconActive: IconComponent
}

export const NAVIGATION: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Boshqaruv paneli',
    description: 'Umumiy statistika va ko\'rsatkichlar',
    path: '/',
    icon: Squares2X2Icon,
    iconActive: Squares2X2Solid,
  },
  {
    id: 'users',
    label: 'Foydalanuvchilar',
    description: 'Mijozlar va akkauntlar boshqaruvi',
    path: '/users',
    icon: UsersIcon,
    iconActive: UsersSolid,
  },
  {
    id: 'orders',
    label: 'Buyurtmalar',
    description: 'Statuslar va buyurtma boshqaruvi',
    path: '/orders',
    icon: ShoppingBagIcon,
    iconActive: ShoppingBagSolid,
  },
  {
    id: 'products',
    label: 'Mahsulotlar',
    description: 'Kategoriya va sub-kategoriyalar',
    path: '/products',
    icon: CubeIcon,
    iconActive: CubeSolid,
  },
  {
    id: 'banners',
    label: 'Bannerlar',
    description: 'Banner rasmlari va bog\'lanishlar',
    path: '/banners',
    icon: PhotoIcon,
    iconActive: PhotoSolid,
  },
  {
    id: 'discounts',
    label: 'Chegirmalar',
    description: 'Vaqt va kun cheklovlari',
    path: '/discounts',
    icon: TagIcon,
    iconActive: TagSolid,
  },
  {
    id: 'reels',
    label: 'Reels',
    description: 'Mahsulot, video va narx',
    path: '/reels',
    icon: FilmIcon,
    iconActive: FilmSolid,
  },
  {
    id: 'group-buy',
    label: 'Guruhli Xaridlar',
    description: 'Guruh xaridlari sozlamalari',
    path: '/group-buy',
    icon: UserGroupIcon,
    iconActive: UserGroupSolid,
  },
  {
    id: 'promocodes',
    label: 'Promokodlar',
    description: 'Promo kodlar va muddatlar',
    path: '/promocodes',
    icon: TicketIcon,
    iconActive: TicketSolid,
  },
  {
    id: 'reviews',
    label: 'Sharhlar',
    description: 'Sharhlar moderatsiyasi',
    path: '/reviews',
    icon: ChatBubbleLeftRightIcon,
    iconActive: ChatBubbleSolid,
  },
  {
    id: 'settings',
    label: 'Sozlamalar',
    description: 'To\'lov kartasi sozlamalari',
    path: '/settings',
    icon: CreditCardIcon,
    iconActive: CreditCardSolid,
  },
]

export function getNavByPath(pathname: string): NavItem {
  if (pathname === '/') return NAVIGATION[0]
  return NAVIGATION.find((n) => pathname.startsWith(n.path) && n.path !== '/') ?? NAVIGATION[0]
}
