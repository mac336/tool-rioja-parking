// @vitest-environment node
// Test de integración de la capa de datos REAL contra el Supabase LOCAL.
// Ejercita los módulos db/* como un usuario autenticado (RLS activa).
// Se salta solo si el Supabase local no responde (p. ej. en CI sin Docker).
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import * as contactos from '@/lib/db/contactos'
import * as reservas from '@/lib/db/reservas'
import * as encuestas from '@/lib/db/encuestas'
import * as mensajes from '@/lib/db/mensajes'
import * as buzon from '@/lib/db/buzon'

const URL = 'http://127.0.0.1:54321'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let disponible = false
const V_EMAIL = 'itest.vecino@test.local'
const P_EMAIL = 'itest.pres@test.local'
const PASS = 'test-password-123'

async function ensureUser(email: string, vivienda: string, rol: string) {
  // Crea el usuario (ignora si ya existe); el trigger crea el profile 'pendiente'.
  await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true }).catch(() => {})
  // Recupera el id vía profiles (por email, que es único).
  const { data: prof } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (prof) {
    // Asegura contraseña conocida y email confirmado aunque el usuario preexistiera.
    await admin.auth.admin.updateUserById(prof.id, { password: PASS, email_confirm: true })
  }
  const { error } = await admin.from('profiles')
    .update({ vivienda, rol, estado: 'activo', normas_aceptadas_at: new Date().toISOString() }).eq('email', email)
  if (error) throw new Error(`update profile ${email}: ${error.message}`)
  return prof?.id
}

beforeAll(async () => {
  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: 'x' } })
    disponible = r.status < 500
  } catch { disponible = false }
  if (!disponible) return
  // Viviendas disjuntas de las del test RLS (Bajo A/1º A Dcha/2º A Dcha/3º A Dcha)
  // para no colisionar en los límites por vivienda al compartir la BD local.
  await ensureUser(V_EMAIL, 'Bajo B', 'vecino')
  await ensureUser(P_EMAIL, '3º F Izqda', 'presidente')
})

describe.skipIf(!process.env.SUPA_ITEST)('capa de datos real (Supabase local)', () => {
  it('vecino: lee zonas y contactos', async () => {
    await supabase.auth.signInWithPassword({ email: V_EMAIL, password: PASS })
    const zonas = await reservas.listZonas()
    expect(zonas.length).toBeGreaterThanOrEqual(4)
    const cts = await contactos.listContactos()
    expect(cts.length).toBeGreaterThanOrEqual(14)
  })

  it('mensajes: gestión publica y el vecino lo ve (vecino no puede publicar)', async () => {
    await supabase.auth.signInWithPassword({ email: P_EMAIL, password: PASS })
    const m = await mensajes.crearMensaje({ tipo: 'aviso', titulo: 'ITEST aviso', cuerpo: 'contenido' })
    expect(m.id).toBeTruthy()
    await supabase.auth.signInWithPassword({ email: V_EMAIL, password: PASS })
    const lista = await mensajes.listMensajes()
    expect(lista.find((x) => x.id === m.id)).toBeTruthy()
    // el vecino NO puede publicar (RLS)
    await expect(mensajes.crearMensaje({ tipo: 'aviso', titulo: 'x', cuerpo: 'y' })).rejects.toBeTruthy()
    // limpieza
    await supabase.auth.signInWithPassword({ email: P_EMAIL, password: PASS })
    await mensajes.borrarMensaje(m.id)
  })

  it('buzón: el vecino escribe a Presidencia, el presidente lo ve y responde', async () => {
    await supabase.auth.signInWithPassword({ email: V_EMAIL, password: PASS })
    const hiloId = await buzon.crearHilo({ asunto: 'ITEST buzón', texto: 'hola presidencia', canal: 'presidencia' })
    expect(hiloId).toBeTruthy()
    const mios = await buzon.listHilos()
    expect(mios.find((h) => h.id === hiloId)).toBeTruthy()
    // El presidente (canal presidencia) lo ve y responde.
    await supabase.auth.signInWithPassword({ email: P_EMAIL, password: PASS })
    const visibles = await buzon.listHilos()
    expect(visibles.find((h) => h.id === hiloId)).toBeTruthy()
    await buzon.responderHilo(hiloId, 'te leo, gracias')
    const det = await buzon.getHilo(hiloId)
    expect(det?.mensajes.length).toBe(2)
    expect(det?.mensajes.some((mm) => mm.de_gestion)).toBe(true)
  })

  it('gestión: crea encuesta multi-pregunta, vecino vota, resultados', async () => {
    await supabase.auth.signInWithPassword({ email: P_EMAIL, password: PASS })
    const e = await encuestas.crearEncuesta({
      titulo: 'ITEST encuesta', cierre: new Date(Date.now() + 7 * 864e5).toISOString(), formato: 'multi',
      preguntas: [
        { texto: 'P1', tipo: 'opcion_unica', opciones: ['A', 'B'] },
        { texto: 'P2', tipo: 'opcion_multiple', opciones: ['X', 'Y', 'Z'] },
      ],
    })
    expect(e.preguntas.length).toBe(2)
    await supabase.auth.signInWithPassword({ email: V_EMAIL, password: PASS })
    const full = await encuestas.getEncuesta(e.id)
    const q1 = full!.preguntas[0]
    await encuestas.votarPregunta(e.id, q1.id, [q1.opciones[0].id])
    const after = await encuestas.getEncuesta(e.id)
    expect(after!.preguntas[0].mi_voto_opcion_ids).toContain(q1.opciones[0].id)
    expect(after!.viviendas_votantes).toBeGreaterThanOrEqual(1)
  })

  it('reserva: vecino crea (pendiente) y presidente aprueba', async () => {
    await supabase.auth.signInWithPassword({ email: V_EMAIL, password: PASS })
    const zonas = await reservas.listZonas()
    const d = new Date(Date.now() + 20 * 864e5)
    const ini = new Date(d); ini.setHours(10, 0, 0, 0)
    const fin = new Date(d); fin.setHours(12, 0, 0, 0)
    // limpia reserva vigente previa de la vivienda
    const vig = await reservas.reservaVigente()
    if (vig) await reservas.cancelarReserva(vig.grupo_id)
    // Multi-zona: dos zonas en el MISMO horario → un solo grupo (2 filas).
    const r = await reservas.crearReserva({ zonaIds: [zonas[0].id, zonas[1].id], inicio: ini.toISOString(), fin: fin.toISOString(), numInvitados: 2 })
    expect(r.estado).toBe('pendiente')
    expect(r.zonas.length).toBe(2)
    expect(r.ids.length).toBe(2)
    await supabase.auth.signInWithPassword({ email: P_EMAIL, password: PASS })
    const pend = await reservas.reservasPendientesGestion()
    const grupo = pend.find((x) => x.grupo_id === r.grupo_id)
    expect(grupo?.zonas.length).toBe(2)
    await reservas.resolverReserva(r.grupo_id, true) // aprueba las 2 zonas a la vez
  })
})
