# Design System — Academia de Baile

**Concepto:** *Estudio* — editorial cálido con aire de escenario. Papel marfil, tinta ciruela, vino de terciopelo y oro de candelabro. Serif expresiva para la voz, sans neutra para el trabajo diario.

**Fuente de las decisiones:** skill `ui-ux-pro-max` (`E:\meto\.agents\skills\ui-ux-pro-max`). Sin Python disponible en la máquina, la base se consultó directamente sobre `data/styles.csv`, `colors.csv`, `typography.csv`, `ux-guidelines.csv` y `charts.csv`.

| Consulta | Resultado usado |
| :--- | :--- |
| `styles.csv` | *Editorial Grid* (jerarquía tipográfica, reglas finas, asimetría), *Bento Box Grid* (KPIs), *Data-Dense Dashboard* (tablas) |
| `colors.csv` | Base *Beauty/Spa/Wellness* reinterpretada: rosa/lavanda → vino + oro + salvia sobre papel cálido |
| `typography.csv` | *Classic Elegant* evolucionado: Fraunces (display) + Inter (UI) |
| `ux-guidelines.csv` | Empty states con acción, toasts de confirmación, skeletons estables, tablas con scroll horizontal |
| `charts.csv` | Barras para tendencia mensual, dona para distribución; etiquetas visibles y leyenda con valores |

**Anti-patrones prohibidos en este proyecto**

- Violeta/índigo genérico de SaaS, gradientes morados, glassmorphism decorativo.
- Emojis como iconos estructurales (usar Phosphor; siempre `aria-hidden` si acompañan texto).
- Sombras difusas grandes, bordes de 24px en todo, blanco puro como fondo de página.
- Texto gris claro sobre papel (mínimo 4.5:1).
- Tablas que desbordan el viewport sin contenedor con scroll.

---

## 1. Tokens

### Color (60-30-10)

| Rol | Token | Valor | Uso |
| :--- | :--- | :--- | :--- |
| 60% Fondo | `--paper` | `#F6F1E7` | Lienzo de la app |
| 60% Fondo 2 | `--paper-2` | `#FBF8F2` | Hover de filas, zonas suaves |
| 60% Superficie | `--surface` | `#FFFDF8` | Tarjetas, tablas, modales |
| 30% Tinta | `--ink` | `#241A20` | Texto principal, sidebar |
| 30% Tinta 2 | `--ink-2` | `#5C4E55` | Texto secundario |
| 30% Tinta 3 | `--ink-3` | `#6E6067` | Metadatos (contraste ≥4.5:1) |
| 10% Primario | `--wine` | `#8C1D3F` | Acciones, activo, foco |
| 10% Primario hover | `--wine-2` | `#A82450` | Hover de primario |
| 10% Acento | `--gold` | `#B8892F` | Detalles, series de gráfico |
| 10% Acento texto | `--gold-ink` | `#8A6420` | Texto sobre papel |
| Línea | `--line` | `#E4DACB` | Bordes de 1px |
| Éxito | `--success` | `#2E6B4E` | Activo / pagado |
| Alerta | `--warning` | `#8A5A00` | Pendiente |
| Peligro | `--danger` | `#A32334` | Inactivo / destructivo |

Superficies de estado: `--success-bg #E6F0E8`, `--warning-bg #F8ECD9`, `--danger-bg #F8E6E7`, `--info-bg #E9EDF2`.

### Tipografía

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--font-display` | `'Fraunces', Georgia, serif` | h1, cifras KPI, títulos de modal |
| `--font-ui` | `'Inter', system-ui, sans-serif` | Todo lo demás |

Escala: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px. Interlineado 1.5 en cuerpo, 1.05–1.15 en display. Tracking `.12em` en labels uppercase de 11–12px.

### Espaciado y forma

- Ritmo 4/8: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Radios: `6px` inputs y botones, `14px` tarjetas, `18px` modales, `999px` badges y chips.
- Bordes: 1px `--line`; 2px en foco. Sin sombras grandes: `0 1px 0 #fff inset, 0 10px 30px -24px rgba(36,26,32,.45)`.
- Movimiento: `180ms` micro, `280ms` entrada, easing `cubic-bezier(.16,1,.3,1)`. Respetar `prefers-reduced-motion`.

---

## 2. Componentes

### Shell
- Sidebar 264px en `--ink` con luz de escenario radial dorada al 8%. Marca serif + filete oro.
- Nav agrupada (`Operación` / `Inteligencia`); ítem activo = píldora marfil con barra vino de 3px, `aria-current="page"`.
- Topbar 64px con burger (móvil), breadcrumb, fecha larga en español y píldora "Sistema activo".
- Bajo 1024px el sidebar es off-canvas con overlay y cierre por overlay, link, Escape y burger (`aria-expanded`).

### KPIs (bento)
Tarjeta con icono en cuadrado tintado, label uppercase 11px, cifra Fraunces 38–44px, nota opcional. Grid `auto-fit minmax(190px, 1fr)`. Hover: elevación 1px, sin escalar.

### Tablas
Contenedor `.tbl` con `overflow-x:auto` y `-webkit-overflow-scrolling`. Header sticky, uppercase 11px, sin fondo pesado. Filas de 52–56px, hover `--paper-2`, acción principal por fila. En móvil se conserva scroll horizontal (no se colapsa a cards).

### Badges
Píldora con punto de color: `activo/pagado` verde, `pendiente_pago/pendiente` ámbar, `inactivo/baja` gris, `anulado` rojo. Siempre texto + color (nunca solo color).

### Formularios
Label visible arriba, control 44px, focus ring vino 2px con offset 2. En modales, grilla de 2 columnas que colapsa a 1 en móvil. Errores inline + toast; nunca `alert()`.

### Feedback
- Toasts abajo-derecha, `role="status"`/`alert`, autocierre 4.5s, botón de cierre.
- Confirmaciones destructivas con `dialog` propio y botón rojo.
- Skeletons estables (misma altura que la tabla) y barra de progreso de 2px arriba.
- Empty states con icono, título y acción sugerida.

### Gráficos
Paleta categórica: `#8C1D3F, #B8892F, #3F6B5A, #5E4B8B, #C4703C, #8A7B82`. Grid punteado `rgba(36,26,32,.08)`, tooltips tinta, sin animación si `prefers-reduced-motion`. Barras `borderRadius 6`, dona `cutout 64%` con borde del color de la superficie.

---

## 3. Accesibilidad

- Contraste mínimo AA en todos los pares texto/fondo; foco visible siempre.
- Targets ≥44×44px (incluye botones de icono de tabla).
- Iconos decorativos `aria-hidden="true"`; botones de icono con `aria-label` y `title`.
- Diálogos con `aria-labelledby` y cierre por Escape; foco devuelto al disparador cuando aplique.
- Tablas con `scope="col"`, inputs con label, `aria-live` en toasts y chat.
