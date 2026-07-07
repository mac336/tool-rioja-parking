import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Moon, Monitor, Mail, FileText, LogOut, Check, KeyRound, Trash2 } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, RoleBadge, Avatar, cx } from '@/components/ui'
import { useApp, PALETTES } from '@/store'
import type { ThemeMode } from '@/types'
import { roleBadgeKind, ROLE_LABEL } from '@/lib/roles'
import { iniciales } from '@/lib/format'

const THEMES: [ThemeMode, string, typeof Sun][] = [
  ['system', 'Auto', Monitor],
  ['light', 'Claro', Sun],
  ['dark', 'Oscuro', Moon],
]

const BAJA_MAILTO =
  'mailto:cdelarioja25@gmail.com' +
  '?subject=' + encodeURIComponent('Solicitud de baja / borrado de datos — Rioja 25') +
  '&body=' + encodeURIComponent('Hola,\n\nSolicito la baja de mi cuenta y el borrado de mis datos personales de la app de la comunidad.\n\nNombre y vivienda:\n\nGracias.')

export function SettingsPage() {
  const { user, theme, setTheme, palette, setPalette, setName, logout, toast } = useApp()
  const nav = useNavigate()
  const cerrarSesion = async () => { await logout(); nav('/login') }
  const [nombre, setNombre] = useState(user.nombre)
  const [guardando, setGuardando] = useState(false)
  const cambiado = nombre.trim() !== user.nombre && nombre.trim().length > 1

  const guardarNombre = async () => {
    setGuardando(true)
    await setName(nombre.trim())
    setGuardando(false)
    toast('Nombre actualizado')
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Perfil y ajustes" />
      <Page className="mx-auto flex max-w-[640px] flex-col gap-4">

        {/* Perfil */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar text={iniciales(user.nombre)} size={52} />
            <div className="flex-1">
              <div className="font-display text-[18px] font-bold text-ink">{user.nombre}</div>
              <div className="text-[13px] text-muted">{user.vivienda}</div>
            </div>
            <RoleBadge kind={roleBadgeKind(user.rol)} />
          </div>

          <Field label="Nombre y apellidos" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Button variant="primary" disabled={!cambiado || guardando} onClick={guardarNombre}>
            {guardando ? 'Guardando…' : 'Guardar nombre'}
          </Button>

          <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
            <ReadOnly etiqueta="Correo" valor={user.email} />
            <ReadOnly etiqueta="Vivienda" valor={user.vivienda} nota="Asignada por la gestión" />
            <ReadOnly etiqueta="Rol" valor={ROLE_LABEL[user.rol]} nota="Lo asigna la gestión" />
          </div>
        </Card>

        {/* Cómo accedes (sin contraseña) */}
        <Card className="flex items-start gap-3">
          <span className="mt-0.5 text-primary"><KeyRound size={20} /></span>
          <div className="text-[13px] text-muted">
            <div className="font-semibold text-ink">Cómo accedes</div>
            Entras con <b>Google</b> o con un <b>enlace mágico por correo</b>. La app no usa contraseñas,
            así que no hay ninguna que cambiar ni que te puedan robar.
          </div>
        </Card>

        {/* Apariencia: tema */}
        <Card>
          <div className="overline mb-3">Apariencia</div>
          <div className="mb-2 text-[13px] font-semibold text-muted">Tema</div>
          <div className="flex gap-2">
            {THEMES.map(([val, lbl, Icon]) => (
              <button key={val} onClick={() => setTheme(val)} aria-pressed={theme === val}
                className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2.5 text-[13px] font-semibold transition-shadow',
                  theme === val ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted shadow-neu-sm')}>
                <Icon size={16} /> {lbl}
              </button>
            ))}
          </div>

          {/* Estilo de colores (paletas) */}
          <div className="mb-2 mt-5 text-[13px] font-semibold text-muted">Estilo de colores</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PALETTES.map((p) => (
              <button key={p.id} onClick={() => setPalette(p.id)} aria-pressed={palette === p.id}
                className={cx('flex items-center gap-2 rounded-[14px] p-2.5 text-[13px] font-semibold transition-shadow',
                  palette === p.id ? 'shadow-neu-inset text-ink' : 'shadow-neu-sm text-muted')}>
                <span className="h-6 w-6 shrink-0 rounded-full" style={{ background: p.color }} />
                {p.nombre}
                {palette === p.id && <Check size={15} className="ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </Card>

        {/* Documentos */}
        <Card className="flex flex-col divide-y divide-border">
          <Link to="/normas" className="flex items-center gap-3 py-2 text-[15px] text-ink">
            <FileText size={19} className="text-muted" /> Normas de uso
          </Link>
          <Link to="/privacidad" className="flex items-center gap-3 py-2 text-[15px] text-ink">
            <FileText size={19} className="text-muted" /> Aviso de privacidad
          </Link>
        </Card>

        {/* RGPD: baja */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-danger"><Trash2 size={20} /></span>
            <div className="text-[13px] text-muted">
              <div className="font-semibold text-ink">Dar de baja mi cuenta</div>
              Puedes solicitar la baja y el borrado de tus datos (RGPD). La gestión lo tramita.
            </div>
          </div>
          <a href={BAJA_MAILTO} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-pill bg-surface px-5 text-[15px] font-bold text-danger shadow-neu-sm">
            <Mail size={18} /> Solicitar baja por correo
          </a>
        </Card>

        {/* Cerrar sesión */}
        <button onClick={cerrarSesion}
          className="flex items-center justify-center gap-2 rounded-pill bg-surface py-3 text-[14px] font-bold text-danger shadow-neu-sm active:shadow-neu-inset">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </Page>
    </div>
  )
}

function ReadOnly({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-[14px] bg-surface p-3 shadow-neu-inset">
      <div className="overline">{etiqueta}</div>
      <div className="truncate text-[14px] font-semibold text-ink">{valor}</div>
      {nota && <div className="text-[11px] text-faint">{nota}</div>}
    </div>
  )
}
