import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import { entrarDemo, verComo, irACalendarioSinRecargar } from './helpers'

// Capturas + geometría (AGENTS.md §7.15) del módulo Calendario, en modo mock.
const DIR = process.env.CAPTURAS_DIR ?? 'test-results/capturas'

test.beforeAll(() => {
  fs.mkdirSync(DIR, { recursive: true })
})

test.describe('Calendario · capturas', () => {
  test('Home (con recordatorio de calendario si el mock lo muestra)', async ({ page }, testInfo) => {
    await entrarDemo(page)
    // Espera a que cargue el bloque contextual (parking/reserva/calendario:
    // el mock tiene un pequeño delay artificial) para que la captura sea
    // representativa y no un estado de carga vacío.
    await expect(page.getByText('Tu reserva')).toBeVisible()
    await page.screenshot({ path: `${DIR}/home-${testInfo.project.name}.png` })
  })

  test('/calendario · lista', async ({ page }, testInfo) => {
    await entrarDemo(page)
    await verComo(page, 'presidente')
    await irACalendarioSinRecargar(page)
    await expect(page.getByText('Cierre de la piscina')).toBeVisible()
    await page.screenshot({ path: `${DIR}/calendario-${testInfo.project.name}.png`, fullPage: true })
  })

  test('/calendario · hoja "Nueva" abierta (con geometría)', async ({ page }, testInfo) => {
    await entrarDemo(page)
    await verComo(page, 'presidente')
    await irACalendarioSinRecargar(page)

    const nueva = page.getByRole('button', { name: 'Nueva' })
    await expect(nueva).toBeVisible()
    const cajaNueva = await nueva.boundingBox()
    expect(cajaNueva).not.toBeNull()
    if (cajaNueva) expect(cajaNueva.height).toBeGreaterThanOrEqual(44)

    await nueva.click()
    await expect(page.getByLabel('Título')).toBeVisible()
    await page.screenshot({ path: `${DIR}/calendario-nueva-${testInfo.project.name}.png` })

    // La hoja modal no desborda el viewport.
    const viewport = page.viewportSize()
    const hoja = page.locator('div').filter({ has: page.getByLabel('Título') }).last()
    const cajaHoja = await hoja.boundingBox()
    expect(viewport).not.toBeNull()
    expect(cajaHoja).not.toBeNull()
    if (viewport && cajaHoja) {
      expect(cajaHoja.x).toBeGreaterThanOrEqual(0)
      expect(cajaHoja.y).toBeGreaterThanOrEqual(0)
      expect(cajaHoja.x + cajaHoja.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(cajaHoja.y + cajaHoja.height).toBeLessThanOrEqual(viewport.height + 1)
    }

    // Ningún elemento de la hoja recién abierta desborda horizontalmente su
    // contenedor (regla de geometría §7.15; acotado a la propia hoja, no a
    // toda la página, para no acoplarse a nada ajeno a esta feature).
    const desbordes = await hoja.evaluate((el) =>
      Array.from(el.querySelectorAll('*')).filter(
        (n) => n.scrollWidth > n.clientWidth + 1,
      ).length,
    )
    expect(desbordes).toBe(0)
  })
})
