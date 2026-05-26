import { BackgroundOrbs } from '@/components/layout/BackgroundOrbs'
import { MainHeader } from '@/components/layout/MainHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { Sidebar } from '@/components/layout/Sidebar'

export function AdminLayout() {
  return (
    <div className="relative min-h-screen">
      <BackgroundOrbs />
      <Sidebar />

      <div
        className="relative min-h-screen transition-[margin] duration-500"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="mx-auto min-h-screen max-w-[var(--content-max)] px-5 py-7 sm:px-8 lg:px-10">
          <MainHeader />
          <PageTransition />
        </div>
      </div>
    </div>
  )
}
