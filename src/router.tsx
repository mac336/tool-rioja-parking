import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useApp } from '@/store'
import { puedeAdmin, esAppAdmin } from '@/lib/roles'
import { usingSupabase } from '@/lib/supabase'

import { LoginPage } from '@/features/auth/LoginPage'
import { RequestAccessPage } from '@/features/auth/RequestAccessPage'
import { RequestSentPage } from '@/features/auth/RequestSentPage'
import { NormasPage } from '@/features/auth/NormasPage'
import { PrivacidadPage } from '@/features/auth/PrivacidadPage'
import { PendingPage } from '@/features/auth/PendingPage'
import { SuspendedPage } from '@/features/auth/SuspendedPage'
import { HomePage } from '@/features/home/HomePage'
import { MensajesPage } from '@/features/mensajes/MensajesPage'
import { BuzonPage } from '@/features/buzon/BuzonPage'
import { MasPage } from '@/features/home/MasPage'
import { EncuestasListPage } from '@/features/encuestas/EncuestasListPage'
import { CreateEncuestaPage } from '@/features/encuestas/CreateEncuestaPage'
import { VotePage } from '@/features/encuestas/VotePage'
import { ResultsPage } from '@/features/encuestas/ResultsPage'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { MyBookingsPage } from '@/features/bookings/MyBookingsPage'
import { ParkingPage } from '@/features/parking/ParkingPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ReciclajePage } from '@/features/misc/ReciclajePage'
import { SugerenciasPage } from '@/features/misc/SugerenciasPage'
import { AvisosPage } from '@/features/misc/AvisosPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { DashboardPage } from '@/features/admin/DashboardPage'

function Shell() {
  return <AppShell><Outlet /></AppShell>
}

function RequireAdmin() {
  const { user } = useApp()
  if (!puedeAdmin(user.rol)) return <Navigate to="/" replace />
  return <Outlet />
}

function RequireAppAdmin() {
  const { user } = useApp()
  if (!esAppAdmin(user.rol)) return <Navigate to="/" replace />
  return <Outlet />
}

/** Gate de sesión (solo con Supabase; en modo demo deja pasar). */
function RequireActive() {
  const { authStatus, user } = useApp()
  if (!usingSupabase) return <Outlet />
  if (authStatus === 'loading') {
    return <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">Cargando…</div>
  }
  if (authStatus === 'anon') return <Navigate to="/login" replace />
  if (authStatus === 'suspended') return <Navigate to="/suspendido" replace />
  if (authStatus === 'pending') return <Navigate to="/pendiente" replace />
  if (!user.normas_aceptadas_at) return <Navigate to="/normas" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  // Pantallas fuera del shell (auth)
  { path: '/login', element: <LoginPage /> },
  { path: '/solicitar-acceso', element: <RequestAccessPage /> },
  { path: '/solicitud-enviada', element: <RequestSentPage /> },
  { path: '/normas', element: <NormasPage /> },
  { path: '/privacidad', element: <PrivacidadPage /> },
  { path: '/pendiente', element: <PendingPage /> },
  { path: '/suspendido', element: <SuspendedPage /> },

  // App con shell (protegida por sesión activa)
  {
    element: <RequireActive />,
    children: [{
    element: <Shell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/mas', element: <MasPage /> },
      { path: '/mensajes', element: <MensajesPage /> },
      { path: '/buzon', element: <BuzonPage /> },
      { path: '/votaciones', element: <EncuestasListPage /> },
      { path: '/votaciones/nueva', element: <CreateEncuestaPage /> },
      { path: '/votaciones/:id', element: <VotePage /> },
      { path: '/votaciones/:id/resultados', element: <ResultsPage /> },
      { path: '/reservas', element: <BookingsPage /> },
      { path: '/reservas/mias', element: <MyBookingsPage /> },
      { path: '/parking', element: <ParkingPage /> },
      { path: '/contactos', element: <ContactsPage /> },
      { path: '/ajustes', element: <SettingsPage /> },
      { path: '/reciclaje', element: <ReciclajePage /> },
      { path: '/sugerencias', element: <SugerenciasPage /> },
      { path: '/avisos', element: <AvisosPage /> },
      {
        element: <RequireAdmin />,
        children: [{ path: '/admin', element: <AdminPage /> }],
      }, {
        element: <RequireAppAdmin />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }],
      },
    ],
    }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
