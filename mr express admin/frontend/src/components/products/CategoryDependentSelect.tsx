import type { CategoryNode } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CategoryDependentSelectProps {
  categories: CategoryNode[]
  categoryId: number | ''
  subcategoryId: number | ''
  onCategoryChange: (id: number | '') => void
  onSubcategoryChange: (id: number | '') => void
}

const selectClass = cn(
  'frosted-pill w-full px-4 py-3 text-sm font-medium text-ink-800 outline-none',
  'dark:text-ink-100',
)

export function CategoryDependentSelect({
  categories,
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
}: CategoryDependentSelectProps) {
  const parent = categories.find((c) => c.id === categoryId)
  const subs = parent?.subcategories ?? []

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
          Kategoriya
        </label>
        <select
          className={selectClass}
          value={categoryId}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : ''
            onCategoryChange(v)
            onSubcategoryChange('')
          }}
        >
          <option value="">Tanlang…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink-900 text-white">
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
          Sub-kategoriya
        </label>
        <select
          className={selectClass}
          value={subcategoryId}
          disabled={!categoryId || subs.length === 0}
          onChange={(e) => onSubcategoryChange(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">
            {!categoryId ? 'Avval kategoriya tanlang' : subs.length === 0 ? 'Sub-kategoriya yo\'q' : 'Tanlang…'}
          </option>
          {subs.map((s) => (
            <option key={s.id} value={s.id} className="bg-ink-900 text-white">
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
