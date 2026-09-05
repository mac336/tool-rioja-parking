import { test, expect } from '@playwright/test'
import { entrarDemo, verComo, ymdOffset } from './helpers'

// e2e en modo mock (sin backend) — specs/21-modulo-calendario.md § Escenarios.

test.describe('Calendario · Servicios y navegación (C23)', () => {
  test('la Home tiene una celda "Calendario" en Servicios y navega a /calendario', async ({ page }) => {
    await entrarDemo(page)
    const celda = page.getByRole('link', { name: 'Calendario' })
    await expect(celda).toBeVisible()
    await celda.click()
    await expect(page).toHaveURL(/\/calendario$/)
  })

  test('C23 · en móvil, Servicios se ve entero sin scroll de página', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'movil', 'geometría de una sola columna: solo aplica en móvil')
    await entrarDemo(page)
    const celda = page.getByRole('link', { name: 'Calendario' })
    await expect(celda).toBeVisible()
    const caja = await celda.boundingBox()
    const viewport = page.viewportSize()
    expect(caja).not.toBeNull()
    expect(viewport).not.toBeNull()
    if (caja && viewport) {
      expect(caja.y + caja.height).toBeLessThanOrEqual(viewport.height + 1)
    }
    const desborda = await page.evaluate(() => {
      const el = document.scrollingElement
      return el ? el.scrollHeight > window.innerHeight + 1 : false
    })
    expect(desborda).toBe(false)
  })
})

test.describe('Calendario · lista (C19, demo)', () => {
  test('/calendario lista los 3 festivos sembrados y "Cierre de la piscina", agrupados por mes', async ({ page }) => {
    await entrarDemo(page)
    await page.goto('/calendario')
    await expect(page.getByText('Cierre de la piscina')).toBeVisible()
    // Los 3 festivos de 2026 sembrados en el mock (12-oct, 8-dic, 25-dic).
    await expect(page.getByText('Fiesta Nacional de España')).toBeVisible()
    await expect(page.getByText('Inmaculada Concepción')).toBeVisible()
    await expect(page.getByText('Natividad del Señor')).toBeVisible()
    // Agrupado por mes: al menos una cabecera "<Mes> 2026" (SectionTitle).
    await expect(page.getByText(/2026/).first()).toBeVisible()
  })
})

test.describe('Calendario · permisos (C2)', () => {
  test('un vecino ve la lista pero NO ve el botón "Nueva"', async ({ page }) => {
    await entrarDemo(page)
    await verComo(page, 'vecino')
    await page.goto('/calendario')
    await expect(page.getByText('Cierre de la piscina')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nueva' })).toHaveCount(0)
  })
})

test.describe('Calendario · alta con permiso (C1, mock)', () => {
  test('el presidente crea "Junta ordinaria" a hoy+5 y aparece en la lista', async ({ page }) => {
    await entrarDemo(page)
    await verComo(page, 'presidente')
    await page.goto('/calendario')
    await page.getByRole('button', { name: 'Nueva' }).click()
    await page.getByLabel('Título').fill('Junta ordinaria')
    await page.getByLabel('Fecha', { exact: true }).fill(ymdOffset(5))
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Junta ordinaria')).toBeVisible()
  })
})

test.describe('Calendario · borrar (C16)', () => {
  test('el presidente borra un evento con confirmación y desaparece de la lista', async ({ page }) => {
    await entrarDemo(page)
    await verComo(page, 'presidente')
    await page.goto('/calendario')
    // Crea uno propio primero, para no depender de qué haya sembrado el mock.
    await page.getByRole('button', { name: 'Nueva' }).click()
    await page.getByLabel('Título').fill('Evento a borrar')
    await page.getByLabel('Fecha', { exact: true }).fill(ymdOffset(6))
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Evento a borrar')).toBeVisible()

    // Fila = el contenedor más interno que tiene tanto el título como el botón
    // Borrar (evita acoplarse a si es <li> o <div>, o a clases CSS).
    const fila = page.locator('div')
      .filter({ hasText: 'Evento a borrar' })
      .filter({ has: page.getByRole('button', { name: /Borrar/ }) })
      .last()
    page.once('dialog', (d) => d.accept())
    await fila.getByRole('button', { name: /Borrar/ }).click()
    await expect(page.getByText('Evento a borrar')).toHaveCount(0)
  })
})

test.describe('Calendario · recordatorio en la Home según el cupo', () => {
  test('con solo la reserva de la demo ocupando el cupo, la Home muestra el recordatorio de calendario', async ({ page }) => {
    await entrarDemo(page)
    // La demo (MOCK_USER, "2º C Dcha") tiene siempre una reserva vigente y
    // "Cierre de la piscina" a hoy+2 → cupo 2 con hueco: sale el recordatorio.
    // Se localiza por su propio texto (título del evento), no por la etiqueta
    // "Calendario" que también aparece (y ahí sí ambigua) en Servicios.
    await expect(page.getByText('Tu reserva')).toBeVisible()
    const gadgetCalendario = page.getByRole('link', { name: /Cierre de la piscina/ })
    await expect(gadgetCalendario).toBeVisible()
    await expect(gadgetCalendario).toContainText('en 2 días')
  })
})
