const stroke = 1.75;

function IconBase({ active, children }) {
  return (
    <svg
      className={`h-[22px] w-[22px] transition-fluid ${
        active ? 'text-ios-blue' : 'text-neutral-400'
      }`}
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

export function IconHome({ active }) {
  return (
    <IconBase active={active}>
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-8.5z" />
    </IconBase>
  );
}

/** Reels / Videolar — pastki menyu ikonkasi */
export function IconReels({ active }) {
  return (
    <IconBase active={active}>
      <path d="M4 6h4v12H4zM10 4h10v16H10z" />
      <path d="M12 8l4 4-4 4V8z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconCatalog({ active }) {
  return (
    <IconBase active={active}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

export function IconCart({ active }) {
  return (
    <IconBase active={active}>
      <path d="M7 9V7a5 5 0 0110 0v2" />
      <path d="M6 9h12l-1.2 9H7.2L6 9z" />
    </IconBase>
  );
}

export function IconHeart({ active }) {
  return (
    <IconBase active={active}>
      <path d="M12 20.5s-7-4.35-7-10a4 4 0 017-2.2A4 4 0 0119 10.5c0 5.65-7 10-7 10z" />
    </IconBase>
  );
}

export function IconProfile({ active }) {
  return (
    <IconBase active={active}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M6 19.5c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </IconBase>
  );
}

export function IconSearch() {
  return (
    <svg
      className="h-[18px] w-[18px] text-neutral-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5L20 20" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}

export function IconHeartFilled({ filled }) {
  return (
    <svg
      className={`h-[18px] w-[18px] transition-fluid ${filled ? 'text-ios-red fill-ios-red' : 'text-neutral-500'}`}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path d="M12 20.5s-7-4.35-7-10a4 4 0 017-2.2A4 4 0 0119 10.5c0 5.65-7 10-7 10z" />
    </svg>
  );
}
