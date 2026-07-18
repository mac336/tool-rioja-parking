import { useEffect, useState } from 'react'
import { FINAL_MUNDIAL_MS } from '@/lib/festivo'

// Cuenta atrás EN VIVO hasta la final. Devuelve el subtítulo listo para pintar.
// Se refresca cada 30 s (suficiente para horas/minutos).
export function useCuentaAtrasFinal(): string {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const restante = FINAL_MUNDIAL_MS - ahora
  if (restante <= 0) return 'Final del Mundial · ¡ya está en juego!'
  const totalMin = Math.floor(restante / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `Final del Mundial · quedan ${h} h y ${m} min`
  if (m > 0) return `Final del Mundial · quedan ${m} min`
  return 'Final del Mundial · ¡empieza ya!'
}
