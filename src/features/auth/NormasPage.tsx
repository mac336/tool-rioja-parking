import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card } from '@/components/ui'
import { usingSupabase } from '@/lib/supabase'
import { aceptarNormas } from '@/lib/session'
import { useApp } from '@/store'

const NORMAS = [
  ['Respeto y convivencia', 'La app sustituye avisos en papel: úsala con respeto. Sin ataques personales, insultos ni contenido discriminatorio.'],
  ['Mensajes', 'Los avisos, anuncios e incidencias los publica la administración. Todos los vecinos los ven en el tablón, pero no pueden crearlos.'],
  ['Buzón', 'Para reportar una avería o consultar algo, escribe a la administración desde el Buzón. Es privado: solo lo ve la gestión.'],
  ['Reservas', 'Una reserva vigente por vivienda. Las aprueba el presidente. Anula la tuya si no vas a usarla.'],
  ['Votaciones', 'Son sondeos informales, sin valor oficial. Un voto por vivienda.'],
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
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Normas de uso" />
      <Page className="mx-auto max-w-[560px]">
        <p className="mb-4 text-[14px] text-muted">Antes de empezar, revisa y acepta las normas de convivencia de la comunidad.</p>
        <Card className="mb-3 border border-primary/30 bg-primary-soft">
          <h3 className="text-[15px] font-bold text-ink">Sobre esta app</h3>
          <p className="mt-1 text-[13px] text-muted">
            La creó un <b>vecino del Bajo C</b> de forma voluntaria y sin ánimo de lucro, para centralizar las gestiones
            de la comunidad y que estén al alcance de todos. Si tienes ideas para mejorarla, mándalas desde
            <b> Sugerencias</b>: llegan directamente a ese vecino para que siga desarrollándola.
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
        <Button block size="lg" className="mt-5" disabled={guardando} onClick={aceptar}>
          {guardando ? 'Guardando…' : 'Acepto las normas'}
        </Button>
      </Page>
    </div>
  )
}
