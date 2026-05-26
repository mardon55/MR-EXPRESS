import type { ComponentType, SVGProps, ReactNode } from 'react'

interface PanelStateProps {
  loading?: boolean
  empty?: boolean
  emptyIcon?: ComponentType<SVGProps<SVGSVGElement>>
  emptyText?: string
  emptyAction?: ReactNode
  children: ReactNode
}

export function PanelState({
  loading,
  empty,
  emptyIcon: EmptyIcon,
  emptyText = 'Ma\'lumot topilmadi',
  emptyAction,
  children,
}: PanelStateProps) {
  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-ink-500">
        Yuklanmoqda…
      </div>
    )
  }
  if (empty) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
        {EmptyIcon && <EmptyIcon className="h-12 w-12 text-ink-400" />}
        <p className="text-ink-500">{emptyText}</p>
        {emptyAction}
      </div>
    )
  }
  return <>{children}</>
}
