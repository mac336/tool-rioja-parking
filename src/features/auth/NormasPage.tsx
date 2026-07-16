import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card } from '@/components/ui'
import { usingSupabase } from '@/lib/supabase'
import { aceptarNormas } from '@/lib/session'
import { useApp } from '@/store'

const NORMAS = [
  ['Respeto y convivencia', 'La app sustituye avisos en papel: úsala con respeto. Sin ataques personales, insultos ni contenido discriminatorio.'],
  ['Tablón', 'En el tablón ves avisos, anuncios, incidencias y sugerencias. La administración publica directamente; como vecino puedes proponer incidencias, anuncios y sugerencias (con foto opcional) desde el Buzón → Publicar, y la gestión los revisa antes de publicarlos. Las sugerencias muestran tu nombre y admiten un «me gusta» por vivienda.'],
  ['Buzón', 'Para reportar una avería o consultar algo, escribe por el Buzón al canal que corresponda (Administración, Presidencia, Conserje o Desarrollador de la app). Es privado: solo lo ve ese destinatario.'],
  ['Reservas', 'Puedes reservar las zonas comunes y la reserva queda confirmada al crearla. Solo una reserva vigente por vivienda a la vez. Puedes anularla hasta 24 horas antes de que empiece; anula la tuya si no vas a usarla.'],
  ['Votaciones', 'Son sondeos informales, sin valor oficial. Un voto por vivienda.'],
  ['Notificaciones', 'La app te avisa con notificaciones (mensajes del tablón, buzón, reservas…). Actívalas en tu móvil e instala la app para no perderte nada.'],
  ['Datos', 'Tratamos datos personales conforme al RGPD. Consulta el aviso de privacidad.'],
]

export function NormasPage() {
  const nav = useNavigate()
  const { refreshAuth } = useApp()
  const [guardando, setGuardando] = useState(false)

  const aceptar = async () => {
    if (usingSupabase) {
      setGuardando(true)
      await aceptarNormas()
      await refreshAuth()
      setGuardando(false)
    }
    nav('/')
  }

  return (
    // Fijada al viewport visible: la lista de normas scrollea en el centro y el
    // botón "Acepto" queda SIEMPRE fijo abajo (accesible sin llegar al final,
    // arreglaba el problema en Android). Ver global.css (.app-viewport).
    <div className="app-viewport flex flex-col bg-bg">
      <SubHeader titulo="Normas de uso" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Page className="mx-auto max-w-[560px]">
          <p className="mb-4 text-[14px] text-muted">Antes de empezar, revisa y acepta las normas de convivencia de la comunidad.</p>
          <Card className="mb-3 border border-primary/30 bg-primary-soft">
            <h3 className="text-[15px] font-bold text-ink">Sobre esta app</h3>
            <p className="mt-1 text-[13px] text-muted">
              Centraliza las gestiones de la comunidad para que estén al alcance de todos: tablón de avisos,
              reservas de zonas comunes, votaciones y un buzón privado para hablar con la administración.
              Si tienes ideas para mejorarla, mándalas desde <b>Sugerencias</b>.
            </p>
          </Card>
          <div className="flex flex-col gap-3">
            {NORMAS.map(([t, d]) => (
              <Card key={t}>
                <h3 className="text-[15px] font-bold text-ink">{t}</h3>
                <p className="mt-1 text-[13px] text-muted">{d}</p>
              </Card>
            ))}
          </div>
        </Page>
      </div>
      <div className="shrink-0 border-t border-border bg-surface/95 p-4 backdrop-blur safe-bottom">
        <div className="mx-auto max-w-[560px]">
          <Button block size="lg" disabled={guardando} onClick={aceptar}>
            {guardando ? 'Guardando…' : 'Acepto las normas'}
          </Button>
        </div>
      </div>
    </div>
  )
}
