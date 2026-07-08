import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'
import { Toaster } from './Toaster'
import { InstallPrompt } from '@/components/InstallPrompt'

/** Layout de nivel superior: sidebar (escritorio) + TabBar (móvil). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full min-w-0 max-w-[720px] flex-1 pb-[90px] md:pb-8">{children}</main>
      </div>
      <TabBar />
      <InstallPrompt />
      <Toaster />
    </div>
  )
}

/** Cabecera de subpágina con botón atrás (sin TabBar en móvil según diseño). */
export function SubHeader({ titulo, right }: { titulo: string; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface/95 px-3 py-3 backdrop-blur safe-top">
      <button onClick={() => nav(-1)} aria-label="Atrás"
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2">
        <ChevronLeft size={24} />
      </button>
      <h1 className="flex-1 truncate font-display text-[19px] font-bold text-ink">{titulo}</h1>
      {right}
    </header>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-4 ${className ?? ''}`}>{children}</div>
}
