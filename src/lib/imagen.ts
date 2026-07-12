// Compresión de imágenes EN EL NAVEGADOR antes de subir.
// - Redimensiona al lado mayor <= MAX_LADO y reencoda a WebP (calidad CALIDAD).
// - Al pasar por <canvas> se ELIMINA el EXIF (incluida la geolocalización): es un
//   efecto deseado, no subimos dónde/cuándo se tomó la foto.
// - Si el resultado supera MAX_BYTES, baja calidad en pasos; si aun así no cabe,
//   lanza un error legible para avisar al usuario.

const MAX_LADO = 1600
const CALIDAD = 0.72
const MAX_BYTES = 800 * 1024 // 800 KB tras comprimir (el bucket corta a 3 MB)

export interface FotoComprimida { blob: Blob; url: string; bytes: number }

/** Comprime un File de imagen a WebP. Rechaza lo que no sea imagen. */
export async function comprimirImagen(file: File): Promise<FotoComprimida> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.')

  const bitmap = await cargarBitmap(file)
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * escala)
  const h = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ('close' in bitmap) (bitmap as ImageBitmap).close()

  // Reencoda bajando calidad hasta caber en MAX_BYTES.
  let q = CALIDAD
  let blob = await aBlob(canvas, q)
  while (blob && blob.size > MAX_BYTES && q > 0.4) {
    q -= 0.12
    blob = await aBlob(canvas, q)
  }
  if (!blob) throw new Error('No se pudo procesar la imagen.')
  if (blob.size > 3 * 1024 * 1024) throw new Error('La imagen es demasiado grande, prueba con otra.')

  return { blob, url: URL.createObjectURL(blob), bytes: blob.size }
}

function aBlob(canvas: HTMLCanvasElement, q: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob((b) => res(b), 'image/webp', q))
}

async function cargarBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap es lo más rápido y decodifica fuera del hilo principal.
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file) } catch { /* algunos formatos (HEIC) fallan → fallback */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen (¿formato no compatible?).')) }
    img.src = url
  })
}
