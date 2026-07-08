import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Field, SelectField, Button, Alert } from '@/components/ui'
import { PISOS } from '@/lib/parking'
import { crearSolicitud } from '@/lib/api'

export function RequestAccessPage() {
  const nav = useNavigate()
  const [nombre, setNombre] = useState('')
  const [vivienda, setVivienda] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const valido = nombre.trim() && vivienda && /.+@.+\..+/.test(email)

  const enviar = async () => {
    setEnviando(true)
    await crearSolicitud({ nombre, vivienda, email })
    nav('/solicitud-enviada', { state: { vivienda } })
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Solicitar acceso" />
      <Page className="mx-auto max-w-[560px]">
        <Alert tipo="info">Un administrador revisará tu solicitud y recibirás un correo para completar tu acceso.</Alert>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Nombre o alias" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Nico" />
          <SelectField label="Vivienda" value={vivienda} onChange={(e) => setVivienda(e.target.value)}>
            <option value="">Selecciona tu vivienda…</option>
            {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
          </SelectField>
          <Field label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
          <Button block size="lg" disabled={!valido || enviando} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </div>
      </Page>
    </div>
  )
}
