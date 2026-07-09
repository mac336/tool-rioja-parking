import { create } from 'zustand'
import type { Profile, ThemeMode, MensajeTipo } from '@/types'
import { usingSupabase } from '@/lib/supabase'
import { getUser as mockGetUser, setUserRole as mockSetRole } from '@/lib/apiMock'
import { actualizarNombre, listRolePermisos } from '@/lib/api'
import { setPermisosActuales, CATALOGO_PERMISOS } from '@/lib/roles'
import { loadProfile, statusFromProfile, onAuthChange, signOut as sbSignOut, type AuthStatus } from '@/lib/session'

export type Palette = 'turquesa' | 'lavanda' | 'coral' | 'bosque'
export const PALETTES: { id: Palette; nombre: string; color: string }[] = [
  { id: 'turquesa', nombre: 'Turquesa', color: '#2BB0C0' },
  { id: 'lavanda', nombre: 'Lavanda', color: '#7C83DB' },
  { id: 'coral', nombre: 'Coral', color: '#EE7A61' },
  { id: 'bosque', nombre: 'Bosque', color: '#35B07E' },
]

interface Toast { id: number; texto: string; tipo: 'ok' | 'error' | 'info' }

export type MsgColors = Record<MensajeTipo, string>
export const DEFAULT_MSG_COLORS: MsgColors = {
  aviso: '#F6E2B3',      // ámbar claro
  anuncio: '#C9DEF6',    // azul claro
  incidencia: '#F3C9C9', // rojo claro
}

interface AppState {
  user: Profile
  authStatus: AuthStatus
  theme: ThemeMode
  palette: Palette
  msgColors: MsgColors
  toasts: Toast[]
  setRole: (rol: Profile['rol']) => void
  setName: (nombre: string) => Promise<void>
  refreshAuth: () => Promise<void>
  logout: () => Promise<void>
  setTheme: (t: ThemeMode) => void
  setPalette: (p: Palette) => void
  setMsgColor: (tipo: MensajeTipo, color: string) => void
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
function loadMsgColors(): MsgColors {
  try {
    const raw = localStorage.getItem('r25-msgcolors')
    return raw ? { ...DEFAULT_MSG_COLORS, ...JSON.parse(raw) } : { ...DEFAULT_MSG_COLORS }
  } catch { return { ...DEFAULT_MSG_COLORS } }
}
applyTheme(savedTheme)
applyPalette(savedPalette)

let toastId = 0

export const useApp = create<AppState>((set, get) => ({
  user: mockGetUser(), // en modo supabase es solo un placeholder hasta cargar el perfil
  authStatus: usingSupabase ? 'loading' : 'active',
  theme: savedTheme,
  palette: savedPalette,
  msgColors: loadMsgColors(),
  toasts: [],
  setRole: (rol) => {
    // Selector DEMO (solo modo mock).
    mockSetRole(rol)
    set({ user: { ...mockGetUser() } })
  },
  setName: async (nombre) => {
    await actualizarNombre(nombre)
    if (usingSupabase) await get().refreshAuth()
    else set({ user: { ...mockGetUser() } })
  },
  refreshAuth: async () => {
    const p = await loadProfile()
    if (p) {
      set({ user: p, authStatus: statusFromProfile(p) })
      // Permisos efectivos del rol (app_admin = todos) para adaptar la interfaz.
      try {
        const matriz = await listRolePermisos()
        const keys = p.rol === 'app_admin'
          ? CATALOGO_PERMISOS.map((c) => c.key)
          : matriz.filter((m) => m.rol === p.rol).map((m) => m.permiso)
        setPermisosActuales(keys)
      } catch { setPermisosActuales(null) }
    } else {
      set({ authStatus: 'anon' })
      setPermisosActuales(null)
    }
  },
  logout: async () => {
    if (usingSupabase) await sbSignOut()
    set({ authStatus: 'anon' })
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
  setMsgColor: (tipo, color) => {
    const next = { ...get().msgColors, [tipo]: color }
    localStorage.setItem('r25-msgcolors', JSON.stringify(next))
    set({ msgColors: next })
  },
  toast: (texto, tipo = 'ok') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, texto, tipo }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Bootstrap de sesión real (solo con Supabase): carga el perfil y escucha cambios.
if (usingSupabase) {
  void useApp.getState().refreshAuth()
  onAuthChange(() => { void useApp.getState().refreshAuth() })
}
