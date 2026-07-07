// Contactos — implementación real (Supabase). CRUD; la escritura la gatea RLS
// (administrador_finca / app_admin).
import { supabase } from '@/lib/supabase'
import type { Contact } from '@/types'

export async function listContactos(): Promise<Contact[]> {
  const { data, error } = await supabase.from('contactos').select('*').order('orden')
  if (error) throw error
  return (data ?? []) as Contact[]
}

export async function crearContacto(input: Omit<Contact, 'id'>): Promise<Contact> {
  const { data, error } = await supabase.from('contactos').insert(input).select('*').single()
  if (error) throw error
  return data as Contact
}

export async function editarContacto(id: string, input: Partial<Omit<Contact, 'id'>>): Promise<void> {
  const { error } = await supabase.from('contactos').update(input).eq('id', id)
  if (error) throw error
}

export async function borrarContacto(id: string): Promise<void> {
  const { error } = await supabase.from('contactos').delete().eq('id', id)
  if (error) throw error
}
