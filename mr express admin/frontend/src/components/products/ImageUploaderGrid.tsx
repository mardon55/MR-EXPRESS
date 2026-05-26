import { useCallback, useState } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const SLOT_COUNT = 6

interface ImageUploaderGridProps {
  files: (File | null)[]
  onChange: (files: (File | null)[]) => void
}

export function ImageUploaderGrid({ files, onChange }: ImageUploaderGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const setSlot = (index: number, file: File | null) => {
    const next = [...files]
    while (next.length < SLOT_COUNT) next.push(null)
    next[index] = file
    onChange(next.slice(0, SLOT_COUNT))
  }

  const onDrop = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault()
      setDragIndex(null)
      const file = e.dataTransfer.files[0]
      if (file?.type.startsWith('image/')) setSlot(index, file)
    },
    [files, onChange],
  )

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const file = files[i] ?? null
        const preview = file ? URL.createObjectURL(file) : null
        return (
          <div
            key={i}
            onDragOver={(e) => {
              e.preventDefault()
              setDragIndex(i)
            }}
            onDragLeave={() => setDragIndex(null)}
            onDrop={(e) => onDrop(i, e)}
            className={cn(
              'relative flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all',
              dragIndex === i
                ? 'border-brand-500/60 bg-brand-500/10'
                : 'border-white/25 bg-white/5 dark:border-white/15',
            )}
          >
            {preview ? (
              <>
                <img src={preview} alt="" className="absolute inset-0 h-full w-full rounded-3xl object-cover" />
                <button
                  type="button"
                  onClick={() => setSlot(i, null)}
                  className="absolute right-2 top-2 rounded-full bg-ink-900/70 p-1 text-white hover:bg-ink-900"
                  aria-label="Rasmni olib tashlash"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-3 text-center">
                <PhotoIcon className="h-8 w-8 text-ink-400" />
                <span className="text-xs font-medium text-ink-500">
                  Rasm {i + 1}
                  <br />
                  <span className="text-ink-400">Sudrab tashlang</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setSlot(i, f)
                  }}
                />
              </label>
            )}
          </div>
        )
      })}
    </div>
  )
}
