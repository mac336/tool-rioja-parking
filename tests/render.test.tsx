// @vitest-environment jsdom
// Smoke test de RENDER: monta cada pantalla en un router de memoria y verifica
// que renderiza sin lanzar (detecta errores de runtime que el typecheck no ve).
import { describe, it, expect, beforeAll } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'

// jsdom no implementa matchMedia; lo stubeamos (lo usan utilidades PWA/tema).
beforeAll(() => {
  if (!window.matchMedia) {
    // @ts-expect-error stub de test
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
  }
})

import { LoginPage } from '@/features/auth/LoginPage'
import { RequestAccessPage } from '@/features/auth/RequestAccessPage'
import { RequestSentPage } from '@/features/auth/RequestSentPage'
import { NormasPage } from '@/features/auth/NormasPage'
import { PrivacidadPage } from '@/features/auth/PrivacidadPage'
import { PendingPage } from '@/features/auth/PendingPage'
import { SuspendedPage } from '@/features/auth/SuspendedPage'
import { HomePage } from '@/features/home/HomePage'
import { MasPage } from '@/features/home/MasPage'
import { MensajesPage } from '@/features/mensajes/MensajesPage'
import { BuzonPage } from '@/features/buzon/BuzonPage'
import { EncuestasListPage } from '@/features/encuestas/EncuestasListPage'
import { CreateEncuestaPage } from '@/features/encuestas/CreateEncuestaPage'
import { VotePage } from '@/features/encuestas/VotePage'
import { ResultsPage } from '@/features/encuestas/ResultsPage'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { NuevaReservaPage } from '@/features/bookings/NuevaReservaPage'
import { ParkingPage } from '@/features/parking/ParkingPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ReciclajePage } from '@/features/misc/ReciclajePage'
import { SugerenciasPage } from '@/features/misc/SugerenciasPage'
import { AvisosPage } from '@/features/misc/AvisosPage'
import { AdminPage } from '@/features/admin/AdminPage'

function renderAt(el: ReactElement, path: string, routePath: string) {
  const r = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={el} />
      </Routes>
    </MemoryRouter>,
  )
  cleanup()
  return r
}

const casos: [string, ReactElement, string, string][] = [
  ['Login', <LoginPage />, '/login', '/login'],
  ['RequestAccess', <RequestAccessPage />, '/solicitar-acceso', '/solicitar-acceso'],
  ['RequestSent', <RequestSentPage />, '/solicitud-enviada', '/solicitud-enviada'],
  ['Normas', <NormasPage />, '/normas', '/normas'],
  ['Privacidad', <PrivacidadPage />, '/privacidad', '/privacidad'],
  ['Pending', <PendingPage />, '/pendiente', '/pendiente'],
  ['Suspended', <SuspendedPage />, '/suspendido', '/suspendido'],
  ['Home', <HomePage />, '/', '/'],
  ['Mas', <MasPage />, '/mas', '/mas'],
  ['Mensajes', <MensajesPage />, '/mensajes', '/mensajes'],
  ['Buzon', <BuzonPage />, '/buzon', '/buzon'],
  ['EncuestasList', <EncuestasListPage />, '/votaciones', '/votaciones'],
  ['CreateEncuesta', <CreateEncuestaPage />, '/votaciones/nueva', '/votaciones/nueva'],
  ['Vote', <VotePage />, '/votaciones/p1', '/votaciones/:id'],
  ['Results', <ResultsPage />, '/votaciones/p3/resultados', '/votaciones/:id/resultados'],
  ['Bookings', <BookingsPage />, '/reservas', '/reservas'],
  ['NuevaReserva', <NuevaReservaPage />, '/reservas/nueva', '/reservas/nueva'],
  ['Parking', <ParkingPage />, '/parking', '/parking'],
  ['Contacts', <ContactsPage />, '/contactos', '/contactos'],
  ['Settings', <SettingsPage />, '/ajustes', '/ajustes'],
  ['Reciclaje', <ReciclajePage />, '/reciclaje', '/reciclaje'],
  ['Sugerencias', <SugerenciasPage />, '/sugerencias', '/sugerencias'],
  ['Avisos', <AvisosPage />, '/avisos', '/avisos'],
  ['Admin', <AdminPage />, '/admin', '/admin'],
]

describe('render sin crash de todas las pantallas', () => {
  for (const [nombre, el, path, routePath] of casos) {
    it(`monta ${nombre}`, () => {
      expect(() => renderAt(el, path, routePath)).not.toThrow()
    })
  }
})
