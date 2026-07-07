import { Lightbulb, Mail } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card } from '@/components/ui'
import { useApp } from '@/store'

const EMAIL = 'cdelarioja25@gmail.com'
const ASUNTO = 'Sugerencia para la app Rioja 25'

export function SugerenciasPage() {
  const { user } = useApp()
  const cuerpo = [
    'Hola:',
    '',
    'Me gustaría sugerir lo siguiente para la app de la comunidad:',
    '',
    '(escribe aquí tu idea)',
    '',
    '—',
    `${user.nombre} · ${user.vivienda}`,
  ].join('\n')
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(ASUNTO)}&body=${encodeURIComponent(cuerpo)}`

  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Sugerencias" />
      <Page>
        <Card className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary-700">
            <Lightbulb size={30} strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="font-display text-[20px] font-bold text-ink">¿Se te ocurre una mejora?</h2>
            <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
              Este espacio es para tus ideas y comentarios sobre la app Rioja 25: qué te gustaría ver, qué echas en falta o qué podríamos mejorar. Toda sugerencia es bienvenida.
            </p>
          </div>
          <a href={mailto}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-pill bg-primary px-6 text-[16px] font-bold text-white shadow-primary transition-colors hover:bg-primary-700">
            <Mail size={20} /> Enviar sugerencia
          </a>
          <p className="text-[12px] text-faint">Se abrirá tu correo con un mensaje a {EMAIL}.</p>
        </Card>
      </Page>
    </div>
  )
}
