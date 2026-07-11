import { useState } from 'react'
import { Lightbulb, Send, CheckCircle2 } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, Textarea, Button, Alert } from '@/components/ui'
import { useApp } from '@/store'
import { esTester } from '@/lib/roles'
import { enviarSugerencia } from '@/lib/api'

export function SugerenciasPage() {
  const { user, toast } = useApp()
  const tester = esTester(user.rol)
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
      toast('¡Gracias! Tu mensaje se ha enviado', 'ok')
    } catch {
      toast('No se pudo enviar. Inténtalo de nuevo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Comentarios y sugerencias" />
      <Page>
        {enviada ? (
          <Card className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-success-soft text-success-ink">
              <CheckCircle2 size={30} strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="font-display text-[20px] font-bold text-ink">¡Mensaje enviado!</h2>
              <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">Gracias por ayudar a mejorar la app. El vecino que la desarrolla ha recibido tu mensaje.</p>
            </div>
            <Button variant="secondary" onClick={() => setEnviada(false)}>Enviar otro</Button>
          </Card>
        ) : (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary-700">
                <Lightbulb size={30} strokeWidth={1.9} />
              </span>
              <div>
                <h2 className="font-display text-[20px] font-bold text-ink">¿Un comentario, sugerencia o mejora?</h2>
                <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
                  Esta app la desarrolla un vecino del Bajo C de forma voluntaria. Cuéntale cualquier <b>comentario</b>, <b>sugerencia</b> o <b>mejora</b>: qué te gusta, qué echas en falta, qué cambiarías o si algo no funciona. Tu mensaje le llega directamente para seguir mejorándola.
                </p>
              </div>
            </div>

            <Textarea
              label="Tu comentario o sugerencia"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={4000}
              rows={6}
              placeholder="Escribe aquí tu comentario, sugerencia o mejora…"
            />

            {tester && <Alert tipo="info">Cuenta de pruebas (Tester): solo lectura. Puedes mirarlo todo y chatear por el buzón, pero no realizar acciones.</Alert>}
            <Button block size="lg" disabled={tester || !valido || enviando} onClick={enviar}>
              <Send size={19} /> {enviando ? 'Enviando…' : 'Enviar'}
            </Button>

            <Alert tipo="info">Tu mensaje llega al vecino que desarrolla la app, junto a tu nombre ({user.nombre}) y vivienda por si necesita responderte.</Alert>
          </Card>
        )}
      </Page>
    </div>
  )
}
