import { useState } from 'react'
import { Lightbulb, Send, CheckCircle2 } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, Textarea, Button, Alert } from '@/components/ui'
import { useApp } from '@/store'
import { enviarSugerencia } from '@/lib/api'

export function SugerenciasPage() {
  const { user, toast } = useApp()
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const valido = texto.trim().length >= 3

  const enviar = async () => {
    if (!valido) return
    setEnviando(true)
    try {
      await enviarSugerencia(texto.trim())
      setEnviada(true)
      setTexto('')
      toast('¡Gracias! Tu sugerencia se ha enviado', 'ok')
    } catch {
      toast('No se pudo enviar la sugerencia. Inténtalo de nuevo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Sugerencias" />
      <Page>
        {enviada ? (
          <Card className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-success-soft text-success-ink">
              <CheckCircle2 size={30} strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="font-display text-[20px] font-bold text-ink">¡Sugerencia enviada!</h2>
              <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">Gracias por ayudar a mejorar la app. El vecino que la desarrolla ha recibido tu mensaje.</p>
            </div>
            <Button variant="secondary" onClick={() => setEnviada(false)}>Enviar otra</Button>
          </Card>
        ) : (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary-700">
                <Lightbulb size={30} strokeWidth={1.9} />
              </span>
              <div>
                <h2 className="font-display text-[20px] font-bold text-ink">¿Se te ocurre una mejora?</h2>
                <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
                  Esta app la desarrolla un vecino del Bajo C de forma voluntaria. Cuéntale qué te gustaría ver, qué echas en falta o qué mejorarías: tu sugerencia le llega directamente para seguir mejorándola.
                </p>
              </div>
            </div>

            <Textarea
              label="Tu sugerencia"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={4000}
              rows={6}
              placeholder="Escribe aquí tu idea…"
            />

            <Button block size="lg" disabled={!valido || enviando} onClick={enviar}>
              <Send size={19} /> {enviando ? 'Enviando…' : 'Enviar sugerencia'}
            </Button>

            <Alert tipo="info">Tu sugerencia llega al vecino que desarrolla la app, junto a tu nombre ({user.nombre}) y vivienda por si necesita responderte.</Alert>
          </Card>
        )}
      </Page>
    </div>
  )
}
