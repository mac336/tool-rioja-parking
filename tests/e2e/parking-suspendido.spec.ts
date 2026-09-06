import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import { entrarDemo, verComo, irAServicioSinRecargar } from './helpers'

// e2e en modo mock (sin backend) — evolutivo #2 (70-impact-2.md del harness):
// suspender la cesión de plaza (Parte 2 de specs/08) mientras
// `CESIONES_ACTIVAS = false` en src/features/parking/ParkingPage.tsx.
// Esta suite es la única red que detecta si se ha apagado de más o de menos.
const DIR = process.env.CAPTURAS_DIR ?? 'test-results/capturas'

test.beforeAll(() => {
  fs.mkdirSync(DIR, { recursive: true })
})

test.describe('Parking · Parte 2 (cesión) suspendida', () => {
  test('/parking (vecino): la rotación se ve, la Parte 2 entera ha desaparecido', async ({ page }, testInfo) => {
    await entrarDemo(page)
    await irAServicioSinRecargar(page, 'Parking')
    await expect(page).toHaveURL('/parking')

    // Parte 1 (rotación) intacta.
    await expect(page.getByText('Mis próximos turnos')).toBeVisible()
    await expect(page.getByText('Próximas quincenas · 6 plazas')).toBeVisible()

    // Parte 2 entera: ausente.
    await expect(page.getByText('¿Cedes o necesitas plaza?')).toHaveCount(0)
    await expect(page.getByText('Demanda actual')).toHaveCount(0)
    await expect(page.getByText('Mis avisos de plaza')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enviar aviso' })).toHaveCount(0)
    await expect(page.getByText('Reasignar huecos')).toHaveCount(0)

    if (testInfo.project.name === 'movil') {
      await page.screenshot({ path: `${DIR}/parking-movil.png`, fullPage: true })
    }
  })

  test('/parking (gestión, presidente): tampoco ve "Reasignar huecos" (regresión de rol)', async ({ page }) => {
    await entrarDemo(page)
    await verComo(page, 'presidente')
    await irAServicioSinRecargar(page, 'Parking')
    await expect(page).toHaveURL('/parking')

    await expect(page.getByText('Próximas quincenas · 6 plazas')).toBeVisible()
    await expect(page.getByText('Reasignar huecos')).toHaveCount(0)
    await expect(page.getByText('¿Cedes o necesitas plaza?')).toHaveCount(0)
  })
})
