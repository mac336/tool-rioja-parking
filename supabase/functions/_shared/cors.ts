// Cabeceras CORS. En producción, restringe ALLOW_ORIGIN al dominio de la app
// (variable de entorno APP_ORIGIN). Ver specs/11 (CORS limitado a los dominios).
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? '*'

export const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
