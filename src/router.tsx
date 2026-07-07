import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useApp } from '@/store'
import { puedeAdmin } from '@/lib/roles'

import { LoginPage } from '@/features/auth/LoginPage'
import { RequestAccessPage } from '@/features/auth/RequestAccessPage'
import { RequestSentPage } from '@/features/auth/RequestSentPage'
import { NormasPage } from '@/features/auth/NormasPage'
import { PrivacidadPage } from '@/features/auth/PrivacidadPage'
import { HomePage } from '@/features/home/HomePage'
import { MasPage } from '@/features/home/MasPage'
import { IncidentsListPage } from '@/features/incidents/IncidentsListPage'
import { IncidentDetailPage } from '@/features/incidents/IncidentDetailPage'
import { NewIncidentPage } from '@/features/incidents/NewIncidentPage'
import { EncuestasListPage } from '@/features/encuestas/EncuestasListPage'
import { CreateEncuestaPage } from '@/features/encuestas/CreateEncuestaPage'
import { VotePage } from '@/features/encuestas/VotePage'
import { ResultsPage } from '@/features/encuestas/ResultsPage'
import { AnunciosPage } from '@/features/anuncios/AnunciosPage'
import { NewAnuncioPage } from '@/features/anuncios/NewAnuncioPage'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { MyBookingsPage } from '@/features/bookings/MyBookingsPage'
import { ParkingPage } from '@/features/parking/ParkingPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ReciclajePage } from '@/features/misc/ReciclajePage'
import { SugerenciasPage } from '@/features/misc/SugerenciasPage'
import { AdminPage } from '@/features/admin/AdminPage'

function Shell() {
  return <AppShell><Outlet /></AppShell>
}

function RequireAdmin() {
  const { user } = useApp()
  if (!puedeAdmin(user.rol)) return <Navigate to="/" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  // Pantallas fuera del shell (auth)
  { path: '/login', element: <LoginPage /> },
  { path: '/solicitar-acceso', element: <RequestAccessPage /> },
  { path: '/solicitud-enviada', element: <RequestSentPage /> },
  { path: '/normas', element: <NormasPage /> },
  { path: '/privacidad', element: <PrivacidadPage /> },

  // App con shell
  {
    element: <Shell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/mas', element: <MasPage /> },
      { path: '/incidencias', element: <IncidentsListPage /> },
      { path: '/incidencias/nueva', element: <NewIncidentPage /> },
      { path: '/incidencias/:id', element: <IncidentDetailPage /> },
      { path: '/votaciones', element: <EncuestasListPage /> },
      { path: '/votaciones/nueva', element: <CreateEncuestaPage /> },
      { path: '/votaciones/:id', element: <VotePage /> },
      { path: '/votaciones/:id/resultados', element: <ResultsPage /> },
      { path: '/anuncios', element: <AnunciosPage /> },
      { path: '/anuncios/nuevo', element: <NewAnuncioPage /> },
      { path: '/reservas', element: <BookingsPage /> },
      { path: '/reservas/mias', element: <MyBookingsPage /> },
      { path: '/parking', element: <ParkingPage /> },
      { path: '/contactos', element: <ContactsPage /> },
      { path: '/ajustes', element: <SettingsPage /> },
      { path: '/reciclaje', element: <ReciclajePage /> },
      { path: '/sugerencias', element: <SugerenciasPage /> },
      {
        element: <RequireAdmin />,
        children: [{ path: '/admin', element: <AdminPage /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
