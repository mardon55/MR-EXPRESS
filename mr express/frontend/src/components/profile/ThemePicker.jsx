import { THEME_LIST } from '../../themes/themeConfig';
import { useTheme } from '../../context/ThemeContext';

export default function ThemePicker() {
  const { previewThemeId, setPreviewThemeId } = useTheme();

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-theme-muted">Interfeys uslubi</p>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {THEME_LIST.map((t) => {
          const active = previewThemeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPreviewThemeId(t.id)}
              className={`press-fluid flex min-w-[80px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-fluid ${
                active ? 'bg-theme-icon ring-theme-accent' : 'opacity-90'
              }`}
            >
              <span className="flex items-center -space-x-1">
                {t.swatches.slice(0, 3).map((color, i) => (
                  <span
                    key={`${t.id}-${i}`}
                    className="h-[18px] w-[18px] rounded-full border-2 border-theme-card shadow-sm"
                    style={{ backgroundColor: color, zIndex: 3 - i }}
                  />
                ))}
              </span>
              <span
                className={`max-w-[76px] truncate text-center text-[10px] font-semibold leading-tight ${
                  active ? 'text-theme-accent' : 'text-theme-muted'
                }`}
              >
                {t.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
