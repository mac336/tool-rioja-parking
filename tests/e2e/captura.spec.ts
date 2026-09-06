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

    // H1 (ROTO, design-review 49): «Nueva» y el ‹ atrás deben tener aire
    // arriba y quedar centrados en la cabecera — antes .safe-top pisaba el
    // padding-top de SubHeader y quedaban a 0 px del borde del viewport.
    const header = page.locator('header').first()
    const cajaHeader = await header.boundingBox()
    expect(cajaHeader).not.toBeNull()

    const nueva = page.getByRole('button', { name: 'Nueva' })
    const cajaNueva = await nueva.boundingBox()
    expect(cajaNueva).not.toBeNull()
    if (cajaHeader && cajaNueva) {
      expect(cajaNueva.y).toBeGreaterThanOrEqual(6)
      const centroNueva = cajaNueva.y + cajaNueva.height / 2
      const centroHeader = cajaHeader.y + cajaHeader.height / 2
      expect(Math.abs(centroNueva - centroHeader)).toBeLessThanOrEqual(2)
    }

    const atras = page.getByRole('button', { name: 'Atrás' })
    const cajaAtras = await atras.boundingBox()
    expect(cajaAtras).not.toBeNull()
    if (cajaHeader && cajaAtras) {
      expect(cajaAtras.y).toBeGreaterThanOrEqual(6)
      const centroAtras = cajaAtras.y + cajaAtras.height / 2
      const centroHeader = cajaHeader.y + cajaHeader.height / 2
      expect(Math.abs(centroAtras - centroHeader)).toBeLessThanOrEqual(2)
    }

    // H2 (POBRE): toda acción de fila (Editar/Borrar) con área pulsable ≥ 44×44.
    const accionesFila = await page.getByRole('button', { name: /^(Editar|Borrar) / }).all()
    expect(accionesFila.length).toBeGreaterThan(0)
    for (const boton of accionesFila) {
      const caja = await boton.boundingBox()
      expect(caja).not.toBeNull()
      if (caja) {
        expect(caja.width).toBeGreaterThanOrEqual(44)
        expect(caja.height).toBeGreaterThanOrEqual(44)
      }
    }

    // H2: una fila de festivo con permiso mide ≤ 120 px de alto en móvil
    // (antes ~175 px: dos píldoras de acción a ancho completo bajo un
    // separador se comían un tercio de la fila).
    if (testInfo.project.name === 'movil') {
      const filaFestivo = page.locator('div')
        .filter({ hasText: 'Fiesta Nacional de España' })
        .filter({ has: page.getByRole('button', { name: /Editar Fiesta Nacional de España/ }) })
        .last()
      const cajaFila = await filaFestivo.boundingBox()
      expect(cajaFila).not.toBeNull()
      if (cajaFila) expect(cajaFila.height).toBeLessThanOrEqual(120)
    }

    await page.screenshot({ path: `${DIR}/calendario-${testInfo.project.name}.png`, fullPage: true })
  })

  test('/calendario · vecino (rol de solo lectura: sin "Nueva" ni acciones de fila)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'movil', 'captura pedida solo en móvil (hueco #6 de 49-design-review.md)')
    await entrarDemo(page)
    await verComo(page, 'vecino')
    await irACalendarioSinRecargar(page)
    await expect(page.getByText('Cierre de la piscina')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nueva' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Editar /})).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Borrar /})).toHaveCount(0)
    await page.screenshot({ path: `${DIR}/calendario-vecino-movil.png`, fullPage: true })
  })

  test('/calendario · hoja "Editar" (con Borrar; Guardar visible sin scroll)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'movil', 'captura pedida solo en móvil (hueco #3 de 49-design-review.md)')
    await entrarDemo(page)
    await verComo(page, 'presidente')
    await irACalendarioSinRecargar(page)
    await page.getByRole('button', { name: 'Editar Cierre de la piscina' }).click()
    await expect(page.getByLabel('Título')).toHaveValue('Cierre de la piscina')
    // El "Borrar" DE LA HOJA (sin título, a diferencia del de cada fila:
    // "Borrar <título>") es el tercer botón, bajo Guardar/Cancelar.
    const borrarHoja = page.getByRole('button', { name: 'Borrar', exact: true })
    await expect(borrarHoja).toBeVisible()
    await page.screenshot({ path: `${DIR}/calendario-editar-movil.png` })

    // El tercer botón "Borrar" bajo Guardar/Cancelar no debe empujar a
    // "Guardar" fuera del viewport visible (hueco #3: ¿sigue cabiendo sin
    // scroll con 3 botones en vez de 2?).
    const guardar = page.getByRole('button', { name: /Guardar/ })
    const cajaGuardar = await guardar.boundingBox()
    const viewport = page.viewportSize()
    expect(cajaGuardar).not.toBeNull()
    expect(viewport).not.toBeNull()
    if (cajaGuardar && viewport) {
      expect(cajaGuardar.y + cajaGuardar.height).toBeLessThanOrEqual(viewport.height + 1)
    }
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
