# Academia de Baile — Frontend

SPA en HTML, CSS y JavaScript vanilla que consume la API del backend (`E:\meto\repos\academia-baile-api`). No requiere build ni dependencias: el backend sirve esta carpeta como estático.

## Cómo levantarlo

```bash
cd ../academia-baile-api
npm install
npm run dev
```

Abrir http://localhost:3000.

Para probar solo la interfaz sin base de datos se puede servir la carpeta con cualquier servidor estático, pero login, tablas y gráficos necesitan `/api/*`.

## Estructura

```
academia-baile-web/
├── index.html                  # Shell: login, sidebar, topbar, diálogos y toasts
├── css/styles.css              # Design system "Estudio" (tokens, componentes, responsive)
├── js/app.js                   # Vistas, API, gráficos, feedback y acciones
├── design-system/academia/     # MASTER.md: fuente de verdad de diseño
└── README.md
```

## Design system

Concepto *Estudio*: papel marfil, tinta ciruela, vino y oro; Fraunces para display e Inter para UI. Los tokens, componentes, reglas de accesibilidad y anti-patrones están en [design-system/academia/MASTER.md](design-system/academia/MASTER.md).

## Convenciones

- JavaScript vanilla en un solo archivo, sin frameworks ni bundler.
- Prettier: `--single-quote --arrow-parens avoid --trailing-comma none`.
- Mantener los IDs y nombres de campos que usa `js/app.js`; el backend espera esos contratos.
- Feedback al usuario siempre con toasts y diálogos propios (nunca `alert`/`confirm`).
- Iconografía Phosphor; nada de emojis estructurales.
- Targets táctiles mínimos de 44×44 px y foco visible.

## Funcionalidad cubierta

Login con JWT, panel con KPIs y gráficos, padrón de alumnos con ficha e historial, CRUD de profesores con ficha y clases a cargo, clases con cupos e inscripciones, pagos y reporte mensual, asistente IA de solo lectura, menú responsive y estados de carga/vacío.
