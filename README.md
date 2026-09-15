# Control de Asistencia

Sistema de control de asistencia por QR para empresa. El trabajador escanea un
QR, selecciona su nombre, ingresa su PIN y el sistema determina automáticamente
si corresponde ENTRADA o SALIDA (con soporte para hasta dos turnos por día,
detectados automáticamente según la hora).

```
TRABAJADOR → QR → GITHUB PAGES (HTML/CSS/JS) → GOOGLE APPS SCRIPT → GOOGLE SHEETS
```

## Estructura del proyecto

```
control-asistencia/
├── docs/                      → Página pública (servida por GitHub Pages desde /docs)
│   ├── index.html
│   ├── css/style.css
│   ├── js/config.js            → URL de la API (editar tras desplegar)
│   ├── js/app.js
│   └── assets/
├── google-apps-script/        → API (copiar a Apps Script)
│   ├── Code.gs                  → doGet / doPost (punto de entrada)
│   ├── Config.gs                → IDs, nombres de hojas, constantes
│   ├── Personal.gs              → validación de trabajador y PIN
│   ├── Turnos.gs                → lectura de turnos
│   ├── Asistencias.gs           → lógica de entrada/salida (multi-turno)
│   └── Utils.gs                 → fecha/hora Guatemala, JSON, helpers
├── DEPLOY.md                   → guía de despliegue paso a paso
└── README.md
```

## Estado actual

- [x] Fase 1 — Diseño de Google Sheets
- [x] Fase 2 — Google Apps Script (API completa)
- [x] Fase 3 — Página web
- [x] Fase 4 — Conexión web ↔ Apps Script
- [x] Fase 5 — Pruebas de entrada y salida (verificado end-to-end, incluye doble turno por día)
- [ ] Fase 6 — Publicar en GitHub Pages
- [ ] Fase 7 — Pruebas completas
- [ ] Fase 8 — API lista para app Android (ya preparada por diseño: respuestas JSON,
      sin dependencia de sesión de navegador, acciones desacopladas en `doGet`/`doPost`)

## Siguiente paso

Sigue `DEPLOY.md` para desplegar el Apps Script y publicar en GitHub Pages.
