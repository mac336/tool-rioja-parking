// "Mi Comunidad" — datos económicos extraídos de las actas (real, Supabase).
// Lee la tabla comunidad_datos (clave→jsonb). La RLS solo deja leer a app_admin
// (developer) por ahora; ver migración 0037. Los tipos describen el payload que
// carga el seed no versonado (actas/seed-comunidad-datos.sql).
import { supabase } from '@/lib/supabase'

// ---- Tipos del payload -------------------------------------------------------
export interface EjercicioCerrado {
  ejercicio: number
  aprobado_en_junta: string
  saldo_final: number
  caja?: Record<string, number>
  pendiente_pago?: Record<string, number>
  pendiente_cobro?: Record<string, number>
  impagados?: { total: number; num_viviendas?: number; nota?: string }
}

export interface Concepto { concepto: string; p2025: number; p2026: number; nota?: string }
export interface CapituloPresupuesto {
  capitulo: string
  total_2025: number
  total_2026: number
  conceptos: Concepto[]
}
export interface Derrama {
  aprobada_en_junta: string
  concepto: string
  empresa?: string
  importe_total: number
  mensualidades: number
  cuota_mensual_total: number
  inicio: string
  fin?: string
  motivo?: string
  nota?: string
}
export interface Finanzas {
  ejercicios_cerrados: EjercicioCerrado[]
  presupuestos: {
    vigente_2025: { total: number; suma_presupuesto: number }
    vigente_2026: { total: number; suma_presupuesto: number; diferencia_vs_anterior: number; pct_aumento: number }
    capitulos: CapituloPresupuesto[]
  }
  derramas: Derrama[]
  agua_caliente_precio_m3: { vigente_desde_junta: string; precio: number }[]
}

export interface CapituloComparado {
  capitulo: string
  p2025: number
  p2026: number
  delta: number
  pct: number
  tendencia: 'sube' | 'baja' | 'estable'
  motivo?: string
}
export interface PartidaGasto { destino: string; importe: number; pct: number }
export interface Comparativa {
  resumen: {
    suma_2025: number
    suma_2026: number
    variacion_absoluta: number
    variacion_pct: number
    saldo_cierre_2024: number
    saldo_cierre_2025: number
    variacion_saldo: number
  }
  por_capitulo: CapituloComparado[]
  donde_se_va_el_dinero_2026: { nota?: string; partidas: PartidaGasto[] }
  observaciones: string[]
}

export interface Acuerdo {
  titulo: string
  resultado: 'aprobado' | 'rechazado' | 'condicionado' | 'informativo' | 'pendiente'
  votacion?: string
  importe?: number
  nota?: string
  ahorro_anual_estimado?: number
}
export interface Junta {
  fecha: string
  tipo: string
  asistencia_coeficiente?: number
  junta_rectora_resultante?: { presidente?: string; vicepresidente?: string; secretario_administrador?: string }
  acuerdos: Acuerdo[]
}
export interface Acuerdos { juntas: Junta[] }

export interface ComunidadDatos {
  finanzas: Finanzas | null
  comparativa: Comparativa | null
  acuerdos: Acuerdos | null
}

// ---- Lectura -----------------------------------------------------------------
export async function getComunidadDatos(): Promise<ComunidadDatos> {
  const { data, error } = await supabase.from('comunidad_datos').select('clave, payload')
  if (error) throw error
  const by = (k: string) => (data ?? []).find((r) => r.clave === k)?.payload ?? null
  return {
    finanzas: by('finanzas') as Finanzas | null,
    comparativa: by('comparativa') as Comparativa | null,
    acuerdos: by('acuerdos') as Acuerdos | null,
  }
}
