# 09 · Módulo Contactos

## Objetivo
Directorio de contactos útiles de la comunidad (administrador, conserje,
proveedores, junta, seguro), **movido detrás del login**. Hoy están escritos en
el HTML público → es una fuga de datos personales que se corrige aquí.

## Historias de usuario
- Como **vecino**, quiero encontrar rápido el teléfono del conserje o del
  administrador.
- Como **admin**, quiero editar los contactos sin tocar código.

## Requisitos funcionales
1. **Listado** por función/categoría: función, nombre, dirección, teléfono(s),
   email/web. Teléfonos y correos como enlaces (`tel:`, `mailto:`).
2. **Edición** (solo admin): alta/edición/baja de contactos desde la app, sin
   redeploy.
3. **Migración**: cargar los contactos actuales del `index.html` como datos
   iniciales en la tabla `contactos` (ya **no** en el código).

## Datos
Tabla `contactos` (módulo 04). Contenido inicial a migrar (proveedores y junta
que hoy figuran en el código):
Administrador, Ascensores, Antenas/portero, Calefacción, Conserje,
Contraincendios, Contadores de agua, Desinsectación, Jardinería, Mant. Piscina,
Puertas Garaje, Presidente, Vicepresidente, Seguro.

## Seguridad y privacidad (ver módulos 10 y 11)
- Lectura **solo** para miembros activos (RLS). Nunca accesible a anónimos ni
  indexable por buscadores.
- Datos de personas (nombres, teléfonos): tratamiento conforme a RGPD
  (módulo 10). No se cachean en el service worker.
- **Acción previa obligatoria:** eliminar los datos personales del HTML público
  actual y revisar el historial de Git antes de mantener el repo público
  (módulo 11).
