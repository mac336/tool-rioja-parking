import { SubHeader, Page } from '@/components/layout/AppShell'

export function PrivacidadPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Aviso de privacidad" />
      <Page className="mx-auto max-w-[640px] text-[14px] leading-relaxed text-muted">
        <h2 className="font-display text-[20px] font-bold text-ink">Protección de datos — Comunidad Rioja 25</h2>
        <p className="mt-3"><b>Responsable:</b> Comunidad de Propietarios Rioja 25.</p>
        <p className="mt-3"><b>Qué datos tratamos:</b> nombre, vivienda, correo electrónico y, en su caso, teléfono, además del contenido que publiques (incidencias, anuncios, votos, reservas).</p>
        <p className="mt-3"><b>Para qué:</b> la gestión ordinaria de la comunidad de vecinos (comunicación, incidencias, reservas de zonas comunes, reparto de parking y sondeos internos).</p>
        <p className="mt-3"><b>Base legal:</b> interés legítimo en la gestión de la comunidad y tu consentimiento al solicitar el acceso.</p>
        <p className="mt-3"><b>Conservación:</b> mientras seas miembro de la comunidad. Las incidencias y votaciones cerradas y los anuncios archivados se borran o anonimizan a los <b>2 años</b>.</p>
        <p className="mt-3"><b>Ubicación:</b> los datos se alojan en servidores de la Unión Europea (Supabase).</p>
        <p className="mt-3"><b>Tus derechos:</b> acceso, rectificación, supresión y oposición. Escribe a <a className="text-primary underline" href="mailto:cdelarioja25@gmail.com">cdelarioja25@gmail.com</a>.</p>
        <p className="mt-3"><b>Sin terceros de tracking:</b> no usamos analítica invasiva ni cookies de terceros.</p>
      </Page>
    </div>
  )
}
