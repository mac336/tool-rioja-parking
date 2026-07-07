import { create } from 'zustand'
import type { Profile, ThemeMode } from '@/types'
import { getUser, setUserRole } from '@/lib/api'

interface Toast { id: number; texto: string; tipo: 'ok' | 'error' | 'info' }

interface AppState {
  user: Profile
  theme: ThemeMode
  toasts: Toast[]
  setRole: (rol: Profile['rol']) => void
  setTheme: (t: ThemeMode) => void
  toast: (texto: string, tipo?: Toast['tipo']) => void
  dismissToast: (id: number) => void
}

function applyTheme(t: ThemeMode) {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
}

const savedTheme = (localStorage.getItem('r25-theme') as ThemeMode) || 'system'
applyTheme(savedTheme)

let toastId = 0

export const useApp = create<AppState>((set) => ({
  user: getUser(),
  theme: savedTheme,
  toasts: [],
  setRole: (rol) => {
    setUserRole(rol)
    set({ user: { ...getUser() } })
  },
  setTheme: (t) => {
    localStorage.setItem('r25-theme', t)
    applyTheme(t)
    set({ theme: t })
  },
  toast: (texto, tipo = 'ok') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, texto, tipo }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
