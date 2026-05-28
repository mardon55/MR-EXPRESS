import { useRef, useEffect } from 'react'
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  }, [value])

  const sync = () => {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className="frosted-glass overflow-hidden rounded-3xl">
      <div className="flex flex-wrap gap-1 border-b border-white/20 bg-white/5 p-2 dark:border-white/10">
        {[
          { icon: BoldIcon, cmd: 'bold', label: 'Qalin' },
          { icon: ItalicIcon, cmd: 'italic', label: 'Kursiv' },
          { icon: ListBulletIcon, cmd: 'insertUnorderedList', label: 'Ro\'yxat' },
        ].map(({ icon: Icon, cmd, label }) => (
          <button
            key={cmd}
            type="button"
            title={label}
            className="frosted-button !rounded-2xl !px-3 !py-2"
            onMouseDown={(e) => {
              e.preventDefault()
              exec(cmd)
              sync()
            }}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          title="Havola"
          className="frosted-button !rounded-2xl !px-3 !py-2"
          onMouseDown={(e) => {
            e.preventDefault()
            const url = window.prompt('Havola URL')
            if (url) exec('createLink', url)
            sync()
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder ?? 'Mahsulot tavsifi…'}
        className={cn(
          'min-h-[140px] px-4 py-3 text-sm text-ink-800 outline-none dark:text-ink-100',
          'empty:before:pointer-events-none empty:before:text-ink-400 empty:before:content-[attr(data-placeholder)]',
        )}
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={sync}
        onBlur={sync}
      />
    </div>
  )
}
