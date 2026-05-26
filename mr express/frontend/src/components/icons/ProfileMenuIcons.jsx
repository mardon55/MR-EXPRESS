const stroke = 1.75;

function Icon({ className = 'h-5 w-5', children, color = 'text-theme-accent' }) {
  return (
    <svg
      className={`${className} ${color}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconChevronRight({ className }) {
  return (
    <Icon className={className || 'h-4 w-4 text-neutral-300'} color="">
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

export function IconOrders() {
  return (
    <Icon>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </Icon>
  );
}

export function IconCargoCalc() {
  return (
    <Icon>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 6V5a2 2 0 012-2h4a2 2 0 012 2v1" />
      <path d="M8 11h8M8 15h5" />
    </Icon>
  );
}

export function IconNotifications() {
  return (
    <Icon>
      <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" />
      <path d="M10 20a2 2 0 004 0" />
    </Icon>
  );
}

export function IconHelp() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 014.5 1.5c0 2-3 2-3 4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconEdit() {
  return (
    <Icon className="h-[18px] w-[18px]">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </Icon>
  );
}

export function IconBack() {
  return (
    <Icon className="h-5 w-5 text-theme-accent" color="">
      <path d="M14 6l-6 6 6 6" />
    </Icon>
  );
}

export function IconPalette() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1.25" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconGroupBuy() {
  return (
    <Icon>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </Icon>
  );
}

export function IconPromo() {
  return (
    <Icon>
      <path d="M4 9v6a2 2 0 002 2h2v4l4-4h6a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
      <path d="M9 7.5h6" />
      <circle cx="9" cy="12" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Tungi bozor — oy va yulduz (profil menyusi) */
export function IconNightMarket() {
  return (
    <Icon>
      <path d="M21 14.5A8.5 8.5 0 1112.5 6" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="10" r="0.75" fill="currentColor" stroke="none" />
    </Icon>
  );
}
