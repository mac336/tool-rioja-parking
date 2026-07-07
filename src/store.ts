import { create } from 'zustand'
import type { Profile, ThemeMode } from '@/types'
import { getUser, setUserRole, actualizarNombre } from '@/lib/api'

export type Palette = 'turquesa' | 'lavanda' | 'coral' | 'bosque'
export const PALETTES: { id: Palette; nombre: string; color: string }[] = [
  { id: 'turquesa', nombre: 'Turquesa', color: '#2BB0C0' },
  { id: 'lavanda', nombre: 'Lavanda', color: '#7C83DB' },
  { id: 'coral', nombre: 'Coral', color: '#EE7A61' },
  { id: 'bosque', nombre: 'Bosque', color: '#35B07E' },
]

interface Toast { id: number; texto: string; tipo: 'ok' | 'error' | 'info' }

interface AppState {
  user: Profile
  theme: ThemeMode
  palette: Palette
  toasts: Toast[]
  setRole: (rol: Profile['rol']) => void
  setName: (nombre: string) => Promise<void>
  setTheme: (t: ThemeMode) => void
  setPalette: (p: Palette) => void
  toast: (texto: string, tipo?: Toast['tipo']) => void
  dismissToast: (id: number) => void
}

function applyTheme(t: ThemeMode) {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
}
function applyPalette(p: Palette) {
  document.documentElement.setAttribute('data-palette', p)
}

const savedTheme = (localStorage.getItem('r25-theme') as ThemeMode) || 'system'
const savedPalette = (localStorage.getItem('r25-palette') as Palette) || 'turquesa'
applyTheme(savedTheme)
applyPalette(savedPalette)

let toastId = 0

export const useApp = create<AppState>((set) => ({
  user: getUser(),
  theme: savedTheme,
  palette: savedPalette,
  toasts: [],
  setRole: (rol) => {
    setUserRole(rol)
    set({ user: { ...getUser() } })
  },
  setName: async (nombre) => {
    await actualizarNombre(nombre)
    set({ user: { ...getUser() } })
  },
  setTheme: (t) => {
    localStorage.setItem('r25-theme', t)
    applyTheme(t)
    set({ theme: t })
  },
  setPalette: (p) => {
    localStorage.setItem('r25-palette', p)
    applyPalette(p)
    set({ palette: p })
  },
  toast: (texto, tipo = 'ok') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, texto, tipo }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
