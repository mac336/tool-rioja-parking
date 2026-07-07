import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'

export function LoginPage() {
  const nav = useNavigate()
  // Demo: "entrar" lleva directamente al Home (auth real se conecta con Supabase).
  const entrar = () => nav('/')
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-6 py-12"
      style={{ background: 'linear-gradient(180deg,var(--primary-soft),var(--bg))' }}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo size={88} />
        <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight text-ink">Bienvenido a<br />Rioja 25</h1>
        <p className="mt-2 max-w-xs text-[15px] text-muted">La app de tu comunidad: incidencias, votaciones, reservas, parking y más.</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button variant="secondary" block size="lg" onClick={entrar}>
          <span className="inline-block h-5 w-5 rounded-full bg-[conic-gradient(at_50%_50%,#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)]" />
          Entrar con Google
        </Button>
        <Button variant="primary" block size="lg" onClick={entrar}>Recibir enlace por correo</Button>
        <div className="my-1 text-center text-[13px] text-faint">¿Aún no tienes acceso?</div>
        <Link to="/solicitar-acceso">
          <Button variant="ghost" block size="lg" className="border-[1.5px] border-primary bg-primary-soft">Solicitar acceso</Button>
        </Link>
        <p className="mt-2 text-center text-[12px] text-faint">Solo vecinos verificados. <Link to="/privacidad" className="underline">Privacidad</Link></p>
      </div>
    </div>
  )
}
