import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  IconHome,
  IconReels,
  IconCatalog,
  IconCart,
  IconHeart,
  IconProfile,
} from './icons/TabIcons';

const tabs = [
  { to: '/', label: 'Bosh', Icon: IconHome, end: true },
  { to: '/reels', label: 'Reels', Icon: IconReels },
  { to: '/catalog', label: 'Katalog', Icon: IconCatalog },
  { to: '/cart', label: 'Savat', Icon: IconCart, badge: 'cart' },
  { to: '/favorites', label: 'Sevimli', Icon: IconHeart },
  { to: '/profile', label: 'Profil', Icon: IconProfile },
];

export default function BottomNav() {
  const { cartCount } = useApp();

  return (
    <nav
      className="glass-float glass-float-dock fixed bottom-[calc(env(safe-area-inset-bottom,20px)+8px)] left-0 right-0 z-50"
      aria-label="Asosiy menyu"
    >
      <div className="flex items-center justify-around px-2 py-2.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className="press-fluid flex flex-1 flex-col items-center gap-1 py-1"
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <tab.Icon active={isActive} />
                  {tab.badge === 'cart' && cartCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ios-blue px-1 text-[10px] font-semibold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium tracking-tight transition-fluid ${
                    isActive ? 'text-ios-blue' : 'text-neutral-400'
                  }`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
