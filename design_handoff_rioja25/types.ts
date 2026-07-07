// Modelos de datos de Rioja 25. Ajusta a tu ORM/API.

export type Role = 'vecino' | 'junta' | 'admin';
export type UserStatus = 'pending' | 'active' | 'rejected';

export interface User {
  id: string;
  nombre: string;
  piso: string;            // ej. "2º C Dcha"
  email: string;
  telefono?: string;
  rol: Role;
  estado: UserStatus;
  iniciales: string;       // ej. "MR" (avatar)
}

export interface AccessRequest {
  id: string;
  nombre: string;
  piso: string;
  email: string;
  comentario?: string;
  creadaEn: string;        // ISO
  estado: 'pending' | 'approved' | 'rejected';
  rolAsignado?: Role;      // lo fija el admin al aprobar
}

export type IncidentStatus = 'abierta' | 'en_curso' | 'resuelta' | 'cerrada';
export type IncidentCategory =
  | 'iluminacion' | 'ascensor' | 'limpieza' | 'fachada' | 'filtraciones' | 'otros';

export interface IncidentComment {
  id: string;
  autorId: string;
  autorNombre: string;
  autorRol: Role;
  texto: string;
  creadoEn: string;
}

export interface Incident {
  id: string;              // ej. "128"
  titulo: string;
  categoria: IncidentCategory;
  estado: IncidentStatus;
  ubicacion: string;       // "Portal", "Ascensor A"…
  descripcion: string;
  fotos: string[];         // URLs
  reportadoPor: string;    // piso o nombre
  creadaEn: string;
  comentarios: IncidentComment[];
}

export type ProposalType = 'si_no' | 'multiple';
export type ProposalStatus = 'abierta' | 'cerrada';

export interface ProposalOption {
  id: string;
  etiqueta: string;
  descripcion?: string;
  votos: number;
}

export interface Proposal {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: ProposalType;
  estado: ProposalStatus;
  propuestaPor: string;    // "Junta"
  cierraEn: string;
  opciones: ProposalOption[];
  totalViviendas: number;  // ej. 40 (para participación/quórum)
  votosEmitidos: number;
  miVotoOpcionId?: string; // opción elegida por el usuario actual
  quorumAlcanzado?: boolean;
  resultado?: 'aprobada' | 'rechazada';
}

export type ZoneId = 'sala_social' | 'piscina' | 'barbacoa' | 'sala_reuniones';
export interface Slot { inicio: string; fin: string; estado: 'libre' | 'ocupada'; }
export interface DayAvailability { fecha: string; franjas: Slot[]; }

export interface Reservation {
  id: string;
  zona: ZoneId;
  fecha: string;           // ISO date
  franja: string;          // "16:00-19:00"
  usuarioId: string;
  estado: 'activa' | 'cancelada';
}

export interface ParkingAssignment {
  quincena: string;        // "16-31 jul"
  plaza: string;           // "P-14"
  nivel?: string;          // "-1"
  usuarioId: string;
  actual: boolean;
}

export type ContactCategory = 'administrador' | 'conserje' | 'proveedor' | 'junta';
export interface Contact {
  id: string;
  nombre: string;
  categoria: ContactCategory;
  subtitulo?: string;      // "Administrador", "Mantenimiento 24 h"…
  telefono?: string;       // pulsable -> tel:
  email?: string;          // pulsable -> mailto:
}

// Estado de UI transversal
export type LoadState = 'idle' | 'loading' | 'empty' | 'error' | 'ready';
export type ThemeMode = 'light' | 'dark';
