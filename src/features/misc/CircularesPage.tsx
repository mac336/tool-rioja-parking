import { Waves, Clock, CalendarDays } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, SectionTitle } from '@/components/ui'

// Circulares de la comunidad. De momento: normas de piscina y zonas comunes
// (normas aprobadas en Junta de 03-04-2013, revisadas en la Junta de 25-06-2026;
// temporada según la circular de 10-06-2026). Contenido público, sin datos
// personales. Fuente/análisis en actas/analisis/piscina-normas.json (no versionado).

const GRUPOS: { titulo: string; items: string[] }[] = [
  {
    titulo: 'Zonas de recreo (general)',
    items: [
      'Son zonas de recreo el jardín, la piscina, la lonja de la fachada y la sala de la comunidad.',
      'Usuarios: propietarios y familiares que conviven; los inquilinos tienen los mismos derechos salvo pacto comunicado a la Junta.',
      'Los invitados van siempre acompañados por quien los invita, que responde de su comportamiento.',
    ],
  },
  {
    titulo: 'Celebraciones',
    items: [
      'Requieren autorización del Presidente, pedida por escrito con al menos 5 días de antelación.',
      'No pueden prolongarse más allá de las 23:00 h en zonas exteriores.',
      'Límite de ruido en el exterior: 55 dB de día y 45 dB de noche (hay una residencia de ancianos a menos de 150 m).',
    ],
  },
  {
    titulo: 'Piscina — obligaciones',
    items: [
      'Usar el paso indicado para acceder a la zona de baño.',
      'Ducharse antes de entrar en el agua.',
      'Seguir las indicaciones del socorrista, presente durante el horario de baño.',
    ],
  },
  {
    titulo: 'Piscina — prohibiciones',
    items: [
      'Bañarse o permanecer en la zona de baño fuera del horario establecido.',
      'Ropa y calzado de calle en la zona de playa y baño.',
      'Comer y beber fuera de las áreas destinadas a ello; nada de barbacoas ni fuego en horario de baño.',
      'Colchonetas, aletas u otros flotadores grandes en el vaso (salvo flotadores de seguridad para niños).',
      'Objetos peligrosos o sucios en el agua, y la entrada de animales.',
    ],
  },
  {
    titulo: 'Mobiliario',
    items: [
      'La comunidad pone sillas y mesas; colocar enseres encima no reserva el sitio.',
      'El mobiliario particular se recoge tras su uso; no se puede fijar con cadenas ni candados.',
    ],
  },
  {
    titulo: 'Sala de la comunidad',
    items: [
      'Uso prioritario: las Juntas. Cuando está libre, se solicita al Presidente.',
      'Se devuelve la llave al terminar y se deja en el mismo estado de limpieza y orden.',
    ],
  },
  {
    titulo: 'Reservas y convivencia (revisión 2026)',
    items: [
      'Las reservas de zonas comunes se piden al conserje, que lleva el calendario de disponibilidad.',
      'Cada reserva identifica a un responsable, que responde de posibles daños o desperfectos.',
      'Prohibido jugar al fútbol u otros deportes en la entrada y la rampa del garaje.',
    ],
  },
]

export function CircularesPage() {
  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Circulares" />
      <Page>
        <p className="mb-4 text-[14px] text-muted">
          Normas de uso de la piscina y las zonas comunes de la comunidad.
        </p>

        {/* Temporada y horario de la piscina */}
        <Card className="mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: '#DFEDFC', color: '#2F76C9' }}>
              <Waves size={19} strokeWidth={1.9} />
            </span>
            <div className="font-display text-[16px] font-bold text-ink">Piscina · temporada 2026</div>
          </div>
          <div className="mt-3 flex flex-col gap-2 text-[14px] text-ink">
            <div className="flex items-center gap-2"><CalendarDays size={16} className="text-muted" /> Del <b>13 de junio</b> al <b>13 de septiembre</b> (ambos inclusive).</div>
            <div className="flex items-center gap-2"><Clock size={16} className="text-muted" /> Baño de <b>12:00 a 15:00</b> y de <b>16:00 a 21:00</b>.</div>
          </div>
          <p className="mt-2.5 rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
            Prohibido bañarse fuera de ese horario: no hay vigilancia de socorrista. Las fechas y el horario los fija cada año la Junta.
          </p>
        </Card>

        {/* Normas por bloques */}
        <div className="flex flex-col gap-4">
          {GRUPOS.map((g) => (
            <section key={g.titulo}>
              <SectionTitle>{g.titulo}</SectionTitle>
              <Card>
                <ul className="flex flex-col gap-2">
                  {g.items.map((t, i) => (
                    <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>

        <p className="mt-4 px-1 text-[12px] text-faint">
          Normas aprobadas en Junta General (03-04-2013), revisadas en la Junta de 25-06-2026. Referencias: Ordenanzas del Ayuntamiento de Madrid ANM 1999/26 (piscinas) y ANM 2011/7 (ruido).
        </p>
      </Page>
    </div>
  )
}
