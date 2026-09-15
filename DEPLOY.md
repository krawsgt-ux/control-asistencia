# Guía de despliegue

## Paso 1 — Crear el proyecto de Apps Script vinculado a tu Sheet

1. Abre tu Google Sheet "Control de Asistencia - BD".
2. Ve a **Extensiones → Apps Script**. Esto abre un editor ya vinculado a tu
   hoja (no necesitas configurar ningún ID).
3. Borra el archivo `Code.gs` de ejemplo que trae vacío, o simplemente borra su
   contenido.

## Paso 2 — Copiar los archivos

En el editor de Apps Script, crea un archivo `.gs` por cada archivo de la
carpeta `google-apps-script/` de este proyecto (mismo nombre) y pega el
contenido correspondiente:

- `Config.gs`
- `Utils.gs`
- `Personal.gs`
- `Turnos.gs`
- `Asistencias.gs`
- `Code.gs`

Para crear cada archivo: icono **+** junto a "Archivos" → **Script**.

No necesitas cambiar `SPREADSHEET_ID` (déjalo vacío) porque el proyecto quedó
vinculado directamente a tu Sheet en el Paso 1.

## Paso 3 — Publicar como Web App

1. Arriba a la derecha, botón **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario
4. Clic en **Implementar**.
5. Autoriza los permisos que Google te pida (es tu propio script accediendo a
   tu propio Sheet).
6. Copia la **URL de la aplicación web** que termina en `/exec`.

## Paso 4 — Conectar la página web

1. Abre `docs/js/config.js` en este proyecto.
2. Reemplaza el valor de `API_URL` con la URL que copiaste:

```js
const API_URL = 'https://script.google.com/macros/s/TU_ID_AQUI/exec';
```

## Paso 5 — Probar localmente

Abre `docs/index.html` directamente en tu navegador (doble clic) y prueba:

1. Debe cargar el listado de trabajadores en el selector.
2. Selecciona un trabajador de prueba, ingresa su PIN y presiona
   "Registrar asistencia" → debe mostrar "Entrada registrada correctamente".
3. Vuelve a repetir el mismo proceso con el mismo trabajador → debe mostrar
   "Salida registrada correctamente" y las horas trabajadas quedan calculadas
   en la hoja `ASISTENCIAS`.
4. Prueba casos de error: PIN incorrecto, trabajador `INACTIVO` (cambia el
   `ESTADO` de un trabajador de prueba en Sheets a `INACTIVO` y vuelve a
   intentar).

Revisa la hoja `ASISTENCIAS` en Google Sheets después de cada prueba para
confirmar que los datos se escribieron correctamente.

## Paso 6 — Publicar en GitHub Pages

Este repositorio ya está preparado: la carpeta `docs/` en la raíz contiene la
página web, que es justo la carpeta que GitHub Pages puede servir directamente
sin configuración extra.

1. En GitHub, entra a tu repositorio → **Settings → Pages**.
2. En **Source**, selecciona **Deploy from a branch**.
3. En **Branch**, selecciona `main` y la carpeta **`/docs`**.
4. Clic en **Save**.
5. Espera 1-2 minutos y GitHub te mostrará la URL pública, algo como
   `https://tu-usuario.github.io/control-asistencia/`.
6. Genera un código QR que apunte a esa URL (cualquier generador de QR sirve)
   y colócalo físicamente en la empresa.

## Notas importantes

- Cada vez que edites los archivos `.gs`, debes crear una **nueva
  implementación** (o editar la existente desde Implementar → Administrar
  implementaciones) para que los cambios tomen efecto en la URL publicada.
- El PIN y los datos completos del personal (`PERSONAL`) nunca salen hacia el
  navegador: la página pública solo recibe `id` y `nombre` de trabajadores
  activos.
- La fecha y hora del registro siempre las genera Apps Script con la zona
  horaria `America/Guatemala`, sin importar la hora del teléfono del
  trabajador.
