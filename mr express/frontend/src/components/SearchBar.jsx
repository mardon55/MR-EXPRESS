import { IconSearch } from './icons/TabIcons';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Mahsulot qidirish...',
}) {
  return (
    <div className="w-full">
      <div className="glass-float relative w-full">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
          <IconSearch />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent py-3.5 pl-11 pr-4 text-[15px] font-medium text-neutral-800 shadow-none outline-none transition-fluid placeholder:text-neutral-400 focus:ring-2 focus:ring-ios-blue/25"
        />
      </div>
    </div>
  );
}
