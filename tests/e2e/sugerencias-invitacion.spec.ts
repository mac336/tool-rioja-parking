import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import { entrarDemo, verComo, irAServicioSinRecargar } from './helpers'

// e2e en modo mock (sin backend) — petición del usuario 2026-09-06, specs/16
// § "Inicio · Tablón de la comunidad" y § "Estado vacío: invitación a sugerir".
const DIR = process.env.CAPTURAS_DIR ?? 'test-results/capturas'

test.beforeAll(() => {
  fs.mkdirSync(DIR, { recursive: true })
})

test.describe('Buzón · deep-link a Publicar (query param)', () => {
  test('/buzon?publicar=sugerencia abre el formulario ya en tipo Sugerencia', async ({ page }) => {
    await entrarDemo(page)
    await page.goto('/buzon?publicar=sugerencia')
    await expect(page.getByText('Nueva sugerencia')).toBeVisible()
    await expect(page.getByLabel('¿Qué quieres sugerir?')).toBeVisible()
    // El query param se limpia tras abrir (replace): no queda en la URL, así
    // que recargar o volver atrás no vuelve a disparar el formulario solo.
    await expect(page).toHaveURL(/\/buzon$/)
  })
})

test.describe('Home · tablón vacío: invitación a sugerir (petición 2026-09-06)', () => {
  // Vacía el tablón borrando los 3 mensajes sembrados del mock (aviso, anuncio,
  // incidencia) desde Servicios → Mensajes: es una acción REAL de borrado ya
  // soportada por la app (no se fabrican datos falsos en el mock, 98-checklist/
  // consigna del encargo). Solo posible con un rol de gestión (aquí app_admin,
  // el único SUPERADMIN disponible en el selector DEMO).
  async function vaciarTablon(page: import('@playwright/test').Page) {
    await entrarDemo(page)
    await verComo(page, 'app_admin')
    page.on('dialog', (d) => d.accept())
    await irAServicioSinRecargar(page, 'Mensajes')
    for (const [tab, vacio] of [
      ['Avisos', 'Sin avisos'],
      ['Anuncios', 'Sin anuncios'],
      ['Incidencias', 'Sin incidencias'],
    ] as const) {
      await page.getByRole('button', { name: new RegExp(`^${tab}`) }).click()
      await page.getByRole('button', { name: 'Borrar' }).click()
      await expect(page.getByRole('heading', { name: vacio })).toBeVisible()
    }
    await page.getByRole('link', { name: 'Inicio' }).click()
    // Deja que se apaguen los toasts "Mensaje borrado" (auto-dismiss 3.5s,
    // store.ts) para que no tapen la Home en las aserciones/captura de abajo.
    await expect(page.getByText('Mensaje borrado')).toHaveCount(0, { timeout: 6000 })
  }

  test('sin mensajes, la Home muestra la tarjeta-invitación (icono, título, texto, botón y enlace)', async ({ page }, testInfo) => {
    await vaciarTablon(page)

    await expect(page.getByText('¿Se te ocurre algo para mejorar la comunidad?')).toBeVisible()
    await expect(page.getByText('Hoy el tablón está tranquilo. Este hueco puede ser para tu idea.')).toBeVisible()
    const boton = page.getByRole('button', { name: 'Escribir una sugerencia' })
    await expect(boton).toBeVisible()
    const enlace = page.getByRole('button', { name: 'Ver sugerencias de vecinos ›' })
    await expect(enlace).toBeVisible()

    // §7.15: pulsable ≥ 44 px de alto.
    const caja = await boton.boundingBox()
    expect(caja).not.toBeNull()
    if (caja) expect(caja.height).toBeGreaterThanOrEqual(44)

    // Elástico y sin scroll de página (specs/10): la tarjeta cabe en el hueco,
    // "Servicios" sigue entero y visible, pegado al footer.
    await expect(page.getByText('Servicios', { exact: true })).toBeVisible()
    const desborda = await page.evaluate(() => {
      const el = document.scrollingElement
      return el ? el.scrollHeight > window.innerHeight + 1 : false
    })
    expect(desborda).toBe(false)

    if (testInfo.project.name === 'movil') {
      await page.screenshot({ path: `${DIR}/home-tablon-vacio-movil.png` })
    }
  })

  test('el enlace "Ver sugerencias de vecinos" lleva a /sugerencias', async ({ page }) => {
    await vaciarTablon(page)
    await page.getByRole('button', { name: 'Ver sugerencias de vecinos ›' }).click()
    await expect(page).toHaveURL(/\/sugerencias$/)
  })

  test('el botón "Escribir una sugerencia" lleva a Buzón → Publicar ya en tipo Sugerencia', async ({ page }) => {
    await vaciarTablon(page)
    await page.getByRole('button', { name: 'Escribir una sugerencia' }).click()
    await expect(page).toHaveURL(/\/buzon/)
    await expect(page.getByText('Nueva sugerencia')).toBeVisible()
    await expect(page.getByLabel('¿Qué quieres sugerir?')).toBeVisible()
  })
})
