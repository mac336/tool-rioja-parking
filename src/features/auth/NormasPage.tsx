import { useNavigate } from 'react-router-dom'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card } from '@/components/ui'

const NORMAS = [
  ['Respeto y convivencia', 'La app sustituye avisos en papel: úsala con respeto. Sin ataques personales, insultos ni contenido discriminatorio.'],
  ['Incidencias', 'Describen problemas de la comunidad, no señalan a vecinos concretos. Máx. 5 al día por vivienda. Fotos sin personas ni matrículas.'],
  ['Anuncios', 'Los revisa la gestión antes de publicarse. Un anuncio pendiente por vivienda; fechas de inicio y fin obligatorias.'],
  ['Reservas', 'Una reserva vigente por vivienda. Las aprueba el presidente. Anula la tuya si no vas a usarla.'],
  ['Votaciones', 'Son sondeos informales, sin valor oficial. Un voto por vivienda.'],
  ['Datos', 'Tratamos datos personales conforme al RGPD. Consulta el aviso de privacidad.'],
]

export function NormasPage() {
  const nav = useNavigate()
  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Normas de uso" />
      <Page className="mx-auto max-w-[560px]">
        <p className="mb-4 text-[14px] text-muted">Antes de empezar, revisa y acepta las normas de convivencia de la comunidad.</p>
        <div className="flex flex-col gap-3">
          {NORMAS.map(([t, d]) => (
            <Card key={t}>
              <h3 className="text-[15px] font-bold text-ink">{t}</h3>
              <p className="mt-1 text-[13px] text-muted">{d}</p>
            </Card>
          ))}
        </div>
        <Button block size="lg" className="mt-5" onClick={() => nav('/')}>Acepto las normas</Button>
      </Page>
    </div>
  )
}
