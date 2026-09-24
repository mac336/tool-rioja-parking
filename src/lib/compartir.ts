// Compartir una tarjeta del tablón como IMAGEN (v1.57.0).
// ---------------------------------------------------------------------------
// Genera un PNG del post-it y lo pasa al menú nativo del móvil (Web Share API
// con ficheros: WhatsApp, Telegram, correo…). Si el navegador no sabe compartir
// ficheros —escritorio, iOS antiguo— se descarga la imagen, que es lo más útil
// que se puede hacer sin inventar un flujo raro.
//
// `html-to-image` se carga con import() DINÁMICO a propósito: pesa ~400 KB y el
// arranque de la app ya va justo contra el objetivo de <200 KB gzip (specs/10).
// Así solo se descarga cuando alguien pulsa Compartir, una vez.

/** Convierte un nodo del DOM en PNG. Devuelve null si el navegador no puede. */
async function nodoAPng(nodo: HTMLElement, nombre: string): Promise<File | null> {
  try {
    const { toBlob } = await import('html-to-image')
    const blob = await toBlob(nodo, {
      pixelRatio: 2,                 // nítido en pantallas retina
      cacheBust: true,               // evita reutilizar fotos con URL firmada vieja
      backgroundColor: '#EEF2F4',    // el papel del post-it es translúcido
      filter: (n) => !(n instanceof HTMLElement && n.dataset.noCaptura === '1'),
    })
    return blob ? new File([blob], nombre, { type: 'image/png' }) : null
  } catch { return null }
}

export type ResultadoCompartir = 'compartido' | 'descargado' | 'cancelado' | 'error'

/** Comparte la tarjeta como imagen. `titulo` se usa para el nombre del fichero. */
export async function compartirTarjeta(nodo: HTMLElement, titulo: string): Promise<ResultadoCompartir> {
  const limpio = titulo.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 40) || 'tablon'
  const fichero = await nodoAPng(nodo, `rioja25-${limpio}.png`)
  if (!fichero) return 'error'

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [fichero] })) {
    try {
      await nav.share({ files: [fichero], title: titulo })
      return 'compartido'
    } catch (e) {
      // El usuario cerró la hoja de compartir: no es un error que haya que gritar.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
      return 'error'
    }
  }

  // Sin Web Share de ficheros: descargamos el PNG.
  const url = URL.createObjectURL(fichero)
  const a = document.createElement('a')
  a.href = url; a.download = fichero.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'descargado'
}
