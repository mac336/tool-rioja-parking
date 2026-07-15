import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Field, SelectField, Button, Alert } from '@/components/ui'
import { PISOS } from '@/lib/parking'
import { crearSolicitud } from '@/lib/api'

// Invitar a un vecino: un vecino YA DENTRO de la app da de alta la solicitud de
// otro (misma vía que la autoregistración pública, solicitar-acceso). La
// vivienda se elige del catálogo real de la finca (no admite direcciones
// externas), y la solicitud queda pendiente de aprobación como cualquier otra.
export function InvitarVecinoPage() {
  const [nombre, setNombre] = useState('')
  const [vivienda, setVivienda] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const valido = nombre.trim() && vivienda && /.+@.+\..+/.test(email)

  const enviar = async () => {
    setEnviando(true)
    try {
      await crearSolicitud({ nombre: nombre.trim(), vivienda, email: email.trim() })
      setEnviada(true)
    } finally {
      setEnviando(false)
    }
  }

  if (enviada) {
    return (
      <div className="min-h-full bg-bg">
        <SubHeader titulo="Invitar vecino" />
        <Page className="mx-auto flex max-w-[560px] flex-col items-center gap-4 pt-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="font-display text-[20px] font-extrabold text-ink">Invitación enviada</h2>
          <p className="max-w-xs text-[14.5px] text-muted">
            La solicitud de <b>{nombre}</b> para el {vivienda} queda pendiente de aprobación. Le avisaremos por correo en cuanto pueda entrar.
          </p>
          <Button variant="secondary" onClick={() => { setEnviada(false); setNombre(''); setVivienda(''); setEmail('') }}>
            Invitar a otro vecino
          </Button>
        </Page>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Invitar vecino" />
      <Page className="mx-auto max-w-[560px]">
        <p className="mb-3 text-[14px] text-muted">
          Invita a un vecino de la comunidad a unirse a la app. Es como si él mismo solicitara el acceso: la revisará la gestión y podrá entrar en cuanto se apruebe.
        </p>
        <Alert tipo="info">Para proteger la privacidad de la comunidad, solo se puede invitar a alguien que viva en una vivienda de Rioja 25. No invites a personas ajenas a la finca.</Alert>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Nombre o alias del vecino" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Nico" />
          <SelectField label="Su vivienda" value={vivienda} onChange={(e) => setVivienda(e.target.value)}>
            <option value="">Selecciona la vivienda…</option>
            {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
          </SelectField>
          <Field label="Su correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
          <Button block size="lg" disabled={!valido || enviando} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar invitación'}
          </Button>
        </div>
      </Page>
    </div>
  )
}
