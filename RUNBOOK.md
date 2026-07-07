# RUNBOOK — App Comunidad Rioja 25

Guía para **ver la app** y para los pasos que solo puedes hacer tú (cuentas/secretos).

---

## 1. Ver la app en 30 segundos (modo demo, sin backend)

La app viene configurada por defecto en **modo mock**: datos de ejemplo en
memoria, totalmente navegable, sin necesidad de Supabase ni credenciales.

```bash
cd /mnt/c/personal/tool-rioja-parking
npm install         # si no lo has hecho ya
npm run dev
```

Abre lo que indique la terminal (normalmente **http://localhost:5173**).

- Entras en la pantalla de **Login** → pulsa "Recibir enlace por correo" o
  "Entrar con Google" (en demo, cualquiera te lleva directo al Home).
- Navega por: Home, Incidencias, Votaciones, Anuncios, Reservas, Parking,
  Contactos, Reciclaje, Sugerencias.
- **Para ver las vistas de gestión** (colas de moderación/aprobación, panel de
  admin): ve a **"Más"** → sección **"DEMO · ver como rol"** → elige
  *Presidente* o *Administrador de la app*. Verás aparecer las colas y el panel
  de gestión.
- Prueba el modo **claro/oscuro** en "Más" → Apariencia.

> Es una PWA: en el móvil o en Chrome puedes "Instalar app".

### Ver con el backend real (ya CABLEADO y probado)
El backend (Postgres + RLS + Auth) está aplicado en Supabase local y la app ya
está conectada a él (auth real + capa de datos vía supabase-js).
```bash
npx supabase start      # levanta Postgres, Auth, Storage, Mailpit… (Docker)
npx supabase db reset   # aplica migraciones + seed (41 viviendas, contactos…)
```
Studio (ver la BD): **http://127.0.0.1:54323** · Correos locales (Mailpit): **http://127.0.0.1:54324**.
Para que la web use el backend real, en `.env.local` pon `VITE_DATA_SOURCE=supabase`
(la URL y la ANON_KEY locales ya están puestas). Reinicia `npm run dev`.

**Flujo de acceso real (en local):**
1. En Login → "Recibir enlace por correo" → escribe un correo → el enlace mágico
   aparece en **Mailpit** (http://127.0.0.1:54324). Ábrelo → entras (estado "pendiente").
2. Aprueba la cuenta: en Studio o por SQL, pon `estado='activo'` y una `vivienda`
   en tu fila de `profiles` (o usa el panel de admin desde una cuenta ya activa).
3. Para que funcionen aprobar-alta y gestión de usuarios en local, sirve las
   funciones: `npx supabase functions serve` (usan service_role).

> **Ya está cableado**: auth (enlace mágico/Google), guard de sesión, pantallas
> pendiente/suspendido, y todos los módulos (incidencias, encuestas multi-pregunta,
> reservas, parking, anuncios, contactos, admin) leen/escriben en Supabase con RLS.
> Verificado con `tests/db-int/integration.test.ts` (`SUPA_ITEST=1 npx vitest run tests/db-int`).
> **Falta para producción**: credenciales Google OAuth, `supabase functions deploy`,
> y un bucket de Storage privado para las imágenes de incidencias/anuncios.

---

## 2. Comprobar que todo está bien (lo que ya dejé verificado)

```bash
npm run build                 # build de producción (debe terminar sin errores)
npx vitest run                # 12 tests de rotación de parking → verde
npx supabase start            # (si no está arrancado)
npx supabase db reset         # aplica esquema + seed
bash scripts/run-rls-tests.sh # 17 tests de seguridad RLS → "TODOS LOS TESTS PASARON"
```

---

## 3. Tareas que SOLO puedes hacer tú (para producción real)

Estas requieren tu identidad y cuentas; no las puedo hacer yo. En orden:

### 3.1 Cuenta de correo de la comunidad (Gmail)
1. Entra en `cdelarioja25@gmail.com` y activa la **verificación en 2 pasos**.
2. Genera una **contraseña de aplicación** (Google Account → Seguridad →
   Contraseñas de aplicaciones). Guárdala; se usa como `GMAIL_APP_PASSWORD`.

### 3.2 Proyecto Supabase de producción (UE)
1. Crea un proyecto en https://supabase.com (región **UE**, p. ej. Frankfurt).
2. Enlaza este repo: `npx supabase link --project-ref <ref>`.
3. Aplica el esquema: `npx supabase db push` (sube las migraciones de `supabase/migrations`).
4. Carga el catálogo inicial: ejecuta el contenido de `supabase/seed.sql` en el
   SQL Editor del proyecto (viviendas, zonas, contactos).
5. **Auth**: activa proveedores **Google** (OAuth) y **Email** (magic link).
   - Configura el **Custom SMTP** con Gmail: host `smtp.gmail.com`, puerto 465,
     usuario `cdelarioja25@gmail.com`, contraseña = la de aplicación (3.1).
6. **Edge Functions**: `npx supabase functions deploy` y define los secretos:
   ```bash
   npx supabase secrets set GMAIL_USER=cdelarioja25@gmail.com \
     GMAIL_APP_PASSWORD=<app-password> \
     TURNSTILE_SECRET_KEY=<clave-secreta-turnstile> \
     APP_ORIGIN=https://<tu-dominio-vercel>
   ```

### 3.3 Google OAuth (para "Entrar con Google")
1. En Google Cloud Console crea credenciales OAuth 2.0 (tipo Web).
2. Añade como *Authorized redirect URI* la que indica Supabase
   (Auth → Providers → Google) y pega Client ID/Secret allí.

### 3.4 Captcha (Cloudflare Turnstile)
1. Crea un sitio en Cloudflare Turnstile → obtén *site key* y *secret key*.
2. *site key* → variable `VITE_TURNSTILE_SITE_KEY` en Vercel.
   *secret key* → secreto de Supabase (3.2, paso 6).
   (En desarrollo usamos la clave de test pública, así que no bloquea nada.)

### 3.5 Vercel (hosting)
1. Importa el repo de GitHub en Vercel (framework: **Vite**).
2. Variables de entorno del proyecto:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key de producción>
   VITE_TURNSTILE_SITE_KEY=<site key>
   VITE_DATA_SOURCE=supabase
   ```
3. Deploy. Cada push a `main` desplegará automáticamente.

---

## 4. Antes de abrir a los vecinos (checklist de seguridad — specs/11)
- [ ] RLS probada con un usuario `vecino` real (ya cubierto por los tests).
- [ ] `service_role` y SMTP **no** aparecen en el frontend ni en el repo.
- [ ] Historial de Git limpio de secretos y del PDF con datos
      (`25-06-2026-Convocatoria-Ordinaria.pdf` está en `.gitignore`; revisa que
      no se subió en commits anteriores antes de hacer el repo público).
- [ ] Captcha + rate-limit activos (Edge Function `solicitar-acceso`).
- [ ] Cabeceras de seguridad / CSP en Vercel (pendiente de añadir `vercel.json`).
- [ ] Revisión de seguridad dedicada.

---

## 5. Estado del trabajo
Ver **`todo.md`** para el detalle de lo hecho, las decisiones tomadas de noche y
lo que queda pendiente de revisar contigo.
