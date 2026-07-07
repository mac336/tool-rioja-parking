import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button, Field, Alert } from '@/components/ui'
import { usingSupabase } from '@/lib/supabase'
import { signInMagic, signInGoogle } from '@/lib/session'

export function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [modoCorreo, setModoCorreo] = useState(false)

  const entrarDemo = () => nav('/') // modo mock: acceso directo a la demo

  const enviarEnlace = async () => {
    setError('')
    if (!/.+@.+\..+/.test(email)) { setError('Introduce un correo válido.'); return }
    setCargando(true)
    const { error } = await signInMagic(email)
    setCargando(false)
    if (error) setError('No hemos podido enviar el enlace. Inténtalo de nuevo.')
    else setEnviado(true)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-6 py-12"
      style={{ background: 'linear-gradient(180deg,var(--primary-soft),var(--bg))' }}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo size={88} />
        <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight text-ink">Bienvenido a<br />Rioja 25</h1>
        <p className="mt-2 max-w-xs text-[15px] text-muted">La app de tu comunidad: incidencias, votaciones, reservas, parking y más.</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {!usingSupabase ? (
          /* Modo demo: acceso directo */
          <>
            <Button variant="secondary" block size="lg" onClick={entrarDemo}>
              <span className="inline-block h-5 w-5 rounded-full bg-[conic-gradient(at_50%_50%,#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)]" />
              Entrar con Google
            </Button>
            <Button variant="primary" block size="lg" onClick={entrarDemo}>Recibir enlace por correo</Button>
          </>
        ) : enviado ? (
          <Alert tipo="success">Te hemos enviado un enlace de acceso a <b>{email}</b>. Ábrelo desde este dispositivo para entrar.</Alert>
        ) : modoCorreo ? (
          <>
            {error && <Alert tipo="danger">{error}</Alert>}
            <Field label="Tu correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
            <Button variant="primary" block size="lg" disabled={cargando} onClick={enviarEnlace}>
              {cargando ? 'Enviando…' : 'Enviar enlace de acceso'}
            </Button>
            <Button variant="ghost" block onClick={() => setModoCorreo(false)}>Volver</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" block size="lg" onClick={() => signInGoogle()}>
              <span className="inline-block h-5 w-5 rounded-full bg-[conic-gradient(at_50%_50%,#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)]" />
              Entrar con Google
            </Button>
            <Button variant="primary" block size="lg" onClick={() => setModoCorreo(true)}>Recibir enlace por correo</Button>
          </>
        )}

        <div className="my-1 text-center text-[13px] text-faint">¿Aún no tienes acceso?</div>
        <Link to="/solicitar-acceso">
          <Button variant="ghost" block size="lg" className="border-[1.5px] border-primary bg-primary-soft">Solicitar acceso</Button>
        </Link>
        <p className="mt-2 text-center text-[12px] text-faint">Solo vecinos verificados. <Link to="/privacidad" className="underline">Privacidad</Link></p>
      </div>
    </div>
  )
}
