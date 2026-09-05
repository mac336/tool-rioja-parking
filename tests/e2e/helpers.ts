import type { Page } from '@playwright/test'

// Helpers e2e (modo mock, sin backend — RUNBOOK.md §1, specs/21).

export type RolDemo = 'vecino' | 'junta' | 'presidente' | 'app_admin'

// Debe coincidir con src/lib/roles.ts (ROLE_LABEL): lo repetimos aquí, literal,
// porque los tests e2e no comparten el bundler/alias de la app.
const ROLE_LABEL: Record<RolDemo, string> = {
  vecino: 'Vecino',
  junta: 'Junta',
  presidente: 'Presidente',
  app_admin: 'Administrador de la app',
}

/** Login en modo demo: cualquier correo válido entra directo al Home.
 *  Salta la pantalla de bienvenida (SplashScreen, una vez por sessionStorage)
 *  marcándola como ya vista ANTES de la primera navegación: así no depende de
 *  su markup ("Siguiente" / "Continuar sin instalar" según plataforma). */
export async function entrarDemo(page: Page): Promise<void> {
  await page.addInitScript(() => { try { sessionStorage.setItem('r25-splash-seen', '1') } catch { /* noop */ } })
  await page.goto('/login')
  await page.getByLabel('Tu correo').fill('demo@correo.es')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** Más → «DEMO · ver como rol» → pulsa el rol pedido (solo modo mock). */
export async function verComo(page: Page, rol: RolDemo): Promise<void> {
  await page.goto('/mas')
  const etiqueta = page.getByText('DEMO · ver como rol', { exact: true })
  // El contenedor del selector demo es el padre directo de la etiqueta y de
  // los botones de rol (evita ambigüedad con el selector "Ver como…" del
  // app_admin, que repite algunas de las mismas etiquetas de rol).
  const contenedor = etiqueta.locator('xpath=..')
  await contenedor.getByRole('button', { name: ROLE_LABEL[rol], exact: true }).click()
}

/** Navega a /calendario SIN recargar la página (clics de React Router, no
 *  `page.goto`), justo después de `verComo`: el rol demo vive en memoria del
 *  mock (`currentUser` de apiMock.ts), y `page.goto()` hace una navegación
 *  dura de verdad (recarga completa del documento) que lo resetea a 'vecino'
 *  — se comprobó que por eso el botón "Nueva" nunca aparecía tras elegir un
 *  rol de gestión. Se asume que `verComo` deja la página en /mas. */
export async function irACalendarioSinRecargar(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('link', { name: 'Calendario' }).click()
}

/** 'YYYY-MM-DD' (Europe/Madrid) de hoy + `dias` días naturales; para rellenar
 *  <input type="date"> en los tests sin depender de la hora local del runner. */
export function ymdOffset(dias: number, base: Date = new Date()): string {
  const d = new Date(base.getTime() + dias * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
