import { IconBack } from './icons/ProfileMenuIcons';

export default function PageHeader({ title, onBack, showLabel = true }) {
  return (
    <header className="relative z-10 shrink-0 border-b border-theme bg-theme-card">
      <div className="flex min-h-[44px] items-center pb-2.5 pl-[15px] pr-4 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="press-fluid flex shrink-0 items-center gap-1 rounded-lg py-1.5 pr-2"
          aria-label="Ortga qaytish"
        >
          <IconBack />
          {showLabel && (
            <span className="text-[15px] font-medium text-theme-accent">Ortga</span>
          )}
        </button>
        <h1 className="min-w-0 flex-1 truncate pl-2 text-[17px] font-semibold text-theme">
          {title}
        </h1>
      </div>
    </header>
  );
}
