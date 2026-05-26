import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { inputClass } from '@/lib/formStyles'
import { cn } from '@/lib/utils'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Qidirish…',
  className,
}: SearchFieldProps) {
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, 'pl-11')}
      />
    </div>
  )
}
